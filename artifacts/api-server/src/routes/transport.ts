import { Router } from "express";
import pino from "pino";

const log = pino({ name: "transport" });
const router = Router();

/**
 * Swiss public transport via timetable.search.ch (SBB/ZVV/PostAuto).
 * transport.opendata.ch ist vom Replit-Netzwerk nicht erreichbar.
 *
 * API-Endpunkte:
 *   Haltestellen-Suche:  GET /api/completion.json?latlon={lat},{lng}&show_ids=1
 *   Abfahrtstafel:        GET /api/stationboard.json?stop={name}&limit=8
 *   Ankunftstafel:        GET /api/stationboard.json?stop={name}&limit=8&mode=arrival
 */

const SEARCH_BASE = "https://timetable.search.ch/api";
const CACHE_TTL_MS = 2 * 60 * 1000;

/** Wählt unter den Kandidaten die nächste echte Haltestelle (mit ID, nicht Adresse). */
function bestStation(
  candidates: Array<{ id?: string; label: string; dist?: number; iconclass?: string }>,
): { id: string; name: string } | null {
  const withId = candidates.filter((s): s is typeof s & { id: string } => !!s.id);
  if (!withId.length) return null;
  // Züge bevorzugen, dann S-Bahn, dann beliebig — jeweils nächste (dist aufsteigend)
  const byDist = [...withId].sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0));
  return (
    byDist.find((s) => s.iconclass === "sl-icon-type-train") ??
    byDist.find((s) => s.iconclass?.includes("strain")) ??
    byDist[0]!
  );
}

interface CacheEntry { data: TransportResult; ts: number }
const cache = new Map<string, CacheEntry>();

export interface TransportDeparture {
  time: string;
  to: string;
  category: string;
  number: string;
  delay: number | null;
  platform: string | null;
}

export interface TransportResult {
  station: { id: string; name: string } | null;
  departures: TransportDeparture[];
}

export interface TransportArrival {
  time: string;
  from: string;
  category: string;
  number: string;
  delay: number | null;
  platform: string | null;
}

export interface TransportAnreiseResult {
  station: { id: string; name: string } | null;
  arrivals: TransportArrival[];
}

interface AnreiseCacheEntry { data: TransportAnreiseResult; ts: number }
const cacheAnreise = new Map<string, AnreiseCacheEntry>();

/** Sucht die nächstgelegene Haltestelle für die angegebenen Koordinaten. */
async function nearestStation(
  lat: number,
  lng: number,
): Promise<{ id: string; name: string } | null> {
  const url = `${SEARCH_BASE}/completion.json?latlon=${lat},${lng}&show_ids=1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`completion HTTP ${res.status}`);
  const json = (await res.json()) as Array<{
    id?: string;
    label: string;
    dist?: number;
    iconclass?: string;
  }>;
  const station = bestStation(json);
  return station ? { id: station.id, name: station.label } : null;
}

/** Typ-Code aus dem search.ch connection-Objekt (z.B. "S", "IR", "IC"). */
function connCategory(conn: { "*G"?: string; type?: string }): string {
  return conn["*G"] ?? conn.type ?? "";
}

/** Liniennummer (z.B. "2" für S2, "36" für IR 36). */
function connNumber(conn: { line?: string; "*L"?: string }): string {
  return conn.line ?? conn["*L"] ?? "";
}

router.get("/transport", async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "lat und lng sind erforderlich" });
  }

  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return res.json(hit.data);
  }

  try {
    const station = await nearestStation(lat, lng);
    if (!station) {
      const empty: TransportResult = { station: null, departures: [] };
      cache.set(key, { data: empty, ts: Date.now() });
      return res.json(empty);
    }

    const sbUrl = `${SEARCH_BASE}/stationboard.json?stop=${encodeURIComponent(station.name)}&limit=8`;
    const sbRes = await fetch(sbUrl, { signal: AbortSignal.timeout(8000) });
    if (!sbRes.ok) throw new Error(`stationboard HTTP ${sbRes.status}`);

    const sbJson = (await sbRes.json()) as {
      stop?: { id: string; name: string };
      connections?: Array<{
        time: string;            // "2026-08-01 14:47:00"
        line?: string;           // "S2", "IR 36"
        type?: string;           // "strain", "express_train"
        type_name?: string;
        "*G"?: string;           // "S", "IR"
        "*L"?: string;
        terminal?: { name: string };
      }>;
    };

    const departures: TransportDeparture[] = (sbJson.connections ?? [])
      .slice(0, 8)
      .map((c) => ({
        time: c.time ? c.time.slice(11, 16) : "",
        to: c.terminal?.name ?? "",
        category: connCategory(c),
        number: connNumber(c),
        delay: null,
        platform: null,
      }));

    const result: TransportResult = {
      station: { id: station.id, name: sbJson.stop?.name ?? station.name },
      departures,
    };
    cache.set(key, { data: result, ts: Date.now() });
    log.info({ station: result.station?.name, departures: departures.length }, "transport geladen");
    return res.json(result);
  } catch (err) {
    log.warn({ err }, "transport fetch fehlgeschlagen");
    return res.status(502).json({ error: "Fahrplan nicht verfügbar" });
  }
});

router.get("/transport-anreise", async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: "lat und lng sind erforderlich" });
  }

  const key = `arr:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const hit = cacheAnreise.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return res.json(hit.data);
  }

  try {
    const station = await nearestStation(lat, lng);
    if (!station) {
      const empty: TransportAnreiseResult = { station: null, arrivals: [] };
      cacheAnreise.set(key, { data: empty, ts: Date.now() });
      return res.json(empty);
    }

    // search.ch unterstützt mode=arrival; Fallback auf Abfahrten wenn leer.
    const sbUrl = `${SEARCH_BASE}/stationboard.json?stop=${encodeURIComponent(station.name)}&limit=8&mode=arrival`;
    const sbRes = await fetch(sbUrl, { signal: AbortSignal.timeout(8000) });
    if (!sbRes.ok) throw new Error(`stationboard HTTP ${sbRes.status}`);

    const sbJson = (await sbRes.json()) as {
      stop?: { id: string; name: string };
      connections?: Array<{
        time: string;
        line?: string;
        type?: string;
        "*G"?: string;
        "*L"?: string;
        terminal?: { name: string };   // Herkunft bei Ankünften
      }>;
    };

    const conns = sbJson.connections ?? [];

    const arrivals: TransportArrival[] = conns
      .slice(0, 8)
      .map((c) => ({
        time: c.time ? c.time.slice(11, 16) : "",
        from: c.terminal?.name ?? "",
        category: connCategory(c),
        number: connNumber(c),
        delay: null,
        platform: null,
      }));

    const result: TransportAnreiseResult = {
      station: { id: station.id, name: sbJson.stop?.name ?? station.name },
      arrivals,
    };
    cacheAnreise.set(key, { data: result, ts: Date.now() });
    log.info({ station: result.station?.name, arrivals: arrivals.length }, "transport-anreise geladen");
    return res.json(result);
  } catch (err) {
    log.warn({ err }, "transport-anreise fetch fehlgeschlagen");
    return res.status(502).json({ error: "Fahrplan nicht verfügbar" });
  }
});

export default router;
