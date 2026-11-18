import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEMO_CONTRIB_DAYS,
  DEMO_STATS,
  GITHUB_USER,
  refreshAllAssets,
  renderContribSvg,
  renderStatsSvg,
} from "./src/generators.js";
import { PROJECTS, type ProjectItem } from "./src/data/portfolioData.js";
import {
  buildEmailJsPayload,
  mapGitHubReposToProjects,
  parseDotEnv,
  validateContactForm,
  type EmailJsConfig,
  type GitHubRepoApiItem,
} from "./src/utils/portfolioLogic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const REPOS_CACHE_TTL_MS = 60 * 1000;

function loadLocalEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  try {
    const parsed = parseDotEnv(fs.readFileSync(envPath, "utf8"));
    for (const [key, val] of Object.entries(parsed)) {
      if (process.env[key] === undefined || process.env[key] === "") {
        process.env[key] = val;
      }
    }
  } catch (err) {
    console.warn("Could not read local .env file:", err);
  }
}

loadLocalEnv();

interface CachedReposState {
  fetchedAt: number;
  source: "github" | "snapshot";
  username: string;
  repos: ProjectItem[];
  rawCount: number;
  totalStars: number;
}

let cachedRepos: CachedReposState | null = null;

function getConfiguredUsername(): string {
  return process.env.GITHUB_USERNAME?.trim() || GITHUB_USER;
}

function getEmailJsConfig(): EmailJsConfig | null {
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
    process.env.VITE_EMAILJS_PUBLIC_KEY?.trim() ||
    process.env.EMAILJS_USER_ID?.trim() ||
    "";
  const privateKey =
    process.env.EMAILJS_PRIVATE_KEY?.trim() ||
    process.env.EMAILJS_ACCESS_TOKEN?.trim() ||
    undefined;

  if (!serviceId || !templateId || !publicKey) {
    return null;
  }

  return { serviceId, templateId, publicKey, privateKey };
}

async function fetchLiveOwnedRepos(username: string): Promise<CachedReposState> {
  const now = Date.now();
  if (
    cachedRepos &&
    cachedRepos.username === username &&
    now - cachedRepos.fetchedAt < REPOS_CACHE_TTL_MS
  ) {
    return cachedRepos;
  }

  const url = `https://api.github.com/users/${encodeURIComponent(
    username,
  )}/repos?sort=created&direction=desc&per_page=100`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "fayizul-portfolio-app",
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub REST repos request failed (${response.status})`);
  }

  const rawRepos = (await response.json()) as GitHubRepoApiItem[];
  const nonForks = rawRepos.filter((r) => !r.fork && !r.archived);
  const totalStars = nonForks.reduce((sum, r) => sum + (r.stargazers_count ?? 0), 0);
  const mapped = mapGitHubReposToProjects(rawRepos, PROJECTS, username);

  cachedRepos = {
    fetchedAt: now,
    source: "github",
    username,
    repos: mapped,
    rawCount: nonForks.length,
    totalStars,
  };
  return cachedRepos;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "64kb" }));

  // Serve uploaded/public assets and SVG assets cleanly
  app.use("/assets", express.static(path.join(ROOT, "public", "assets")));
  app.use("/assets", express.static(path.join(ROOT, "assets")));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/repos", async (req, res) => {
    const username = getConfiguredUsername();
    if (req.query.refresh === "1") {
      cachedRepos = null;
    }

    try {
      const result = await fetchLiveOwnedRepos(username);
      return res.json({
        source: result.source,
        username: result.username,
        totalCount: result.repos.length,
        repos: result.repos,
      });
    } catch (err) {
      console.warn("Falling back to seed projects for /api/repos:", err);
      return res.json({
        source: "snapshot",
        username,
        totalCount: PROJECTS.length,
        repos: PROJECTS,
      });
    }
  });

  app.get("/api/profile", async (_req, res) => {
    const username = getConfiguredUsername();
    try {
      const liveRepos = await fetchLiveOwnedRepos(username);
      return res.json({
        source: "github-public",
        stats: {
          ...DEMO_STATS,
          repos: Math.max(liveRepos.rawCount, liveRepos.repos.length),
          stars_earned: liveRepos.totalStars,
        },
        contribDays: DEMO_CONTRIB_DAYS.map(([label, count]) => ({ label, count })),
      });
    } catch (err) {
      console.warn("Falling back to snapshot profile data:", err);
      return res.json({
        source: "snapshot",
        stats: DEMO_STATS,
        contribDays: DEMO_CONTRIB_DAYS.map(([label, count]) => ({ label, count })),
      });
    }
  });

  app.post("/api/contact", async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name : "";
    const email = typeof body.email === "string" ? body.email : "";
    const message = typeof body.message === "string" ? body.message : "";

    const validation = validateContactForm({ name, email, message });
    if (!validation.valid) {
      return res.status(400).json({
        ok: false,
        error: validation.error || "Please complete all contact fields.",
        fieldErrors: validation.fieldErrors,
      });
    }

    const emailJsConfig = getEmailJsConfig();
    let deliveredVia: "emailjs" | "local" = "local";

    if (emailJsConfig) {
      try {
        const payload = buildEmailJsPayload(emailJsConfig, { name, email, message });
        const emailJsRes = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!emailJsRes.ok) {
          const detail = await emailJsRes.text();
          if (emailJsRes.status === 403 && !emailJsConfig.privateKey) {
            return res.status(200).json({
              ok: false,
              requiresBrowserSend: true,
              emailJs: {
                serviceId: emailJsConfig.serviceId,
                templateId: emailJsConfig.templateId,
                publicKey: emailJsConfig.publicKey,
              },
            });
          }
          console.error("EmailJS delivery failed:", emailJsRes.status, detail);
          return res.status(502).json({
            ok: false,
            error: `Email delivery failed (${emailJsRes.status}). Please verify your EmailJS Service ID, Template ID, and Public Key in .env.`,
          });
        }
        deliveredVia = "emailjs";
      } catch (err) {
        console.error("EmailJS request error:", err);
        return res.status(502).json({
          ok: false,
          error: "Could not reach EmailJS right now. Please try again in a moment.",
        });
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

    try {
      const dataDir = path.join(ROOT, ".data");
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
      fs.writeFileSync(logPath, JSON.stringify(existing.slice(-200), null, 2), "utf8");
    } catch (err) {
      console.warn("Could not persist contact message to disk:", err);
    }

    return res.json({
      ok: true,
      id: entry.id,
      deliveredVia,
      receivedAt: entry.receivedAt,
      message:
        deliveredVia === "emailjs"
          ? "Email sent via EmailJS! Thanks for reaching out."
          : "Message received! Thanks for reaching out.",
    });
  });

  app.get("/api/stats.svg", async (_req, res) => {
    res.type("image/svg+xml").send(renderStatsSvg(DEMO_STATS));
  });

  app.get("/api/contrib.svg", async (_req, res) => {
    const total = DEMO_CONTRIB_DAYS.reduce((sum, [, c]) => sum + c, 0);
    res.type("image/svg+xml").send(renderContribSvg(DEMO_CONTRIB_DAYS, total));
  });

  app.post("/api/refresh", async (req, res) => {
    try {
      const demo = req.query.demo === "1";
      const result = await refreshAllAssets(ROOT, { demo });
      res.json({ ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh assets";
      res.status(500).json({ ok: false, error: message });
    }
  });

  const distDir = path.join(ROOT, "dist");
  const isProd = process.env.NODE_ENV === "production" && fs.existsSync(distDir);

  if (isProd) {
    app.use(express.static(distDir));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
