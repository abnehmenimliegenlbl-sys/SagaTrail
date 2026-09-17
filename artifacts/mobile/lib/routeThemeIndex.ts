import { getPois } from "@workspace/api-client-react";

import type { HikingRoute } from "@/constants/routes";
import { bboxAroundGeometry, filterByRouteCorridor } from "@/lib/geo";
import {
  deriveRouteThemes,
  MAX_THEME_DISTANCE_KM,
  type RouteThemeKey,
} from "@/lib/routeThemes";

const THEME_POI_RETRY_MS = 5000;

/**
 * In-memory cache shared by the canton filter and the global theme browser.
 * It is deliberately not persisted: POI evidence can change independently
 * from the route catalog.
 */
export const routeThemeCache = new Map<string, RouteThemeKey[]>();

async function loadThemePois(
  bbox: ReturnType<typeof bboxAroundGeometry>,
): Promise<Awaited<ReturnType<typeof getPois>>> {
  const initial = await getPois(bbox);
  if (initial.length > 0) return initial;
  await new Promise((resolve) => setTimeout(resolve, THEME_POI_RETRY_MS));
  return getPois(bbox);
}

export async function getRouteThemes(route: HikingRoute): Promise<RouteThemeKey[]> {
  const cached = routeThemeCache.get(route.id);
  if (cached) return cached;

  const geometry = route.geometry ?? [];
  const pois = await loadThemePois(
    bboxAroundGeometry(geometry, route.coordinates, MAX_THEME_DISTANCE_KM),
  );
  const nearbyPois =
    geometry.length > 1
      ? filterByRouteCorridor(pois, geometry, MAX_THEME_DISTANCE_KM)
      : pois;
  const themes = deriveRouteThemes(nearbyPois, route);
  routeThemeCache.set(route.id, themes);
  return themes;
}