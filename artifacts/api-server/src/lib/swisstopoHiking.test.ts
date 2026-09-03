import { test } from "node:test";
import assert from "node:assert/strict";
import { assessSac } from "./swisstopoHiking";

test("prefers an OSM sac_scale as an exact SAC value", () => {
  assert.deepEqual(assessSac("mountain_hiking", "T3"), {
    value: "T2",
    source: "osm_exact",
  });
});

test("marks the swissTLM3D fallback as derived", () => {
  assert.deepEqual(assessSac(null, "T3"), {
    value: "T3",
    source: "swisstopo_derived",
  });
});

test("does not turn an absent SAC value into an estimate", () => {
  assert.deepEqual(assessSac(null, null), {
    value: "unbekannt",
    source: "unknown",
  });
});