import assert from "node:assert/strict";
import { test } from "node:test";
import { getCuratedPoiSummary } from "./curatedPoiInfo";

test("returns the Lörrach park history for the Hebelpark bus stop", () => {
  const result = getCuratedPoiSummary(
    "Hebelpark",
    "highway=bus_stop",
    47.6130918,
    7.6636197,
  );

  assert.ok(result);
  assert.match(result.extract, /Haltestelle Hebelpark/);
  assert.match(result.extract, /Friedhof/);
  assert.match(result.extract, /1688 bis 1867/);
  assert.equal(result.url, "https://www.loerrach.de/lieblingsorte/Sitzbaenke-am-Hebelpark");
});

test("returns documented facts for the Hebel-Denkmal", () => {
  const result = getCuratedPoiSummary(
    "Hebel-Denkmal",
    "historic=memorial",
    47.6126439,
    7.6634171,
  );

  assert.ok(result);
  assert.match(result.extract, /Johann Peter Hebel/);
  assert.match(result.extract, /1910/);
  assert.match(result.extract, /10\. Mai/);
});

test("does not apply Lörrach facts to distant or different POIs", () => {
  assert.equal(
    getCuratedPoiSummary("Hebelpark", "highway=bus_stop", 47.62, 7.66),
    null,
  );
  assert.equal(
    getCuratedPoiSummary("Hebel-Denkmal", "historic=memorial", 47.62, 7.66),
    null,
  );
  const stop = getCuratedPoiSummary(
    "Hebelpark",
    "highway=bus_stop",
    47.6130918,
    7.6636197,
  );
  const park = getCuratedPoiSummary(
    "Hebelpark",
    "leisure=park",
    47.6130918,
    7.6636197,
  );
  assert.ok(stop);
  assert.ok(park);
  assert.match(stop.extract, /Haltestelle/);
  assert.doesNotMatch(park.extract, /Haltestelle/);
});