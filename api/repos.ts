import { handleReposRequest } from "./_lib/portfolioServer.js";

interface VercelReq {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface VercelRes {
  status: (code: number) => VercelRes;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default async function handler(req: VercelReq, res: VercelRes) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method && req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const refreshParam = req.query?.refresh;
  const refreshRequested =
    refreshParam === "1" ||
    (Array.isArray(refreshParam) && refreshParam[0] === "1");

  const payload = await handleReposRequest(refreshRequested);
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=600",
  );
  return res.status(200).json(payload);
}
