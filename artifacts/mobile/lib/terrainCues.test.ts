import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import {
  buildRouteGradeSegments,
  calculateProfileAscentM,
  getSmoothedGradePctAtDistance,
  limitTerrainSectionsForSpeech,
  type RouteGradeBand,
  type TerrainProfilePoint,
  type TerrainSection,
} from "./terrainCues";

const ROUTE_GEOMETRY = [
  [46, 7],
  [46.00045, 7],
  [46.0009, 7],
  [46.00135, 7],
  [46.0018, 7],
];

function routeDistanceKm(): number {
  return ROUTE_GEOMETRY.slice(1).reduce((total, point, index) => {
    const previous = ROUTE_GEOMETRY[index]!;
    const deltaLat = ((point[0] - previous[0]) * Math.PI) / 180;
    const haversine = Math.sin(deltaLat / 2) ** 2;
    return total + 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }, 0);
}

function linearProfile(gradePct: number): TerrainProfilePoint[] {
  const lengthKm = routeDistanceKm();
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

test("calculates total ascent from real climbs without counting descents", () => {
  assert.equal(
    calculateProfileAscentM([
      { distanceKm: 0, altM: 100 },
      { distanceKm: 0.1, altM: 160 },
      { distanceKm: 0.2, altM: 140 },
      { distanceKm: 0.3, altM: 220 },
    ]),
    140,
  );
});

test("does not count an isolated short DTM spike as ascent", () => {
  assert.equal(
    calculateProfileAscentM([
      { distanceKm: 0, altM: 100 },
      { distanceKm: 0.05, altM: 180 },
      { distanceKm: 0.1, altM: 100 },
    ]),
    0,
  );
});

test("uses the absolute grade for descents as well as climbs", () => {
  assertEveryBand(ROUTE_GEOMETRY, linearProfile(-30), "red");
});

test("reports the signed smoothed grade for the active virtual route position", () => {
  const uphill = getSmoothedGradePctAtDistance(linearProfile(12), routeDistanceKm() / 2);
  const downhill = getSmoothedGradePctAtDistance(linearProfile(-12), routeDistanceKm() / 2);

  assert.ok(uphill != null);
  assert.ok(downhill != null);
  assert.ok(Math.abs(uphill - 12) < 0.01);
  assert.ok(Math.abs(downhill + 12) < 0.01);
  assert.equal(getSmoothedGradePctAtDistance(null, 0), null);
});

test("keeps a flat feeder green before a steep route section", () => {
  const geometry = [
    [46, 7],
    [46.00045, 7],
    [46.0009, 7],
    [46.00135, 7],
    [46.0018, 7],
    [46.00225, 7],
  ];
  const lengthKm = geometry.reduce((total, point, index) => {
    if (index === 0) return total;
    const previous = geometry[index - 1]!;
    const deltaLat = ((point[0] - previous[0]) * Math.PI) / 180;
    const haversine = Math.sin(deltaLat / 2) ** 2;
    return total + 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }, 0);
  const feederLengthKm = lengthKm * 0.4;
  const profile: TerrainProfilePoint[] = [
    { distanceKm: 0, altM: 0 },
    { distanceKm: feederLengthKm, altM: 0 },
    { distanceKm: lengthKm, altM: 120 },
  ];

  const bands = bandsFor(geometry, profile);
  assert.ok(bands.length >= 3);
  assert.deepEqual(bands.slice(0, 2), ["green", "green"]);
  assert.ok(bands.slice(2).some((band) => band === "red"));
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
  assert.ok(colors.every((color) => color === "#FF3030"), colors.join(", "));
});

function terrainSection(
  id: string,
  startKm: number,
  peakGradePct: number,
  isVerySteep = false,
): TerrainSection {
  return {
    id,
    startKm,
    endKm: startKm + 0.2,
    lengthKm: 0.2,
    direction: "up",
    elevationChangeM: peakGradePct * 2,
    averageGradePct: peakGradePct,
    peakGradePct,
    isVerySteep,
  };
}

test("limits dense terrain voice cues while retaining the strongest section", () => {
  const selected = limitTerrainSectionsForSpeech([
    terrainSection("mild", 0.1, 12),
    terrainSection("stronger", 0.35, 18),
    terrainSection("safety", 0.52, 31, true),
    terrainSection("later", 1.05, 14),
  ]);

  assert.deepEqual(
    selected.map((section) => section.id),
    ["safety", "later"],
  );
});