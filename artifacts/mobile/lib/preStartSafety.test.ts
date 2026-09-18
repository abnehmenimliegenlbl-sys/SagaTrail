import assert from "node:assert/strict";
import test from "node:test";

import type { TrailConditionReport } from "@workspace/api-client-react";

import { evaluatePreStartSafety, type PreStartSafetyInput, type SafetyClosure } from "./preStartSafety";

const NOW = Date.parse("2026-09-18T10:00:00.000Z");

function baseInput(overrides: Partial<PreStartSafetyInput> = {}): PreStartSafetyInput {
  return {
    nowMs: NOW,
    weather: {
      isThunderstorm: false,
      trailConditionLevel: "gut",
      conditionLabel: "Klar",
    } as PreStartSafetyInput["weather"],
    weatherLoading: false,
    weatherError: false,
    avalanche: {
      available: false,
      dangerLevel: null,
      reason: "no-bulletin",
    } as PreStartSafetyInput["avalanche"],
    avalancheLoading: false,
    trailConditions: [],
    conditionsLoading: false,
    sperrungen: [],
    sperrungenLoading: false,
    ...overrides,
  };
}

function condition(condition: TrailConditionReport["condition"], reportedAt: Date): TrailConditionReport {
  return { id: `condition-${condition}`, routeId: "route-1", condition, reportedAt: reportedAt.toISOString() };
}

test("postpones the start for a thunderstorm", () => {
  const result = evaluatePreStartSafety(
    baseInput({
      weather: {
        isThunderstorm: true,
        trailConditionLevel: "kritisch",
        conditionLabel: "Gewitter",
      } as PreStartSafetyInput["weather"],
    }),
  );

  assert.equal(result.decision, "postpone");
  assert.equal(result.reasons[0]?.code, "thunderstorm");
});

test("postpones the start for high avalanche danger", () => {
  const result = evaluatePreStartSafety(
    baseInput({
      avalanche: {
        available: true,
        dangerLevel: 4,
        reason: null,
      } as PreStartSafetyInput["avalanche"],
    }),
  );

  assert.equal(result.decision, "postpone");
  assert.ok(result.reasons.some((reason) => reason.code === "avalanche-high"));
});

test("postpones for a fresh blocked community report but not an old one", () => {
  const fresh = evaluatePreStartSafety(
    baseInput({
      trailConditions: [
        condition("blocked", new Date(NOW - 60 * 60 * 1000)),
      ],
    }),
  );
  const old = evaluatePreStartSafety(
    baseInput({
      trailConditions: [
        condition("blocked", new Date(NOW - 8 * 24 * 60 * 60 * 1000)),
      ],
    }),
  );

  assert.equal(fresh.decision, "postpone");
  assert.equal(old.decision, "start");
});

test("keeps RSS notices out of the route verdict", () => {
  const rssClosure: SafetyClosure = {
    id: "rss-1",
    title: "National notice",
    source: "rss",
    typ: "sperrung",
  };
  const result = evaluatePreStartSafety(baseInput({ sperrungen: [rssClosure] }));

  assert.equal(result.decision, "start");
  assert.equal(result.activeClosures.length, 0);
});

test("uses caution for canton-scoped admin notices and incomplete data", () => {
  const closureResult = evaluatePreStartSafety(
    baseInput({
      sperrungen: [
        {
          id: "admin-1",
          title: "Wegschaden",
          source: "admin",
          typ: "wegschaden",
        },
      ],
    }),
  );
  const loadingResult = evaluatePreStartSafety(
    baseInput({
      weatherLoading: true,
      weather: null,
    }),
  );

  assert.equal(closureResult.decision, "caution");
  assert.equal(loadingResult.decision, "caution");
  assert.equal(loadingResult.dataMissing, true);
});

test("uses caution for avalanche level three", () => {
  const result = evaluatePreStartSafety(
    baseInput({
      avalanche: {
        available: true,
        dangerLevel: 3,
        reason: null,
      } as PreStartSafetyInput["avalanche"],
    }),
  );

  assert.equal(result.decision, "caution");
  assert.ok(result.reasons.some((reason) => reason.code === "avalanche-moderate"));
});