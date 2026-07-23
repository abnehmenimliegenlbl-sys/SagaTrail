import { Router, type IRouter } from "express";
import { ROUTES_EXPLORER_HTML } from "../lib/routesExplorerHtml";

const router: IRouter = Router();

// ── Bild-Cache ──────────────────────────────────────────────────────────────
// Hält bis zu MAX_CACHE_ENTRIES Bilder im RAM; älteste werden verdrängt.
const MAX_CACHE_ENTRIES = 800;
type CacheEntry = { buf: Buffer; ct: string };
const imgCache = new Map<string, CacheEntry>();

function cacheSet(url: string, entry: CacheEntry): void {
  if (imgCache.size >= MAX_CACHE_ENTRIES) {
    // Ältesten Eintrag entfernen (Map preserves insertion order)
    imgCache.delete(imgCache.keys().next().value as string);
  }
  imgCache.set(url, entry);
}

// In-flight dedup: gleiche URL wird nur 1× bei Wikimedia abgefragt,
// alle weiteren warten auf dasselbe Promise.
const inFlight = new Map<string, Promise<CacheEntry | null>>();

// Concurrency-Semaphore: max 4 gleichzeitige Wikimedia-Fetches
let activeWikimedia = 0;
const waitQueue: Array<() => void> = [];
const MAX_CONCURRENT = 4;

async function acquireSemaphore(): Promise<void> {
  if (activeWikimedia < MAX_CONCURRENT) { activeWikimedia++; return; }
  await new Promise<void>(resolve => waitQueue.push(resolve));
  activeWikimedia++;
}
function releaseSemaphore(): void {
  activeWikimedia--;
  const next = waitQueue.shift();
  if (next) next();
}

async function fetchWikimedia(url: string): Promise<CacheEntry | null> {
  await acquireSemaphore();
  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "SagaTrail/1.0 (sagatrail.ch)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!upstream.ok) return null;
    const ct = upstream.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await upstream.arrayBuffer());
    return { buf, ct };
  } catch {
    return null;
  } finally {
    releaseSemaphore();
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Trailing-slash-Redirect: /api/routen → /api/routen/
router.get("", (_req, res): void => {
  res.redirect(301, "/api/routen/");
});

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

  // 1. RAM-Cache
  const cached = imgCache.get(url);
  if (cached) {
    res.setHeader("Content-Type", cached.ct);
    res.setHeader("Cache-Control", "public, max-age=604800"); // 7 Tage
    res.setHeader("X-Cache", "HIT");
    res.send(cached.buf);
    return;
  }

  // 2. In-flight dedup
  let pending = inFlight.get(url);
  if (!pending) {
    pending = fetchWikimedia(url).then(entry => {
      inFlight.delete(url);
      if (entry) cacheSet(url, entry);
      return entry;
    });
    inFlight.set(url, pending);
  }

  const entry = await pending;
  if (!entry) { res.status(502).end(); return; }

  res.setHeader("Content-Type", entry.ct);
  res.setHeader("Cache-Control", "public, max-age=604800"); // 7 Tage
  res.setHeader("X-Cache", "MISS");
  res.send(entry.buf);
});

export default router;
