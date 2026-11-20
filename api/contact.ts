import {
  extractClientIp,
  handleContactRequest,
} from "./_lib/portfolioServer.js";

interface VercelReq {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

interface VercelRes {
  status: (code: number) => VercelRes;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default async function handler(req: VercelReq, res: VercelRes) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const ip = extractClientIp(req.headers, req.socket?.remoteAddress);
  let parsedBody = req.body;
  if (typeof parsedBody === "string") {
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid JSON payload." });
    }
  }

  const result = await handleContactRequest({
    rawBody: parsedBody,
    ip,
  });

  return res.status(result.status).json(result.body);
}
