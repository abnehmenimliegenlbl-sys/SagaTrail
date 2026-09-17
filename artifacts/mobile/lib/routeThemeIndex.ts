import { getPois } from "@workspace/api-client-react";

import type { HikingRoute } from "@/constants/routes";
import { bboxAroundGeometry, filterByRouteCorridor } from "@/lib/geo";
import {
  deriveRouteThemes,
  MAX_THEME_DISTANCE_KM,
  ROUTE_THEME_KEYS,
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

  // Der Server speichert die Themenbelege zusammen mit dem Prüfzeitpunkt.
  // Ein leeres Array ist dann ein belastbares "kein Treffer" und darf nicht
  // durch eine teure, flüchtige Live-Suche überschrieben werden.
  if (route.qualityCheckedAt && Array.isArray(route.themeKeys)) {
    const themes = route.themeKeys.filter(
      (key): key is RouteThemeKey => ROUTE_THEME_KEYS.includes(key as RouteThemeKey),
    );
    routeThemeCache.set(route.id, themes);
    return themes;
  }

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