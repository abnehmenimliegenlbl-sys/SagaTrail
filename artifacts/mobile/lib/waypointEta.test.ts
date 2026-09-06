import assert from "node:assert/strict";
import test from "node:test";

import { estimateRouteMinutes } from "./waypointEta";

test("estimates combined horizontal and ascent walking time", () => {
  assert.equal(estimateRouteMinutes(5, 400), 105);
});

test("uses horizontal time for a flat route and keeps a minimum", () => {
  assert.equal(estimateRouteMinutes(8, 0), 120);
  assert.equal(estimateRouteMinutes(0.2, 0), 15);
});