import type { PoiSource } from "./wikipedia";

export interface CuratedPoiSummary {
  title: string;
  extract: string;
  url: string;
  lang: string;
  image: null;
  sources: PoiSource[];
}

const PARK_CENTER = { lat: 47.6127239, lng: 7.6634480 };
const MEMORIAL_LOCATION = { lat: 47.6126439, lng: 7.6634171 };
const HEBELPARK_HISTORY_URL =
  "https://www.loerrach.de/lieblingsorte/Sitzbaenke-am-Hebelpark";
const HEBELPARK_PAGE_URL =
  "https://www.loerrach.de/de/Loerrach-Erleben/Tourismus/EntdeckensWert/NaturLust/Parks";
const LORRACH_HISTORY_URL =
  "https://www.loerrach.de/de/Stadt-Buergerschaft/Loerrach-im-ueberblick/Stadtportraet/Geschichte";
const HEBELPARK_HISTORY =
  "Der Hebelpark in Lörrach diente früher als Friedhof. Nachdem der Friedhof an der Stadtkirche nach der Pest zu klein geworden war, wurde er hierher verlegt. In den 1860er Jahren, nach Inbetriebnahme der Bahnlinie, wurde der Friedhof an die Brombacher Straße verlegt. Eine Platte an der Turmstraße erinnert an den früheren Stadtturm, der von 1688 bis 1867 bestand.";
const HEBELPARK_STOP_EXTRACT =
  `Die Haltestelle Hebelpark liegt am gleichnamigen Park in Lörrach. ${HEBELPARK_HISTORY}`;
const HEBELPARK_STOP_STORY =
  "Die Haltestelle Hebelpark liegt am gleichnamigen Park in Lörrach. Der Park diente früher als Friedhof; nachdem der Friedhof an der Stadtkirche nach der Pest zu klein geworden war, wurde er hierher verlegt. In den 1860er Jahren, nach Inbetriebnahme der Bahnlinie, wurde der Friedhof an die Brombacher Straße verlegt. Eine Platte an der Turmstraße erinnert an den früheren Stadtturm, der von 1688 bis 1867 bestand.";
const HEBELPARK_STORY =
  "Der Hebelpark in Lörrach diente früher als Friedhof. Nachdem der Friedhof an der Stadtkirche nach der Pest zu klein geworden war, wurde er hierher verlegt. In den 1860er Jahren, nach Inbetriebnahme der Bahnlinie, wurde der Friedhof an die Brombacher Straße verlegt. Eine Platte an der Turmstraße erinnert an den früheren Stadtturm, der von 1688 bis 1867 bestand.";
const HEBEL_MEMORIAL_EXTRACT =
  "Das überlebensgroße Denkmal in der Mitte des Hebelparks erinnert an den alemannischen Heimatdichter Johann Peter Hebel. Die Stadtchronik nennt 1910 als Jahr der Einweihung. Am 10. Mai, dem Hebeltag, fanden hier Kundgebungen statt, bei denen Schülerinnen und Schüler Gedichte vortrugen.";

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const meanLatRadians = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const eastWest = (a.lng - b.lng) * 111_320 * Math.cos(meanLatRadians);
  const northSouth = (a.lat - b.lat) * 111_320;
  return Math.hypot(eastWest, northSouth);
}

function summary(
  title: string,
  extract: string,
  url: string,
  supportingSourceUrls: string[] = [],
): CuratedPoiSummary {
  return {
    title,
    extract,
    url,
    lang: "de",
    image: null,
    sources: [url, ...supportingSourceUrls].map((sourceUrl) => ({
      role: "text" as const,
      provider: "Stadt Lörrach",
      title:
        sourceUrl === HEBELPARK_HISTORY_URL
          ? "Sitzbänke am Hebelpark"
          : sourceUrl === HEBELPARK_PAGE_URL
            ? "Parks in Lörrach"
            : sourceUrl === LORRACH_HISTORY_URL
              ? "Geschichte der Stadt Lörrach"
              : undefined,
      url: sourceUrl,
    })),
  };
}

/**
 * Local, source-backed detail for the two Lörrach POIs whose automated
 * Wikipedia/AI fallback either mixed nearby objects or had no useful source.
 * The tight coordinate and type checks prevent applying these facts to other
 * places with the same name (or to the Hebelpark bus stop as if it were the
 * park itself).
 */
export function getCuratedPoiSummary(
  name: string,
  kind: string,
  lat: number,
  lng: number,
): CuratedPoiSummary | null {
  const normalizedName = normalizeName(name);
  const location = { lat, lng };

  if (
    normalizedName === "hebelpark" &&
    distanceMeters(location, PARK_CENTER) <= 300
  ) {
    if (kind === "highway=bus_stop") {
      return summary(
        "Haltestelle Hebelpark (Lörrach)",
        HEBELPARK_STOP_EXTRACT,
        HEBELPARK_HISTORY_URL,
      );
    }

    if (kind === "leisure=park" || kind === "tourism=attraction") {
      return summary(
        "Hebelpark (Lörrach)",
        HEBELPARK_HISTORY,
        HEBELPARK_HISTORY_URL,
        [HEBELPARK_PAGE_URL],
      );
    }
  }

  if (
    normalizedName === "hebeldenkmal" &&
    kind === "historic=memorial" &&
    distanceMeters(location, MEMORIAL_LOCATION) <= 150
  ) {
    return summary(
      "Hebel-Denkmal (Lörrach)",
      HEBEL_MEMORIAL_EXTRACT,
      LORRACH_HISTORY_URL,
      [HEBELPARK_PAGE_URL],
    );
  }

  return null;
}

/** German/gsw copy stays deterministic so no new details are added in rewriting. */
export function getCuratedPoiNarration(
  name: string,
  kind: string,
  extract: string,
  lang: string,
): string | null {
  if (lang !== "de" && lang !== "gsw") return null;

  const normalizedName = normalizeName(name);
  const sourceText = extract.trim();
  if (
    normalizedName === "hebelpark" &&
    kind === "highway=bus_stop" &&
    sourceText === HEBELPARK_STOP_EXTRACT
  ) {
    return HEBELPARK_STOP_STORY;
  }
  if (
    normalizedName === "hebelpark" &&
    (kind === "leisure=park" || kind === "tourism=attraction") &&
    sourceText === HEBELPARK_HISTORY
  ) {
    return HEBELPARK_STORY;
  }
  if (
    normalizedName === "hebeldenkmal" &&
    kind === "historic=memorial" &&
    sourceText === HEBEL_MEMORIAL_EXTRACT
  ) {
    return HEBEL_MEMORIAL_EXTRACT;
  }
  return null;
}

// The city pages provide the supporting facts: the Hebelpark history and
// former city tower are documented at HEBELPARK_HISTORY_URL; the monument's
// size/location is on HEBELPARK_PAGE_URL and its 1910 inauguration is in the
// city chronology at LORRACH_HISTORY_URL.