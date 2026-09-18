import assert from "node:assert/strict";
import test from "node:test";

import {
  hasRealTerrainTriangle,
  parseTerrainCorridor,
  type TerrainGrid,
} from "./routeTerrain3d";

const grid: TerrainGrid = {
  rows: 2,
  columns: 2,
  bounds: { south: 46, west: 7, north: 46.01, east: 7.01 },
  grid: [
    [
      { lat: 46.01, lng: 7, elevationM: 1000 },
      { lat: 46.01, lng: 7.01, elevationM: null },
    ],
    [
      { lat: 46, lng: 7, elevationM: 900 },
      { lat: 46, lng: 7.01, elevationM: 950 },
    ],
  ],
};

test("preserves SwissTopo gaps and never builds a triangle through them", () => {
  const parsed = parseTerrainCorridor(grid);
  assert.ok(parsed);
  assert.equal(parsed.grid[0]![1]!.elevationM, null);
  assert.equal(hasRealTerrainTriangle(parsed, 0, 0, "upperLeft"), false);
  assert.equal(hasRealTerrainTriangle(parsed, 0, 0, "lowerRight"), false);
});

test("builds both terrain halves when every DTM height is real", () => {
  const complete: TerrainGrid = {
    ...grid,
    grid: grid.grid.map((row) =>
      row.map((cell) => ({ ...cell, elevationM: cell.elevationM ?? 975 })),
    ),
  };
  assert.equal(hasRealTerrainTriangle(complete, 0, 0, "upperLeft"), true);
  assert.equal(hasRealTerrainTriangle(complete, 0, 0, "lowerRight"), true);
});