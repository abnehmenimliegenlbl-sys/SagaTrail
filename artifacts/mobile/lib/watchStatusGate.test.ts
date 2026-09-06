import assert from "node:assert/strict";
import test from "node:test";

import { isMeaningfulWatchStatusUpdate } from "./watchStatusGate";

const stationary = {
  direction: "Links",
  remainingKm: 5,
  position: { lat: 47.3769, lng: 8.5417 },
};

test("suppresses stationary updates", () => {
  assert.equal(isMeaningfulWatchStatusUpdate(stationary, stationary), false);
  assert.equal(
    isMeaningfulWatchStatusUpdate(stationary, {
      ...stationary,
      position: { lat: 47.377, lng: 8.5418 },
    }),
    false,
  );
});

test("allows meaningful movement and direction changes", () => {
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
});