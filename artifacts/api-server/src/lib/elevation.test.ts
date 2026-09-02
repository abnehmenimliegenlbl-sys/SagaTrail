import assert from "node:assert/strict";
import test from "node:test";
import type { Logger } from "pino";
import { computeElevationProfile } from "./elevation";

const log = {
  warn: () => undefined,
} as unknown as Logger;

function routePoints(count: number): { lat: number; lng: number }[] {
  return Array.from({ length: count }, (_, index) => ({
    lat: 46 + index * 0.001,
    lng: 7 + index * 0.0005,
  }));
}

function profileResponse(request: string | URL | Request, altitudeOffset: number): Response {
  const url = new URL(request.toString());
  const geometry = JSON.parse(url.searchParams.get("geom") ?? "{}") as {
    coordinates: [number, number][];
  };
  const coordinates = geometry.coordinates;
  return new Response(
    JSON.stringify(
      coordinates.map((_, index) => ({
        dist: 25 + index * 100,
        alts: { COMB: altitudeOffset + index },
      })),
    ),
    { headers: { "content-type": "application/json" } },
  );
}

test("splits long routes into overlapping chunks and merges them from zero", async () => {
  const originalFetch = globalThis.fetch;
  const requests: { coordinates: [number, number][] }[] = [];

  globalThis.fetch = async (request) => {
    const url = new URL(request.toString());
    const geometry = JSON.parse(url.searchParams.get("geom") ?? "{}") as {
      coordinates: [number, number][];
    };
    requests.push(geometry);
    return profileResponse(request, requests.length * 1000);
  };

  try {
    const profile = await computeElevationProfile(routePoints(241), log);

    assert.ok(profile);
    assert.equal(requests.length, 3);
    assert.deepEqual(requests[0]!.coordinates.at(-1), requests[1]!.coordinates[0]);
    assert.deepEqual(requests[1]!.coordinates.at(-1), requests[2]!.coordinates[0]);
    assert.equal(profile[0]!.distanceKm, 0);
    assert.equal(profile.length, 241);
    for (let index = 1; index < profile.length; index++) {
      assert.ok(profile[index]!.distanceKm >= profile[index - 1]!.distanceKm);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not return a partial profile when one chunk fails", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;

  globalThis.fetch = async (request) => {
    requestCount++;
    if (requestCount === 2) return new Response("upstream failure", { status: 503 });
    return profileResponse(request, 0);
  };

  try {
    const profile = await computeElevationProfile(routePoints(241), log);

    assert.equal(profile, null);
    assert.equal(requestCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects a chunk with a missing elevation value instead of shifting points", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (request) => {
    const response = profileResponse(request, 0);
    const data = (await response.json()) as { dist: number; alts: { COMB?: number } }[];
    delete data[3]!.alts.COMB;
    return new Response(JSON.stringify(data), {
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const profile = await computeElevationProfile(routePoints(121), log);

    assert.equal(profile, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});