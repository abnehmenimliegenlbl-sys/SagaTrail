import assert from "node:assert/strict";
import { test } from "node:test";
import type { Logger } from "pino";
import {
  extractPoiWebText,
  scrapePoiWebsiteSource,
  searchPoiWebsiteSource,
  selectPoiWebSearchResult,
} from "./poiWebSource";
import { normalizeOsmWebsiteUrl } from "./overpass";

const log = { info: () => undefined, warn: () => undefined } as unknown as Logger;

const kinderzooContext = {
  name: "Kinderzoo",
  kind: "attraction",
  place: "Basel",
  canton: "Basel-Stadt",
};

const localAndWrongCityResults = [
  {
    title: "Kinderzoo in Zürich",
    url: "https://www.zuerich.example/kinderzoo",
    description: "Der Kinderzoo liegt in Zürich.",
  },
  {
    title: "Bei der Tierpflege mithelfen – im Kinderzoo | Zoo Basel",
    url: "https://www.zoobasel.ch/de/zooerlebnisse/kinderzoo",
    description: "Seit 1977 erleben Kinder den Kinderzolli des Zoo Basel.",
  },
];

test("OSM website fields normalize safe web URLs and prefer website over contact URL", () => {
  assert.equal(
    normalizeOsmWebsiteUrl({
      website: "www.zoobasel.ch/de",
      "contact:website": "https://fallback.example",
    }),
    "https://www.zoobasel.ch/de",
  );
  assert.equal(
    normalizeOsmWebsiteUrl({ "contact:website": "https://museum.example/info" }),
    "https://museum.example/info",
  );
  assert.equal(normalizeOsmWebsiteUrl({ website: "javascript:alert(1)" }), null);
});

test("search result selection rejects same-name pages from another locality", () => {
  const selected = selectPoiWebSearchResult(localAndWrongCityResults, kinderzooContext);
  assert.equal(
    selected?.url,
    "https://www.zoobasel.ch/de/zooerlebnisse/kinderzoo",
  );
});

test("search result selection fails closed without a matching location", () => {
  assert.equal(
    selectPoiWebSearchResult(
      [localAndWrongCityResults[0]!],
      kinderzooContext,
    ),
    null,
  );
});

test("web extraction removes navigation and keeps concise factual paragraphs", () => {
  const result = extractPoiWebText(
    [
      "[Home](https://example.ch) [Info](https://example.ch/info) [Shop](https://example.ch/shop)",
      "",
      "# Kinderzoo",
      "",
      "Seit 1977 ermöglicht der Kinderzoo des Zoo Basel Kindern Begegnungen mit grösseren und kleineren Haustieren. Die Tiere helfen den jüngsten Besucherinnen und Besuchern, eine tiefere Beziehung zu ihnen aufzubauen.",
      "",
      "Unter Anleitung einer Tierpflegerin oder eines Tierpflegers lernen Kinder, die Tiere zu versorgen und bei der Stallreinigung mitzuhelfen.",
    ].join("\n"),
  );
  assert.match(result, /Seit 1977/);
  assert.match(result, /Tierpflegerin/);
  assert.doesNotMatch(result, /Home|Shop/);
});

test("web extraction retains short factual paragraphs instead of returning no source", () => {
  assert.match(
    extractPoiWebText(
      "Der Kinderzoo wurde 1977 eröffnet und gehört zum Zoo Basel.",
    ),
    /wurde 1977 eröffnet/,
  );
});

test("web extraction rejects newsletter and navigation boilerplate", () => {
  assert.equal(
    extractPoiWebText(
      "#### Immer aktuell bleiben, mit dem ZOO BASEL Newsletter\n\nWEITER",
    ),
    "",
  );
});

test("web extraction keeps facts about the POI, not map-page nearby places", () => {
  const markdown = [
    "Highlights include Basel Zoo and Basel SBB Railway Station.",
    "Zoo Basel is a zoological garden in the city of Basel, Switzerland.",
    "Pruntrutermatte is a park, which is situated 240 metres south of Kinderzoo.",
    "Nearby places include Basel-Gundeldingen and Binningen.",
    "Discover Kinderzoo from above in high-definition satellite imagery.",
  ].join("\n\n");
  assert.equal(extractPoiWebText(markdown, "Kinderzoo"), "");
});

test("web extraction retains a factual paragraph whose subject is the POI", () => {
  assert.match(
    extractPoiWebText(
      "Kinderzoo wurde 1977 eröffnet und gehört zum Zoo Basel.",
      "Kinderzoo",
    ),
    /wurde 1977 eröffnet/,
  );
});

test("OSM website scraping returns a cited summary only after name and place match", async () => {
  const calls: string[] = [];
  const summary = await scrapePoiWebsiteSource(
    kinderzooContext,
    "https://www.zoobasel.ch/de/kinderzoo",
    log,
    async (endpoint) => {
      calls.push(endpoint);
      return {
        success: true,
        data: {
          markdown:
            "# Kinderzoo\n\nSeit 1977 ermöglicht der Kinderzoo des Zoo Basel Kindern Begegnungen mit verschiedenen Haustieren. Der Ort liegt in Basel und gehört zum Zoo Basel.",
          metadata: {
            title: "Kinderzoo | Zoo Basel",
            sourceURL: "https://www.zoobasel.ch/de/kinderzoo",
            language: "de",
          },
        },
      };
    },
  );

  assert.deepEqual(calls, ["/scrape"]);
  assert.equal(summary?.url, "https://www.zoobasel.ch/de/kinderzoo");
  assert.equal(summary?.sources?.[0]?.provider, "Zoo Basel");
  assert.match(summary?.extract ?? "", /Seit 1977/);
});

test("Firecrawl search scrapes one relevant result and returns its source citation", async () => {
  const calls: Array<{ endpoint: string; body: Record<string, unknown> }> = [];
  const summary = await searchPoiWebsiteSource(kinderzooContext, log, async (endpoint, body) => {
    calls.push({ endpoint, body });
    if (endpoint === "/search") {
      return { success: true, data: { web: localAndWrongCityResults } };
    }
    return {
      success: true,
      data: {
        markdown:
          "# Kinderzoo\n\nSeit 1977 ermöglicht der Kinderzoo des Zoo Basel Kindern Begegnungen mit verschiedenen Haustieren. Der Ort liegt in Basel und gehört zum Zoo Basel.",
        metadata: {
          title: "Kinderzoo | Zoo Basel",
          sourceURL: "https://www.zoobasel.ch/de/zooerlebnisse/kinderzoo",
          language: "de",
        },
      },
    };
  });

  assert.deepEqual(calls.map((call) => call.endpoint), ["/search", "/scrape"]);
  assert.match(String(calls[0]?.body.query), /Kinderzoo.*Basel.*official/);
  assert.deepEqual(calls[0]?.body.sources, [{ type: "web" }]);
  assert.equal(summary?.sources?.[0]?.url, summary?.url);
  assert.equal(summary?.sources?.[0]?.provider, "Zoo Basel");
});

test("Firecrawl search skips generic fallback names instead of guessing a nearby POI", async () => {
  let called = false;
  const result = await searchPoiWebsiteSource(
    { ...kinderzooContext, name: "Wegkreuz" },
    log,
    async () => {
      called = true;
      return {};
    },
  );
  assert.equal(result, null);
  assert.equal(called, false);
});