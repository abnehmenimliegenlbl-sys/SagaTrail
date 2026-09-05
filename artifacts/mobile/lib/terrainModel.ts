import type { LatLng } from "@/types";
import type { PanoramaGipfel } from "@/lib/panorama";
import {
  buildRouteGradeSegments,
  type RouteGradeBand,
  type TerrainProfilePoint,
} from "./terrainCues";

export interface LocalTerrainSample {
  distanceM: number;
  elevationM: number;
}

export interface LocalTerrainRay {
  bearingDeg: number;
  samples: LocalTerrainSample[];
}

export interface LocalTerrainModel {
  version: 1;
  source: "SwissTopo DTM radial profiles";
  center: LatLng;
  radiusM: number;
  sectors: number;
  rings: number;
  fetchedAt: number;
  observerElevationM: number | null;
  rays: LocalTerrainRay[];
}

export type TerrainVisibility = "visible" | "occluded" | "unknown";
export type TerrainVertex = [number, number, number];
export type TerrainTextureCoordinate = [number, number];
export type TerrainTriangle = [number, number, number];
export type TerrainRouteLine = TerrainVertex[];
export interface TerrainRouteSegment {
  points: TerrainRouteLine;
  band: RouteGradeBand;
  thickness: number;
}

export interface GeographicRouteDisplayOptions {
  /** Maximum number of native route polylines used for the complete route. */
  maxSegments?: number;
  /** Maximum virtual distance from the observer in the AR world, in metres. */
  maxVirtualDistanceM?: number;
}

export interface LocalTerrainMesh {
  vertices: TerrainVertex[];
  normals: TerrainVertex[];
  texcoords: TerrainTextureCoordinate[];
  triangleIndices: TerrainTriangle[];
}

const AR_WORLD_SCALE = 0.04;
const MIN_RAY_DISTANCE_M = 12;
const MAX_OCCLUSION_GAP_DEG = 8;
const OCCLUSION_MARGIN_DEG = 0.5;
const DEFAULT_MAX_VIRTUAL_ROUTE_DISTANCE_M = 80;
const DEFAULT_MAX_ROUTE_SEGMENTS = 96;
// Keep a visible minimum at the compressed end of the route. A very thin
// final segment makes otherwise touching Viro polylines look disconnected.
const MIN_ROUTE_THICKNESS = 0.032;
const MAX_ROUTE_THICKNESS = 0.09;
const clampNumber = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

function normalizeBearing(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function bearingDifference(a: number, b: number): number {
  const difference = Math.abs(normalizeBearing(a) - normalizeBearing(b));
  return Math.min(difference, 360 - difference);
}

function isFiniteLatLng(value: unknown): value is LatLng {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<LatLng>;
  return (
    typeof point.lat === "number" &&
    Number.isFinite(point.lat) &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lng)
  );
}

export function isLocalTerrainModel(value: unknown): value is LocalTerrainModel {
  if (!value || typeof value !== "object") return false;
  const model = value as Partial<LocalTerrainModel>;
  if (
    model.version !== 1 ||
    model.source !== "SwissTopo DTM radial profiles" ||
    !isFiniteLatLng(model.center) ||
    typeof model.radiusM !== "number" ||
    !Number.isFinite(model.radiusM) ||
    typeof model.sectors !== "number" ||
    typeof model.rings !== "number" ||
    (model.observerElevationM !== null &&
      (typeof model.observerElevationM !== "number" ||
        !Number.isFinite(model.observerElevationM))) ||
    !Array.isArray(model.rays)
  ) {
    return false;
  }
  return model.rays.every(
    (ray) =>
      !!ray &&
      typeof ray.bearingDeg === "number" &&
      Number.isFinite(ray.bearingDeg) &&
      Array.isArray(ray.samples) &&
      ray.samples.every(
        (sample) =>
          !!sample &&
          typeof sample.distanceM === "number" &&
          Number.isFinite(sample.distanceM) &&
          typeof sample.elevationM === "number" &&
          Number.isFinite(sample.elevationM),
      ),
  );
}

function interpolateRayElevation(
  ray: LocalTerrainRay,
  distanceM: number,
): number | null {
  const samples = ray.samples
    .filter(
      (sample) =>
        Number.isFinite(sample.distanceM) && Number.isFinite(sample.elevationM),
    )
    .sort((a, b) => a.distanceM - b.distanceM);
  if (samples.length < 2) return null;
  if (distanceM < samples[0].distanceM || distanceM > samples[samples.length - 1].distanceM) {
    return null;
  }
  for (let index = 1; index < samples.length; index++) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (distanceM > current.distanceM) continue;
    const span = current.distanceM - previous.distanceM;
    if (span <= 0) return current.elevationM;
    const fraction = (distanceM - previous.distanceM) / span;
    return previous.elevationM + (current.elevationM - previous.elevationM) * fraction;
  }
  return null;
}

function nearestRay(
  model: LocalTerrainModel,
  bearingDeg: number,
): LocalTerrainRay | null {
  let closest: LocalTerrainRay | null = null;
  let closestDifference = Infinity;
  for (const ray of model.rays) {
    const difference = bearingDifference(ray.bearingDeg, bearingDeg);
    if (difference < closestDifference) {
      closestDifference = difference;
      closest = ray;
    }
  }
  return closest && closestDifference <= MAX_OCCLUSION_GAP_DEG ? closest : null;
}

/**
 * Determines whether a real terrain sample blocks the line of sight to a peak.
 * Missing rays, missing observer elevation, distant peaks beyond the model
 * radius, and unknown peak angles deliberately return "unknown".
 */
export function terrainVisibilityForPeak(
  model: LocalTerrainModel | null | undefined,
  peak: Pick<PanoramaGipfel, "bearingDeg" | "distanceKm" | "elevationAngleDeg">,
  observerElevationM: number | null | undefined,
): TerrainVisibility {
  if (!model || peak.elevationAngleDeg == null || !Number.isFinite(peak.elevationAngleDeg)) {
    return "unknown";
  }
  const elevation = observerElevationM ?? model.observerElevationM;
  const targetDistanceM = peak.distanceKm * 1000;
  if (
    elevation == null ||
    !Number.isFinite(elevation) ||
    !Number.isFinite(targetDistanceM) ||
    targetDistanceM <= MIN_RAY_DISTANCE_M ||
    targetDistanceM > model.radiusM + 1
  ) {
    return "unknown";
  }

  const ray = nearestRay(model, peak.bearingDeg);
  if (!ray) return "unknown";

  const samples = ray.samples
    .filter(
      (sample) =>
        Number.isFinite(sample.distanceM) && Number.isFinite(sample.elevationM),
    )
    .sort((a, b) => a.distanceM - b.distanceM);
  let hasTerrainEvidence = false;
  for (let index = 1; index < samples.length; index++) {
    const start = samples[index - 1].distanceM;
    const end = samples[index].distanceM;
    if (end <= MIN_RAY_DISTANCE_M || start >= targetDistanceM || end <= start) continue;
    const segmentEnd = Math.min(end, targetDistanceM);
    const steps = Math.max(1, Math.ceil((segmentEnd - Math.max(start, MIN_RAY_DISTANCE_M)) / 40));
    for (let step = 0; step <= steps; step++) {
      const distanceM =
        Math.max(start, MIN_RAY_DISTANCE_M) +
        ((segmentEnd - Math.max(start, MIN_RAY_DISTANCE_M)) * step) / steps;
      if (distanceM >= targetDistanceM) continue;
      const terrainElevationM = interpolateRayElevation(ray, distanceM);
      if (terrainElevationM == null) continue;
      hasTerrainEvidence = true;
      const terrainAngleDeg =
        (Math.atan2(terrainElevationM - elevation, distanceM) * 180) / Math.PI;
      if (terrainAngleDeg > peak.elevationAngleDeg + OCCLUSION_MARGIN_DEG) {
        return "occluded";
      }
    }
  }

  return hasTerrainEvidence ? "visible" : "unknown";
}

/**
 * Converts the radial model into a local Viro mesh. Directions stay geographic
 * by subtracting the current compass heading, while distance and elevation use
 * the same display scale so the terrain keeps its real slope angles.
 */
export function buildLocalTerrainMesh(
  model: LocalTerrainModel | null | undefined,
  headingDeg: number | null | undefined,
): LocalTerrainMesh | null {
  const observerElevation = model?.observerElevationM;
  if (!model || headingDeg == null || observerElevation == null) return null;

  const rays = model.rays
    .filter((ray) => ray.samples.length >= 2)
    .slice()
    .sort((a, b) => a.bearingDeg - b.bearingDeg);
  if (rays.length < 4) return null;

  const ringCount = Math.min(
    model.rings,
    ...rays.map((ray) => ray.samples.length),
  );
  if (ringCount < 2) return null;

  const vertices: TerrainVertex[] = [];
  const normals: TerrainVertex[] = [];
  const texcoords: TerrainTextureCoordinate[] = [];
  for (const ray of rays) {
    const relativeBearing =
      ((ray.bearingDeg - headingDeg + 540) % 360) - 180;
    const angle = (relativeBearing * Math.PI) / 180;
    for (const sample of ray.samples.slice(0, ringCount)) {
      const distance = sample.distanceM * AR_WORLD_SCALE;
      vertices.push([
        Math.sin(angle) * distance,
        (sample.elevationM - observerElevation) * AR_WORLD_SCALE,
        -Math.cos(angle) * distance,
      ]);
      normals.push([0, 1, 0]);
      const geographicAngle = (ray.bearingDeg * Math.PI) / 180;
      const eastM = Math.sin(geographicAngle) * sample.distanceM;
      const northM = Math.cos(geographicAngle) * sample.distanceM;
      texcoords.push([
        clampNumber(0.5 + eastM / (model.radiusM * 2), 0, 1),
        clampNumber(0.5 - northM / (model.radiusM * 2), 0, 1),
      ]);
    }
  }

  const triangleIndices: TerrainTriangle[] = [];
  const expectedGap = 360 / Math.max(1, model.sectors);
  for (let rayIndex = 0; rayIndex < rays.length; rayIndex++) {
    const nextRayIndex = (rayIndex + 1) % rays.length;
    const gap =
      nextRayIndex === 0
        ? bearingDifference(rays[rayIndex].bearingDeg, rays[0].bearingDeg)
        : bearingDifference(rays[rayIndex].bearingDeg, rays[nextRayIndex].bearingDeg);
    if (gap > expectedGap * 1.6) continue;
    for (let ringIndex = 0; ringIndex < ringCount - 1; ringIndex++) {
      const a = rayIndex * ringCount + ringIndex;
      const b = nextRayIndex * ringCount + ringIndex;
      const c = rayIndex * ringCount + ringIndex + 1;
      const d = nextRayIndex * ringCount + ringIndex + 1;
      triangleIndices.push([a, b, c], [c, b, d]);
    }
  }

  return triangleIndices.length > 0
    ? { vertices, normals, texcoords, triangleIndices }
    : null;
}

/**
 * Projects route geometry into a local Viro frame. When headingDeg is set,
 * coordinates are camera-relative (used by the retained map-card renderer).
 * When it is null, coordinates stay in the geographic GravityAndHeading frame
 * (used by the live AR route).
 */
export function buildLocalTerrainRouteLines(
  model: LocalTerrainModel | null | undefined,
  routeGeometry: readonly number[][] | null | undefined,
  headingDeg: number | null | undefined,
  centerOverride?: LatLng | null,
  maxDisplayRadiusM?: number,
): TerrainRouteLine[] {
  const observerElevation = model?.observerElevationM;
  // The live GPS position is the actual Viro observer origin. The terrain
  // model can be up to two minutes / 120 m old, so preferring model.center
  // here can move the route outside the local radius and yield no line at all.
  const center = centerOverride ?? model?.center;
  // The displayed route may extend beyond the DTM coverage. Outside that
  // coverage the route stays level; terrain elevation is never fabricated.
  const radiusM = maxDisplayRadiusM ?? model?.radiusM ?? 500;
  if (
    !center ||
    !Array.isArray(routeGeometry) ||
    routeGeometry.length < 2
  ) {
    return [];
  }

  const earthRadiusM = 6_371_000;
  const centerLatRad = (center.lat * Math.PI) / 180;
  const maxPoints = 160;
  const stride = Math.max(1, Math.ceil(routeGeometry.length / maxPoints));
  const lines: TerrainRouteLine[] = [];
  let currentLine: TerrainRouteLine = [];

  const flush = () => {
    if (currentLine.length >= 2) lines.push(currentLine);
    currentLine = [];
  };

  const sampledIndices: number[] = [];
  for (let index = 0; index < routeGeometry.length; index += stride) {
    sampledIndices.push(index);
  }
  if (sampledIndices[sampledIndices.length - 1] !== routeGeometry.length - 1) {
    sampledIndices.push(routeGeometry.length - 1);
  }

  for (const index of sampledIndices) {
    const point = routeGeometry[index];
    const lat = point?.[0];
    const lng = point?.[1];
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      flush();
      continue;
    }

    const deltaLat = ((lat - center.lat) * Math.PI) / 180;
    const deltaLng = ((lng - center.lng) * Math.PI) / 180;
    const northM = deltaLat * earthRadiusM;
    const eastM = deltaLng * earthRadiusM * Math.cos(centerLatRad);
    const distanceM = Math.hypot(northM, eastM);
    if (distanceM > radiusM + 1) {
      flush();
      continue;
    }

    const bearingDeg =
      ((Math.atan2(eastM, northM) * 180) / Math.PI + 360) % 360;
    const relativeBearing =
      headingDeg == null
        ? bearingDeg
        : ((bearingDeg - headingDeg + 540) % 360) - 180;
    const angle = (relativeBearing * Math.PI) / 180;
    const ray = model == null ? null : nearestRay(model, bearingDeg);
    const terrainElevation =
      observerElevation == null || ray == null
        ? observerElevation
        : interpolateRayElevation(ray, distanceM) ?? observerElevation;
    const distance = distanceM * AR_WORLD_SCALE;
    // The route is still useful without an absolute observer elevation. In
    // that case keep it level rather than dropping the complete AR overlay.
    const elevation =
      terrainElevation == null || observerElevation == null
        ? 0
        : (terrainElevation - observerElevation) * AR_WORLD_SCALE;

    currentLine.push([
      Math.sin(angle) * distance,
      elevation,
      -Math.cos(angle) * distance,
    ]);
  }

  flush();
  return lines;
}

/**
 * Route overlay for the live AR world. GravityAndHeading already aligns Viro
 * with geographic north, so these coordinates must not be rotated by the
 * phone's current compass heading a second time.
 */
export function buildGeographicTerrainRouteLines(
  model: LocalTerrainModel | null | undefined,
  routeGeometry: readonly number[][] | null | undefined,
  centerOverride?: LatLng | null,
  maxDisplayRadiusM?: number,
): TerrainRouteLine[] {
  return buildLocalTerrainRouteLines(
    model,
    routeGeometry,
    null,
    centerOverride,
    maxDisplayRadiusM,
  );
}

interface ProjectedGeographicRoutePoint {
  point: TerrainVertex;
  displayDistanceM: number;
}

function geographicDistanceM(point: readonly number[], center: LatLng): number | null {
  const lat = point[0];
  const lng = point[1];
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }
  const earthRadiusM = 6_371_000;
  const centerLatRad = (center.lat * Math.PI) / 180;
  const northM = ((lat - center.lat) * Math.PI * earthRadiusM) / 180;
  const eastM =
    ((lng - center.lng) * Math.PI * earthRadiusM * Math.cos(centerLatRad)) / 180;
  return Math.hypot(northM, eastM);
}

function compressedRouteDistanceM(
  distanceM: number,
  terrainRadiusM: number,
  maxRouteDistanceM: number,
  maxVirtualDistanceM: number,
): number {
  if (distanceM <= terrainRadiusM || maxRouteDistanceM <= terrainRadiusM) {
    return distanceM;
  }
  const farDistanceM = maxRouteDistanceM - terrainRadiusM;
  const farProgress =
    Math.log1p((distanceM - terrainRadiusM) / Math.max(1, terrainRadiusM)) /
    Math.log1p(farDistanceM / Math.max(1, terrainRadiusM));
  return (
    terrainRadiusM +
      clampNumber(farProgress, 0, 1) *
      Math.max(0, maxVirtualDistanceM - terrainRadiusM)
  );
}

function projectGeographicRoutePoint(
  model: LocalTerrainModel | null | undefined,
  point: readonly number[],
  center: LatLng,
  terrainRadiusM: number,
  maxRouteDistanceM: number,
  maxVirtualDistanceM: number,
): ProjectedGeographicRoutePoint | null {
  const distanceM = geographicDistanceM(point, center);
  if (distanceM == null) return null;

  const earthRadiusM = 6_371_000;
  const centerLatRad = (center.lat * Math.PI) / 180;
  const northM = ((point[0] - center.lat) * Math.PI * earthRadiusM) / 180;
  const eastM =
    ((point[1] - center.lng) * Math.PI * earthRadiusM * Math.cos(centerLatRad)) /
    180;
  const bearingDeg =
    ((Math.atan2(eastM, northM) * 180) / Math.PI + 360) % 360;
  const observerElevation = model?.observerElevationM ?? null;
  const ray = model == null ? null : nearestRay(model, bearingDeg);
  const terrainElevation =
    observerElevation == null || ray == null || distanceM > terrainRadiusM + 1
      ? observerElevation
      : interpolateRayElevation(ray, distanceM) ?? observerElevation;
  const elevation =
    terrainElevation == null || observerElevation == null
      ? 0
      : (terrainElevation - observerElevation) * AR_WORLD_SCALE;
  const displayDistanceM = compressedRouteDistanceM(
    distanceM,
    terrainRadiusM,
    maxRouteDistanceM,
    maxVirtualDistanceM,
  );
  const distance = displayDistanceM * AR_WORLD_SCALE;
  const angle = (bearingDeg * Math.PI) / 180;

  return {
    point: [
      Math.sin(angle) * distance,
      elevation,
      -Math.cos(angle) * distance,
    ],
    displayDistanceM,
  };
}

function mergeRouteGradeSegments(
  segments: Array<{ coordinates: number[][]; band: RouteGradeBand }>,
  maxSegments: number,
): Array<{ coordinates: number[][]; band: RouteGradeBand }> {
  if (segments.length <= maxSegments) return segments;
  const groupSize = Math.ceil(segments.length / maxSegments);
  const merged: Array<{ coordinates: number[][]; band: RouteGradeBand }> = [];

  for (let start = 0; start < segments.length; start += groupSize) {
    const group = segments.slice(start, start + groupSize);
    const coordinates = group.flatMap((segment, index) =>
      index === 0 ? segment.coordinates : segment.coordinates.slice(1),
    );
    merged.push({
      coordinates,
      band: group.reduce<RouteGradeBand>(
        (strongest, segment) => {
          const rank: Record<RouteGradeBand, number> = {
            green: 0,
            yellow: 1,
            orange: 2,
            red: 3,
          };
          return rank[segment.band] > rank[strongest] ? segment.band : strongest;
        },
        "green",
      ),
    });
  }
  return merged;
}

/**
 * Splits and projects the complete live AR route. The nearby part retains
 * geographic scale, while distant parts are logarithmically compressed so the
 * destination remains in the AR world. Each slot gets a distance-based line
 * thickness, and the route remains capped to the fixed native slot count.
 */
export function buildGeographicTerrainRouteSegments(
  model: LocalTerrainModel | null | undefined,
  routeGeometry: readonly number[][] | null | undefined,
  centerOverride?: LatLng | null,
  maxDisplayRadiusM?: number,
  terrainProfile?: readonly TerrainProfilePoint[] | null,
  displayOptions: GeographicRouteDisplayOptions = {},
): TerrainRouteSegment[] {
  if (!routeGeometry || routeGeometry.length < 2) return [];

  const center = centerOverride ?? model?.center;
  if (!center) return [];
  const terrainRadiusM = maxDisplayRadiusM ?? model?.radiusM ?? 500;
  const maxVirtualDistanceM =
    displayOptions.maxVirtualDistanceM ?? DEFAULT_MAX_VIRTUAL_ROUTE_DISTANCE_M;
  const maxSegments =
    displayOptions.maxSegments ?? DEFAULT_MAX_ROUTE_SEGMENTS;
  const geometry = routeGeometry.map((point) => [point[0], point[1]]);
  const gradeSegments = mergeRouteGradeSegments(
    buildRouteGradeSegments(
      geometry,
      terrainProfile ? terrainProfile.map((point) => ({ ...point })) : null,
    ),
    maxSegments,
  );
  const maxRouteDistanceM = geometry.reduce((maximum, point) => {
    const distanceM = geographicDistanceM(point, center);
    return distanceM == null ? maximum : Math.max(maximum, distanceM);
  }, 0);

  return gradeSegments.flatMap((segment) => {
    const projected = segment.coordinates
      .map((point) =>
        projectGeographicRoutePoint(
          model,
          point,
          center,
          terrainRadiusM,
          maxRouteDistanceM,
          maxVirtualDistanceM,
        ),
      )
      .filter((point): point is ProjectedGeographicRoutePoint => point !== null);
    if (projected.length < 2) return [];
    const displayDistanceM =
      projected.reduce((sum, point) => sum + point.displayDistanceM, 0) /
      projected.length;
    const distanceProgress =
      maxVirtualDistanceM <= 0
        ? 1
        : clampNumber(displayDistanceM / maxVirtualDistanceM, 0, 1);
    const thickness = Math.max(
      MIN_ROUTE_THICKNESS,
      MAX_ROUTE_THICKNESS * (1 - 0.45 * distanceProgress),
    );
    return [
      {
        points: projected.map(({ point }) => point),
        band: segment.band,
        thickness,
      },
    ];
  });
}

/**
 * Returns the projected final route point used by the small destination flag.
 * It uses the same compression and terrain rules as the route polylines.
 */
export function buildGeographicTerrainRouteDestination(
  model: LocalTerrainModel | null | undefined,
  routeGeometry: readonly number[][] | null | undefined,
  centerOverride?: LatLng | null,
  maxDisplayRadiusM?: number,
  displayOptions: GeographicRouteDisplayOptions = {},
): TerrainVertex | null {
  if (!routeGeometry || routeGeometry.length < 2) return null;
  const center = centerOverride ?? model?.center;
  if (!center) return null;
  const terrainRadiusM = maxDisplayRadiusM ?? model?.radiusM ?? 500;
  const maxVirtualDistanceM =
    displayOptions.maxVirtualDistanceM ?? DEFAULT_MAX_VIRTUAL_ROUTE_DISTANCE_M;
  const maxRouteDistanceM = routeGeometry.reduce((maximum, point) => {
    const distanceM = geographicDistanceM(point, center);
    return distanceM == null ? maximum : Math.max(maximum, distanceM);
  }, 0);
  for (let index = routeGeometry.length - 1; index >= 0; index -= 1) {
    const projected = projectGeographicRoutePoint(
      model,
      routeGeometry[index]!,
      center,
      terrainRadiusM,
      maxRouteDistanceM,
      maxVirtualDistanceM,
    );
    if (projected) return projected.point;
  }
  return null;
}

/**
 * Converts the same route geometry into a north-up map-card coordinate system.
 * The map card uses x=east and y=north, while the AR terrain frame uses x=east
 * and z=north. Elevation is intentionally discarded for this flat map view.
 */
export function buildLocalMapRouteLines(
  model: LocalTerrainModel | null | undefined,
  routeGeometry: readonly number[][] | null | undefined,
): TerrainRouteLine[] {
  return buildLocalTerrainRouteLines(model, routeGeometry, 0).map((line) =>
    line.map(([east, _elevation, northFacing]) => [
      east / AR_WORLD_SCALE,
      -northFacing / AR_WORLD_SCALE,
      0.04,
    ]),
  );
}
