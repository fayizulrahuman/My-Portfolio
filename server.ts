import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEMO_CONTRIB_DAYS,
  DEMO_STATS,
  refreshAllAssets,
  renderContribSvg,
  renderStatsSvg,
} from "./src/generators.js";
import {
  extractClientIp,
  getEmailJsConfig,
  getMissingEmailJsKeys,
  handleContactRequest,
  handleProfileRequest,
  handleReposRequest,
  loadLocalEnv,
} from "./api/_lib/portfolioServer.js";
import { shouldSendEmailJsFromServer } from "./src/utils/portfolioLogic.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

loadLocalEnv(ROOT);

function isValidRefreshSecret(authHeader: string | undefined): boolean {
  const configured = process.env.REFRESH_SECRET?.trim();
  if (!configured || !authHeader) return false;
  const expected = `Bearer ${configured}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function startServer() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    next();
  });

  app.use(express.json({ limit: "32kb" }));

  // Serve uploaded/public assets and SVG assets cleanly
  app.use("/assets", express.static(path.join(ROOT, "public", "assets")));
  app.use("/assets", express.static(path.join(ROOT, "assets")));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/repos", async (req, res) => {
    const refreshRequested = req.query.refresh === "1";
    const payload = await handleReposRequest(refreshRequested);
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );
    return res.json(payload);
  });

  app.get("/api/profile", async (_req, res) => {
    const payload = await handleProfileRequest();
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600",
    );
    return res.json(payload);
  });

  app.post("/api/contact", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const ip = extractClientIp(
      req.headers as Record<string, string | string[] | undefined>,
      req.socket?.remoteAddress,
    );
    const result = await handleContactRequest({
      rawBody: req.body,
      ip,
      rootDir: ROOT,
    });
    return res.status(result.status).json(result.body);
  });

  app.get("/api/stats.svg", async (_req, res) => {
    res.type("image/svg+xml").send(renderStatsSvg(DEMO_STATS));
  });

  app.get("/api/contrib.svg", async (_req, res) => {
    const total = DEMO_CONTRIB_DAYS.reduce((sum, [, c]) => sum + c, 0);
    res.type("image/svg+xml").send(renderContribSvg(DEMO_CONTRIB_DAYS, total));
  });

  app.post("/api/refresh", async (req, res) => {
    if (!isValidRefreshSecret(req.headers.authorization)) {
      return res.status(403).json({
        ok: false,
        error: "Forbidden: valid REFRESH_SECRET Bearer token required.",
      });
    }
    try {
      const demo = req.query.demo === "1";
      const result = await refreshAllAssets(ROOT, { demo });
      return res.json({ ok: true, ...result });
    } catch (err) {
      console.error("Failed to refresh assets:", err);
      return res.status(500).json({ ok: false, error: "Failed to refresh assets" });
    }
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ ok: false, error: "API route not found" });
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
    const emailCfg = getEmailJsConfig(ROOT);
    if (emailCfg) {
      const mode = shouldSendEmailJsFromServer(emailCfg)
        ? "server-side"
        : "browser-handoff";
      console.log(`EmailJS: configured (${mode})`);
    } else {
      const missing = getMissingEmailJsKeys(ROOT);
      console.warn(`EmailJS: NOT configured (missing: ${missing.join(", ")})`);
    }
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
