import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { buildRouteGradeSegments, type RouteGradeBand, type TerrainProfilePoint } from "./terrainCues";

const ROUTE_GEOMETRY = [
  [46, 7],
  [46.00045, 7],
  [46.0009, 7],
  [46.00135, 7],
  [46.0018, 7],
];

function routeDistanceKm(): number {
  const lat1 = (ROUTE_GEOMETRY[0]![0] * Math.PI) / 180;
  const lat2 = (ROUTE_GEOMETRY[1]![0] * Math.PI) / 180;
  const deltaLat = ((ROUTE_GEOMETRY[1]![0] - ROUTE_GEOMETRY[0]![0]) * Math.PI) / 180;
  const haversine = Math.sin(deltaLat / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function linearProfile(gradePct: number): TerrainProfilePoint[] {
  const lengthKm = routeDistanceKm() * 4;
  return [0, 1, 2, 3, 4].map((index) => ({
    distanceKm: (lengthKm * index) / 4,
    altM: (gradePct * 10 * lengthKm * index) / 4,
  }));
}

function bandsFor(
  geometry: number[][],
  profile: TerrainProfilePoint[],
): RouteGradeBand[] {
  return buildRouteGradeSegments(geometry, profile).map((segment) => segment.band);
}

function assertEveryBand(
  geometry: number[][],
  profile: TerrainProfilePoint[],
  expected: RouteGradeBand,
): void {
  const bands = bandsFor(geometry, profile);
  assert.ok(bands.length > 0);
  assert.ok(bands.every((band) => band === expected), bands.join(", "));
}

test("keeps all four map color thresholds stable", () => {
  assertEveryBand(ROUTE_GEOMETRY, linearProfile(9.9), "green");
  assertEveryBand(ROUTE_GEOMETRY, linearProfile(10), "yellow");
  assertEveryBand(ROUTE_GEOMETRY, linearProfile(20), "orange");
  assertEveryBand(ROUTE_GEOMETRY, linearProfile(30), "red");
});

test("does not turn a single short elevation spike into red map segments", () => {
  const profile = linearProfile(0);
  profile[1]!.altM = 40;
  assertEveryBand(ROUTE_GEOMETRY, profile, "green");
});

test("uses the absolute grade for descents as well as climbs", () => {
  assertEveryBand(ROUTE_GEOMETRY, linearProfile(-30), "red");
});

test("keeps the WordPress map viewer in sync with the mobile classifier", () => {
  const wordpress = readFileSync(
    new URL("../../../wordpress/routen.php", import.meta.url).pathname,
    "utf8",
  );
  const start = wordpress.indexOf("function strDistanceKm");
  const end = wordpress.indexOf("function strLoadElevationProfile", start);
  assert.ok(start >= 0 && end > start);

  const context: Record<string, unknown> = {};
  vm.runInNewContext(String(wordpress).slice(start, end), context);
  const buildSegments = context.strBuildGradeSegments as (
    geometry: number[][],
    profile: TerrainProfilePoint[],
  ) => { color: string }[];
  const colors = buildSegments(ROUTE_GEOMETRY, linearProfile(30)).map(
    (segment) => segment.color,
  );
  assert.ok(colors.length > 0);
  assert.ok(colors.every((color) => color === "#DA291C"), colors.join(", "));
});