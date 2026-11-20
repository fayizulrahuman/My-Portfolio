import { useEffect, useRef } from "react";
import {
  mountThreePortfolioScene,
  type PortfolioSceneState,
} from "../three/sceneBuilder";

interface ThreePortfolioCanvasProps extends PortfolioSceneState {
  pulseSignal: number;
  onNodeSelect: (label: string) => void;
  onWebGlStatusChange: (status: "ready" | "fallback") => void;
}

export function ThreePortfolioCanvas({
  theme,
  sceneMode,
  accentHex,
  scrollProgress,
  motionPaused,
  hoveredDomainLabel,
  pulseSignal,
  onNodeSelect,
  onWebGlStatusChange,
}: ThreePortfolioCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<ReturnType<typeof mountThreePortfolioScene> | null>(null);
  const callbacksRef = useRef({ onNodeSelect, onWebGlStatusChange });
  callbacksRef.current = { onNodeSelect, onWebGlStatusChange };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const controller = mountThreePortfolioScene(
      container,
      {
        theme,
        sceneMode,
        accentHex,
        scrollProgress,
        motionPaused,
        hoveredDomainLabel,
      },
      {
        onNodeSelect: (label) => callbacksRef.current.onNodeSelect(label),
        onWebGlStatusChange: (status) => callbacksRef.current.onWebGlStatusChange(status),
      },
    );
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
    // Mount WebGL canvas once so theme/mode updates transition smoothly without tearing down the context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controllerRef.current?.updateState({
      theme,
      sceneMode,
      accentHex,
      scrollProgress,
      motionPaused,
      hoveredDomainLabel,
    });
  }, [theme, sceneMode, accentHex, scrollProgress, motionPaused, hoveredDomainLabel]);

  useEffect(() => {
    if (pulseSignal > 0) {
      controllerRef.current?.pulseSignalBurst();
    }
  }, [pulseSignal]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 h-full w-full select-none"
    />
  );
}
