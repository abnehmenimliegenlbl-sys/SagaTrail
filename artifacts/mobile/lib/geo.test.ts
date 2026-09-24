import assert from "node:assert/strict";
import test from "node:test";

import {
  distanceToRouteEndpointKm,
  filterBusAndTramStopsToRouteEndpoints,
  isAutoNarratablePoi,
} from "./geo";

const geometry = [
  [46.0000, 7.0000],
  [46.0100, 7.0000],
  [46.0200, 7.0000],
];

test("keeps bus and tram stops at the route endpoints", () => {
  const stops = [
    { id: "bus-start", kind: "highway=bus_stop", lat: 46.0005, lng: 7 },
    { id: "tram-end", kind: "railway=tram_stop", lat: 46.0195, lng: 7 },
  ];

  assert.deepEqual(
    filterBusAndTramStopsToRouteEndpoints(stops, geometry).map((stop) => stop.id),
    ["bus-start", "tram-end"],
  );
});

test("removes bus and tram stops in the route corridor", () => {
  const stops = [
    { id: "bus-middle", kind: "highway=bus_stop", lat: 46.0100, lng: 7.0005 },
    { id: "tram-middle", kind: "railway=tram_stop", lat: 46.0110, lng: 7.0005 },
  ];

  assert.deepEqual(filterBusAndTramStopsToRouteEndpoints(stops, geometry), []);
});

test("does not apply endpoint-only filtering to other POI types", () => {
  const chapel = { id: "chapel", kind: "historic=chapel", lat: 46.0100, lng: 7 };

  assert.deepEqual(
    filterBusAndTramStopsToRouteEndpoints([chapel], geometry),
    [chapel],
  );
  assert.ok(distanceToRouteEndpointKm(chapel, geometry) > 0.5);
});

test("bus and tram stops can stay in the POI list but never trigger an auto story", () => {
  assert.equal(isAutoNarratablePoi({ kind: "highway=bus_stop" }), false);
  assert.equal(isAutoNarratablePoi({ kind: "railway=tram_stop" }), false);
  assert.equal(isAutoNarratablePoi({ kind: "historic=castle" }), true);
});