import { getPois, type Poi } from "@workspace/api-client-react";

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

function themesFromPois(route: HikingRoute, pois: Poi[]): RouteThemeKey[] {
  const geometry = route.geometry ?? [];
  const nearbyPois =
    geometry.length > 1
      ? filterByRouteCorridor(pois, geometry, MAX_THEME_DISTANCE_KM)
      : pois;
  return deriveRouteThemes(nearbyPois, route);
}

export function getRouteThemesFromPois(
  route: HikingRoute,
  pois: Poi[],
): RouteThemeKey[] {
  const cached = routeThemeCache.get(route.id);
  if (cached) return cached;

  // Die Routen-Endpunkte liefern die geprüften Themenbelege. Ein leeres Array
  // ist ein belastbares "kein Treffer" und darf nicht durch eine teure,
  // flüchtige Live-Suche überschrieben werden. qualityCheckedAt ist nicht in
  // jedem Routen-Endpunkt Teil der Antwort, daher ist themeKeys selbst das
  // maßgebliche Vorhandensein-Signal.
  if (Array.isArray(route.themeKeys)) {
    const themes = route.themeKeys.filter(
      (key): key is RouteThemeKey => ROUTE_THEME_KEYS.includes(key as RouteThemeKey),
    );
    routeThemeCache.set(route.id, themes);
    return themes;
  }

  const themes = themesFromPois(route, pois);
  routeThemeCache.set(route.id, themes);
  return themes;
}

/** Einzelrouten-Rückfall für den normalen Kantonsfilter. */
export async function getRouteThemes(route: HikingRoute): Promise<RouteThemeKey[]> {
  const cached = routeThemeCache.get(route.id);
  if (cached) return cached;
  const geometry = route.geometry ?? [];
  const pois = await loadThemePois(
    bboxAroundGeometry(geometry, route.coordinates, MAX_THEME_DISTANCE_KM),
  );
  return getRouteThemesFromPois(route, pois);
}

/**
 * Holt die POIs für mehrere Routen mit einer gemeinsamen Bounding Box.
 * Die alte Variante hat für jede Route eine eigene Overpass-Abfrage ausgelöst.
 */
export async function loadThemePoisForRoutes(
  routes: HikingRoute[],
): Promise<Poi[]> {
  // Bereits serverseitig geprüfte Routen brauchen keine Live-POI-Abfrage.
  // Neben der unnötigen Last war eine fehlgeschlagene Sammelabfrage sonst
  // ausreichend, um alle Themenrouten eines Kantons zu verwerfen.
  const routesNeedingPois = routes.filter((route) => !Array.isArray(route.themeKeys));
  if (routesNeedingPois.length === 0) return [];

  const points = routesNeedingPois.flatMap((route) =>
    route.geometry && route.geometry.length > 1
      ? route.geometry.map(([lat, lng]) => ({ lat, lng }))
      : [route.coordinates],
  );
  if (points.length === 0) return [];
  const center = points.reduce(
    (sum, point) => ({ lat: sum.lat + point.lat, lng: sum.lng + point.lng }),
    { lat: 0, lng: 0 },
  );
  center.lat /= points.length;
  center.lng /= points.length;
  const pois = await loadThemePois(
    bboxAroundGeometry(
      points.map((point) => [point.lat, point.lng]),
      center,
      MAX_THEME_DISTANCE_KM,
    ),
  );
  return pois;
}