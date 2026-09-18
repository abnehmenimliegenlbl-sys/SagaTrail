import assert from "node:assert/strict";
import test from "node:test";
import { assessRouteQuality } from "./routeQuality";

const validRoute = {
  geometry: [[47.0000, 8.0000], [47.0100, 8.0100]],
  distanceKm: 1.34,
  ascentM: 120,
  sac: "T2",
  sacSource: "osm_exact",
  geometryVersion: 1,
} as const;

test("marks a plausible route as verified", () => {
  const result = assessRouteQuality(validRoute);
  assert.equal(result.status, "verified");
  assert.ok(result.computedDistanceKm !== null);
  assert.deepEqual(result.reasons, []);
});

test("rejects a route whose stored distance diverges from geometry", () => {
  const result = assessRouteQuality({ ...validRoute, distanceKm: 50 });
  assert.equal(result.status, "invalid");
  assert.ok(result.reasons.includes("distance_geometry_mismatch"));
});

test("keeps unknown difficulty visible as partial, not falsely verified", () => {
  const result = assessRouteQuality({
    ...validRoute,
    sac: "unbekannt",
    sacSource: "unknown",
  });
  assert.equal(result.status, "partial");
  assert.ok(result.reasons.includes("difficulty_unknown"));
});