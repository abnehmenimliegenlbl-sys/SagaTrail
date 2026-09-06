import assert from "node:assert/strict";
import test from "node:test";

import { detectNavigationCues } from "./navigationCues";

test("does not announce an ordinary route bend", () => {
  assert.deepEqual(
    detectNavigationCues(
      [
        [47, 8],
        [47.001, 8],
        [47.002, 8.001],
        [47.002, 8.002],
        [47.002, 8.003],
      ],
      10,
    ),
    [],
  );
});

test("does not infer a trail choice from a sharp switchback", () => {
  assert.deepEqual(
    detectNavigationCues(
      [
        [47, 8],
        [47.001, 8],
        [47.002, 8],
        [47.0015, 8.0002],
        [47.001, 8.0004],
      ],
      10,
    ),
    [],
  );
});