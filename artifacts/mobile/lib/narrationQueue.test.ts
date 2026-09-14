import assert from "node:assert/strict";
import test from "node:test";

import {
  enqueueNarrationItem,
  type NarrationQueueItem,
} from "./narrationQueue";

test("keeps only the latest queued surface state", () => {
  const queue: NarrationQueueItem[] = [];
  enqueueNarrationItem(queue, {
    text: "Asphalt",
    replaceQueuedCategory: "surface",
  });
  enqueueNarrationItem(queue, {
    text: "Schotter",
    replaceQueuedCategory: "surface",
  });
  enqueueNarrationItem(queue, {
    text: "Asphalt neu",
    replaceQueuedCategory: "surface",
  });

  assert.deepEqual(queue.map((entry) => entry.text), ["Asphalt neu"]);
});

test("preserves non-replaceable narration around the latest status", () => {
  const queue: NarrationQueueItem[] = [{ text: "Kapitel" }];
  enqueueNarrationItem(queue, {
    text: "Alter Untergrund",
    replaceQueuedCategory: "surface",
  });
  enqueueNarrationItem(queue, { text: "POI" });
  enqueueNarrationItem(queue, {
    text: "Aktueller Untergrund",
    replaceQueuedCategory: "surface",
  });

  assert.deepEqual(
    queue.map((entry) => entry.text),
    ["Kapitel", "Aktueller Untergrund", "POI"],
  );
});

test("repairs an existing queue containing duplicate surface states", () => {
  const queue: NarrationQueueItem[] = [
    { text: "Asphalt alt", replaceQueuedCategory: "surface" },
    { text: "Kapitel" },
    { text: "Schotter alt", replaceQueuedCategory: "surface" },
  ];

  enqueueNarrationItem(queue, {
    text: "Aktueller Untergrund",
    replaceQueuedCategory: "surface",
  });

  assert.deepEqual(
    queue.map((entry) => entry.text),
    ["Aktueller Untergrund", "Kapitel"],
  );
});

test("keeps one latest terrain and one latest surface state independently", () => {
  const queue: NarrationQueueItem[] = [];
  enqueueNarrationItem(queue, {
    text: "Terrain alt",
    replaceQueuedCategory: "terrain",
  });
  enqueueNarrationItem(queue, {
    text: "Surface aktuell",
    replaceQueuedCategory: "surface",
  });
  enqueueNarrationItem(queue, {
    text: "Terrain aktuell",
    replaceQueuedCategory: "terrain",
  });

  assert.deepEqual(
    queue.map((entry) => entry.text),
    ["Terrain aktuell", "Surface aktuell"],
  );
});