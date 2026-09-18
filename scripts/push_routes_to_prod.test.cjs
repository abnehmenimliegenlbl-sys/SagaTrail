const assert = require("node:assert/strict");
const test = require("node:test");

const { estimateMinutes, mapRouteRow } = require("./route_sync_mapping.cjs");

function sourceRow(overrides = {}) {
  return {
    id: "osm-test",
    saga_id: "saga-test",
    canton: "ZH",
    distance_km: 3.7,
    distance_tag_km: "8.2",
    ascent_m: 1250,
    minutes: 60,
    ...overrides,
  };
}

test("transfers the official distance tag as a number", () => {
  const mapped = mapRouteRow(sourceRow());

  assert.equal(mapped.distanceKm, 3.7);
  assert.equal(mapped.distanceTagKm, 8.2);
  assert.equal(mapped.minutes, estimateMinutes(8.2, 1250));
});

test("falls back to geometry distance only when no official tag exists", () => {
  const mapped = mapRouteRow(sourceRow({ distance_tag_km: null }));

  assert.equal(mapped.distanceTagKm, null);
  assert.equal(mapped.minutes, estimateMinutes(3.7, 1250));
});

test("does not send invalid numeric tags as NaN", () => {
  const mapped = mapRouteRow(
    sourceRow({ distance_tag_km: "not-a-number", distance_km: "4.5" }),
  );

  assert.equal(mapped.distanceTagKm, null);
  assert.equal(mapped.distanceKm, 4.5);
  assert.equal(mapped.minutes, estimateMinutes(4.5, 1250));
});