import { Router, type IRouter } from "express";
import { ROUTES_EXPLORER_HTML } from "../lib/routesExplorerHtml";

const router: IRouter = Router();

router.get("/", (_req, res): void => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(ROUTES_EXPLORER_HTML);
});

// Image proxy — fetches external photos (Wikimedia etc.) server-side
// so the browser never has to deal with referrer/CORS restrictions.
router.get("/img", async (req, res): Promise<void> => {
  const url = typeof req.query.url === "string" ? req.query.url : null;
  if (!url) { res.status(400).end(); return; }
  const allowed = /^https:\/\/(upload\.wikimedia\.org|commons\.wikimedia\.org)\//;
  if (!allowed.test(url)) { res.status(403).end(); return; }
  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "SagaTrail/1.0 (sagatrail.ch)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) { res.status(upstream.status).end(); return; }
    const ct = upstream.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buf);
  } catch {
    res.status(502).end();
  }
});

export default router;
