import assert from "node:assert/strict";
import {
  isValidGarminHikeLiveState,
  parseGarminSosRequest,
  toGarminHikeLiveState,
  withGarminSosAcknowledgement,
} from "../lib/garminProtocol";
import type { HikeLiveState } from "../lib/watchCompanion";

const canonicalState: HikeLiveState = {
  version: 1,
  sequence: 42,
  timestamp: 1_700_000_000_000,
  gpsFreshness: "fresh",
  nextNavigation: { direction: "right", bearingDeg: 92, distanceM: 650 },
  upcomingNavigations: [
    { direction: "right", bearingDeg: 92, distanceM: 650 },
    { direction: "left", bearingDeg: 140, distanceM: 1200 },
  ],
  plannedAscentM: 900,
  remainingAscentM: 490,
  terrainSection: { direction: "up", gradePct: 12, remainingM: 800, startsInM: 0 },
  safetyCheckin: { status: "active", remainingSec: 1800, liveLinkActive: true },
  offRoute: { distanceM: 35, bearingToRouteDeg: 210 },
  weather: {
    temperatureC: 18,
    weatherCode: 2,
    windKmh: 12,
    windGustsKmh: 28,
    precipitationMm: 0,
    isThunderstorm: false,
  },
  daylight: { sunsetAtEpochMs: 1_700_004_000_000, arrivalAfterSunset: false },
  language: "de",
  elapsedSec: 3600,
  walkedDistanceM: 8200,
  ascentM: 410,
  steps: 12_345,
  heartRate: { bpm: 138, measuredAt: 1_700_000_000_000, freshness: "fresh", source: "phone" },
  activeAlert: { kind: "narration", text: "Die Alp beginnt hinter dem Wald.", critical: false },
  poiStory: {
    id: "poi-bergkapelle",
    name: "Bergkapelle",
    imageUrl: "https://example.com/bergkapelle.jpg",
    text: "Die kleine Kapelle wurde im 18. Jahrhundert erbaut.",
  },
  sessionStatus: "sos_requested",
};

const connected = toGarminHikeLiveState(canonicalState, "connected", 1_700_000_000_500);
assert.equal(connected.direction, "right");
assert.equal(connected.remainingKm, 0.65);
assert.equal(connected.companionStatus, "connected");
assert.equal(connected.sosAcknowledgement, "none");
assert.equal(connected.freshnessS, 0.5);
assert.equal(connected.nextInstruction, "Die Alp beginnt hinter dem Wald.");
assert.equal(connected.upcomingNavigations?.length, 2);
assert.equal(connected.safetyCheckin?.status, "active");
assert.equal(connected.weather?.temperatureC, 18);
assert.equal(connected.poiStory?.name, "Bergkapelle");
assert.equal(connected.poiStory?.imageUrl, "https://example.com/bergkapelle.jpg");
assert.equal(isValidGarminHikeLiveState(connected), true);

const disconnected = toGarminHikeLiveState(canonicalState, "disconnected", 1_700_000_000_500);
assert.equal(disconnected.companionStatus, "disconnected");
assert.equal(isValidGarminHikeLiveState(disconnected), true);

const acknowledged = withGarminSosAcknowledgement(connected, "acknowledged");
assert.equal(acknowledged.sosAcknowledgement, "acknowledged");
assert.equal(isValidGarminHikeLiveState(acknowledged), true);

const canonicalAcknowledged = toGarminHikeLiveState(
  { ...canonicalState, sosAcknowledgement: "acknowledged" },
  "connected",
  1_700_000_000_500,
);
assert.equal(canonicalAcknowledged.sosAcknowledgement, "acknowledged");

assert.deepEqual(
  parseGarminSosRequest({ protocolVersion: 1, type: "sosRequest", requestId: 123456 }),
  { protocolVersion: 1, type: "sosRequest", requestId: 123456 },
);
assert.equal(parseGarminSosRequest({ protocolVersion: 1, type: "sosRequest", requestId: 1, lat: 46.8 }), null);
assert.equal(isValidGarminHikeLiveState({ ...connected, coordinates: [] }), false);

console.log("Garmin protocol checks passed");