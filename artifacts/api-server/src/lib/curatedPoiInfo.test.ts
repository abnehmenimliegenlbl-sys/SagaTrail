import assert from "node:assert/strict";
import { test } from "node:test";
import { getCuratedPoiNarration, getCuratedPoiSummary } from "./curatedPoiInfo";
import { fetchCommonsImageSource } from "./wikipedia";

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
  assert.deepEqual(result.sources, [
    {
      role: "text",
      provider: "Stadt Lörrach",
      title: "Sitzbänke am Hebelpark",
      url: result.url,
    },
  ]);
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
  assert.deepEqual(
    result.sources.map((source) => source.url),
    [
      "https://www.loerrach.de/de/Stadt-Buergerschaft/Loerrach-im-ueberblick/Stadtportraet/Geschichte",
      "https://www.loerrach.de/de/Loerrach-Erleben/Tourismus/EntdeckensWert/NaturLust/Parks",
    ],
  );
});

test("returns Zoo Basel's verified Kinderzoo details and narration", () => {
  const result = getCuratedPoiSummary(
    "Kinderzoo",
    "tourism=attraction",
    47.5467252,
    7.5794107,
  );

  assert.ok(result);
  assert.equal(result.title, "Kinderzoo im Zoo Basel");
  assert.equal(result.url, "https://www.zoobasel.ch/de/zooerlebnisse/r/19/kinderzoo/");
  assert.equal(result.lang, "de");
  assert.match(result.extract, /Kinder ab acht Jahren/);
  assert.match(result.extract, /Bauernhof-Streichelgehege/);
  assert.deepEqual(result.sources, [
    {
      role: "text",
      provider: "Zoo Basel",
      title: "Arbeiten im Kinderzoo",
      url: result.url,
    },
  ]);
  assert.match(
    getCuratedPoiNarration(
      "Kinderzoo",
      "tourism=attraction",
      result.extract,
      "de",
    ) ?? "",
    /Tierpflegerinnen und Tierpfleger leiten sie dabei an/,
  );
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

test("does not apply Kinderzoo details to distant or different POIs", () => {
  assert.equal(
    getCuratedPoiSummary("Kinderzoo", "tourism=attraction", 47.55, 7.58),
    null,
  );
  assert.equal(
    getCuratedPoiSummary(
      "Kinderzoo",
      "leisure=park",
      47.5467252,
      7.5794107,
    ),
    null,
  );
  assert.equal(
    getCuratedPoiSummary(
      "Zoo Basel",
      "tourism=attraction",
      47.5467252,
      7.5794107,
    ),
    null,
  );
});

test("resolves Commons thumbnail metadata without treating image text as POI facts", async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = "";
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({
      query: {
        pages: {
          "123": {
            title: "File:Hebel-Denkmal.jpg",
            imageinfo: [{
              descriptionurl: "https://commons.wikimedia.org/wiki/File:Hebel-Denkmal.jpg",
              extmetadata: {
                LicenseShortName: { value: "CC BY-SA 4.0" },
                Artist: { value: '<a href="https://example.org">A. Beispiel</a>' },
              },
            }],
          },
        },
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const source = await fetchCommonsImageSource(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Hebel-Denkmal.jpg/600px-Hebel-Denkmal.jpg",
    );
    assert.ok(source);
    assert.equal(source.role, "image");
    assert.equal(source.provider, "Wikimedia Commons");
    assert.equal(source.title, "Hebel-Denkmal.jpg");
    assert.equal(source.url, "https://commons.wikimedia.org/wiki/File:Hebel-Denkmal.jpg");
    assert.equal(source.license, "CC BY-SA 4.0");
    assert.equal(source.creator, "A. Beispiel");
    assert.match(requestedUrl, /File%3AHebel-Denkmal.jpg/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});