/**
 * Partner-Leads: 2-stufig
 *
 * Stufe 1 – OSM via Overpass: 1 Query pro Kanton (Kantonsgebiet-Filter),
 *   dann Nähefilter auf Routen-Koordinaten aus external_routes.
 * Stufe 2 – Google Places Enrichment: nur für POIs ohne Telefon UND Website.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { CANTON_ISO } from "./cantonIso";

export interface PartnerLead {
  kanton: string;
  sprache: string;
  route: string;
  typ: string;
  name: string;
  adresse: string;
  telefon: string;
  website: string;
  googleMaps: string;
  quelle: "OSM" | "Google";
}

// ---------------------------------------------------------------------------
// Sprache
// ---------------------------------------------------------------------------

const CANTON_LANG: Record<string, string> = {
  "Aargau": "DE",
  "Appenzell Ausserrhoden": "DE",
  "Appenzell Innerrhoden": "DE",
  "Basel-Landschaft": "DE",
  "Basel-Stadt": "DE",
  "Genf": "FR",
  "Glarus": "DE",
  "Jura": "FR",
  "Luzern": "DE",
  "Neuenburg": "FR",
  "Nidwalden": "DE",
  "Obwalden": "DE",
  "Schaffhausen": "DE",
  "Schwyz": "DE",
  "Solothurn": "DE",
  "St. Gallen": "DE",
  "Tessin": "IT",
  "Thurgau": "DE",
  "Uri": "DE",
  "Waadt": "FR",
  "Zug": "DE",
  "Zürich": "DE",
};

function detectSprache(canton: string, lat: number, lng: number): string {
  switch (canton) {
    case "Wallis":   return lng > 7.53 ? "DE" : "FR";
    case "Bern":     return lng < 7.15 ? "FR" : "DE";
    case "Freiburg": return lng < 7.05 ? "FR" : "DE";
    case "Graubünden":
      if (lat < 46.4) return "IT";
      if (lng > 9.8)  return "RM";
      return "DE";
    default:
      return CANTON_LANG[canton] ?? "DE";
  }
}

// ---------------------------------------------------------------------------
// Haversine-Distanz (m)
// ---------------------------------------------------------------------------

function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(sin2));
}

// ---------------------------------------------------------------------------
// Overpass
// ---------------------------------------------------------------------------

const OVERPASS_PROXY_URL = process.env.OVERPASS_PROXY_URL?.trim() ?? "";
const OVERPASS_PROXY_TOKEN = process.env.OVERPASS_PROXY_TOKEN?.trim() ?? "";
const OVERPASS_MIRRORS = [
  ...(OVERPASS_PROXY_URL ? [OVERPASS_PROXY_URL] : []),
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const USER_AGENT = "SagaTrail/1.0 (Swiss hiking companion)";

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function runOverpass(query: string, timeoutMs = 30_000): Promise<OsmElement[]> {
  let lastError: Error | null = null;
  for (const url of OVERPASS_MIRRORS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
      };
      if (OVERPASS_PROXY_URL && url === OVERPASS_PROXY_URL && OVERPASS_PROXY_TOKEN) {
        headers["X-Proxy-Token"] = OVERPASS_PROXY_TOKEN;
      }
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: new URLSearchParams({ data: query }).toString(),
        signal: controller.signal,
      });
      if (!res.ok) {
        lastError = new Error(`Overpass HTTP ${res.status}`);
        await sleep(1000);
        continue;
      }
      const json = (await res.json()) as { elements?: OsmElement[] };
      return json.elements ?? [];
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error("Overpass nicht erreichbar");
}

/**
 * Batch-Query: alle Restaurants, Cafés und Unterkünfte im Umkreis von
 * mehreren Sagen-Koordinaten gleichzeitig (Union von around-Filtern).
 * Klein und schnell (500m Radius je Punkt) statt kantonsweiter Query.
 */
async function fetchPoiAroundSagas(
  points: { lat: number; lng: number }[],
  radiusM: number,
): Promise<OsmElement[]> {
  if (points.length === 0) return [];

  const arounds = points.map((p) => `around:${radiusM},${p.lat},${p.lng}`).join("|");

  // Für jeden Typ ein Union-Block mit allen Punkten
  const union = points.flatMap((p) => {
    const a = `around:${radiusM},${p.lat},${p.lng}`;
    return [
      `node["amenity"~"^(restaurant|cafe)$"]["name"](${a});`,
      `node["tourism"~"^(hotel|hostel|alpine_hut|wilderness_hut|guest_house)$"]["name"](${a});`,
      `way["amenity"~"^(restaurant|cafe)$"]["name"](${a});`,
      `way["tourism"~"^(hotel|hostel|alpine_hut|wilderness_hut|guest_house)$"]["name"](${a});`,
    ];
  });

  void arounds; // suppress unused warning

  const query = [
    "[out:json][timeout:30];",
    "(",
    ...union,
    ");",
    "out center tags;",
  ].join("");

  return runOverpass(query, 35_000);
}

function osmTypLabel(tags: Record<string, string>): string {
  const a = tags.amenity;
  const t = tags.tourism;
  if (a === "restaurant") return "Restaurant";
  if (a === "cafe") return "Café";
  if (t === "hotel") return "Hotel";
  if (t === "hostel") return "Hostel";
  if (t === "alpine_hut") return "Berghütte";
  if (t === "wilderness_hut") return "Wilderness Hut";
  if (t === "guest_house") return "Pension";
  return a ?? t ?? "Sonstiges";
}

// ---------------------------------------------------------------------------
// Google Places Enrichment
// ---------------------------------------------------------------------------

const PLACES_BASE = "https://maps.googleapis.com/maps/api/place";

async function googleFindPlace(
  name: string,
  lat: number,
  lng: number,
  apiKey: string,
): Promise<string | null> {
  const url =
    `${PLACES_BASE}/findplacefromtext/json` +
    `?input=${encodeURIComponent(name)}` +
    `&inputtype=textquery` +
    `&locationbias=circle:300@${lat},${lng}` +
    `&fields=place_id` +
    `&key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as {
      candidates?: { place_id: string }[];
      status: string;
    };
    return data.candidates?.[0]?.place_id ?? null;
  } catch {
    return null;
  }
}

async function googleDetails(
  placeId: string,
  apiKey: string,
): Promise<{ phone: string; website: string; mapsUrl: string } | null> {
  const fields = "formatted_phone_number,website,url";
  const url = `${PLACES_BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as {
      result?: { formatted_phone_number?: string; website?: string; url?: string };
      status: string;
    };
    if (!data.result) return null;
    return {
      phone: data.result.formatted_phone_number ?? "",
      website: data.result.website ?? "",
      mapsUrl: data.result.url ?? "",
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// DB laden: Sagas + Routen
// ---------------------------------------------------------------------------

interface DbSaga {
  id: string;
  canton: string;
  lat: number;
  lng: number;
}

interface DbRoute {
  id: string;
  name: string;
  canton: string;
  lat: number;
  lng: number;
  startLat: number | null;
  startLng: number | null;
  endLat: number | null;
  endLng: number | null;
}

async function loadSagas(): Promise<DbSaga[]> {
  const result = await db.execute(sql`
    SELECT id, canton, lat, lng
    FROM catalog_sagas
    WHERE lat IS NOT NULL AND lng IS NOT NULL
    ORDER BY canton
  `);
  return result.rows as unknown as DbSaga[];
}

async function loadRoutes(): Promise<DbRoute[]> {
  const result = await db.execute(sql`
    SELECT
      id, name, canton, lat, lng,
      (geometry->0->>0)::float  AS start_lat,
      (geometry->0->>1)::float  AS start_lng,
      (geometry->-1->>0)::float AS end_lat,
      (geometry->-1->>1)::float AS end_lng
    FROM external_routes
    WHERE lat IS NOT NULL AND lng IS NOT NULL
    ORDER BY canton, name
  `);
  return (result.rows as unknown as {
    id: string; name: string; canton: string;
    lat: number; lng: number;
    start_lat: number | null; start_lng: number | null;
    end_lat: number | null; end_lng: number | null;
  }[]).map((r) => ({
    id: r.id, name: r.name, canton: r.canton,
    lat: Number(r.lat), lng: Number(r.lng),
    startLat: r.start_lat != null ? Number(r.start_lat) : null,
    startLng: r.start_lng != null ? Number(r.start_lng) : null,
    endLat: r.end_lat != null ? Number(r.end_lat) : null,
    endLng: r.end_lng != null ? Number(r.end_lng) : null,
  }));
}

// ---------------------------------------------------------------------------
// Job-State (in-memory)
// ---------------------------------------------------------------------------

export type JobStatus = "idle" | "running" | "done" | "error";

export interface JobState {
  status: JobStatus;
  cantonsTotal: number;
  cantonesDone: number;
  leadsFound: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  error: string | null;
  csv: string | null;
}

export const jobState: JobState = {
  status: "idle",
  cantonsTotal: 0,
  cantonesDone: 0,
  leadsFound: 0,
  startedAt: null,
  finishedAt: null,
  error: null,
  csv: null,
};

// ---------------------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const SAGA_BATCH_SIZE = 5; // Sagen pro Overpass-Query

async function runExport(googleApiKey: string, radiusM: number): Promise<void> {
  const [sagas, routes] = await Promise.all([loadSagas(), loadRoutes()]);

  // Sagas in Batches aufteilen
  const batches: DbSaga[][] = [];
  for (let i = 0; i < sagas.length; i += SAGA_BATCH_SIZE) {
    batches.push(sagas.slice(i, i + SAGA_BATCH_SIZE));
  }

  jobState.cantonsTotal = batches.length;
  jobState.cantonesDone = 0;

  const seen = new Set<string>();
  const leads: PartnerLead[] = [];

  for (const batch of batches) {
    const points = batch.map((s) => ({ lat: s.lat, lng: s.lng }));

    let elements: OsmElement[];
    try {
      elements = await fetchPoiAroundSagas(points, radiusM);
    } catch {
      elements = [];
    }

    for (const el of elements) {
      const osmKey = `${el.type}-${el.id}`;
      if (seen.has(osmKey)) continue;

      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (lat == null || lng == null) continue;

      const tags = el.tags ?? {};
      const name = tags.name;
      if (!name) continue;

      // Nächste Route über Mitte, Start UND Ende suchen
      let nearestRoute: DbRoute | undefined;
      let nearestDist = Infinity;
      for (const r of routes) {
        const pts: { lat: number; lng: number }[] = [{ lat: r.lat, lng: r.lng }];
        if (r.startLat != null && r.startLng != null) pts.push({ lat: r.startLat, lng: r.startLng });
        if (r.endLat != null && r.endLng != null)   pts.push({ lat: r.endLat,   lng: r.endLng   });
        const d = Math.min(...pts.map((p) => haversineM({ lat, lng }, p)));
        if (d < nearestDist) { nearestDist = d; nearestRoute = r; }
      }
      if (!nearestRoute || nearestDist > radiusM * 3) continue;

      // Kanton aus nächster Saga des Batches ableiten
      let canton = nearestRoute.canton ?? "Unbekannt";
      // Feinabgleich: welche Saga aus dem Batch ist am nächsten?
      let sagaCanton = canton;
      let sagaDist = Infinity;
      for (const s of batch) {
        const d = haversineM({ lat, lng }, { lat: s.lat, lng: s.lng });
        if (d < sagaDist) { sagaDist = d; sagaCanton = s.canton; }
      }
      if (sagaDist <= radiusM) canton = sagaCanton;

      seen.add(osmKey);

      const sprache = detectSprache(canton, lat, lng);
      const telefon = tags.phone ?? tags["contact:phone"] ?? "";
      const website = tags.website ?? tags["contact:website"] ?? tags.url ?? "";
      const adresse = [
        tags["addr:street"],
        tags["addr:housenumber"],
        tags["addr:city"],
      ]
        .filter(Boolean)
        .join(" ");

      let finalTelefon = telefon;
      let finalWebsite = website;
      let finalMapsUrl = "";
      let quelle: "OSM" | "Google" = "OSM";

      if (!telefon && !website && googleApiKey) {
        await sleep(50);
        const placeId = await googleFindPlace(name, lat, lng, googleApiKey);
        if (placeId) {
          const details = await googleDetails(placeId, googleApiKey);
          if (details) {
            finalTelefon = details.phone;
            finalWebsite = details.website;
            finalMapsUrl = details.mapsUrl;
            quelle = "Google";
          }
        }
      }

      leads.push({
        kanton: canton,
        sprache,
        route: nearestRoute.name,
        typ: osmTypLabel(tags),
        name,
        adresse,
        telefon: finalTelefon,
        website: finalWebsite,
        googleMaps: finalMapsUrl,
        quelle,
      });

      jobState.leadsFound = leads.length;
    }

    jobState.cantonesDone++;
    await sleep(200);
  }

  jobState.csv = leadsToCSV(leads);
  jobState.status = "done";
  jobState.finishedAt = new Date();
}

/** Startet den Export im Hintergrund (non-blocking). */
export function startPartnerLeadsExport(googleApiKey: string, radiusM = 500): void {
  if (jobState.status === "running") return;
  jobState.status = "running";
  jobState.startedAt = new Date();
  jobState.finishedAt = null;
  jobState.error = null;
  jobState.csv = null;
  jobState.cantonesDone = 0;
  jobState.leadsFound = 0;

  runExport(googleApiKey, radiusM).catch((err) => {
    jobState.status = "error";
    jobState.error = err instanceof Error ? err.message : String(err);
    jobState.finishedAt = new Date();
  });
}

export function leadsToCSV(leads: PartnerLead[]): string {
  const header = "Kanton;Sprache;Route;Typ;Name;Adresse;Telefon;Website;Google Maps;Quelle";
  const rows = leads.map((l) =>
    [
      l.kanton, l.sprache, l.route, l.typ, l.name,
      l.adresse, l.telefon, l.website, l.googleMaps, l.quelle,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";"),
  );
  return [header, ...rows].join("\n");
}
