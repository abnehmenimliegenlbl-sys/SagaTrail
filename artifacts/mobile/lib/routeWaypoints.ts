import { LatLng } from "@/types";
import { fortschrittAufRoute } from "./geo";

export interface RouteWaypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  fraction: number;
  type: "partner" | "poi";
  kind?: string;
}

const MAX_WAYPOINTS = 3;
const MAX_DIST_KM = 0.1;

type WithLatLng = { id: string; name: string; lat: number; lng: number };

function project(
  point: WithLatLng,
  geometry: number[][],
): { fraction: number; distKm: number } | null {
  return fortschrittAufRoute({ lat: point.lat, lng: point.lng } as LatLng, geometry);
}

export function computeRouteWaypoints(
  geometry: number[][] | null | undefined,
  partners: (WithLatLng)[],
  pois: (WithLatLng & { kind?: string })[],
): RouteWaypoint[] {
  if (!geometry || geometry.length < 2) return [];

  const partnerWps: RouteWaypoint[] = [];
  for (const p of partners) {
    const proj = project(p, geometry);
    if (proj && proj.distKm <= MAX_DIST_KM) {
      partnerWps.push({
        id: `partner-${p.id}`,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        fraction: proj.fraction,
        type: "partner",
      });
    }
  }
  partnerWps.sort((a, b) => a.fraction - b.fraction);

  const remaining = MAX_WAYPOINTS - partnerWps.length;
  const poiWps: RouteWaypoint[] = [];
  if (remaining > 0) {
    for (const p of pois) {
      const proj = project(p, geometry);
      if (proj && proj.distKm <= MAX_DIST_KM) {
        poiWps.push({
          id: `poi-${p.id}`,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          fraction: proj.fraction,
          type: "poi",
          kind: p.kind,
        });
      }
    }
    poiWps.sort((a, b) => a.fraction - b.fraction);
    poiWps.splice(remaining);
  }

  return [...partnerWps, ...poiWps]
    .sort((a, b) => a.fraction - b.fraction)
    .slice(0, MAX_WAYPOINTS);
}
