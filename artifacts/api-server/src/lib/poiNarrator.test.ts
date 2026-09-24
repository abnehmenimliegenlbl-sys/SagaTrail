import assert from "node:assert/strict";
import { test } from "node:test";
import type { Logger } from "pino";
import { getCuratedPoiSummary } from "./curatedPoiInfo";
import { narratePoi } from "./poiNarrator";

test("does not generate generic POI boilerplate without any source facts", async () => {
  const log = { info: () => undefined } as unknown as Logger;

  const text = await narratePoi(
    { name: "Unknown memorial", kind: "historic=memorial", lang: "de" },
    log,
  );

  assert.equal(
    text,
    "Zu diesem Ort liegen derzeit keine verlässlichen Detailinformationen vor.",
  );
});

test("uses verified Hebelpark facts without an AI rewrite", async () => {
  const log = { info: () => undefined } as unknown as Logger;
  const detail = getCuratedPoiSummary(
    "Hebelpark",
    "highway=bus_stop",
    47.6130918,
    7.6636197,
  );
  assert.ok(detail);

  const text = await narratePoi(
    {
      name: "Hebelpark",
      kind: "highway=bus_stop",
      extract: detail.extract,
      lang: "de",
    },
    log,
  );

  assert.equal(
    text,
    "Die Haltestelle Hebelpark liegt am gleichnamigen Park in Lörrach. Der Park diente früher als Friedhof; nachdem der Friedhof an der Stadtkirche nach der Pest zu klein geworden war, wurde er hierher verlegt. In den 1860er Jahren, nach Inbetriebnahme der Bahnlinie, wurde der Friedhof an die Brombacher Straße verlegt. Eine Platte an der Turmstraße erinnert an den früheren Stadtturm, der von 1688 bis 1867 bestand.",
  );
  assert.doesNotMatch(text, /Mittelalter|wachte|Platz konnte sich neu erfinden/);
});

test("uses verified Hebel-Denkmal facts without invented scene-setting", async () => {
  const log = { info: () => undefined } as unknown as Logger;
  const detail = getCuratedPoiSummary(
    "Hebel-Denkmal",
    "historic=memorial",
    47.6126439,
    7.6634171,
  );
  assert.ok(detail);

  const text = await narratePoi(
    {
      name: "Hebel-Denkmal",
      kind: "historic=memorial",
      extract: detail.extract,
      lang: "de",
    },
    log,
  );

  assert.equal(text, detail.extract);
  assert.doesNotMatch(text, /gegenüber|alljährlich|seitdem/);
});