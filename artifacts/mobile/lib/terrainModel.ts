import type { LatLng } from "@/types";
import type { PanoramaGipfel } from "@/lib/panorama";

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
export type TerrainTriangle = [number, number, number];

export interface LocalTerrainMesh {
  vertices: TerrainVertex[];
  normals: TerrainVertex[];
  triangleIndices: TerrainTriangle[];
}

const AR_WORLD_SCALE = 0.04;
const MIN_RAY_DISTANCE_M = 12;
const MAX_OCCLUSION_GAP_DEG = 8;
const OCCLUSION_MARGIN_DEG = 0.5;

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
    ? { vertices, normals, triangleIndices }
    : null;
}
