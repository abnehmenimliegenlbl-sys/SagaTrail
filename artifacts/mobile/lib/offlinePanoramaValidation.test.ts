import assert from "node:assert/strict";
import test from "node:test";

import {
  isOfflinePanoramaDatenbank,
  PANORAMA_OFFLINE_SOURCE,
  PANORAMA_OFFLINE_VERSION,
  PANORAMA_ROUTE_CORRIDOR_KM,
} from "./offlinePanoramaValidation";

type TestPackage = {
  version: number;
  source: string;
  elevationSource: string;
  visibilitySource: string;
  coverage: {
    peakCorridorKm: number;
    terrainRadiusM: number | null;
  };
  downloadedAt: number;
  peaks: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    elevationM: number | null;
    elevationSource: string;
  }[];
  terrainProfile: { distanceKm: number; altM: number }[];
  terrainModel?: unknown;
};

function validPackage(): TestPackage {
  return {
    version: PANORAMA_OFFLINE_VERSION,
    source: PANORAMA_OFFLINE_SOURCE,
    elevationSource: "OpenStreetMap ele tag",
    visibilitySource: "SwissTopo DTM radial profiles",
    coverage: {
      peakCorridorKm: PANORAMA_ROUTE_CORRIDOR_KM,
      terrainRadiusM: null,
    },
    downloadedAt: 1,
    peaks: [
      {
        id: "peak-1",
        name: "Test peak",
        lat: 46.8,
        lng: 8.2,
        elevationM: null,
        elevationSource: "unknown",
      },
    ],
    terrainProfile: [
      { distanceKm: 0, altM: 1000 },
      { distanceKm: 1, altM: 1100 },
    ],
  };
}

test("accepts a complete offline panorama package", () => {
  assert.equal(isOfflinePanoramaDatenbank(validPackage()), true);
});

test("rejects corrupted peak coordinates before display", () => {
  const payload = validPackage();
  payload.peaks[0].lat = 91;
  assert.equal(isOfflinePanoramaDatenbank(payload), false);
});

test("rejects incomplete or unordered terrain profiles", () => {
  const payload = validPackage();
  payload.terrainProfile = [
    { distanceKm: 0, altM: 1000 },
    { distanceKm: 0, altM: 1100 },
  ];
  assert.equal(isOfflinePanoramaDatenbank(payload), false);
});

test("rejects malformed terrain models instead of passing them to the renderer", () => {
  const payload = validPackage();
  payload.terrainModel = {
    version: 1,
    source: "SwissTopo DTM radial profiles",
    center: { lat: 46.8, lng: 8.2 },
    radiusM: 0,
    sectors: 16,
    rings: 7,
    fetchedAt: 1,
    observerElevationM: null,
    rays: [],
  };
  assert.equal(isOfflinePanoramaDatenbank(payload), false);
});