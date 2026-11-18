import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { SceneMode, ThemeMode } from "../data/portfolioData";
import {
  computeCameraRigTarget,
  dampScalar,
  getSceneThemePalette,
} from "../utils/portfolioLogic";

export interface PortfolioSceneState {
  theme: ThemeMode;
  sceneMode: SceneMode;
  accentHex: string;
  scrollProgress: number;
  motionPaused: boolean;
  hoveredDomainLabel: string | null;
}

export interface PortfolioSceneCallbacks {
  onNodeSelect?: (label: string) => void;
  onWebGlStatusChange?: (status: "ready" | "fallback") => void;
}

interface SignalPulse {
  from: THREE.Vector3;
  to: THREE.Vector3;
  phase: number;
  speed: number;
}

// Pre-allocated scratch helpers (zero GC inside animation loop)
const _dummy = new THREE.Object3D();
const _vec3 = new THREE.Vector3();
const _targetBg = new THREE.Color("#070b16");
const _targetLineA = new THREE.Color("#5eead4");
const _targetLineB = new THREE.Color("#a78bfa");
const _targetAccent = new THREE.Color("#5eead4");
const _targetSecondaryRing = new THREE.Color("#a78bfa");

export function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

const TOPO_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uScroll;
  uniform float uBurst;
  uniform float uGain;

  varying float vElev;
  varying vec2 vUv;
  varying float vRadial;

  float ridgeNoise(vec2 p) {
    float a = sin(p.x * 0.55 + uTime * 0.38) * cos(p.y * 0.48 - uTime * 0.28);
    float b = sin((p.x + p.y) * 0.34 - uTime * 0.22) * 0.65;
    float c = cos((p.x * 0.85 - p.y * 0.72) + uTime * 0.18) * 0.42;
    return a + b + c;
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    vec2 wp = pos.xy * 0.42 + vec2(uScroll * 1.4, uScroll * 0.6);

    float n1 = ridgeNoise(wp);
    float n2 = ridgeNoise(wp * 1.85 + vec2(3.1, -1.7)) * 0.45;

    vec2 cursorWorld = vec2(uPointer.x * 9.0, uPointer.y * 6.0);
    float dist = length(pos.xy - cursorWorld);
    float cursorLift = exp(-dist * 0.22) * 0.95;
    float burstWave = sin(dist * 1.8 - uTime * 5.0) * exp(-dist * 0.18) * uBurst * 0.85;

    float elev = (n1 + n2 + cursorLift + burstWave) * uGain;
    pos.z += elev * 0.72;

    vElev = elev;
    vRadial = length(uv - 0.5);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const TOPO_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uBgColor;
  uniform vec3 uLineColorA;
  uniform vec3 uLineColorB;
  uniform vec3 uAccentColor;
  uniform float uThemeMix;
  uniform float uBurst;

  varying float vElev;
  varying vec2 vUv;
  varying float vRadial;

  void main() {
    // Crisp multi-frequency topographic contour isolines
    float contourPhase = abs(fract(vElev * 2.15) - 0.5) * 2.0;
    float linePrimary = 1.0 - smoothstep(0.0, 0.11, contourPhase);

    float subPhase = abs(fract(vElev * 6.45) - 0.5) * 2.0;
    float lineSubtle = (1.0 - smoothstep(0.0, 0.09, subPhase)) * 0.36;

    float mixBand = clamp(vUv.x * 0.65 + sin(vElev * 1.4) * 0.25 + 0.15, 0.0, 1.0);
    vec3 contourCol = mix(uLineColorA, uLineColorB, mixBand);
    contourCol = mix(contourCol, uAccentColor, 0.28 + uBurst * 0.45);

    // Subtle elevation shading between contour bands
    float ridgeShade = clamp((vElev + 1.5) * 0.25, 0.0, 1.0);
    vec3 baseCol = mix(uBgColor, contourCol, mix(0.05, 0.035, uThemeMix) * ridgeShade);

    // Gently calm contour intensity behind left editorial hero text
    float heroMask = mix(0.32, 1.0, smoothstep(0.15, 0.52, vUv.x));
    float lineStrength = clamp(
      (linePrimary * mix(0.68, 0.42, uThemeMix) + lineSubtle * mix(0.38, 0.2, uThemeMix)) * heroMask,
      0.0,
      1.0
    );
    vec3 finalCol = mix(baseCol, contourCol, lineStrength);

    // Vignette blend smoothly into scene background around outer edges
    float edgeFade = 1.0 - smoothstep(0.28, 0.52, vRadial);
    finalCol = mix(uBgColor, finalCol, edgeFade);

    gl_FragColor = vec4(finalCol, 1.0);
    #include <colorspace_fragment>
  }
`;

export function mountThreePortfolioScene(
  container: HTMLElement,
  initialState: PortfolioSceneState,
  callbacks: PortfolioSceneCallbacks,
) {
  const isSoftwareGl = detectSoftwareWebGL();
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
      alpha: false,
      preserveDrawingBuffer: true,
    });
  } catch {
    callbacks.onWebGlStatusChange?.("fallback");
    return {
      updateState: () => {},
      pulseSignalBurst: () => {},
      dispose: () => {},
    };
  }

  const initialPalette = getSceneThemePalette(initialState.theme);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.setAttribute("data-testid", "three-portfolio-canvas");
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(initialPalette.background);
  scene.fog = new THREE.FogExp2(initialPalette.fog, 0.032);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envRenderTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRenderTarget.texture;
  pmremGenerator.dispose();

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;
  const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
  camera.position.set(-0.6, 1.65, 8.1);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minDistance = 4.2;
  controls.maxDistance = 15;
  controls.maxPolarAngle = Math.PI * 0.6;
  controls.minPolarAngle = Math.PI * 0.2;
  controls.target.set(0.75, 0.45, -0.8);

  const disposables: Array<{ dispose: () => void }> = [envRenderTarget];

  // Studio lighting
  const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x0b1226, 1.25);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
  keyLight.position.set(5, 8, 7);
  scene.add(keyLight);

  const accentLight = new THREE.PointLight(0x5eead4, 14, 24, 1.2);
  accentLight.position.set(2.8, 2.4, 3.6);
  scene.add(accentLight);

  // ---------------------------------------------------------------------------
  // 1. PROCEDURAL GLSL TOPOGRAPHIC CONTOUR LANDSCAPE
  // ---------------------------------------------------------------------------
  const topoGeo = new THREE.PlaneGeometry(34, 24, isSoftwareGl ? 64 : 96, isSoftwareGl ? 48 : 72);
  const topoUniforms = {
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uScroll: { value: initialState.scrollProgress },
    uBurst: { value: 0 },
    uGain: { value: 1 },
    uThemeMix: { value: initialState.theme === "light" ? 1 : 0 },
    uBgColor: { value: new THREE.Color(initialPalette.background) },
    uLineColorA: { value: new THREE.Color(initialPalette.contourHigh) },
    uLineColorB: { value: new THREE.Color(initialPalette.accentDefault) },
    uAccentColor: { value: new THREE.Color(initialState.accentHex) },
  };

  const topoMat = new THREE.ShaderMaterial({
    uniforms: topoUniforms,
    vertexShader: TOPO_VERTEX_SHADER,
    fragmentShader: TOPO_FRAGMENT_SHADER,
  });
  const topoMesh = new THREE.Mesh(topoGeo, topoMat);
  topoMesh.rotation.x = -Math.PI * 0.38;
  topoMesh.position.set(0.4, -1.6, -2.8);
  scene.add(topoMesh);
  disposables.push(topoGeo, topoMat);

  // ---------------------------------------------------------------------------
  // 2. INTERACTIVE SYNAPTIC ORBITAL LATTICE (Organic sculptural orbital cluster)
  // ---------------------------------------------------------------------------
  const latticeGroup = new THREE.Group();
  latticeGroup.position.set(2.35, 0.35, 0.4);
  scene.add(latticeGroup);

  const coreGeo = new THREE.IcosahedronGeometry(0.42, 1);
  const coreWireGeo = new THREE.WireframeGeometry(coreGeo);
  const coreWireMat = new THREE.LineBasicMaterial({
    color: 0x5eead4,
    transparent: true,
    opacity: 0.85,
  });
  const coreWire = new THREE.LineSegments(coreWireGeo, coreWireMat);
  latticeGroup.add(coreWire);

  const coreInnerGeo = new THREE.IcosahedronGeometry(0.24, 1);
  const coreInnerMat = new THREE.MeshStandardMaterial({
    color: 0xa78bfa,
    emissive: 0xa78bfa,
    emissiveIntensity: 0.9,
    roughness: 0.22,
    metalness: 0.65,
  });
  const coreInner = new THREE.Mesh(coreInnerGeo, coreInnerMat);
  coreInner.userData = { domainLabel: "Neural Core · AI & ML Systems" };
  coreInner.layers.enable(1);
  latticeGroup.add(coreInner);
  disposables.push(coreGeo, coreWireGeo, coreWireMat, coreInnerGeo, coreInnerMat);

  // Precision orbital rings around lattice
  const ring1Geo = new THREE.TorusGeometry(1.42, 0.02, 12, 84);
  const ringMat1 = new THREE.MeshStandardMaterial({
    color: 0x5eead4,
    emissive: 0x5eead4,
    emissiveIntensity: 0.75,
    roughness: 0.25,
    metalness: 0.7,
  });
  const ring1 = new THREE.Mesh(ring1Geo, ringMat1);
  ring1.rotation.x = Math.PI * 0.36;
  latticeGroup.add(ring1);

  const ring2Geo = new THREE.TorusGeometry(1.86, 0.016, 12, 84);
  const ringMat2 = new THREE.MeshStandardMaterial({
    color: 0xa78bfa,
    emissive: 0xa78bfa,
    emissiveIntensity: 0.65,
    roughness: 0.25,
    metalness: 0.7,
  });
  const ring2 = new THREE.Mesh(ring2Geo, ringMat2);
  ring2.rotation.x = -Math.PI * 0.28;
  ring2.rotation.y = Math.PI * 0.24;
  latticeGroup.add(ring2);

  const ring3Geo = new THREE.TorusGeometry(2.26, 0.01, 10, 96);
  const ringMat3 = new THREE.MeshStandardMaterial({
    color: 0xf0abfc,
    emissive: 0xf0abfc,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.55,
    roughness: 0.3,
    metalness: 0.65,
  });
  const ring3 = new THREE.Mesh(ring3Geo, ringMat3);
  ring3.rotation.x = Math.PI * 0.18;
  ring3.rotation.y = -Math.PI * 0.32;
  latticeGroup.add(ring3);
  disposables.push(ring1Geo, ringMat1, ring2Geo, ringMat2, ring3Geo, ringMat3);

  // Interactive orbiting project & skill nodes
  const nodeGeo = new THREE.OctahedronGeometry(0.11, 0);
  disposables.push(nodeGeo);
  const nodeConfigs = [
    { label: "FallGuard · MediaPipe Vision", r: 1.42, phase: 0.2, tilt: 0.45, color: 0x5eead4 },
    { label: "VitalSync · Mobile Health", r: 1.86, phase: 1.8, tilt: -0.4, color: 0xa78bfa },
    { label: "HiddenGems · Geospatial API", r: 1.42, phase: 3.3, tilt: 0.45, color: 0xf0abfc },
    { label: "FinTrack · TypeScript Expo", r: 1.86, phase: 4.9, tilt: -0.4, color: 0xfbbf24 },
  ];

  const interactiveMeshes: THREE.Mesh[] = [coreInner];
  const orbitingNodes: Array<{
    mesh: THREE.Mesh;
    r: number;
    phase: number;
    tilt: number;
    speed: number;
  }> = [];

  nodeConfigs.forEach((cfg, idx) => {
    const nMat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      emissive: cfg.color,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.6,
    });
    disposables.push(nMat);
    const nMesh = new THREE.Mesh(nodeGeo, nMat);
    nMesh.userData = { domainLabel: cfg.label };
    nMesh.layers.enable(1);
    latticeGroup.add(nMesh);
    interactiveMeshes.push(nMesh);
    orbitingNodes.push({
      mesh: nMesh,
      r: cfg.r,
      phase: cfg.phase,
      tilt: cfg.tilt,
      speed: 0.24 + idx * 0.04,
    });
  });

  // Dynamic synaptic signal photons connecting core to outer field
  const pulseCount = 16;
  const photonGeo = new THREE.SphereGeometry(0.036, 8, 8);
  const photonMat = new THREE.MeshBasicMaterial({ color: 0x5eead4 });
  const photonInstanced = new THREE.InstancedMesh(photonGeo, photonMat, pulseCount);
  photonInstanced.frustumCulled = false;
  latticeGroup.add(photonInstanced);
  disposables.push(photonGeo, photonMat);

  const signalSeeds: SignalPulse[] = Array.from({ length: pulseCount }, (_, i) => ({
    from: new THREE.Vector3(0, 0, 0),
    to: new THREE.Vector3(Math.cos(i * 1.3) * 1.4, Math.sin(i * 0.9) * 0.9, Math.sin(i * 1.7) * 0.8),
    phase: (i * 0.17) % 1,
    speed: 0.45 + (i % 4) * 0.12,
  }));

  // Ambient floating architectural motes (150 instances)
  const MOTE_COUNT = 150;
  const moteGeo = new THREE.OctahedronGeometry(0.038, 0);
  const moteMat = new THREE.MeshBasicMaterial({
    color: initialPalette.contourHigh,
    transparent: true,
    opacity: 0.62,
  });
  const moteInstanced = new THREE.InstancedMesh(moteGeo, moteMat, MOTE_COUNT);
  moteInstanced.frustumCulled = false;
  scene.add(moteInstanced);
  disposables.push(moteGeo, moteMat);

  const moteSeeds = Array.from({ length: MOTE_COUNT }, (_, i) => {
    const angle = (i * 137.5 * Math.PI) / 180;
    const rad = 3.5 + ((i * 67) % 100) / 9;
    return {
      x: Math.cos(angle) * rad,
      y: ((i * 37) % 80) / 10 - 2.2,
      z: Math.sin(angle) * rad - 2.2,
      scale: 0.55 + ((i * 13) % 10) * 0.08,
      speed: 0.28 + (i % 6) * 0.08,
    };
  });

  if (!isSoftwareGl) {
    renderer.compile(scene, camera);
  }

  // ---------------------------------------------------------------------------
  // STATE, POINTER & RAYCASTING
  // ---------------------------------------------------------------------------
  let currentState: PortfolioSceneState = { ...initialState };
  let pointerX = 0;
  let pointerY = 0;
  let userDragging = false;
  let burstEnergy = 0;
  let hoveredMesh: THREE.Mesh | null = null;
  let lastRaycastMs = 0;

  const raycaster = new THREE.Raycaster();
  raycaster.layers.set(1);
  const pointerNdc = new THREE.Vector2();

  const onControlsStart = () => {
    userDragging = true;
  };
  const onControlsEnd = () => {
    userDragging = false;
  };
  controls.addEventListener("start", onControlsStart);
  controls.addEventListener("end", onControlsEnd);

  const onPointerMove = (e: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointerX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    const now = performance.now();
    if (now - lastRaycastMs < 60) return;
    lastRaycastMs = now;

    pointerNdc.set(pointerX, pointerY);
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(interactiveMeshes, false);

    if (hoveredMesh && (!hits.length || hits[0].object !== hoveredMesh)) {
      hoveredMesh.scale.setScalar(1);
      hoveredMesh = null;
    }
    if (hits.length > 0) {
      const hit = hits[0].object as THREE.Mesh;
      hoveredMesh = hit;
      hit.scale.setScalar(1.42);
      renderer.domElement.style.cursor = "pointer";
    } else {
      renderer.domElement.style.cursor = "default";
    }
  };

  const onPointerDown = (e: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointerNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -(((e.clientY - rect.top) / rect.height) * 2 - 1),
    );
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(interactiveMeshes, false);
    if (hits.length > 0) {
      const label = hits[0].object.userData?.domainLabel as string | undefined;
      burstEnergy = 1.0;
      if (label) callbacks.onNodeSelect?.(label);
    }
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  renderer.domElement.addEventListener("pointerdown", onPointerDown);

  const onResize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.render(scene, camera);
  };
  window.addEventListener("resize", onResize);

  const onContextLost = (e: Event) => {
    e.preventDefault();
    callbacks.onWebGlStatusChange?.("fallback");
  };
  const onContextRestored = () => {
    callbacks.onWebGlStatusChange?.("ready");
  };
  renderer.domElement.addEventListener("webglcontextlost", onContextLost);
  renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

  // ---------------------------------------------------------------------------
  // ANIMATION LOOP (Software-WebGL afterDraw sync pacing)
  // ---------------------------------------------------------------------------
  let frameId = 0;
  let disposed = false;
  let prevTime = performance.now();
  let simTime = 0;
  let dampedScroll = initialState.scrollProgress;
  let dampedThemeMix = initialState.theme === "light" ? 1 : 0;
  let dampedGain = 1;

  function afterDraw(cb: () => void) {
    if (disposed) return;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  function tick() {
    if (disposed) return;
    const now = performance.now();
    const dt = Math.min((now - prevTime) / 1000, 0.08);
    prevTime = now;

    if (!currentState.motionPaused) {
      simTime += dt;
    }
    burstEnergy = dampScalar(burstEnergy, 0, 2.8, dt);
    dampedScroll = dampScalar(dampedScroll, currentState.scrollProgress, 5.5, dt);
    dampedThemeMix = dampScalar(
      dampedThemeMix,
      currentState.theme === "light" ? 1 : 0,
      16.0,
      dt,
    );

    const palette = getSceneThemePalette(currentState.theme);
    _targetBg.set(palette.background);
    _targetLineA.set(palette.contourHigh);
    _targetLineB.set(palette.accentDefault);
    _targetAccent.set(currentState.accentHex);
    _targetSecondaryRing.set(palette.ringSecondary);

    if (scene.background instanceof THREE.Color) {
      scene.background.lerp(_targetBg, 0.65);
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.lerp(_targetBg, 0.65);
    }

    topoUniforms.uTime.value = simTime;
    topoUniforms.uPointer.value.set(
      dampScalar(topoUniforms.uPointer.value.x, pointerX, 6.0, dt),
      dampScalar(topoUniforms.uPointer.value.y, pointerY, 6.0, dt),
    );
    topoUniforms.uScroll.value = dampedScroll;
    topoUniforms.uBurst.value = burstEnergy;
    topoUniforms.uThemeMix.value = dampedThemeMix;
    topoUniforms.uBgColor.value.lerp(_targetBg, 0.65);
    topoUniforms.uLineColorA.value.lerp(_targetLineA, 0.45);
    topoUniforms.uLineColorB.value.lerp(_targetLineB, 0.45);
    topoUniforms.uAccentColor.value.lerp(_targetAccent, 0.35);

    const rig = computeCameraRigTarget(
      dampedScroll,
      currentState.sceneMode,
      pointerX,
      pointerY,
    );
    dampedGain = dampScalar(dampedGain, rig.contourGain, 4.5, dt);
    topoUniforms.uGain.value = dampedGain;

    if (!userDragging) {
      camera.position.x = dampScalar(camera.position.x, rig.position[0], 3.8, dt);
      camera.position.y = dampScalar(camera.position.y, rig.position[1], 3.8, dt);
      camera.position.z = dampScalar(camera.position.z, rig.position[2], 3.8, dt);
      controls.target.x = dampScalar(controls.target.x, rig.lookAt[0], 4.2, dt);
      controls.target.y = dampScalar(controls.target.y, rig.lookAt[1], 4.2, dt);
      controls.target.z = dampScalar(controls.target.z, rig.lookAt[2], 4.2, dt);
    }
    controls.update();

    const isNarrow = (container.clientWidth || window.innerWidth) < 900;

    // Position and animate Interactive Synaptic Lattice
    const targetLatticeX = isNarrow
      ? 0.72
      : currentState.sceneMode === "topography"
        ? 2.25 - dampedScroll * 0.35
        : 0.25;
    const targetLatticeY = isNarrow ? -1.48 : 0.35;
    const targetLatticeScale = isNarrow ? 0.5 : 1.0;

    latticeGroup.position.x = dampScalar(latticeGroup.position.x, targetLatticeX, 4.5, dt);
    latticeGroup.position.y = dampScalar(latticeGroup.position.y, targetLatticeY, 4.5, dt);
    latticeGroup.scale.setScalar(
      dampScalar(latticeGroup.scale.x, targetLatticeScale, 4.5, dt),
    );
    latticeGroup.rotation.y = simTime * 0.18 * rig.latticeSpin + pointerX * 0.2;

    coreWire.rotation.x = simTime * 0.35;
    coreWire.rotation.y = simTime * 0.42;
    coreWireMat.color.lerp(_targetLineA, 0.1);
    ringMat1.color.lerp(_targetAccent, 0.1);
    ringMat1.emissive.lerp(_targetAccent, 0.1);
    ringMat2.color.lerp(_targetSecondaryRing, 0.1);
    ringMat2.emissive.lerp(_targetSecondaryRing, 0.1);
    accentLight.color.lerp(_targetAccent, 0.1);

    ring1.rotation.z = simTime * 0.26 * rig.latticeSpin;
    ring2.rotation.z = -simTime * 0.2 * rig.latticeSpin;
    ring3.rotation.z = simTime * 0.14 * rig.latticeSpin;

    orbitingNodes.forEach((n, idx) => {
      const a = n.phase + simTime * n.speed * (rig.latticeSpin + burstEnergy * 0.9);
      n.mesh.position.set(
        Math.cos(a) * n.r,
        Math.sin(a) * n.r * Math.sin(n.tilt),
        Math.sin(a) * n.r * Math.cos(n.tilt),
      );
      if (n.mesh !== hoveredMesh) {
        const s = 1 + Math.sin(simTime * 2.2 + idx) * 0.12 + burstEnergy * 0.35;
        n.mesh.scale.setScalar(s);
      }
    });

    signalSeeds.forEach((sig, i) => {
      const t = (sig.phase + simTime * (sig.speed + burstEnergy * 0.6)) % 1;
      _vec3.copy(sig.from).lerp(sig.to, t);
      _dummy.position.copy(_vec3);
      _dummy.scale.setScalar(0.65 + Math.sin(t * Math.PI) * 0.6);
      _dummy.updateMatrix();
      photonInstanced.setMatrixAt(i, _dummy.matrix);
    });
    photonInstanced.instanceMatrix.needsUpdate = true;
    photonMat.color.lerp(_targetAccent, 0.12);

    // Update ambient architectural motes
    moteMat.color.lerp(_targetLineA, 0.12);
    moteMat.opacity = currentState.theme === "light" ? 0.36 : 0.62;
    for (let i = 0; i < MOTE_COUNT; i++) {
      const s = moteSeeds[i];
      _dummy.position.set(
        s.x + pointerX * 0.16,
        s.y + Math.sin(simTime * s.speed + i) * 0.16,
        s.z,
      );
      _dummy.scale.setScalar(s.scale * (0.78 + Math.sin(simTime * 1.6 + i) * 0.24));
      _dummy.updateMatrix();
      moteInstanced.setMatrixAt(i, _dummy.matrix);
    }
    moteInstanced.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = window.requestAnimationFrame(tick);
    }
  }

  callbacks.onWebGlStatusChange?.("ready");
  tick();

  return {
    updateState: (next: Partial<PortfolioSceneState>) => {
      currentState = { ...currentState, ...next };
    },
    pulseSignalBurst: () => {
      burstEnergy = 1.0;
    },
    dispose: () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      controls.removeEventListener("start", onControlsStart);
      controls.removeEventListener("end", onControlsEnd);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
