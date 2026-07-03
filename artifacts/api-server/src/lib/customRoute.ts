import type { Logger } from "pino";
import { computeElevationStats } from "./elevation";
import { deriveSacFromSwissTlm3d } from "./swisstopoHiking";
import { deriveSeason } from "./season";
import { reverseGeocode } from "./geocoding";
import { downsample, estimateMinutes, pathDistanceKm, type LatLng } from "./geo";

/**
 * Berechnet eine Wanderroute zwischen zwei selbst gewaehlten Punkten (OSRM,
 * ohne API-Key, Profil "foot") und reichert sie mit denselben Quellen wie die
 * Kantonsrouten an (swisstopo-Hoehenmetern, SAC-Grad, Saison-Heuristik). Die
 * Route wird NICHT persistiert — jede Anfrage berechnet sie neu, denn Start/
 * Ziel sind frei waehlbar und nicht auf einen Kanton-Katalog begrenzt.
 */

const OSRM_URL = "https://router.project-osrm.org/route/v1/foot";
const USER_AGENT = "SagaTrail/1.0 (Swiss hiking companion)";
const STORED_GEOMETRY_POINTS = 80;
const MIN_KM = 0.3;
const MAX_KM = 60;

interface OsrmResponse {
  code?: string;
  routes?: {
    distance: number;
    geometry: { coordinates: [number, number][] };
  }[];
}

export class CustomRouteError extends Error {}

/** Baut einen deterministischen Bezeichner aus gerundeten Start-/Zielkoordinaten. */
function customRouteId(start: LatLng, end: LatLng): string {
  const r = (n: number) => n.toFixed(5);
  return `custom-${r(start.lat)}-${r(start.lng)}-${r(end.lat)}-${r(end.lng)}`;
}

export interface CustomRoute {
  id: string;
  sagaId: string;
  name: string;
  region: string;
  distanceKm: number;
  ascentM: number;
  maxElevationM: number;
  season: ReturnType<typeof deriveSeason>;
  minutes: number;
  sac: string;
  terrain: string;
  coordinates: LatLng;
  geometry: [number, number][];
  featured: boolean;
}

/**
 * Berechnet die Fussweg-Route zwischen `start` und `end` und reichert sie an.
 * Wirft `CustomRouteError`, wenn OSRM keine Route findet oder die Laenge
 * ausserhalb des sinnvollen Bereichs liegt (Router meldet dann 400).
 */
export async function buildCustomRoute(
  start: LatLng,
  end: LatLng,
  startLabel: string | undefined,
  endLabel: string | undefined,
  log: Logger,
): Promise<CustomRoute> {
  const url = `${OSRM_URL}/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`OSRM-Routing: HTTP-Fehler ${res.status}`);
  }
  const data = (await res.json()) as OsrmResponse;
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route) {
    throw new CustomRouteError(
      "Zwischen den gewaehlten Punkten wurde keine Route gefunden.",
    );
  }

  const points: LatLng[] = route.geometry.coordinates.map(([lng, lat]) => ({
    lat,
    lng,
  }));
  const distanceKm = pathDistanceKm(points);
  if (distanceKm < MIN_KM || distanceKm > MAX_KM) {
    throw new CustomRouteError(
      `Die Route ist mit ${distanceKm.toFixed(1)} km ausserhalb des sinnvollen Bereichs (${MIN_KM}-${MAX_KM} km).`,
    );
  }

  const [elevation, sac, startPlace, endPlace] = await Promise.all([
    computeElevationStats(points, log),
    deriveSacFromSwissTlm3d(points, log),
    startLabel ? Promise.resolve({ label: startLabel, canton: null }) : reverseGeocode(start.lat, start.lng, log),
    endLabel ? Promise.resolve({ label: endLabel }) : reverseGeocode(end.lat, end.lng, log),
  ]);

  const ascentM = elevation?.ascentM ?? 0;
  const maxElevationM = elevation?.maxElevationM ?? 0;
  const sacGrade = sac ?? "unbekannt";
  const region = startPlace.canton ?? "";
  const geometry: [number, number][] = downsample(points, STORED_GEOMETRY_POINTS).map(
    (p) => [p.lat, p.lng],
  );
  const shortLabel = (label: string) => label.split(",")[0]?.trim() || label;

  return {
    id: customRouteId(start, end),
    sagaId: customRouteId(start, end),
    name: `${shortLabel(startPlace.label)} → ${shortLabel(endPlace.label)}`,
    region,
    distanceKm: Math.round(distanceKm * 10) / 10,
    ascentM,
    maxElevationM,
    season: deriveSeason(maxElevationM, sacGrade),
    minutes: estimateMinutes(distanceKm, ascentM),
    sac: sacGrade,
    terrain: "Eigene Route",
    coordinates: start,
    geometry,
    featured: false,
  };
}
