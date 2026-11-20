interface VercelReq {
  method?: string;
}

interface VercelRes {
  status: (code: number) => VercelRes;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default function handler(req: VercelReq, res: VercelRes) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method && req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  return res.status(200).json({ status: "ok" });
}
