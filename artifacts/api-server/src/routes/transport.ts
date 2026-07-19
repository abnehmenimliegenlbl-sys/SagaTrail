import { Router } from "express";
import pino from "pino";

const log = pino({ name: "transport" });
const router = Router();

const OPENDATA_BASE = "https://transport.opendata.ch/v1";
const CACHE_TTL_MS = 2 * 60 * 1000;

/**
 * Waehlt unter den Kandidaten-Stationen die "schweizerischste" aus.
 *
 * opendata.ch-IDs fuer Schweizer Stationen beginnen mit "85" (UIC-Code 85 =
 * Schweiz). Deutsche Grenzbahnhoefe tauchen ebenfalls in der Locations-API auf
 * (IDs wie 110XXXX oder 80XXXX), liefern aber in opendata.ch keinen
 * vollstaendigen Fahrplan — deshalb werden sie nur als Fallback genutzt.
 *
 * Prioritaet: 85XXXXX > 8XXXXXX > alle anderen numerischen IDs
 */
function bestStation(
  stations: Array<{ id: string | null; name: string; distance: number | null }>,
): { id: string; name: string } | null {
  const candidates = stations.filter(
    (s): s is typeof s & { id: string } => !!s.id && /^\d+$/.test(s.id),
  );
  return (
    candidates.find((s) => s.id.startsWith("85")) ??
    candidates.find((s) => s.id.startsWith("8")) ??
    candidates[0] ??
    null
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
    const locUrl = `${OPENDATA_BASE}/locations?x=${lat}&y=${lng}&type=station`;
    const locRes = await fetch(locUrl, { signal: AbortSignal.timeout(8000) });
    if (!locRes.ok) throw new Error(`locations HTTP ${locRes.status}`);

    const locJson = (await locRes.json()) as {
      stations: Array<{ id: string | null; name: string; distance: number | null }>;
    };

    const station = bestStation(locJson.stations);
    if (!station?.id) {
      const empty: TransportResult = { station: null, departures: [] };
      cache.set(key, { data: empty, ts: Date.now() });
      return res.json(empty);
    }

    const now = new Date().toISOString().slice(0, 16);
    const sbUrl = `${OPENDATA_BASE}/stationboard?station=${encodeURIComponent(station.id)}&limit=8&datetime=${encodeURIComponent(now)}`;
    const sbRes = await fetch(sbUrl, { signal: AbortSignal.timeout(8000) });
    if (!sbRes.ok) throw new Error(`stationboard HTTP ${sbRes.status}`);

    const sbJson = (await sbRes.json()) as {
      station: { id: string; name: string };
      stationboard: Array<{
        stop: {
          departure: string | null;
          departureTimestamp: number | null;
          delay: number | null;
          platform: string | null;
        };
        category: string;
        number: string;
        to: string;
      }>;
    };

    const departures: TransportDeparture[] = (sbJson.stationboard ?? [])
      .filter(e => e.stop.departureTimestamp != null)
      .slice(0, 8)
      .map(e => ({
        time: e.stop.departure ? e.stop.departure.slice(11, 16) : "",
        to: e.to,
        category: e.category,
        number: e.number,
        delay: e.stop.delay ?? null,
        platform: e.stop.platform ?? null,
      }));

    const result: TransportResult = {
      station: { id: station.id, name: station.name },
      departures,
    };
    cache.set(key, { data: result, ts: Date.now() });
    log.info({ station: station.name, departures: departures.length }, "transport geladen");
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
    const locUrl = `${OPENDATA_BASE}/locations?x=${lat}&y=${lng}&type=station`;
    const locRes = await fetch(locUrl, { signal: AbortSignal.timeout(8000) });
    if (!locRes.ok) throw new Error(`locations HTTP ${locRes.status}`);

    const locJson = (await locRes.json()) as {
      stations: Array<{ id: string | null; name: string; distance: number | null }>;
    };

    const station = bestStation(locJson.stations);
    if (!station?.id) {
      const empty: TransportAnreiseResult = { station: null, arrivals: [] };
      cacheAnreise.set(key, { data: empty, ts: Date.now() });
      return res.json(empty);
    }

    const now = new Date().toISOString().slice(0, 16);
    const sbUrl = `${OPENDATA_BASE}/stationboard?station=${encodeURIComponent(station.id)}&limit=8&datetime=${encodeURIComponent(now)}&type=arrival`;
    const sbRes = await fetch(sbUrl, { signal: AbortSignal.timeout(8000) });
    if (!sbRes.ok) throw new Error(`stationboard HTTP ${sbRes.status}`);

    const sbJson = (await sbRes.json()) as {
      station: { id: string; name: string };
      stationboard: Array<{
        stop: {
          arrival: string | null;
          arrivalTimestamp: number | null;
          departure: string | null;
          departureTimestamp: number | null;
          delay: number | null;
          platform: string | null;
        };
        category: string;
        number: string;
        from: string | null;
        to: string | null;
      }>;
    };

    // Kleine Bus-/Tramhaltestellen liefern in opendata.ch oft KEINE
    // Ankunftszeiten (stop.arrival = null), nur Abfahrten. Fallback:
    // Abfahrtszeit an derselben Haltestelle verwenden, sonst bleibt
    // "SBB live am Start" bei solchen Stationen dauerhaft leer.
    const arrivals: TransportArrival[] = (sbJson.stationboard ?? [])
      .filter(e => e.stop.arrivalTimestamp != null || e.stop.departureTimestamp != null)
      .slice(0, 8)
      .map(e => ({
        time: (e.stop.arrival ?? e.stop.departure ?? "").slice(11, 16),
        from: e.from ?? e.to ?? "",
        category: e.category,
        number: e.number,
        delay: e.stop.delay ?? null,
        platform: e.stop.platform ?? null,
      }));

    const result: TransportAnreiseResult = {
      station: { id: station.id, name: station.name },
      arrivals,
    };
    cacheAnreise.set(key, { data: result, ts: Date.now() });
    log.info({ station: station.name, arrivals: arrivals.length }, "transport-anreise geladen");
    return res.json(result);
  } catch (err) {
    log.warn({ err }, "transport-anreise fetch fehlgeschlagen");
    return res.status(502).json({ error: "Fahrplan nicht verfügbar" });
  }
});

export default router;
