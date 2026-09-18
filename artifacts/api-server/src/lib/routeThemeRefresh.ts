import type { Logger } from "pino";
import { and, eq, gte } from "drizzle-orm";
import {
  db,
  externalRoutesTable,
  routePoiEvidenceTable,
  type ExternalRouteRow,
} from "@workspace/db";
import { fetchHistoricPois, type RawPoi } from "./overpass";
import { assessRouteQuality } from "./routeQuality";

export const THEME_MAX_DISTANCE_KM = {
  wasserwege: 0.2,
  burgen_ruinen_alte_wege: 0.2,
  gipfel_panorama: 2,
  geologie_eiszeit: 2,
  hoehlen_grotten: 0.5,
  wald_wildtiere: 2,
  alpen_landwirtschaft: 0.5,
  pilger_handelswege: 0.1,
  industriekultur: 0.2,
  familien_entdecker: 1,
  nacht_sterne: 2,
  flora_jahreszeiten: 2,
  bahn_seilbahn: 0.2,
} as const;

type RouteThemeKey = keyof typeof THEME_MAX_DISTANCE_KM;
const THEME_KEYS = Object.keys(THEME_MAX_DISTANCE_KM) as RouteThemeKey[];
const MAX_THEME_DISTANCE_KM = Math.max(
  ...Object.values(THEME_MAX_DISTANCE_KM),
);
const REFRESH_DELAY_MS = Number(process.env.ROUTE_THEME_DELAY_MS || 3000);

type LatLng = { lat: number; lng: number };
type PoiWithDistance = { poi: RawPoi; distanceKm: number };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asGeometry(raw: unknown): LatLng[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((point): LatLng | null => {
      if (Array.isArray(point)) {
        return { lat: Number(point[0]), lng: Number(point[1]) };
      }
      if (point && typeof point === "object") {
        const candidate = point as { lat?: unknown; lng?: unknown };
        return { lat: Number(candidate.lat), lng: Number(candidate.lng) };
      }
      return null;
    })
    .filter(
      (point): point is LatLng =>
        point !== null && Number.isFinite(point.lat) && Number.isFinite(point.lng),
    );
}

function routeBbox(
  geometry: LatLng[],
): { south: number; west: number; north: number; east: number } | null {
  if (geometry.length < 2) return null;
  const south = Math.min(...geometry.map((point) => point.lat));
  const north = Math.max(...geometry.map((point) => point.lat));
  const west = Math.min(...geometry.map((point) => point.lng));
  const east = Math.max(...geometry.map((point) => point.lng));
  const centerLat = (south + north) / 2;
  const latPad = MAX_THEME_DISTANCE_KM / 111;
  const lngPad =
    MAX_THEME_DISTANCE_KM /
    (111 * Math.cos((centerLat * Math.PI) / 180) || 1);
  return {
    south: south - latPad,
    west: west - lngPad,
    north: north + latPad,
    east: east + lngPad,
  };
}

function bboxKey(bbox: {
  south: number;
  west: number;
  north: number;
  east: number;
}): string {
  return [bbox.south, bbox.west, bbox.north, bbox.east]
    .map((value) => value.toFixed(4))
    .join(",");
}

function distanceToSegmentKm(point: LatLng, a: LatLng, b: LatLng): number {
  const radius = 6371;
  const radians = Math.PI / 180;
  const cosLat = Math.cos(point.lat * radians);
  const ax = (a.lng - point.lng) * radians * cosLat * radius;
  const ay = (a.lat - point.lat) * radians * radius;
  const bx = (b.lng - point.lng) * radians * cosLat * radius;
  const by = (b.lat - point.lat) * radians * radius;
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  const t =
    length2 === 0
      ? 0
      : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function distanceToRouteKm(point: LatLng, geometry: LatLng[]): number {
  let nearest = Infinity;
  for (let index = 1; index < geometry.length; index += 1) {
    nearest = Math.min(
      nearest,
      distanceToSegmentKm(point, geometry[index - 1]!, geometry[index]!),
    );
  }
  return nearest;
}

function nearbyPois(pois: RawPoi[], geometry: LatLng[]): PoiWithDistance[] {
  return pois.flatMap((poi) => {
    const point = { lat: Number(poi.lat), lng: Number(poi.lng) };
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return [];
    const distanceKm = distanceToRouteKm(point, geometry);
    return distanceKm <= MAX_THEME_DISTANCE_KM
      ? [{ poi, distanceKm }]
      : [];
  });
}

function hasKind(poi: RawPoi, ...kinds: string[]): boolean {
  return kinds.includes(poi.kind);
}

function deriveThemes(
  entries: PoiWithDistance[],
  familyFriendly: boolean | null,
): RouteThemeKey[] {
  const tags = new Set<RouteThemeKey>();
  for (const { poi, distanceKm } of entries) {
    const kind = poi.kind || "";
    const addIfNear = (theme: RouteThemeKey, matches: boolean) => {
      if (matches && distanceKm <= THEME_MAX_DISTANCE_KM[theme]) {
        tags.add(theme);
      }
    };

    addIfNear("wasserwege", [
      "natural=water",
      "natural=waterfall",
      "natural=spring",
      "natural=gorge",
      "waterway=waterfall",
      "waterway=river",
      "waterway=stream",
    ].includes(kind));
    addIfNear("burgen_ruinen_alte_wege", [
      "historic=castle",
      "historic=ruins",
      "historic=fort",
      "historic=archaeological_site",
      "historic=roman_road",
      "historic=roman_villa",
      "historic=roman_building",
      "historic=battlefield",
      "historic=bridge",
    ].includes(kind));
    addIfNear(
      "gipfel_panorama",
      hasKind(poi, "natural=peak", "natural=saddle", "tourism=viewpoint"),
    );
    addIfNear(
      "geologie_eiszeit",
      kind.startsWith("geological=") ||
        hasKind(poi, "natural=rock", "natural=glacier"),
    );
    addIfNear(
      "hoehlen_grotten",
      hasKind(
        poi,
        "natural=arch",
        "natural=cave",
        "natural=cave_entrance",
        "natural=rock_shelter",
        "man_made=adit",
      ),
    );
    addIfNear(
      "wald_wildtiere",
      hasKind(poi, "natural=wood", "natural=wetland", "tourism=wildlife_hide"),
    );
    addIfNear(
      "alpen_landwirtschaft",
      hasKind(
        poi,
        "tourism=alpine_hut",
        "amenity=shelter",
        "shop=cheese",
        "farm=Alp",
        "landuse=meadow",
        "landuse=pasture",
      ),
    );
    addIfNear(
      "pilger_handelswege",
      hasKind(
        poi,
        "route=pilgrimage",
        "historic=church",
        "historic=wayside_cross",
        "historic=wayside_shrine",
        "historic=milestone",
        "historic=boundary_stone",
      ),
    );
    addIfNear(
      "industriekultur",
      [
        "man_made=watermill",
        "man_made=windmill",
        "man_made=works",
        "man_made=quarry",
      ].includes(kind),
    );
    addIfNear(
      "familien_entdecker",
      hasKind(poi, "amenity=playground", "amenity=picnic_site", "amenity=toilets"),
    );
    addIfNear(
      "nacht_sterne",
      hasKind(poi, "amenity=observatory", "tourism=observatory"),
    );
    addIfNear(
      "flora_jahreszeiten",
      hasKind(
        poi,
        "natural=tree",
        "natural=wetland",
        "landuse=orchard",
        "landuse=vineyard",
        "natural=heath",
      ),
    );
    addIfNear(
      "bahn_seilbahn",
      hasKind(
        poi,
        "railway=station",
        "railway=halt",
        "railway=tram_stop",
        "highway=bus_stop",
        "aerialway=station",
        "amenity=ferry_terminal",
      ),
    );
  }
  if (familyFriendly === true) tags.add("familien_entdecker");
  return THEME_KEYS.filter((key) => tags.has(key));
}

export async function refreshCantonRouteThemes(
  routes: ExternalRouteRow[],
  log: Logger,
): Promise<{ checked: number; updated: number; skipped: number; failed: number }> {
  let checked = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const poiCache = new Map<string, Promise<RawPoi[]>>();

  const loadPois = (bbox: {
    south: number;
    west: number;
    north: number;
    east: number;
  }): Promise<RawPoi[]> => {
    const key = bboxKey(bbox);
    const cached = poiCache.get(key);
    if (cached) return cached;
    const pending = fetchHistoricPois(bbox, log);
    poiCache.set(key, pending);
    return pending;
  };

  for (const route of routes) {
    const geometry = asGeometry(route.geometry);
    const quality = assessRouteQuality(route);
    const checkedAt = new Date();
    const bbox = routeBbox(geometry);
    if (!bbox) {
      // An invalid geometry must not keep old theme evidence alive. The route
      // is still marked so the UI can explain why its metrics are untrusted.
      await db.transaction(async (tx) => {
        await tx
          .delete(routePoiEvidenceTable)
          .where(eq(routePoiEvidenceTable.routeId, route.id));
        await tx
          .update(externalRoutesTable)
          .set({
            themeKeys: [],
            qualityCheckedAt: checkedAt,
            qualityStatus: quality.status,
          })
          .where(
            and(
              eq(externalRoutesTable.id, route.id),
              gte(externalRoutesTable.geometryVersion, 1),
            ),
          );
      });
      skipped += 1;
      continue;
    }
    checked += 1;
    try {
      const pois = await loadPois(bbox);
      const nearby = nearbyPois(pois, geometry);
      const themes = deriveThemes(nearby, route.familyFriendly);
      const evidence = nearby.flatMap(({ poi, distanceKm }) =>
        deriveThemes([{ poi, distanceKm }], null).map((themeKey) => ({
          id: `${route.id}:${poi.id}:${themeKey}`,
          routeId: route.id,
          poiId: poi.id,
          themeKey,
          name: poi.name,
          kind: poi.kind,
          lat: poi.lat,
          lng: poi.lng,
          distanceKm,
          source: "OpenStreetMap",
          sourceUrl: `https://www.openstreetmap.org/${poi.id}`,
          lastSeenAt: new Date(),
        })),
      );
      await db.transaction(async (tx) => {
        // A successful source response is authoritative for this route. Any
        // POI missing from it is removed instead of being shown indefinitely.
        await tx
          .delete(routePoiEvidenceTable)
          .where(eq(routePoiEvidenceTable.routeId, route.id));
        if (evidence.length > 0) {
          await tx.insert(routePoiEvidenceTable).values(evidence);
        }
        await tx
          .update(externalRoutesTable)
          .set({
            themeKeys: themes,
            qualityCheckedAt: checkedAt,
            qualityStatus: quality.status,
          })
          .where(
            and(
              eq(externalRoutesTable.id, route.id),
              gte(externalRoutesTable.geometryVersion, 1),
            ),
          );
      });
      updated += 1;
    } catch (err) {
      failed += 1;
      log.warn(
        { err, routeId: route.id, canton: route.canton },
        "POI-Themenaktualisierung fehlgeschlagen; alte Themen bleiben erhalten",
      );
    }
    await sleep(REFRESH_DELAY_MS);
  }

  return { checked, updated, skipped, failed };
}