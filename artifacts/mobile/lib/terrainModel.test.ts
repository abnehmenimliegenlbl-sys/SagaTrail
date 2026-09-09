import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLocalTerrainMesh,
  buildGeographicTerrainRouteDestination,
  buildGeographicTerrainRouteSegments,
  routeOriginForAR,
  terrainVisibilityForPeak,
  type LocalTerrainModel,
} from "./terrainModel";

function model(overrides: Partial<LocalTerrainModel> = {}): LocalTerrainModel {
  const ray = (bearingDeg: number) => ({
    bearingDeg,
    samples: [
      { distanceM: 0, elevationM: 1000 },
      { distanceM: 100, elevationM: 1030 },
      { distanceM: 500, elevationM: 1000 },
    ],
  });
  return {
    version: 1,
    source: "SwissTopo DTM radial profiles",
    center: { lat: 46.8, lng: 8.2 },
    radiusM: 500,
    sectors: 4,
    rings: 3,
    fetchedAt: 1,
    observerElevationM: 1000,
    rays: [ray(0), ray(90), ray(180), ray(270)],
    ...overrides,
  };
}

test("hides a peak only when a real terrain sample is above its sightline", () => {
  const terrain = model();
  const blocked = terrainVisibilityForPeak(
    terrain,
    { bearingDeg: 0, distanceKm: 0.4, elevationAngleDeg: 5 },
    1000,
  );
  const visible = terrainVisibilityForPeak(
    terrain,
    { bearingDeg: 0, distanceKm: 0.4, elevationAngleDeg: 20 },
    1000,
  );

  assert.equal(blocked, "occluded");
  assert.equal(visible, "visible");
});

test("keeps a peak visible as unknown when evidence is insufficient", () => {
  const terrain = model({ rays: [model().rays[0]!] });

  assert.equal(
    terrainVisibilityForPeak(
      terrain,
      { bearingDeg: 0, distanceKm: 0.4, elevationAngleDeg: null },
      1000,
    ),
    "unknown",
  );
  assert.equal(
    terrainVisibilityForPeak(
      terrain,
      { bearingDeg: 12, distanceKm: 0.4, elevationAngleDeg: 5 },
      1000,
    ),
    "unknown",
  );
  assert.equal(
    terrainVisibilityForPeak(
      terrain,
      { bearingDeg: 0, distanceKm: 0.8, elevationAngleDeg: 5 },
      1000,
    ),
    "unknown",
  );
});

test("builds a compass-aligned mesh only with a known observer height", () => {
  const mesh = buildLocalTerrainMesh(model(), 0);
  assert.ok(mesh);
  assert.equal(mesh.vertices.length, 12);
  assert.equal(mesh.triangleIndices.length, 16);
  assert.ok(mesh.vertices.some(([x, y, z]) => x > 0 && z < 0 && y > 0));
  assert.ok(
    mesh.texcoords.slice(0, 3).every(([, v], index) =>
      index === 0 ? v === 0.5 : v > 0.5,
    ),
    "north-facing terrain must sample the northern half of a flipY WMS texture",
  );
  assert.equal(buildLocalTerrainMesh(model({ observerElevationM: null }), 0), null);
  assert.equal(buildLocalTerrainMesh(model(), null), null);
});

const ROUTE_CENTER = { lat: 46, lng: 7 };
const LONG_ROUTE = [
  [46, 7],
  [46.005, 7],
  [46.01, 7],
  [46.015, 7],
  [46.02, 7],
];

test("projects the complete route into compressed AR depth", () => {
  const segments = buildGeographicTerrainRouteSegments(
    null,
    LONG_ROUTE,
    ROUTE_CENTER,
    500,
    null,
    { maxSegments: 96, maxVirtualDistanceM: 2_000 },
  );

  assert.ok(segments.length > 1);
  assert.ok(segments.length <= 96);
  const points = segments.flatMap((segment) => segment.points);
  assert.ok(points.length > 2);
  assert.ok(
    points.every(([east, _elevation, north]) => Math.hypot(east, north) <= 80.001),
  );
  assert.ok(segments[0]!.thickness > segments.at(-1)!.thickness);
  assert.ok(segments.at(-1)!.thickness >= 0.032);
  for (let index = 1; index < segments.length; index++) {
    assert.deepEqual(
      segments[index - 1]!.points.at(-1),
      segments[index]!.points[0],
    );
  }
});

test("places the destination flag at the final route point", () => {
  const destination = buildGeographicTerrainRouteDestination(
    null,
    LONG_ROUTE,
    ROUTE_CENTER,
    500,
    { maxVirtualDistanceM: 2_000 },
  );

  assert.ok(destination);
  assert.ok(Math.hypot(destination[0], destination[2]) > 0);
  assert.ok(Math.hypot(destination[0], destination[2]) <= 80.001);
});

test("snaps a nearby GPS fix to the route for the AR origin", () => {
  const gpsFix = { lat: 46.004, lng: 7.00012 };
  const snapped = routeOriginForAR(gpsFix, LONG_ROUTE);

  assert.ok(Math.abs(snapped.lat - gpsFix.lat) < 0.00001);
  assert.ok(Math.abs(snapped.lng - 7) < 0.00001);
});

test("does not pull an off-route AR origin onto a distant route", () => {
  const gpsFix = { lat: 46.004, lng: 7.002 };
  const origin = routeOriginForAR(gpsFix, LONG_ROUTE);

  assert.deepEqual(origin, gpsFix);
});
