import assert from "node:assert/strict";
import test from "node:test";

import { isFreshGpsFix } from "./gpsSafety";

const NOW = 1_000_000;

test("accepts a recent fix when permission and a position exist", () => {
  assert.equal(
    isFreshGpsFix({
      permissionGranted: true,
      hasPosition: true,
      lastFixAtMs: NOW - 30_000,
      nowMs: NOW,
    }),
    true,
  );
});

test("rejects a stale fix even when permission remains granted", () => {
  assert.equal(
    isFreshGpsFix({
      permissionGranted: true,
      hasPosition: true,
      lastFixAtMs: NOW - 181_000,
      nowMs: NOW,
    }),
    false,
  );
});

test("rejects missing position or permission", () => {
  assert.equal(
    isFreshGpsFix({
      permissionGranted: true,
      hasPosition: false,
      lastFixAtMs: NOW - 1_000,
      nowMs: NOW,
    }),
    false,
  );
  assert.equal(
    isFreshGpsFix({
      permissionGranted: false,
      hasPosition: true,
      lastFixAtMs: NOW - 1_000,
      nowMs: NOW,
    }),
    false,
  );
});

test("rejects a timestamp from before the first accepted fix", () => {
  assert.equal(
    isFreshGpsFix({
      permissionGranted: true,
      hasPosition: true,
      lastFixAtMs: 0,
      nowMs: NOW,
    }),
    false,
  );
});