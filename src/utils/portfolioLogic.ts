import type {
  ProjectCategory,
  ProjectItem,
  SceneMode,
  ThemeMode,
} from "../data/portfolioData";

export interface CameraRigTarget {
  position: [number, number, number];
  lookAt: [number, number, number];
  latticeSpin: number;
  contourGain: number;
}

export interface SceneThemePalette {
  background: string;
  fog: string;
  contourLow: string;
  contourHigh: string;
  accentDefault: string;
  ringSecondary: string;
}

export interface GitHubRepoApiItem {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  topics?: string[];
  fork?: boolean;
  archived?: boolean;
  html_url?: string;
  homepage?: string | null;
  created_at?: string;
  pushed_at?: string;
  updated_at?: string;
}

export interface ContactFormInput {
  name: string;
  email: string;
  message: string;
}

export interface ContactValidationResult {
  valid: boolean;
  error?: string;
  fieldErrors: Partial<Record<keyof ContactFormInput, string>>;
}

const ACCENT_PALETTE: Array<{ dark: string; light: string }> = [
  { dark: "#5eead4", light: "#0d9488" },
  { dark: "#a78bfa", light: "#6d28d9" },
  { dark: "#f0abfc", light: "#be185d" },
  { dark: "#fbbf24", light: "#b45309" },
];

export function filterProjects(
  projects: ProjectItem[],
  category: ProjectCategory,
): ProjectItem[] {
  if (category === "all") return projects;
  return projects.filter((project) => project.category === category);
}

export function dampScalar(
  current: number,
  target: number,
  lambda: number,
  dt: number,
): number {
  const safeDt = Math.max(0, Math.min(dt, 0.1));
  return current + (target - current) * (1 - Math.exp(-lambda * safeDt));
}

export function resolveThemePreference(
  stored: string | null | undefined,
  systemPrefersDark: boolean,
): ThemeMode {
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark ? "dark" : "dark";
}

export function getSceneThemePalette(theme: ThemeMode): SceneThemePalette {
  if (theme === "light") {
    return {
      background: "#f5f6fa",
      fog: "#f5f6fa",
      contourLow: "#dfe4f2",
      contourHigh: "#0d9488",
      accentDefault: "#6d28d9",
      ringSecondary: "#6d28d9",
    };
  }
  return {
    background: "#070b16",
    fog: "#070b16",
    contourLow: "#101730",
    contourHigh: "#5eead4",
    accentDefault: "#a78bfa",
    ringSecondary: "#a78bfa",
  };
}

export function cycleDisciplineIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return (current + 1) % total;
}

export function computeCameraRigTarget(
  scrollProgress: number,
  sceneMode: SceneMode,
  pointerX: number,
  pointerY: number,
): CameraRigTarget {
  const t = Math.max(0, Math.min(1, scrollProgress));
  const px = Math.max(-1, Math.min(1, pointerX));
  const py = Math.max(-1, Math.min(1, pointerY));

  if (sceneMode === "lattice") {
    return {
      position: [1.0 + px * 1.35, 1.8 + py * 0.55, 8.2 - t * 1.0],
      lookAt: [0.45, 0.45, 0],
      latticeSpin: 1.5,
      contourGain: 0.72,
    };
  }

  const camX = -0.6 + t * 0.85 + px * 0.85;
  const camY = 1.65 - t * 0.3 + py * 0.45;
  const camZ = 8.1 + t * 0.5;

  return {
    position: [camX, camY, camZ],
    lookAt: [0.75 - t * 0.35, 0.45 - t * 0.15, -0.8],
    latticeSpin: 1.0 + t * 0.35,
    contourGain: 1.0,
  };
}

export function classifyGitHubRepoCategory(
  language: string | null | undefined,
  topics: string[] = [],
  description = "",
  name = "",
): Exclude<ProjectCategory, "all"> {
  const haystack = [
    language ?? "",
    ...topics,
    description,
    name,
  ]
    .join(" ")
    .toLowerCase();

  if (
    /(\bmediapipe\b|\bvision\b|\bopencv\b|\byolo\b|\bpytorch\b|\btensorflow\b|\bml\b|\bai\b|\bfallguard\b|\bneural\b|\bdeep-learning\b|\bllm\b|computer vision|machine learning)/.test(
      haystack,
    ) ||
    (language ?? "").toLowerCase() === "python"
  ) {
    return "ai";
  }

  if (
    /(react-native|expo|flutter|android|ios|mobile|vitalsync|fintrack|apk|swift|kotlin)/.test(
      haystack,
    )
  ) {
    return "mobile";
  }

  return "fullstack";
}

export function sanitizeHttpUrl(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return trimmed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function decodeBasicHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ");
}

export function parseGitHubReposHtml(
  html: string,
  githubOwner: string,
): GitHubRepoApiItem[] {
  const chunks = html.split(/<li[^>]*itemprop="owns"[^>]*>/).slice(1);
  const repos: GitHubRepoApiItem[] = [];

  for (const chunk of chunks) {
    const closeIdx = chunk.search(/<\/li>\s*(?:<li|\s*<\/ul>|$)/);
    const li = closeIdx >= 0 ? chunk.slice(0, closeIdx) : chunk;
    const nameMatch = li.match(/itemprop="name codeRepository"[^>]*>\s*([^<\s]+)/);
    const name = nameMatch?.[1]?.trim();
    if (!name) continue;

    const rawDesc = li.match(/itemprop="description"[^>]*>([\s\S]*?)<\/p>/)?.[1];
    const desc = rawDesc
      ? decodeBasicHtmlEntities(rawDesc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      : null;

    const rawLang = li.match(/itemprop="programmingLanguage"[^>]*>\s*([^<]+)/)?.[1];
    const language = rawLang ? decodeBasicHtmlEntities(rawLang.trim()) : null;

    const starsRaw = li.match(
      /href="[^"]*\/stargazers"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)/,
    )?.[1];
    const stars = starsRaw ? Number(starsRaw.replace(/,/g, "")) || 0 : 0;

    const topics = [...li.matchAll(/href="\/topics\/([^"?#/]+)"/g)]
      .map((m) => decodeURIComponent(m[1]).trim())
      .filter(Boolean);

    const isFork = /Forked from/i.test(li);

    repos.push({
      name,
      description: desc || null,
      language,
      stargazers_count: stars,
      topics,
      fork: isFork,
      archived: false,
      html_url: `https://github.com/${encodeURIComponent(githubOwner)}/${encodeURIComponent(name)}`,
    });
  }

  return repos;
}

export function mapGitHubReposToProjects(
  rawRepos: GitHubRepoApiItem[],
  flagshipSeeds: ProjectItem[],
  githubOwner = "fayizulrahuman",
): ProjectItem[] {
  const seedMap = new Map(
    flagshipSeeds.map((item) => [item.name.toLowerCase(), item]),
  );

  const nonForks = rawRepos.filter(
    (repo) =>
      !repo.fork &&
      !repo.archived &&
      repo.name.toLowerCase() !== githubOwner.toLowerCase(),
  );

  // Order curated flagship builds first, then remaining owned repos by stars and recent push
  const sorted = [...nonForks].sort((a, b) => {
    const aSeed = seedMap.has(a.name.toLowerCase()) ? 1 : 0;
    const bSeed = seedMap.has(b.name.toLowerCase()) ? 1 : 0;
    if (aSeed !== bSeed) return bSeed - aSeed;
    const starDiff = (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0);
    if (starDiff !== 0) return starDiff;
    const aTime = Date.parse(a.created_at || a.pushed_at || a.updated_at || "") || 0;
    const bTime = Date.parse(b.created_at || b.pushed_at || b.updated_at || "") || 0;
    return bTime - aTime;
  });

  if (sorted.length === 0) {
    return flagshipSeeds;
  }

  return sorted.map((repo, idx) => {
    const seed = seedMap.get(repo.name.toLowerCase());
    const indexLabel = String(idx + 1).padStart(2, "0");
    const cleanHomepage = sanitizeHttpUrl(repo.homepage);
    const cleanGithubUrl = sanitizeHttpUrl(repo.html_url);

    const stars =
      typeof repo.stargazers_count === "number" && Number.isFinite(repo.stargazers_count)
        ? Math.max(0, Math.floor(repo.stargazers_count))
        : undefined;

    if (seed) {
      return {
        ...seed,
        indexLabel,
        stars: stars ?? seed.stars,
        primaryLanguage: repo.language || seed.primaryLanguage,
        description: repo.description?.trim() || seed.description,
        githubUrl: cleanGithubUrl || seed.githubUrl,
        homepageUrl: cleanHomepage || seed.homepageUrl,
        updatedAt: repo.pushed_at || repo.updated_at,
      };
    }

    const palette = ACCENT_PALETTE[idx % ACCENT_PALETTE.length];
    const language = repo.language || "Code";
    const topics = (repo.topics ?? []).slice(0, 4);
    const category = classifyGitHubRepoCategory(
      repo.language,
      topics,
      repo.description ?? "",
      repo.name,
    );
    const stack =
      topics.length > 0
        ? [language, ...topics.filter((t) => t.toLowerCase() !== language.toLowerCase())].slice(0, 3)
        : [language, "GitHub"];

    const description =
      repo.description?.trim() ||
      `Open-source ${language} repository created and maintained by ${githubOwner}.`;

    const tagline =
      category === "ai"
        ? "AI & intelligent automation"
        : category === "mobile"
          ? "Cross-platform mobile build"
          : "Full-stack & web engineering";

    return {
      id: repo.name,
      indexLabel,
      name: repo.name,
      tagline,
      constraint: cleanHomepage
        ? "Public repository with live deployment"
        : "Public open-source repository on GitHub",
      description,
      architecture: `${description} Built primarily with ${stack.join(", ")} and synced automatically from GitHub.`,
      category,
      primaryLanguage: language,
      stars: stars ?? 0,
      stack,
      accentHex: palette.dark,
      lightAccentHex: palette.light,
      githubUrl:
        cleanGithubUrl ||
        `https://github.com/${encodeURIComponent(githubOwner)}/${encodeURIComponent(repo.name)}`,
      homepageUrl: cleanHomepage,
      updatedAt: repo.pushed_at || repo.updated_at,
      highlights: [
        `Primary language: ${language}`,
        topics.length > 0 ? `Topics: ${topics.join(", ")}` : "Public GitHub repository",
        cleanHomepage ? `Live deployment available` : `Source hosted on GitHub`,
      ],
    };
  });
}

export function computeRepoTotals(rawRepos: GitHubRepoApiItem[]): {
  repoCount: number;
  starsEarned: number;
} {
  const active = rawRepos.filter((r) => !r.fork && !r.archived);
  const starsEarned = active.reduce((sum, r) => {
    const count =
      typeof r.stargazers_count === "number" && Number.isFinite(r.stargazers_count)
        ? Math.max(0, Math.floor(r.stargazers_count))
        : 0;
    return sum + count;
  }, 0);
  return { repoCount: active.length, starsEarned };
}

const MAX_CONTACT_NAME = 100;
const MAX_CONTACT_EMAIL = 160;
const MAX_CONTACT_MESSAGE = 4000;
const HAS_CONTROL_OR_NEWLINE = /[\r\n\0]/;

export function validateContactForm(
  input: ContactFormInput,
): ContactValidationResult {
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();
  const fieldErrors: Partial<Record<keyof ContactFormInput, string>> = {};

  if (name.length < 2) {
    fieldErrors.name = "Please enter your name (at least 2 characters).";
  } else if (name.length > MAX_CONTACT_NAME || HAS_CONTROL_OR_NEWLINE.test(name)) {
    fieldErrors.name = `Name must be a single line under ${MAX_CONTACT_NAME} characters.`;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > MAX_CONTACT_EMAIL || HAS_CONTROL_OR_NEWLINE.test(email)) {
    fieldErrors.email = "Please enter a valid email address.";
  }

  if (message.length < 8) {
    fieldErrors.message = "Please write a brief message (at least 8 characters).";
  } else if (message.length > MAX_CONTACT_MESSAGE) {
    fieldErrors.message = `Message must be under ${MAX_CONTACT_MESSAGE} characters.`;
  }

  const firstError =
    fieldErrors.name || fieldErrors.email || fieldErrors.message;

  return {
    valid: Object.keys(fieldErrors).length === 0,
    error: firstError,
    fieldErrors,
  };
}

export function parseDotEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eqIdx = withoutExport.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = withoutExport.slice(0, eqIdx).trim();
    let val = withoutExport.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key) {
      result[key] = val;
    }
  }
  return result;
}

export interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  privateKey?: string;
  toEmail?: string;
}

export function buildEmailJsPayload(
  config: EmailJsConfig,
  input: ContactFormInput,
) {
  const name = input.name.trim();
  const email = input.email.trim();
  const message = input.message.trim();

  return {
    service_id: config.serviceId,
    template_id: config.templateId,
    user_id: config.publicKey,
    ...(config.privateKey ? { accessToken: config.privateKey } : {}),
    template_params: {
      from_name: name,
      from_email: email,
      reply_to: email,
      name,
      email,
      message,
      to_name: "Fayizul Rahuman S.",
      ...(config.toEmail ? { to_email: config.toEmail } : {}),
    },
  };
}

export function shouldSendEmailJsFromServer(config: EmailJsConfig): boolean {
  return Boolean(config.privateKey && config.privateKey.trim().length > 0);
}


