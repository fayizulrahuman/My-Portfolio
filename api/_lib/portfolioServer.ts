import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CONTRIB_DAYS,
  DEFAULT_STATS,
  PROFILE_META,
  PROJECTS,
  type ProjectItem,
} from "../../src/data/portfolioData.js";
import {
  buildEmailJsPayload,
  mapGitHubReposToProjects,
  parseDotEnv,
  parseGitHubReposHtml,
  shouldSendEmailJsFromServer,
  validateContactForm,
  type EmailJsConfig,
  type GitHubRepoApiItem,
} from "../../src/utils/portfolioLogic.js";

const REPOS_CACHE_TTL_MS = 15 * 60 * 1000;
const GITHUB_FETCH_TIMEOUT_MS = 7000;
const EMAILJS_FETCH_TIMEOUT_MS = 8000;
const CONTACT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_MAX_PER_WINDOW = 5;
const REFRESH_COOLDOWN_MS = 30 * 1000;

interface CachedReposState {
  fetchedAt: number;
  source: "github" | "snapshot";
  username: string;
  repos: ProjectItem[];
  rawCount: number;
  totalStars: number;
}

let cachedRepos: CachedReposState | null = null;
let lastKnownGoodRepos: CachedReposState | null = null;
let inFlightReposPromise: Promise<CachedReposState> | null = null;
let rateLimitedUntil = 0;
let lastManualRefreshAt = 0;

const contactRateBuckets = new Map<string, number[]>();

const envFileLoadedKeys = new Set<string>();

export function loadLocalEnv(rootDir: string): void {
  if (process.env.VERCEL) return;
  for (const filename of [".env", ".env.local"]) {
    const envPath = path.join(rootDir, filename);
    if (!fs.existsSync(envPath)) continue;
    try {
      const parsed = parseDotEnv(fs.readFileSync(envPath, "utf8"));
      for (const [key, val] of Object.entries(parsed)) {
        const current = process.env[key];
        const canUpdate =
          current === undefined ||
          current === "" ||
          envFileLoadedKeys.has(key);
        if (canUpdate) {
          process.env[key] = val;
          envFileLoadedKeys.add(key);
        }
      }
    } catch (err) {
      console.warn(`Could not read local ${filename} file:`, err);
    }
  }
}

export function getConfiguredUsername(): string {
  return process.env.GITHUB_USERNAME?.trim() || PROFILE_META.handle;
}

export function getMissingEmailJsKeys(rootDir?: string): string[] {
  if (rootDir) loadLocalEnv(rootDir);
  const missing: string[] = [];
  if (!(process.env.EMAILJS_SERVICE_ID?.trim() || process.env.VITE_EMAILJS_SERVICE_ID?.trim())) {
    missing.push("EMAILJS_SERVICE_ID");
  }
  if (!(process.env.EMAILJS_TEMPLATE_ID?.trim() || process.env.VITE_EMAILJS_TEMPLATE_ID?.trim())) {
    missing.push("EMAILJS_TEMPLATE_ID");
  }
  if (
    !(
      process.env.EMAILJS_PUBLIC_KEY?.trim() ||
      process.env.EMAILJS_USER_ID?.trim() ||
      process.env.VITE_EMAILJS_PUBLIC_KEY?.trim()
    )
  ) {
    missing.push("EMAILJS_PUBLIC_KEY");
  }
  return missing;
}

export function getEmailJsConfig(rootDir?: string): EmailJsConfig | null {
  if (rootDir) loadLocalEnv(rootDir);

  const serviceId =
    process.env.EMAILJS_SERVICE_ID?.trim() ||
    process.env.VITE_EMAILJS_SERVICE_ID?.trim() ||
    "";
  const templateId =
    process.env.EMAILJS_TEMPLATE_ID?.trim() ||
    process.env.VITE_EMAILJS_TEMPLATE_ID?.trim() ||
    "";
  const publicKey =
    process.env.EMAILJS_PUBLIC_KEY?.trim() ||
    process.env.EMAILJS_USER_ID?.trim() ||
    process.env.VITE_EMAILJS_PUBLIC_KEY?.trim() ||
    "";
  const privateKey =
    process.env.EMAILJS_PRIVATE_KEY?.trim() ||
    process.env.EMAILJS_ACCESS_TOKEN?.trim() ||
    undefined;
  const toEmail =
    process.env.CONTACT_RECIPIENT_EMAIL?.trim() || PROFILE_META.email;

  if (!serviceId || !templateId || !publicKey) {
    return null;
  }

  return { serviceId, templateId, publicKey, privateKey, toEmail };
}

export function extractClientIp(
  headers: Record<string, string | string[] | undefined>,
  fallbackAddress?: string,
): string {
  const forwarded = headers["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded?.split(",")[0];
  const realIp = headers["x-real-ip"];
  const raw =
    firstForwarded?.trim() ||
    (Array.isArray(realIp) ? realIp[0]?.trim() : realIp?.trim()) ||
    fallbackAddress ||
    "unknown";
  return raw.slice(0, 64);
}

function isContactRateLimited(ip: string, now = Date.now()): boolean {
  const cutoff = now - CONTACT_WINDOW_MS;
  const recent = (contactRateBuckets.get(ip) ?? []).filter((ts) => ts > cutoff);
  if (recent.length >= CONTACT_MAX_PER_WINDOW) {
    contactRateBuckets.set(ip, recent);
    return true;
  }
  recent.push(now);
  contactRateBuckets.set(ip, recent);

  if (contactRateBuckets.size > 500) {
    for (const [key, list] of contactRateBuckets.entries()) {
      if (list.every((ts) => ts <= cutoff)) {
        contactRateBuckets.delete(key);
      }
    }
  }
  return false;
}

function buildSnapshotReposState(username: string, now: number): CachedReposState {
  const totalStars = PROJECTS.reduce((sum, p) => sum + p.stars, 0);
  return {
    fetchedAt: now,
    source: "snapshot",
    username,
    repos: PROJECTS,
    rawCount: PROJECTS.length,
    totalStars,
  };
}

async function fetchPublicGitHubHtmlRepos(
  username: string,
): Promise<GitHubRepoApiItem[] | null> {
  try {
    const htmlRes = await fetch(
      `https://github.com/${encodeURIComponent(username)}?tab=repositories`,
      {
        headers: {
          "User-Agent": "fayizul-portfolio-app",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(GITHUB_FETCH_TIMEOUT_MS),
      },
    );
    if (!htmlRes.ok) return null;
    const html = await htmlRes.text();
    const parsed = parseGitHubReposHtml(html, username);
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function fetchLiveOwnedRepos(
  username: string,
  forceRefresh = false,
): Promise<CachedReposState> {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedRepos &&
    cachedRepos.username === username &&
    now - cachedRepos.fetchedAt < REPOS_CACHE_TTL_MS
  ) {
    return cachedRepos;
  }

  if (inFlightReposPromise) {
    return inFlightReposPromise;
  }

  inFlightReposPromise = (async (): Promise<CachedReposState> => {
    const githubToken = process.env.GITHUB_TOKEN?.trim();
    let rawRepos: GitHubRepoApiItem[] | null = null;

    // Skip REST API while unauthenticated rate-limit window is active
    const canTryRestApi = Boolean(githubToken) || Date.now() >= rateLimitedUntil;

    if (canTryRestApi) {
      try {
        const url = `https://api.github.com/users/${encodeURIComponent(
          username,
        )}/repos?sort=created&direction=desc&per_page=100`;

        const headers: Record<string, string> = {
          "User-Agent": "fayizul-portfolio-app",
          Accept: "application/vnd.github+json",
        };
        if (githubToken) {
          headers.Authorization = `Bearer ${githubToken}`;
        }

        const response = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(GITHUB_FETCH_TIMEOUT_MS),
        });

        if (response.ok) {
          rawRepos = (await response.json()) as GitHubRepoApiItem[];
        } else if (response.status === 403 || response.status === 429) {
          const resetHeader = Number(response.headers.get("x-ratelimit-reset") || "0");
          const resetMs = resetHeader > 0 ? resetHeader * 1000 : Date.now() + 5 * 60 * 1000;
          rateLimitedUntil = Math.max(Date.now() + 60 * 1000, resetMs);
        }
      } catch {
        // Fall through to public HTML fallback
      }
    }

    // Fallback to GitHub's public repositories page when REST API is rate-limited
    if (!rawRepos) {
      rawRepos = await fetchPublicGitHubHtmlRepos(username);
    }

    if (rawRepos && rawRepos.length > 0) {
      const nonForks = rawRepos.filter((r) => !r.fork && !r.archived);
      const totalStars = nonForks.reduce(
        (sum, r) => sum + (r.stargazers_count ?? 0),
        0,
      );
      const mapped = mapGitHubReposToProjects(rawRepos, PROJECTS, username);

      const liveState: CachedReposState = {
        fetchedAt: Date.now(),
        source: "github",
        username,
        repos: mapped,
        rawCount: nonForks.length,
        totalStars,
      };
      cachedRepos = liveState;
      lastKnownGoodRepos = liveState;
      return liveState;
    }

    if (lastKnownGoodRepos && lastKnownGoodRepos.username === username) {
      cachedRepos = { ...lastKnownGoodRepos, fetchedAt: Date.now() };
      return cachedRepos;
    }

    const fallbackState = buildSnapshotReposState(username, Date.now());
    cachedRepos = fallbackState;
    return fallbackState;
  })();

  try {
    return await inFlightReposPromise;
  } finally {
    inFlightReposPromise = null;
  }
}

export async function handleReposRequest(refreshRequested = false) {
  const username = getConfiguredUsername();
  let forceRefresh = false;
  if (refreshRequested) {
    const now = Date.now();
    if (now - lastManualRefreshAt >= REFRESH_COOLDOWN_MS) {
      forceRefresh = true;
      lastManualRefreshAt = now;
    }
  }

  const result = await fetchLiveOwnedRepos(username, forceRefresh);
  return {
    source: result.source,
    username: result.username,
    totalCount: result.repos.length,
    repos: result.repos,
  };
}

export async function handleProfileRequest() {
  const username = getConfiguredUsername();
  const liveRepos = await fetchLiveOwnedRepos(username);

  if (liveRepos.source === "github") {
    return {
      source: "github-public" as const,
      stats: {
        ...DEFAULT_STATS,
        repos: Math.max(liveRepos.rawCount, liveRepos.repos.length),
        stars_earned: liveRepos.totalStars,
      },
      contribDays: DEFAULT_CONTRIB_DAYS,
    };
  }

  return {
    source: "snapshot" as const,
    stats: DEFAULT_STATS,
    contribDays: DEFAULT_CONTRIB_DAYS,
  };
}

export interface ContactHandlerResult {
  status: number;
  body: Record<string, unknown>;
}

export async function handleContactRequest(options: {
  rawBody: unknown;
  ip: string;
  rootDir?: string;
}): Promise<ContactHandlerResult> {
  const body =
    options.rawBody && typeof options.rawBody === "object"
      ? (options.rawBody as Record<string, unknown>)
      : {};

  if (isContactRateLimited(options.ip)) {
    return {
      status: 429,
      body: {
        ok: false,
        error: "Too many messages sent recently. Please wait a few minutes and try again.",
      },
    };
  }

  const name = typeof body.name === "string" ? body.name : "";
  const email = typeof body.email === "string" ? body.email : "";
  const message = typeof body.message === "string" ? body.message : "";

  const validation = validateContactForm({ name, email, message });
  if (!validation.valid) {
    return {
      status: 400,
      body: {
        ok: false,
        error: validation.error || "Please complete all contact fields.",
        fieldErrors: validation.fieldErrors,
      },
    };
  }

  const emailJsConfig = getEmailJsConfig(options.rootDir);
  const isProdRuntime = Boolean(
    process.env.VERCEL || process.env.NODE_ENV === "production",
  );

  if (!emailJsConfig) {
    const missingKeys = getMissingEmailJsKeys(options.rootDir);
    return {
      status: 503,
      body: {
        ok: false,
        error: isProdRuntime
          ? `Email delivery is not configured yet. Please email ${PROFILE_META.email} directly.`
          : `EmailJS is not configured yet (missing in .env: ${missingKeys.join(", ")}). Add them to .env or email ${PROFILE_META.email} directly.`,
      },
    };
  }

  let deliveredVia: "emailjs" | "emailjs-browser" | "local" = "local";
  let handoffToBrowser = false;

  if (emailJsConfig) {
    if (!shouldSendEmailJsFromServer(emailJsConfig)) {
      deliveredVia = "emailjs-browser";
      handoffToBrowser = true;
    } else {
      try {
        const payload = buildEmailJsPayload(emailJsConfig, {
          name,
          email,
          message,
        });
        const emailJsRes = await fetch(
          "https://api.emailjs.com/api/v1.0/email/send",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(EMAILJS_FETCH_TIMEOUT_MS),
          },
        );

        if (!emailJsRes.ok) {
          if (emailJsRes.status === 403) {
            deliveredVia = "emailjs-browser";
            handoffToBrowser = true;
          } else {
            const detail = await emailJsRes.text().catch(() => "");
            console.warn("EmailJS delivery failed:", emailJsRes.status, detail);
            return {
              status: 502,
              body: {
                ok: false,
                error:
                  "Email delivery service could not accept the message right now. Please try again later.",
              },
            };
          }
        } else {
          deliveredVia = "emailjs";
          console.info("Contact message delivered via EmailJS (server-side)");
        }
      } catch (err) {
        console.warn("EmailJS request error:", err);
        return {
          status: 502,
          body: {
            ok: false,
            error: "Could not reach the email delivery service. Please try again shortly.",
          },
        };
      }
    }
  }

  const entry = {
    id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
    deliveredVia,
    receivedAt: new Date().toISOString(),
  };

  if (options.rootDir && !process.env.VERCEL) {
    try {
      const dataDir = path.join(options.rootDir, ".data");
      fs.mkdirSync(dataDir, { recursive: true });
      const logPath = path.join(dataDir, "contact-messages.json");
      let existing: Array<typeof entry> = [];
      if (fs.existsSync(logPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(logPath, "utf8"));
          if (Array.isArray(parsed)) existing = parsed;
        } catch {
          existing = [];
        }
      }
      existing.push(entry);
      fs.writeFileSync(
        logPath,
        JSON.stringify(existing.slice(-200), null, 2),
        "utf8",
      );
    } catch (err) {
      console.warn("Could not persist contact message to disk:", err);
    }
  }

  if (handoffToBrowser && emailJsConfig) {
    return {
      status: 200,
      body: {
        ok: false,
        requiresBrowserSend: true,
        emailJs: {
          serviceId: emailJsConfig.serviceId,
          templateId: emailJsConfig.templateId,
          publicKey: emailJsConfig.publicKey,
          toEmail: emailJsConfig.toEmail,
        },
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      id: entry.id,
      deliveredVia,
      receivedAt: entry.receivedAt,
      message:
        deliveredVia === "emailjs"
          ? "Email sent via EmailJS! Thanks for reaching out."
          : "Message received! Thanks for reaching out.",
    },
  };
}
