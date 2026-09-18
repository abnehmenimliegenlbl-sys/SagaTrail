import type { HikingRoute } from "../constants/routes";
import type { RouteThemeKey } from "./routeThemes";

/**
 * Applies the canton theme filter without making assumptions about how theme
 * evidence was obtained. Selecting multiple themes means "any selected theme".
 */
export function filterRoutesByThemes<T extends Pick<HikingRoute, "id">>(
  routes: readonly T[],
  routeThemesById: Readonly<Record<string, readonly RouteThemeKey[]>>,
  selectedThemeKeys: readonly RouteThemeKey[],
): T[] {
  if (selectedThemeKeys.length === 0) return [...routes];

  const selected = new Set(selectedThemeKeys);
  return routes.filter((route) =>
    (routeThemesById[route.id] ?? []).some((theme) => selected.has(theme)),
  );
}