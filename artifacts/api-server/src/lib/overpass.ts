import type { Logger } from "pino";
import { haversineM, type LatLng } from "./geo";

/**
 * Laedt reale Wanderrouten je Kanton aus OpenStreetMap ueber die Overpass-API.
 *
 * Zweistufiges, distanzbewusstes Vorgehen, um Last und Antwortgroesse gering zu
 * halten und trotzdem auch KURZE lokale Routen in routendichten Kantonen zu
 * finden:
 *
 *  1. Index (`out tags bb;`): fuer ALLE benannten Wanderrouten-Relationen des
 *     Kantons nur Tags und die Bounding Box holen. Das ist selbst fuer grosse
 *     Kantone (>1000 Relationen) klein und schnell. Aus der Bounding-Box-
 *     Diagonale ergibt sich eine UNTERE Schranke der echten Routenlaenge: eine
 *     Route ist nie kuerzer als ihre Bounding-Box-Diagonale. Damit lassen sich
 *     bei einer Obergrenze (distMax) alle sicher zu langen Routen vorab
 *     aussortieren, BEVOR die teure Geometrie geladen wird.
 *  2. Geometrie (`out geom;`): nur fuer die ausgewaehlten Kandidaten die
 *     Wegpunkte nachladen, um die exakte Laenge zu berechnen.
 *
 * Overpass verlangt einen aussagekraeftigen User-Agent, sonst 406.
 */

// Mehrere Overpass-Spiegel: der oeffentliche Hauptserver ist oft ueberlastet
// (504/429). Wir probieren der Reihe nach mit kurzer Wartezeit weiter.
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const USER_AGENT = "SagaTrail/1.0 (Swiss hiking companion)";
const REQUEST_TIMEOUT_MS = 60000;

// Geometrie wird in Bloecken nachgeladen, damit die Antwort auch bei vielen
// Kandidaten nicht das Overpass-Zeit-/Groessenlimit sprengt.
const GEOMETRY_BATCH = 80;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Angereicherte Route mit voller Geometrie (nach Phase 2). */
export interface RawHikingRoute {
  id: string;
  osmId: number;
  name: string;
  ref: string | null;
  sac: string | null;
  network: string | null;
  points: LatLng[];
}

/**
 * Leichter Index-Eintrag (nach Phase 1): Tags plus die aus der Bounding Box
 * abgeleitete Diagonale als untere Schranke der Routenlaenge.
 */
export interface RouteIndexEntry {
  osmId: number;
  name: string;
  ref: string | null;
  sac: string | null;
  network: string | null;
  bboxDiagKm: number;
  rank: number;
}

interface OverpassBounds {
  minlat: number;
  minlon: number;
  maxlat: number;
  maxlon: number;
}

interface OverpassTagsElement {
  type: string;
  id: number;
  bounds?: OverpassBounds;
  tags?: Record<string, string>;
}

interface OverpassGeomMember {
  type: string;
  geometry?: { lat: number; lon: number }[];
}

interface OverpassGeomElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  members?: OverpassGeomMember[];
}

async function runOverpass<T>(query: string): Promise<T[]> {
  let lastError: Error | null = null;
  for (const url of OVERPASS_MIRRORS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ data: query }).toString(),
          signal: controller.signal,
        });
        if (!res.ok) {
          // 429/5xx: naechster Versuch/Spiegel; andere Fehler abbrechen.
          if (res.status === 429 || res.status >= 500) {
            lastError = new Error(`Overpass HTTP ${res.status}`);
            await sleep(1000);
            continue;
          }
          throw new Error(`Overpass HTTP ${res.status}`);
        }
        const json = (await res.json()) as { elements?: T[] };
        return json.elements ?? [];
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      } finally {
        clearTimeout(timer);
      }
    }
  }
  throw lastError ?? new Error("Overpass nicht erreichbar");
}

const NETWORK_RANK: Record<string, number> = {
  iwn: 0,
  nwn: 1,
  rwn: 2,
  lwn: 3,
};

function rankOf(network: string | null): number {
  return NETWORK_RANK[network ?? ""] ?? 4;
}

/** Diagonale der Bounding Box in km (untere Schranke der Routenlaenge). */
function bboxDiagonalKm(b: OverpassBounds): number {
  return (
    haversineM(
      { lat: b.minlat, lng: b.minlon },
      { lat: b.maxlat, lng: b.maxlon },
    ) / 1000
  );
}

/** Verkettet die Wegstuecke einer Relation zu einer Punktliste (ohne Duplikate). */
function stitchGeometry(members: OverpassGeomMember[]): LatLng[] {
  const points: LatLng[] = [];
  for (const m of members) {
    if (m.type !== "way" || !m.geometry) continue;
    for (const g of m.geometry) {
      const last = points[points.length - 1];
      if (last && last.lat === g.lat && last.lng === g.lon) continue;
      points.push({ lat: g.lat, lng: g.lon });
    }
  }
  return points;
}

/**
 * Phase 1: leichter Index aller benannten Wanderrouten-Relationen eines Kantons
 * (nur Tags + Bounding Box). Klein und schnell, auch fuer >1000 Relationen.
 */
export async function fetchCantonRouteIndex(
  iso: string,
  log: Logger,
): Promise<RouteIndexEntry[]> {
  const query = [
    "[out:json][timeout:90];",
    `area["ISO3166-2"="${iso}"]->.a;`,
    'relation["route"="hiking"]["name"](area.a);',
    "out tags bb;",
  ].join("");
  const elements = await runOverpass<OverpassTagsElement>(query);
  const index: RouteIndexEntry[] = [];
  for (const e of elements) {
    const tags = e.tags ?? {};
    if (!tags.name || !e.bounds) continue;
    const network = tags.network ?? null;
    index.push({
      osmId: e.id,
      name: tags.name,
      ref: tags.ref ?? null,
      sac: tags.sac_scale ?? null,
      network,
      bboxDiagKm: bboxDiagonalKm(e.bounds),
      rank: rankOf(network),
    });
  }
  log.info({ iso, indexed: index.length }, "Overpass: Kanton-Index geladen");
  return index;
}

/**
 * Phase 2: Geometrie fuer eine Kandidatenauswahl nachladen und zu Punktlisten
 * verketten. Die Abfrage wird blockweise gestellt, damit sie das Overpass-Limit
 * nicht sprengt. Relationen, deren Geometrie sich nicht verketten laesst
 * (points.length < 2), entfallen.
 */
export async function fetchRouteGeometries(
  osmIds: number[],
  log: Logger,
): Promise<RawHikingRoute[]> {
  if (osmIds.length === 0) return [];
  const routes: RawHikingRoute[] = [];
  for (let i = 0; i < osmIds.length; i += GEOMETRY_BATCH) {
    const batch = osmIds.slice(i, i + GEOMETRY_BATCH);
    const query = [
      "[out:json][timeout:90];",
      `relation(id:${batch.join(",")});`,
      "out geom;",
    ].join("");
    const geom = await runOverpass<OverpassGeomElement>(query);
    for (const g of geom) {
      if (!g.members) continue;
      const points = stitchGeometry(g.members);
      if (points.length < 2) continue;
      const tags = g.tags ?? {};
      routes.push({
        id: `osm-${g.id}`,
        osmId: g.id,
        name: tags.name ?? `Wanderroute ${g.id}`,
        ref: tags.ref ?? null,
        sac: tags.sac_scale ?? null,
        network: tags.network ?? null,
        points,
      });
    }
  }
  log.info(
    { requested: osmIds.length, stitched: routes.length },
    "Overpass: Geometrie geladen",
  );
  return routes;
}
