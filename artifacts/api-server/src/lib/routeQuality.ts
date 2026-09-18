import type { ExternalRouteRow } from "@workspace/db";
import { pathDistanceKm } from "./geo";

export type RouteQualityStatus = "verified" | "partial" | "invalid";

type Point = { lat: number; lng: number };

function parseGeometry(raw: unknown): Point[] {
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
    .map((point): Point | null => {
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
      (point): point is Point =>
        point !== null &&
        Number.isFinite(point.lat) &&
        Number.isFinite(point.lng) &&
        point.lat >= 45 &&
        point.lat <= 49 &&
        point.lng >= 5 &&
        point.lng <= 11,
    );
}

/**
 * Prüft nur Plausibilität, nicht die amtliche Richtigkeit. Eine Route wird
 * niemals als verifiziert markiert, wenn die gespeicherte Geometrie ungültig
 * ist oder ihre berechnete Distanz deutlich von der gespeicherten Distanz
 * abweicht. Offizielle Distanz-Tags werden dabei separat bewahrt.
 */
export function assessRouteQuality(
  route: Pick<
    ExternalRouteRow,
    "geometry" | "distanceKm" | "ascentM" | "sac" | "sacSource" | "geometryVersion"
  >,
): { status: RouteQualityStatus; computedDistanceKm: number | null; reasons: string[] } {
  const geometry = parseGeometry(route.geometry);
  const reasons: string[] = [];
  if (route.geometryVersion < 1 || geometry.length < 2) {
    reasons.push("geometry_missing_or_invalid");
  }

  const computedDistanceKm =
    geometry.length >= 2 ? pathDistanceKm(geometry) : null;
  if (
    computedDistanceKm == null ||
    !Number.isFinite(computedDistanceKm) ||
    computedDistanceKm <= 0
  ) {
    reasons.push("distance_not_computable");
  } else if (
    !Number.isFinite(route.distanceKm) ||
    route.distanceKm <= 0 ||
    Math.abs(computedDistanceKm - route.distanceKm) >
      Math.max(1, route.distanceKm * 0.2)
  ) {
    reasons.push("distance_geometry_mismatch");
  }

  if (!Number.isFinite(route.ascentM) || route.ascentM < 0 || route.ascentM > 100_000) {
    reasons.push("ascent_invalid");
  }
  if (!route.sac || route.sac === "unbekannt") {
    reasons.push("difficulty_unknown");
  } else if (!route.sacSource || route.sacSource === "unknown") {
    reasons.push("difficulty_source_unknown");
  }

  return {
    status: reasons.some((reason) =>
      ["geometry_missing_or_invalid", "distance_not_computable", "distance_geometry_mismatch", "ascent_invalid"].includes(reason),
    )
      ? "invalid"
      : reasons.length > 0
        ? "partial"
        : "verified",
    computedDistanceKm,
    reasons,
  };
}