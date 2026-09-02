import assert from "node:assert/strict";
import test from "node:test";
import type { Logger } from "pino";
import { computeElevationProfile } from "./elevation";

const log = {
  warn: () => undefined,
} as unknown as Logger;

async function captureRetryDelays(action: () => Promise<unknown>): Promise<number[]> {
  const originalSetTimeout = globalThis.setTimeout;
  const delays: number[] = [];
  globalThis.setTimeout = ((callback: () => void, delay?: number) => {
    delays.push(delay ?? 0);
    callback();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  try {
    await action();
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
  return delays;
}

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
    if (requestCount >= 2 && requestCount <= 4) {
      return new Response("upstream failure", { status: 503 });
    }
    return profileResponse(request, 0);
  };

  try {
    const profile = await computeElevationProfile(routePoints(241), log);

    assert.equal(profile, null);
    assert.equal(requestCount, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

for (const status of [408, 425, 429, 500, 502, 503, 504]) {
  test(`retries temporary HTTP ${status} before returning a complete profile`, async () => {
    const originalFetch = globalThis.fetch;
    let requestCount = 0;

    globalThis.fetch = async (request) => {
      requestCount++;
      if (requestCount === 1) {
        return new Response("temporary upstream failure", { status });
      }
      return profileResponse(request, 0);
    };

    try {
      const profile = await computeElevationProfile(routePoints(2), log);

      assert.ok(profile);
      assert.equal(requestCount, 2);
      assert.equal(profile.length, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}

test("honors a valid Retry-After seconds value for HTTP 429", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;

  globalThis.fetch = async (request) => {
    requestCount++;
    if (requestCount === 1) {
      return new Response("rate limited", {
        status: 429,
        headers: { "Retry-After": "1" },
      });
    }
    return profileResponse(request, 0);
  };

  try {
    const delays = await captureRetryDelays(() =>
      computeElevationProfile(routePoints(2), log),
    );

    assert.deepEqual(delays, [1000]);
    assert.equal(requestCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses the bounded fallback delay when Retry-After is missing", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;

  globalThis.fetch = async (request) => {
    requestCount++;
    if (requestCount === 1) return new Response("rate limited", { status: 429 });
    return profileResponse(request, 0);
  };

  try {
    const delays = await captureRetryDelays(() =>
      computeElevationProfile(routePoints(2), log),
    );

    assert.deepEqual(delays, [200]);
    assert.equal(requestCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses the bounded fallback delay when Retry-After is invalid", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;

  globalThis.fetch = async (request) => {
    requestCount++;
    if (requestCount === 1) {
      return new Response("rate limited", {
        status: 429,
        headers: { "Retry-After": "later" },
      });
    }
    return profileResponse(request, 0);
  };

  try {
    const delays = await captureRetryDelays(() =>
      computeElevationProfile(routePoints(2), log),
    );

    assert.deepEqual(delays, [200]);
    assert.equal(requestCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retries a network failure before returning a complete profile", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;

  globalThis.fetch = async (request) => {
    requestCount++;
    if (requestCount === 1) throw new Error("temporary network failure");
    return profileResponse(request, 0);
  };

  try {
    const profile = await computeElevationProfile(routePoints(2), log);

    assert.ok(profile);
    assert.equal(requestCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

for (const status of [400, 401, 403, 404, 409, 422, 451, 499]) {
  test(`does not retry permanent HTTP ${status} failure`, async () => {
    const originalFetch = globalThis.fetch;
    let requestCount = 0;

    globalThis.fetch = async () => {
      requestCount++;
      return new Response("permanent upstream failure", { status });
    };

    try {
      const profile = await computeElevationProfile(routePoints(2), log);

      assert.equal(profile, null);
      assert.equal(requestCount, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}

test("returns null after the bounded retry limit for a persistent HTTP failure", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;

  globalThis.fetch = async () => {
    requestCount++;
    return new Response("upstream failure", { status: 503 });
  };

  try {
    const profile = await computeElevationProfile(routePoints(2), log);

    assert.equal(profile, null);
    assert.equal(requestCount, 3);
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