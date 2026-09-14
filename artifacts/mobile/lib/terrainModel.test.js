"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const terrainModel_1 = require("./terrainModel");
function model(overrides = {}) {
    const ray = (bearingDeg) => ({
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
(0, node_test_1.default)("hides a peak only when a real terrain sample is above its sightline", () => {
    const terrain = model();
    const blocked = (0, terrainModel_1.terrainVisibilityForPeak)(terrain, { bearingDeg: 0, distanceKm: 0.4, elevationAngleDeg: 5 }, 1000);
    const visible = (0, terrainModel_1.terrainVisibilityForPeak)(terrain, { bearingDeg: 0, distanceKm: 0.4, elevationAngleDeg: 20 }, 1000);
    strict_1.default.equal(blocked, "occluded");
    strict_1.default.equal(visible, "visible");
});
(0, node_test_1.default)("keeps a peak visible as unknown when evidence is insufficient", () => {
    const terrain = model({ rays: [model().rays[0]] });
    strict_1.default.equal((0, terrainModel_1.terrainVisibilityForPeak)(terrain, { bearingDeg: 0, distanceKm: 0.4, elevationAngleDeg: null }, 1000), "unknown");
    strict_1.default.equal((0, terrainModel_1.terrainVisibilityForPeak)(terrain, { bearingDeg: 12, distanceKm: 0.4, elevationAngleDeg: 5 }, 1000), "unknown");
    strict_1.default.equal((0, terrainModel_1.terrainVisibilityForPeak)(terrain, { bearingDeg: 0, distanceKm: 0.8, elevationAngleDeg: 5 }, 1000), "unknown");
});
(0, node_test_1.default)("builds a compass-aligned mesh only with a known observer height", () => {
    const mesh = (0, terrainModel_1.buildLocalTerrainMesh)(model(), 0);
    strict_1.default.ok(mesh);
    strict_1.default.equal(mesh.vertices.length, 12);
    strict_1.default.equal(mesh.triangleIndices.length, 16);
    strict_1.default.ok(mesh.vertices.some(([x, y, z]) => x > 0 && z < 0 && y > 0));
    strict_1.default.ok(mesh.texcoords.slice(0, 3).every(([, v], index) => index === 0 ? v === 0.5 : v > 0.5), "north-facing terrain must sample the northern half of a flipY WMS texture");
    strict_1.default.equal((0, terrainModel_1.buildLocalTerrainMesh)(model({ observerElevationM: null }), 0), null);
    strict_1.default.equal((0, terrainModel_1.buildLocalTerrainMesh)(model(), null), null);
});
(0, node_test_1.default)("projects a geographic point onto the exact rendered terrain triangle", () => {
    const terrain = model();
    const point = {
        lat: terrain.center.lat + (50 * 180) / (Math.PI * 6_371_000),
        lng: terrain.center.lng,
    };
    const projected = (0, terrainModel_1.projectGeographicPointOntoTerrain)(terrain, point);
    strict_1.default.ok(projected);
    strict_1.default.ok(Math.abs(projected[0]) < 0.0001);
    strict_1.default.ok(Math.abs(projected[2] + 2) < 0.001);
    strict_1.default.ok(Math.abs(projected[1] - 0.6) < 0.001);
});
const ROUTE_CENTER = { lat: 46, lng: 7 };
const LONG_ROUTE = [
    [46, 7],
    [46.005, 7],
    [46.01, 7],
    [46.015, 7],
    [46.02, 7],
];
(0, node_test_1.default)("projects the complete route into compressed AR depth", () => {
    const segments = (0, terrainModel_1.buildGeographicTerrainRouteSegments)(null, LONG_ROUTE, ROUTE_CENTER, 500, null, { maxSegments: 96, maxVirtualDistanceM: 2_000 });
    strict_1.default.ok(segments.length > 1);
    strict_1.default.ok(segments.length <= 96);
    const points = segments.flatMap((segment) => segment.points);
    strict_1.default.ok(points.length > 2);
    strict_1.default.ok(points.every(([east, _elevation, north]) => Math.hypot(east, north) <= 80.001));
    strict_1.default.ok(segments[0].thickness > segments.at(-1).thickness);
    strict_1.default.ok(segments.at(-1).thickness >= 0.032);
    for (let index = 1; index < segments.length; index++) {
        strict_1.default.deepEqual(segments[index - 1].points.at(-1), segments[index].points[0]);
    }
});
(0, node_test_1.default)("places the destination flag at the final route point", () => {
    const destination = (0, terrainModel_1.buildGeographicTerrainRouteDestination)(null, LONG_ROUTE, ROUTE_CENTER, 500, { maxVirtualDistanceM: 2_000 });
    strict_1.default.ok(destination);
    strict_1.default.ok(Math.hypot(destination[0], destination[2]) > 0);
    strict_1.default.ok(Math.hypot(destination[0], destination[2]) <= 80.001);
});
(0, node_test_1.default)("snaps a nearby GPS fix to the route for the AR origin", () => {
    const gpsFix = { lat: 46.004, lng: 7.00012 };
    const snapped = (0, terrainModel_1.routeOriginForAR)(gpsFix, LONG_ROUTE);
    strict_1.default.ok(Math.abs(snapped.lat - gpsFix.lat) < 0.00001);
    strict_1.default.ok(Math.abs(snapped.lng - 7) < 0.00001);
});
(0, node_test_1.default)("does not pull an off-route AR origin onto a distant route", () => {
    const gpsFix = { lat: 46.004, lng: 7.002 };
    const origin = (0, terrainModel_1.routeOriginForAR)(gpsFix, LONG_ROUTE);
    strict_1.default.deepEqual(origin, gpsFix);
});
(0, node_test_1.default)("hides the walked route while preserving the fixed geographic origin", () => {
    const route = [
        [46, 7],
        [46.005, 7],
        [46.01, 7],
    ];
    const remaining = (0, terrainModel_1.routeGeometryAheadOfPosition)(route, { lat: 46, lng: 7 }, { lat: 46.006, lng: 7.00001 });
    strict_1.default.ok(remaining);
    strict_1.default.equal(remaining.length, 2);
    strict_1.default.ok(Math.abs(remaining[0][0] - 46.006) < 0.00001);
    strict_1.default.equal(remaining[1][0], 46.01);
});
(0, node_test_1.default)("refreshes the AR route near the moving observer without resetting its world position", () => {
    const metersPerLatitudeDegree = 180 / (Math.PI * 6_371_000);
    const route = Array.from({ length: 7 }, (_, index) => [
        46 + (index * 20 * metersPerLatitudeDegree),
        7,
    ]);
    const origin = { lat: route[0][0], lng: route[0][1] };
    const observer = { lat: route[2][0], lng: route[2][1] };
    const remaining = (0, terrainModel_1.routeGeometryAheadOfPosition)(route, origin, observer);
    const worldOffset = (0, terrainModel_1.arWorldOffsetForPosition)(origin, observer);
    strict_1.default.ok(remaining);
    const segments = (0, terrainModel_1.buildGeographicTerrainRouteSegments)(null, remaining, observer, 500, null, {
        maxRenderedDistanceM: 50,
        maxRouteDistanceM: (0, terrainModel_1.routeGeometryMaxDistanceM)(route, observer),
        worldOffset,
    });
    const points = segments.flatMap((segment) => segment.points);
    strict_1.default.ok(points.length >= 2);
    strict_1.default.ok(Math.abs(points[0][2] - worldOffset[2]) < 0.01);
    strict_1.default.ok(points.some((point) => point[2] < worldOffset[2] - 0.5));
});
(0, node_test_1.default)("keeps only the connected near-field prefix for looped routes", () => {
    const metersPerLatitudeDegree = 180 / (Math.PI * 6_371_000);
    const route = [
        [46, 7],
        [46 + 40 * metersPerLatitudeDegree, 7],
        [46 + 40 * metersPerLatitudeDegree, 7 + 40 * metersPerLatitudeDegree],
        [46, 7 + 40 * metersPerLatitudeDegree],
        [46 + 5 * metersPerLatitudeDegree, 7 + 5 * metersPerLatitudeDegree],
    ];
    const segments = (0, terrainModel_1.buildGeographicTerrainRouteSegments)(null, route, ROUTE_CENTER, 500, null, {
        maxRenderedDistanceM: 50,
        realScaleRadiusM: 50,
        maxRouteDistanceM: 250,
        maxVirtualDistanceM: 300,
    });
    const points = segments.flatMap((segment) => segment.points);
    strict_1.default.ok(points.length >= 2);
    strict_1.default.ok(points.every(([east, _elevation, north]) => Math.hypot(east, north) <= 2.001));
    strict_1.default.ok(points.every((point, index) => {
        if (index === 0)
            return true;
        const previous = points[index - 1];
        return Math.hypot(point[0] - previous[0], point[2] - previous[2]) < 2.1;
    }));
});
(0, node_test_1.default)("keeps the full route when the GPS fix is too far from it", () => {
    const route = [
        [46, 7],
        [46.005, 7],
        [46.01, 7],
    ];
    strict_1.default.equal((0, terrainModel_1.routeGeometryAheadOfPosition)(route, { lat: 46, lng: 7 }, { lat: 46.006, lng: 7.002 }), null);
});
