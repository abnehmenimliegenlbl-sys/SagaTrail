import { HikingRoute } from "../constants/routes";
import { LatLng, Saga } from "../types";

/**
 * Zuordnung von Wanderrouten zu kuratierten, gemeinfrei belegten Sagen.
 *
 * SagaTrail erfindet keine Sagen mehr. Jede Route bekommt die naechstgelegene
 * dokumentierte Regionalsage. Liegt keine Sage exakt am Ort der Route, wird die
 * Zuordnung als "nicht_exakt_lokalisierbar" gekennzeichnet, damit die App
 * ehrlich bleibt.
 */

const EARTH_RADIUS_M = 6371000;
// Bis zu dieser Distanz (und bei gleichem Kanton) gilt eine Sage als exakt am
// Ort der Route verankert.
const EXAKT_RADIUS_M = 3500;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distanz zwischen zwei Punkten in Metern (Haversine). */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Findet die naechstgelegene kuratierte Sage zu einer Position. Sagen im
 * gleichen Kanton werden bevorzugt; sonst wird schweizweit die naechste mit
 * bekannten Koordinaten gewaehlt.
 */
export function nearestSaga(
  coord: LatLng | undefined,
  canton: string,
  sagas: Saga[],
): Saga | undefined {
  if (sagas.length === 0) return undefined;
  const located = sagas.filter((s) => s.coordinates);
  if (!coord || located.length === 0) {
    return sagas.find((s) => s.canton === canton) ?? sagas[0];
  }
  const sameCanton = located.filter((s) => s.canton === canton);
  const pool = sameCanton.length ? sameCanton : located;
  let best: Saga | undefined;
  let bestD = Infinity;
  for (const s of pool) {
    const d = haversineM(coord, s.coordinates as LatLng);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/**
 * Gibt die N naechstgelegenen kuratierten Sagen zur Route zurueck,
 * sortiert nach Distanz aufsteigend. Sagen im gleichen Kanton werden
 * bevorzugt; bei 0 Kantonsstreffern wird schweizweit gesucht.
 */
export function nearestNSagas(
  coord: LatLng | undefined,
  canton: string,
  sagas: Saga[],
  n = 3,
): Saga[] {
  if (sagas.length === 0) return [];
  const located = sagas.filter((s) => s.coordinates);
  const sameCanton = located.filter((s) => s.canton === canton);
  const pool = sameCanton.length ? sameCanton : located;
  if (!coord) return pool.slice(0, n);
  return pool
    .map((s) => ({ s, d: haversineM(coord, s.coordinates as LatLng) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.s);
}

export type SagaLokalisierung = "exakt" | "nicht_exakt_lokalisierbar";

/**
 * Beurteilt, ob die zugeordnete Sage exakt am Ort der Route belegt ist oder nur
 * die naechstgelegene Regionalsage darstellt.
 */
export function sagaLokalisierung(
  route: HikingRoute,
  saga: Saga,
): SagaLokalisierung {
  if (
    saga.coordinates &&
    route.coordinates &&
    saga.canton === route.region &&
    haversineM(route.coordinates, saga.coordinates) <= EXAKT_RADIUS_M
  ) {
    return "exakt";
  }
  return "nicht_exakt_lokalisierbar";
}
