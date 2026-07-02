import type { Logger } from "pino";
import type { LatLng } from "./geo";

/**
 * Laedt reale Wanderrouten je Kanton aus OpenStreetMap ueber die Overpass-API.
 *
 * Vorgehen zweiphasig, um Last und Antwortgroesse zu begrenzen:
 *  1. Nur Tags aller benannten Wanderrouten-Relationen im Kanton holen und die
 *     relevantesten auswaehlen (amtliches Wanderwegnetz zuerst: iwn/nwn/rwn/lwn,
 *     bevorzugt mit Nummer/ref).
 *  2. Fuer die Auswahl die Geometrie (out geom) nachladen.
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RawHikingRoute {
  id: string;
  osmId: number;
  name: string;
  ref: string | null;
  sac: string | null;
  network: string | null;
  points: LatLng[];
}

interface OverpassTagsElement {
  type: string;
  id: number;
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

function rankOf(tags: Record<string, string>): number {
  const net = tags.network ?? "";
  return NETWORK_RANK[net] ?? 4;
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

export async function fetchCantonHikingRoutes(
  iso: string,
  log: Logger,
  limit = 16,
): Promise<RawHikingRoute[]> {
  // Phase 1: benannte Wanderrouten-Relationen (nur Tags).
  const tagsQuery = [
    "[out:json][timeout:90];",
    `area["ISO3166-2"="${iso}"]->.a;`,
    'relation["route"="hiking"]["name"](area.a);',
    "out tags;",
  ].join("");
  const tagged = await runOverpass<OverpassTagsElement>(tagsQuery);
  log.info({ iso, found: tagged.length }, "Overpass: benannte Routen gefunden");

  const candidates = tagged
    .filter((e) => e.tags?.name)
    .sort((a, b) => {
      const ra = rankOf(a.tags ?? {});
      const rb = rankOf(b.tags ?? {});
      if (ra !== rb) return ra - rb;
      const refA = a.tags?.ref ? 0 : 1;
      const refB = b.tags?.ref ? 0 : 1;
      if (refA !== refB) return refA - refB;
      return (a.tags?.name ?? "").localeCompare(b.tags?.name ?? "", "de");
    })
    .slice(0, limit);

  if (candidates.length === 0) return [];

  // Phase 2: Geometrie fuer die Auswahl nachladen.
  const ids = candidates.map((c) => c.id).join(",");
  const geomQuery = [
    "[out:json][timeout:90];",
    `relation(id:${ids});`,
    "out geom;",
  ].join("");
  const geom = await runOverpass<OverpassGeomElement>(geomQuery);
  const byId = new Map(geom.map((g) => [g.id, g]));

  const routes: RawHikingRoute[] = [];
  for (const c of candidates) {
    const g = byId.get(c.id);
    if (!g?.members) continue;
    const points = stitchGeometry(g.members);
    if (points.length < 2) continue;
    const tags = c.tags ?? {};
    routes.push({
      id: `osm-${c.id}`,
      osmId: c.id,
      name: tags.name ?? `Wanderroute ${c.id}`,
      ref: tags.ref ?? null,
      sac: tags.sac_scale ?? null,
      network: tags.network ?? null,
      points,
    });
  }
  return routes;
}
