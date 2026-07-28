import { Router, type IRouter } from "express";
import { GetCantonRoutesResponse } from "@workspace/api-zod";
import type { ExternalRouteRow } from "@workspace/db";
import { loadCachedRoutes } from "../lib/routeService";
import { deriveSeason } from "../lib/season";
import { haversineM } from "../lib/geo";

const router: IRouter = Router();

// Kein Deckel — alle gefilterten Routen werden zurueckgegeben.
const RESULT_LIMIT = Infinity;

/**
 * Sortiert Treffer nach Relevanz, damit der RESULT_LIMIT-Deckel die
 * aussagekraeftigsten Routen behaelt: amtlich nummerierte Wanderland-Routen
 * (mit `ref`) zuerst, danach alphabetisch.
 */
/**
 * Sortier-Rangfolge:
 * 1. nationale Routen (1-stellige Nummer), 2. deren Etappen,
 * 3. regionale Routen (2-stellig), 4. deren Etappen,
 * 5. lokale Routen (3-stellig), 6. deren Etappen,
 * 7. kantonale Routen (K-Nummern), 8. Rest.
 * Innerhalb jeder Kategorie nach Routen-Nummer, Etappen zusätzlich
 * nach Etappen-Nummer.
 */
function sortSchluessel(row: ExternalRouteRow): [number, number, number] {
  const ref = row.ref ?? "";
  const istEtappe = /\b(?:etappe|étape|etape|tappa)\b/i.test(row.name);
  const etappenNr = istEtappe
    ? parseInt(row.name.match(/\b(?:Etappe|Étape|Etape|Tappa)\s+(\d+)/i)?.[1] ?? "0", 10)
    : 0;

  if (/^\d+$/.test(ref)) {
    const nr = parseInt(ref, 10);
    const stufe = ref.length === 1 ? 0 : ref.length === 2 ? 2 : 4; // national/regional/lokal
    return [stufe + (istEtappe ? 1 : 0), nr, etappenNr];
  }
  if (/^K\d+$/.test(ref)) {
    return [6, parseInt(ref.slice(1), 10), 0];
  }
  return [7, 0, 0];
}

function byRelevance(a: ExternalRouteRow, b: ExternalRouteRow): number {
  const ka = sortSchluessel(a);
  const kb = sortSchluessel(b);
  if (ka[0] !== kb[0]) return ka[0] - kb[0];
  if (ka[1] !== kb[1]) return ka[1] - kb[1];
  if (ka[2] !== kb[2]) return ka[2] - kb[2];
  return a.name.localeCompare(b.name, "de");
}

function toRoute(row: ExternalRouteRow) {
  return {
    id: row.id,
    sagaId: row.sagaId,
    name: row.name,
    region: row.canton,
    distanceKm: row.distanceKm,
    ascentM: row.ascentM,
    maxElevationM: row.maxElevationM,
    season: deriveSeason(row.maxElevationM, row.sac),
    minutes: row.minutes,
    sac: row.sac,
    terrain: row.terrain,
    coordinates: { lat: row.lat, lng: row.lng },
    geometry: row.geometry,
    featured: row.featured,
    photoUrl: row.photoUrl ?? null,
    photoAttribution: row.photoAttribution ?? null,
    description: row.description ?? null,
    descriptionSource: row.descriptionSource ?? null,
  };
}

/** Liest den SAC-Grad (T1–T6) aus einem Routen-Feld; null bei "unbekannt". */
function sacStufe(sac: string): number | null {
  const m = /T\s*([1-6])/i.exec(sac);
  return m ? Number(m[1]) : null;
}

/** Liest eine optionale numerische Query-Grenze; null bei fehlend/ungueltig. */
function numParam(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Liest einen optionalen Boolean-Query-Parameter; null bei fehlend/ungueltig. */
function boolParam(value: unknown): boolean | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null || raw === "") return null;
  return raw === "true" || raw === "1";
}

interface RouteFilter {
  distMin: number | null;
  distMax: number | null;
  ascMin: number | null;
  ascMax: number | null;
  diffMin: number | null;
  diffMax: number | null;
  ganzjaehrigNur: boolean | null;
  nearLat: number | null;
  nearLng: number | null;
}

/**
 * Grenzt die Routen anhand der Filter ein. Distanz- und Hoehenmeter-Grenzen sind
 * nach oben offen, wenn keine Obergrenze uebergeben wird. Sobald eine
 * Schwierigkeitsgrenze gesetzt ist, entfallen Routen mit unbekanntem SAC-Grad.
 */
function applyFilter(row: ExternalRouteRow, f: RouteFilter): boolean {
  if (f.distMin !== null && row.distanceKm < f.distMin) return false;
  if (f.distMax !== null && row.distanceKm > f.distMax) return false;
  if (f.ascMin !== null && row.ascentM < f.ascMin) return false;
  if (f.ascMax !== null && row.ascentM > f.ascMax) return false;
  if (f.diffMin !== null || f.diffMax !== null) {
    const stufe = sacStufe(row.sac);
    if (stufe === null) return false; // unbekannter Grad bei aktivem Filter raus
    if (f.diffMin !== null && stufe < f.diffMin) return false;
    if (f.diffMax !== null && stufe > f.diffMax) return false;
  }
  if (f.ganzjaehrigNur === true) {
    const season = deriveSeason(row.maxElevationM, row.sac);
    if (season !== "ganzjaehrig") return false;
  }
  return true;
}

router.get("/cantons/:canton/routes", async (req, res): Promise<void> => {
  const canton = Array.isArray(req.params.canton)
    ? req.params.canton[0]
    : req.params.canton;
  const filter: RouteFilter = {
    distMin: numParam(req.query.distMin),
    distMax: numParam(req.query.distMax),
    ascMin: numParam(req.query.ascMin),
    ascMax: numParam(req.query.ascMax),
    diffMin: numParam(req.query.diffMin),
    diffMax: numParam(req.query.diffMax),
    ganzjaehrigNur: boolParam(req.query.ganzjaehrigNur),
    nearLat: numParam(req.query.nearLat),
    nearLng: numParam(req.query.nearLng),
  };
  try {
    const rows = await loadCachedRoutes(canton);
    const userPos =
      filter.nearLat !== null && filter.nearLng !== null
        ? { lat: filter.nearLat, lng: filter.nearLng }
        : null;
    const matched = rows
      .filter((row) => applyFilter(row, filter))
      .sort(userPos
        ? (a, b) =>
            haversineM({ lat: a.lat, lng: a.lng }, userPos) -
            haversineM({ lat: b.lat, lng: b.lng }, userPos)
        : byRelevance)
      .slice(0, RESULT_LIMIT);
    res.json(GetCantonRoutesResponse.parse(matched.map(toRoute)));
  } catch (err) {
    req.log.error({ err, canton }, "Kanton-Routen konnten nicht geladen werden");
    res.status(502).json({ error: "Routen konnten nicht geladen werden" });
  }
});

export default router;
