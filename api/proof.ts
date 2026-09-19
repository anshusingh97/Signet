export const config = {
  api: {
    bodyParser: false,
  },
};

interface IncomingReq {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: BodyInit | null;
}

interface ServerRes {
  setHeader(name: string, value: string): void;
  status(code: number): {
    end(): void;
    send(body: Buffer): void;
    json(body: Record<string, unknown>): void;
  };
}

export default async function handler(req: IncomingReq, res: ServerRes) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");
    return res.status(200).end();
  }

  const endpoint = req.url?.includes("/check") ? "/check" : "/prove";
  const targetUrl = `https://proof-server.preprod.midnight.network${endpoint}`;

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": (req.headers["content-type"] as string) || "application/octet-stream",
      },
      body: req.body,
    });

    const data = await response.arrayBuffer();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");
    return res.status(response.status).send(Buffer.from(data));
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(500).json({ error: errorMsg });
  }
}

