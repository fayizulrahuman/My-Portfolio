import { useCallback, useEffect, useState } from "react";
import { ActivityContactSection } from "./components/ActivityContactSection";
import { ChaptersSection } from "./components/ChaptersSection";
import { DisciplinesMarquee } from "./components/DisciplinesMarquee";
import { HeroSection } from "./components/HeroSection";
import { ProjectsSection } from "./components/ProjectsSection";
import { ThreePortfolioCanvas } from "./components/ThreePortfolioCanvas";
import { ToolboxSection } from "./components/ToolboxSection";
import { TopNav } from "./components/TopNav";
import {
  DEFAULT_STATS,
  PROFILE_META,
  PROJECTS,
  type ProfileStatsData,
  type ProjectItem,
  type ThemeMode,
} from "./data/portfolioData";
import {
  mapGitHubReposToProjects,
  resolveThemePreference,
  type GitHubRepoApiItem,
} from "./utils/portfolioLogic";

export function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "dark";
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem("fayizul-theme");
    } catch {
      stored = null;
    }
    const sysDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
    return resolveThemePreference(stored, sysDark);
  });

  const [accentHex, setAccentHex] = useState<string>(
    theme === "light" ? "#0d9488" : "#5eead4",
  );
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [motionPaused] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [selectedNodeLabel, setSelectedNodeLabel] = useState<string | null>(null);
  const [webglStatus, setWebglStatus] = useState<"ready" | "fallback">("ready");
  const [pulseSignal, setPulseSignal] = useState<number>(0);

  const [stats, setStats] = useState<ProfileStatsData>(DEFAULT_STATS);
  const [projects, setProjects] = useState<ProjectItem[]>(PROJECTS);
  const [reposLoading, setReposLoading] = useState<boolean>(true);

  // Sync `.dark` class on <html> and persist user theme selection
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      window.localStorage.setItem("fayizul-theme", theme);
    } catch {
      // Ignore storage failures
    }
  }, [theme]);

  useEffect(() => {
    let active = true;

    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { stats?: ProfileStatsData } | null) => {
        if (!active || !payload?.stats) return;
        setStats(payload.stats);
      })
      .catch(() => {
        // Seed metrics remain active
      });

    fetch("/api/repos")
      .then((res) => (res.ok ? res.json() : null))
      .then(async (payload: { repos?: ProjectItem[] } | null) => {
        if (!active) return;
        if (payload?.repos && payload.repos.length > 0) {
          setProjects(payload.repos);
          return;
        }
        // Fallback to direct public unauthenticated GitHub REST API
        const ghRes = await fetch(
          `https://api.github.com/users/${encodeURIComponent(PROFILE_META.handle)}/repos?sort=created&direction=desc&per_page=100`,
        );
        if (!active || !ghRes.ok) return;
        const rawRepos = (await ghRes.json()) as GitHubRepoApiItem[];
        setProjects(mapGitHubReposToProjects(rawRepos, PROJECTS, PROFILE_META.handle));
      })
      .catch(() => {
        // Seed flagship builds remain active
      })
      .finally(() => {
        if (active) setReposLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const maxScroll = Math.max(
          1,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        setScrollProgress(Math.min(1, Math.max(0, window.scrollY / maxScroll)));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === "dark" ? "light" : "dark";
      setAccentHex(next === "light" ? "#0d9488" : "#5eead4");
      return next;
    });
  }, []);

  const handleNodeSelect = useCallback((label: string) => {
    setSelectedNodeLabel(label);
  }, []);

  const handleChapterAccent = useCallback((hex: string) => {
    setAccentHex(hex);
    setPulseSignal((n) => n + 1);
  }, []);

  return (
    <div
      data-theme={theme}
      data-webgl={webglStatus}
      className="relative min-h-screen overflow-x-clip text-[#0f172a] dark:text-[#f4f5ff] transition-colors duration-300"
    >
      <ThreePortfolioCanvas
        theme={theme}
        sceneMode="topography"
        accentHex={accentHex}
        scrollProgress={scrollProgress}
        motionPaused={motionPaused}
        hoveredDomainLabel={selectedNodeLabel}
        pulseSignal={pulseSignal}
        onNodeSelect={handleNodeSelect}
        onWebGlStatusChange={setWebglStatus}
      />

      <TopNav theme={theme} onToggleTheme={handleToggleTheme} />

      <main className="pointer-events-none relative z-10">
        <HeroSection
          stats={stats}
          repoCount={projects.length}
          motionPaused={motionPaused}
        />
        <DisciplinesMarquee motionPaused={motionPaused} />
        <ChaptersSection
          theme={theme}
          onSelectChapterAccent={handleChapterAccent}
        />
        <ProjectsSection
          theme={theme}
          projects={projects}
          isLoading={reposLoading}
          onAccentChange={setAccentHex}
        />
        <ToolboxSection theme={theme} onAccentChange={setAccentHex} />
        <ActivityContactSection stats={stats} repoCount={projects.length} />
      </main>
    </div>
  );
}

export default App;
