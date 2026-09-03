import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLocalTerrainMesh,
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
  assert.equal(buildLocalTerrainMesh(model({ observerElevationM: null }), 0), null);
  assert.equal(buildLocalTerrainMesh(model(), null), null);
});
