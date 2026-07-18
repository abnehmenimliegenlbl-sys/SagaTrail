import { Router, type IRouter } from "express";
import { GetCantonRoutesResponse } from "@workspace/api-zod";
import type { ExternalRouteRow } from "@workspace/db";
import { getCantonRoutes } from "../lib/routeService";
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
function byRelevance(a: ExternalRouteRow, b: ExternalRouteRow): number {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  const refA = a.ref ? 0 : 1;
  const refB = b.ref ? 0 : 1;
  if (refA !== refB) return refA - refB;
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
    const rows = await getCantonRoutes(canton, req.log, filter.distMax ?? undefined);
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
