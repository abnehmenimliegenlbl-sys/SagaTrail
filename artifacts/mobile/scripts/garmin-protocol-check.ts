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
  elapsedSec: 3600,
  walkedDistanceM: 8200,
  ascentM: 410,
  steps: 12_345,
  heartRate: { bpm: 138, measuredAt: 1_700_000_000_000, freshness: "fresh", source: "phone" },
  activeAlert: { kind: "narration", text: "Die Alp beginnt hinter dem Wald.", critical: false },
  sessionStatus: "sos_requested",
};

const connected = toGarminHikeLiveState(canonicalState, "connected", 1_700_000_000_500);
assert.equal(connected.direction, "right");
assert.equal(connected.remainingKm, 0.65);
assert.equal(connected.companionStatus, "connected");
assert.equal(connected.sosAcknowledgement, "none");
assert.equal(connected.freshnessS, 0.5);
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