import assert from "node:assert/strict";
import test from "node:test";

import { isMeaningfulWatchStatusUpdate } from "./watchStatusGate";

const stationary = {
  direction: "Links",
  remainingKm: 5,
  heartRateBpm: null,
  position: { lat: 47.3769, lng: 8.5417 },
};

test("suppresses stationary updates without heart rate", () => {
  assert.equal(isMeaningfulWatchStatusUpdate(stationary, stationary), false);
  assert.equal(
    isMeaningfulWatchStatusUpdate(stationary, {
      ...stationary,
      position: { lat: 47.377, lng: 8.5418 },
    }),
    false,
  );
});

test("allows meaningful movement, direction and heart-rate changes", () => {
  assert.equal(
    isMeaningfulWatchStatusUpdate(stationary, {
      ...stationary,
      position: { lat: 47.3776, lng: 8.5417 },
    }),
    true,
  );
  assert.equal(
    isMeaningfulWatchStatusUpdate(stationary, {
      ...stationary,
      direction: "Rechts",
    }),
    true,
  );
  assert.equal(
    isMeaningfulWatchStatusUpdate(
      { ...stationary, heartRateBpm: 100 },
      { ...stationary, heartRateBpm: 106 },
    ),
    true,
  );
});