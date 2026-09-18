import assert from "node:assert/strict";
import test from "node:test";

import { filterRoutesByThemes } from "./routeThemeFilter";
import type { RouteThemeKey } from "./routeThemes";

const routes = [
  { id: "water", name: "Water route" },
  { id: "castle", name: "Castle route" },
  { id: "both", name: "Water and castle route" },
  { id: "none", name: "Unmatched route" },
] as const;

const evidence: Record<string, RouteThemeKey[]> = {
  water: ["wasserwege"],
  castle: ["burgen_ruinen_alte_wege"],
  both: ["wasserwege", "burgen_ruinen_alte_wege"],
  none: [],
};

test("keeps every route when no theme is selected", () => {
  assert.deepEqual(
    filterRoutesByThemes(routes, evidence, []),
    routes,
  );
});

test("filters to routes matching one selected theme", () => {
  assert.deepEqual(
    filterRoutesByThemes(routes, evidence, ["wasserwege"]).map((route) => route.id),
    ["water", "both"],
  );
});

test("combines multiple selected themes with OR semantics", () => {
  assert.deepEqual(
    filterRoutesByThemes(
      routes,
      evidence,
      ["wasserwege", "burgen_ruinen_alte_wege"],
    ).map((route) => route.id),
    ["water", "castle", "both"],
  );
});

test("excludes routes without evidence and returns an empty result when none match", () => {
  assert.deepEqual(
    filterRoutesByThemes(routes, evidence, ["gipfel_panorama"]).map((route) => route.id),
    [],
  );
});