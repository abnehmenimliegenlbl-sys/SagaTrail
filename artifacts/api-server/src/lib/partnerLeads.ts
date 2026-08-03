/**
 * Partner-Leads: 2-stufig
 *
 * Stufe 1 – OSM via Overpass: Punkte entlang der Routen-Geometrie
 *   (Sampling alle ~800m), dann Proximity-Filter auf Route-Koordinaten.
 * Stufe 2 – Google Places Enrichment: nur für POIs ohne Telefon UND Website.
 *
 * Bereits in der partners-Tabelle vorhandene Betriebe und Betriebe
 * aus dem partner_email_log / partner_email_blocklist werden
 * automatisch ausgeschlossen.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { CANTON_ISO } from "./cantonIso";
import { upsertLeadsToDb } from "./leadMailer";

export interface PartnerLead {
  kanton: string;
  sprache: string;
  route: string;
  routeId?: string;
  osmId?: string;
  typ: string;
  kategorie?: string;
  tier?: "Top" | "Mid+" | "Mid" | "Low";
  name: string;
  adresse: string;
  telefon: string;
  website: string;
  email?: string;
  googleMaps: string;
  lat?: number;
  lng?: number;
  quelle: "OSM" | "Google";
}

/** Leitet eine grobe Kategorie aus dem OSM-Typ ab. */
function detectKategorie(tags: Record<string, string>): string {
  const am = tags.amenity ?? "";
  const sh = tags.shop ?? "";
  const to = tags.tourism ?? "";
  const ae = tags.aerialway ?? "";
  if (ae) return "Transport";
  if (["restaurant", "cafe", "bar", "fast_food", "biergarten"].includes(am)) return "F+B";
  if (["hotel", "hostel", "guest_house", "alpine_hut", "chalet"].includes(am) ||
      ["hotel", "hostel", "guest_house", "alpine_hut"].includes(to)) return "Herberge";
  if (["outdoor", "sports", "ski", "gift"].includes(sh)) return "Ausrüstung";
  if (am === "shelter" || to === "viewpoint") return "Attraktion";
  return "Sonstiges";
}

/** Schätzt die Lead-Qualität anhand verfügbarer Kontaktdaten. */
function detectTier(email: string, website: string, websiteFromGoogle: boolean): "Top" | "Mid+" | "Mid" | "Low" {
  const hasEmail = email.trim().length > 0;
  const hasWeb   = website.trim().length > 0;
  if (hasEmail && hasWeb)  return "Top";
  if (!hasEmail && hasWeb) return websiteFromGoogle ? "Mid+" : "Mid";
  return "Low";
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
// Routen-Geometrie samplen (alle ~sampleDistM Meter ein Punkt)
// ---------------------------------------------------------------------------

type GeoPoint = [number, number] | { lat: number; lng: number };

function toLatLng(p: GeoPoint): { lat: number; lng: number } {
  if (Array.isArray(p)) return { lat: p[0], lng: p[1] };
  return p as { lat: number; lng: number };
}

function sampleGeometryPoints(
  geom: GeoPoint[],
  sampleDistM = 800,
): { lat: number; lng: number }[] {
  if (!geom || geom.length === 0) return [];
  const pts = geom.map(toLatLng);
  const result: { lat: number; lng: number }[] = [pts[0]];
  let distSinceSample = 0;

  for (let i = 1; i < pts.length; i++) {
    distSinceSample += haversineM(pts[i - 1], pts[i]);
    if (distSinceSample >= sampleDistM) {
      result.push(pts[i]);
      distSinceSample = 0;
    }
  }

  const last = pts[pts.length - 1];
  if (result[result.length - 1] !== last) result.push(last);

  return result;
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

async function runOverpass(query: string, timeoutMs = 45_000): Promise<OsmElement[]> {
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
 * mehreren Routen-Sampling-Punkten gleichzeitig.
 * Max 8 Punkte pro Query (Overpass-Limit beachten).
 */
async function fetchPoiAroundPoints(
  points: { lat: number; lng: number }[],
  radiusM: number,
): Promise<OsmElement[]> {
  if (points.length === 0) return [];

  const union = points.flatMap((p) => {
    const a = `around:${radiusM},${p.lat},${p.lng}`;
    return [
      `node["amenity"~"^(restaurant|cafe)$"]["name"](${a});`,
      `node["tourism"~"^(hotel|hostel|alpine_hut|wilderness_hut|guest_house)$"]["name"](${a});`,
      `way["amenity"~"^(restaurant|cafe)$"]["name"](${a});`,
      `way["tourism"~"^(hotel|hostel|alpine_hut|wilderness_hut|guest_house)$"]["name"](${a});`,
      // #28: Bergbahnen (cable cars, gondolas, chair lifts)
      `node["aerialway"~"^(cable_car|gondola|chair_lift)$"]["name"](${a});`,
      `way["aerialway"~"^(cable_car|gondola|chair_lift)$"]["name"](${a});`,
      // #28: Outdoor- & Sportgeschäfte
      `node["shop"~"^(outdoor|sports|ski|gift)$"]["name"](${a});`,
      `way["shop"~"^(outdoor|sports|ski|gift)$"]["name"](${a});`,
    ];
  });

  const query = [
    "[out:json][timeout:40];",
    "(",
    ...union,
    ");",
    "out center tags;",
  ].join("");

  return runOverpass(query, 50_000);
}

function osmTypLabel(tags: Record<string, string>): string {
  const a = tags.amenity;
  const t = tags.tourism;
  const aw = tags.aerialway;
  const sh = tags.shop;
  if (a === "restaurant") return "Restaurant";
  if (a === "cafe") return "Café";
  if (t === "hotel") return "Hotel";
  if (t === "hostel") return "Hostel";
  if (t === "alpine_hut") return "Berghütte";
  if (t === "wilderness_hut") return "Wilderness Hut";
  if (t === "guest_house") return "Pension";
  // #28: Bergbahnen
  if (aw === "cable_car") return "Seilbahn";
  if (aw === "gondola") return "Gondelbahn";
  if (aw === "chair_lift") return "Sessellift";
  // #28: Outdoor-/Sportgeschäfte
  if (sh === "outdoor") return "Outdoor-Shop";
  if (sh === "sports") return "Sportgeschäft";
  if (sh === "gift") return "Souvenirladen";
  if (sh === "ski") return "Ski-Shop";
  return a ?? t ?? aw ?? sh ?? "Sonstiges";
}

// ---------------------------------------------------------------------------
// Google Places Enrichment (optional – nur wenn API-Key vorhanden)
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
// DB laden: Routen mit Geometrie
// ---------------------------------------------------------------------------

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
  geometry: GeoPoint[] | null;
}

async function loadRoutes(): Promise<DbRoute[]> {
  const result = await db.execute(sql`
    SELECT id, name, canton, lat, lng, geometry
    FROM external_routes
    WHERE lat IS NOT NULL AND lng IS NOT NULL
    ORDER BY canton, name
  `);
  return (result.rows as unknown as {
    id: string; name: string; canton: string;
    lat: number; lng: number;
    geometry: unknown;
  }[]).map((r) => {
    const geom = Array.isArray(r.geometry) ? r.geometry as GeoPoint[] : null;
    const first = geom?.[0] != null ? toLatLng(geom[0]) : null;
    const last  = geom?.length     ? toLatLng(geom[geom.length - 1]) : null;
    return {
      id: r.id, name: r.name, canton: r.canton,
      lat: Number(r.lat), lng: Number(r.lng),
      startLat: first?.lat ?? null,
      startLng: first?.lng ?? null,
      endLat:   last?.lat  ?? null,
      endLng:   last?.lng  ?? null,
      geometry: geom,
    };
  });
}

// ---------------------------------------------------------------------------
// Bereits vorhandene Partner & kontaktierte E-Mails laden
// ---------------------------------------------------------------------------

interface ExistingPartner {
  name: string;
  websiteDomain: string;
}

async function loadExistingPartners(): Promise<ExistingPartner[]> {
  const result = await db.execute(sql`
    SELECT name, COALESCE(website_url, '') AS website_url
    FROM partners
  `);
  return (result.rows as Array<{ name: string; website_url: string }>).map((r) => ({
    name: r.name.toLowerCase().trim(),
    websiteDomain: extractDomain(r.website_url),
  }));
}

async function loadContactedWebsites(): Promise<Set<string>> {
  const result = await db.execute(sql`
    SELECT DISTINCT el.email
    FROM partner_email_log el
    WHERE el.status = 'ok'
    UNION
    SELECT email FROM partner_email_blocklist
  `);
  return new Set(
    (result.rows as Array<{ email: string }>).map((r) => r.email.toLowerCase()),
  );
}

function extractDomain(url: string): string {
  if (!url) return "";
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

function isExistingPartner(
  name: string,
  website: string,
  existing: ExistingPartner[],
): boolean {
  const normName = name.toLowerCase().trim();
  const domain = extractDomain(website);
  for (const p of existing) {
    if (p.name === normName) return true;
    if (domain && p.websiteDomain && domain === p.websiteDomain) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Job-State (in-memory)
// ---------------------------------------------------------------------------

export type JobStatus = "idle" | "running" | "done" | "error";

export interface TierCounts {
  Top: number;
  "Mid+": number;
  Mid: number;
  Low: number;
}

export interface EmailScrapeState {
  total: number;   // Leads mit Website aber ohne E-Mail (Kandidaten)
  done:  number;   // bereits geprüft
  found: number;   // E-Mails erfolgreich gefunden
}

export interface JobState {
  status: JobStatus;
  stopRequested: boolean;
  cantonsTotal: number;
  cantonesDone: number;
  leadsFound: number;
  excluded: number;
  tierCounts: TierCounts;
  emailScrape: EmailScrapeState;
  startedAt: Date | null;
  finishedAt: Date | null;
  error: string | null;
  csv: string | null;
  /** Erste 100 Leads zur Vorschau im Admin-Dashboard */
  preview: PartnerLead[];
}

export const jobState: JobState = {
  status: "idle",
  stopRequested: false,
  cantonsTotal: 0,
  cantonesDone: 0,
  leadsFound: 0,
  excluded: 0,
  tierCounts: { Top: 0, "Mid+": 0, Mid: 0, Low: 0 },
  emailScrape: { total: 0, done: 0, found: 0 },
  startedAt: null,
  finishedAt: null,
  error: null,
  csv: null,
  preview: [],
};

// ---------------------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// E-Mail-Scraper (parallel zum OSM-Export)
// ---------------------------------------------------------------------------

async function scrapeEmailFromWebsite(url: string): Promise<string> {
  if (!url) return "";
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SagaTrailBot/1.0)" },
    });
    if (!r.ok) return "";
    const html = await r.text();
    const mailto = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
    if (mailto) return mailto[1].toLowerCase();
    const plain = html.replace(/<[^>]+>/g, " ");
    const match = plain.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (match) return match[0].toLowerCase();
  } catch { /* Timeout oder Netzwerkfehler */ }
  return "";
}

/** Scraped E-Mails für alle Leads im Batch die eine Website aber keine E-Mail haben.
 *  Läuft fire-and-forget parallel zur Hauptsuche. */
async function scrapeEmailsBatchAsync(leads: PartnerLead[]): Promise<void> {
  const candidates = leads.filter((l) => l.website && !l.email && l.osmId);
  jobState.emailScrape.total += candidates.length;

  for (const lead of candidates) {
    // Abbrechen wenn Job gestoppt
    if (jobState.status === "idle") break;

    const email = await scrapeEmailFromWebsite(lead.website);
    jobState.emailScrape.done++;

    if (email) {
      jobState.emailScrape.found++;
      lead.email = email;

      // Nur E-Mail in DB schreiben — Tier bleibt unverändert
      db.execute(sql`
        UPDATE partner_leads
        SET email = ${email}
        WHERE osm_id = ${lead.osmId!} AND (email IS NULL OR email = '')
      `).catch(() => { /* ignoriere */ });
    }
    await sleep(80);
  }
}

/**
 * Fasst alle Routen-Sampling-Punkte in Batches zusammen.
 * Je Batch wird eine Overpass-Query mit BATCH_SIZE Punkten gesendet.
 */
const POINT_BATCH_SIZE = 8; // Punkte pro Overpass-Query

async function runExport(googleApiKey: string, radiusM: number): Promise<void> {
  // Routen laden (mit Geometrie)
  const routes = await loadRoutes();

  // Bestehende Partner und bereits kontaktierte E-Mails laden
  const [existingPartners, contactedEmails] = await Promise.all([
    loadExistingPartners(),
    loadContactedWebsites(),
  ]);

  // Alle Sampling-Punkte aus Routen-Geometrien erzeugen
  // Jeder Punkt trägt die Route-ID mit sich
  const allPoints: { lat: number; lng: number; routeId: string }[] = [];
  for (const route of routes) {
    const geomPts = route.geometry ? sampleGeometryPoints(route.geometry, 800) : [];
    // Fallback: Mitte, Start, Ende wenn keine Geometrie
    if (geomPts.length === 0) {
      geomPts.push({ lat: route.lat, lng: route.lng });
      if (route.startLat != null && route.startLng != null)
        geomPts.push({ lat: route.startLat, lng: route.startLng });
      if (route.endLat != null && route.endLng != null)
        geomPts.push({ lat: route.endLat, lng: route.endLng });
    }
    for (const pt of geomPts) {
      allPoints.push({ lat: pt.lat, lng: pt.lng, routeId: route.id });
    }
  }

  // Punkte in Batches aufteilen
  const batches: { lat: number; lng: number; routeId: string }[][] = [];
  for (let i = 0; i < allPoints.length; i += POINT_BATCH_SIZE) {
    batches.push(allPoints.slice(i, i + POINT_BATCH_SIZE));
  }

  // Route-Lookup nach ID
  const routeById = new Map(routes.map((r) => [r.id, r]));

  jobState.cantonsTotal = batches.length;
  jobState.cantonesDone = 0;
  jobState.excluded = 0;
  jobState.stopRequested = false;
  jobState.tierCounts = { Top: 0, "Mid+": 0, Mid: 0, Low: 0 };
  jobState.emailScrape = { total: 0, done: 0, found: 0 };

  const seen = new Set<string>();
  const leads: PartnerLead[] = [];
  let savedCursor = 0; // wie viele Leads bereits in die DB geschrieben wurden

  for (const batch of batches) {
    if (jobState.stopRequested) {
      jobState.status = "done";
      jobState.finishedAt = new Date();
      break;
    }

    const points = batch.map((p) => ({ lat: p.lat, lng: p.lng }));

    let elements: OsmElement[];
    try {
      elements = await fetchPoiAroundPoints(points, radiusM);
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

      // Nächste Route über alle Punkte im Batch suchen
      let nearestRoute: DbRoute | undefined;
      let nearestDist = Infinity;
      for (const bp of batch) {
        const d = haversineM({ lat, lng }, { lat: bp.lat, lng: bp.lng });
        if (d < nearestDist) {
          nearestDist = d;
          nearestRoute = routeById.get(bp.routeId);
        }
      }
      // Auch Routen-Mitte/Start/Ende prüfen für korrekte Zuordnung
      if (!nearestRoute || nearestDist > radiusM * 2) {
        for (const r of routes) {
          const pts: { lat: number; lng: number }[] = [{ lat: r.lat, lng: r.lng }];
          if (r.startLat != null && r.startLng != null) pts.push({ lat: r.startLat, lng: r.startLng });
          if (r.endLat != null && r.endLng != null)   pts.push({ lat: r.endLat,   lng: r.endLng   });
          const d = Math.min(...pts.map((p) => haversineM({ lat, lng }, p)));
          if (d < nearestDist) { nearestDist = d; nearestRoute = r; }
        }
      }
      if (!nearestRoute || nearestDist > radiusM * 2) continue;

      const telefon = tags.phone ?? tags["contact:phone"] ?? "";
      const website = tags.website ?? tags["contact:website"] ?? tags.url ?? "";
      const osmEmail = tags.email ?? tags["contact:email"] ?? "";

      // Bereits vorhandene Partner ausschließen
      if (isExistingPartner(name, website, existingPartners)) {
        seen.add(osmKey);
        jobState.excluded++;
        continue;
      }

      // Bereits kontaktierte E-Mail-Domain ausschließen
      const domain = extractDomain(website);
      if (domain) {
        let alreadyContacted = false;
        for (const email of contactedEmails) {
          if (email.endsWith("@" + domain) || email.includes(domain)) {
            alreadyContacted = true;
            break;
          }
        }
        if (alreadyContacted) {
          seen.add(osmKey);
          jobState.excluded++;
          continue;
        }
      }

      seen.add(osmKey);

      const canton = nearestRoute.canton ?? "Unbekannt";
      const sprache = detectSprache(canton, lat, lng);
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

      const typLabel = osmTypLabel(tags);
      const tier = detectTier(osmEmail, finalWebsite, quelle === "Google");
      leads.push({
        kanton: canton,
        sprache,
        route: nearestRoute.name,
        routeId: nearestRoute.id,
        osmId: String(el.id),
        typ: typLabel,
        kategorie: detectKategorie(tags),
        tier,
        name,
        adresse,
        telefon: finalTelefon,
        website: finalWebsite,
        email: osmEmail,
        googleMaps: finalMapsUrl,
        lat,
        lng,
        quelle,
      });

      jobState.leadsFound = leads.length;
      jobState.tierCounts[tier] = (jobState.tierCounts[tier] ?? 0) + 1;
    }

    jobState.cantonesDone++;

    // Vorschau aktualisieren (max. 100 Einträge)
    jobState.preview = leads.slice(0, 100);

    // Neu gefundene Leads dieses Batches automatisch in DB schreiben
    const newLeads = leads.slice(savedCursor);
    if (newLeads.length > 0) {
      const rows = newLeads.map((l) => ({
        quelle: l.quelle === "Google" ? ("osm" as const) : ("osm" as const),
        osmId: l.osmId,
        name: l.name,
        email: l.email ?? null,
        kanton: l.kanton,
        sprache: l.sprache,
        route: l.route,
        routeId: l.routeId,
        typ: l.typ,
        kategorie: l.kategorie,
        tier: l.tier,
        adresse: l.adresse,
        telefon: l.telefon,
        website: l.website,
        lat: l.lat,
        lng: l.lng,
      }));
      upsertLeadsToDb(rows).catch(() => { /* ignoriere Fehler – nächster Batch */ });
      // E-Mail-Scraping parallel starten (fire-and-forget)
      scrapeEmailsBatchAsync(newLeads);
      savedCursor = leads.length;
    }

    await sleep(150);
  }

  jobState.csv = leadsToCSV(leads);
  jobState.preview = leads.slice(0, 100);
  jobState.status = "done";
  jobState.finishedAt = new Date();
}

/** Startet den Export im Hintergrund (non-blocking). */
export function startPartnerLeadsExport(googleApiKey: string, radiusM = 400): void {
  if (jobState.status === "running") return;
  jobState.status = "running";
  jobState.startedAt = new Date();
  jobState.finishedAt = null;
  jobState.error = null;
  jobState.csv = null;
  jobState.cantonesDone = 0;
  jobState.leadsFound = 0;
  jobState.excluded = 0;
  jobState.preview = [];

  runExport(googleApiKey, radiusM).catch((err) => {
    jobState.status = "error";
    jobState.error = err instanceof Error ? err.message : String(err);
    jobState.finishedAt = new Date();
  });
}

export function leadsToCSV(leads: PartnerLead[]): string {
  const header = "Kanton;Sprache;Route;Route-ID;OSM-ID;Typ;Kategorie;Tier;Name;Adresse;Telefon;Website;Google Maps;Lat;Lng;Quelle";
  const rows = leads.map((l) =>
    [
      l.kanton, l.sprache, l.route, l.routeId ?? "", l.osmId ?? "",
      l.typ, l.kategorie ?? "", l.tier ?? "", l.name,
      l.adresse, l.telefon, l.website, l.googleMaps,
      l.lat ?? "", l.lng ?? "", l.quelle,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(";"),
  );
  return [header, ...rows].join("\n");
}
