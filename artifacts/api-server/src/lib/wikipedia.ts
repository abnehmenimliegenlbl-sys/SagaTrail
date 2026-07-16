import type { Logger } from "pino";

/**
 * Live-Anreicherung mit Wikipedia-Kurzzusammenfassungen (CC BY-SA).
 *
 * Verwendet ausschliesslich die oeffentliche Wikipedia-REST-API (kein
 * Wikidata-Schreibzugriff, keine Autorisierung noetig). Ergebnisse werden
 * knapp und mit Quellenangabe (Titel + URL) weitergereicht, damit die
 * Attribution in der App jederzeit sichtbar bleibt.
 */

const USER_AGENT = "SagaTrail/1.0 (Swiss hiking companion; contact: none)";
const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_LANG = "de";

export interface WikiSummary {
  title: string;
  extract: string;
  url: string;
  lang: string;
  image: string | null;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface WikiRestSummary {
  title?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  type?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
}

/** Laedt die Kurzzusammenfassung eines konkreten Wikipedia-Artikeltitels. */
export async function fetchWikipediaSummary(
  title: string,
  lang: string = DEFAULT_LANG,
): Promise<WikiSummary | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const json = await fetchJson<WikiRestSummary>(url);
  if (!json || !json.extract || json.type === "disambiguation") return null;
  return {
    title: json.title ?? title,
    extract: json.extract,
    url: json.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    lang,
    image: json.thumbnail?.source ?? json.originalimage?.source ?? null,
  };
}

interface WikidataEntityResponse {
  entities?: Record<string, { sitelinks?: Record<string, { title?: string }> }>;
}

interface WikidataClaimsResponse {
  entities?: Record<
    string,
    {
      sitelinks?: Record<string, { title?: string }>;
      claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
    }
  >;
}

/** Loest eine Wikidata-Q-ID auf den Artikeltitel der Zielsprache auf (falls vorhanden). */
export async function resolveWikidataTitle(
  qid: string,
  lang: string = DEFAULT_LANG,
): Promise<string | null> {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(qid)}.json`;
  const json = await fetchJson<WikidataEntityResponse>(url);
  const entity = json?.entities?.[qid];
  return entity?.sitelinks?.[`${lang}wiki`]?.title ?? entity?.sitelinks?.enwiki?.title ?? null;
}

/**
 * Laedt das Hauptbild (Wikidata-Property P18) eines Objekts und gibt eine
 * Wikimedia-Commons-URL in der angegebenen Breite zurueck.
 *
 * Viele Schweizer OSM-Objekte (historische Brunnen, Kapellen usw.) haben auf
 * Wikipedia kein Hauptbild und liefern daher kein `thumbnail` in der REST-API.
 * Das Wikidata-P18-Bild ist haeufig trotzdem vorhanden und qualitativ besser.
 */
export async function fetchWikidataImage(
  qid: string,
  widthPx = 600,
): Promise<string | null> {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(qid)}.json`;
  const json = await fetchJson<WikidataClaimsResponse>(url);
  const entity = json?.entities?.[qid];
  const p18 = entity?.claims?.["P18"];
  const filename = p18?.[0]?.mainsnak?.datavalue?.value;
  if (typeof filename !== "string" || !filename) return null;
  const encoded = encodeURIComponent(filename.replace(/ /g, "_"));
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=${widthPx}`;
}

/**
 * Loest eine OSM-`wikipedia`-Tag-Angabe ("de:Artikelname" oder nur
 * "Artikelname") in eine Zusammenfassung auf.
 */
export async function resolveOsmWikipediaTag(
  tag: string,
  fallbackLang: string = DEFAULT_LANG,
): Promise<WikiSummary | null> {
  const match = /^([a-z-]{2,})\s*:\s*(.+)$/.exec(tag.trim());
  const lang = match ? match[1] : fallbackLang;
  const title = match ? match[2] : tag.trim();
  return fetchWikipediaSummary(title, lang);
}

/** Normalisiert einen Namen fuer den unscharfen Vergleich (Kleinbuchstaben, nur Buchstaben/Ziffern). */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

/** Laenge des gemeinsamen Praefixes zweier Strings. */
function commonPrefixLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

/**
 * Prueft, ob zwei Ortsnamen plausibel denselben Ort bezeichnen — tolerant
 * gegenueber kleinen Schreibvarianten (z.B. "Basiliskbrunnen" vs.
 * "Basiliskenbrunnen"): Enthaltensein nach Normalisierung oder ein
 * gemeinsames Praefix von mindestens 60 % des kuerzeren Namens.
 */
function namesRoughlyMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na.length < 4 || nb.length < 4) return na === nb;
  if (na.includes(nb) || nb.includes(na)) return true;
  const prefix = commonPrefixLength(na, nb);
  return prefix >= Math.ceil(Math.min(na.length, nb.length) * 0.6);
}

interface GeoSearchResponse {
  query?: { geosearch?: { title: string; dist: number }[] };
}

/**
 * Sucht einen Wikipedia-Artikel fuer einen benannten Ort ueber die
 * Geo-Suche (Artikel mit Koordinaten im Umkreis) und gleicht die Titel
 * unscharf mit dem OSM-Namen ab. Dritte Stufe der POI-Anreicherung, wenn
 * das OSM-Objekt weder wikipedia- noch wikidata-Tag traegt.
 */
export async function searchNearbyWikipedia(
  name: string,
  lat: number,
  lng: number,
  lang: string = DEFAULT_LANG,
): Promise<WikiSummary | null> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}%7C${lng}&gsradius=300&gslimit=10&format=json&origin=*`;
  const json = await fetchJson<GeoSearchResponse>(url);
  const hits = (json?.query?.geosearch ?? [])
    .filter((h) => namesRoughlyMatch(h.title, name))
    .sort((a, b) => a.dist - b.dist);
  for (const hit of hits) {
    const summary = await fetchWikipediaSummary(hit.title, lang);
    if (summary) return summary;
  }
  // Vierte Stufe: Titelsuche nach dem Namen — greift, wenn der Artikel keine
  // Koordinaten in der Naehe traegt (z.B. beschreibt "Basiliskenbrunnen" alle
  // Basler Basilisken-Brunnen gemeinsam, ohne Einzelkoordinaten).
  const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&srlimit=5&origin=*`;
  const searchJson = await fetchJson<{ query?: { search?: { title: string }[] } }>(searchUrl);
  const titleHits = (searchJson?.query?.search ?? []).filter((h) =>
    namesRoughlyMatch(h.title, name),
  );
  for (const hit of titleHits) {
    const summary = await fetchWikipediaSummary(hit.title, lang);
    if (summary) return summary;
  }
  return null;
}

/**
 * Sucht eine Sagen-/Legenden-bezogene Wikipedia-Seite fuer einen Kanton. Dient
 * als zweite Stufe der Sagen-Zuordnung (nach kuratierten Sagen im selben
 * Kanton, vor der kantonsuebergreifenden kuratierten Rueckfalloption).
 */
export async function searchCantonLegend(
  canton: string,
  log: Logger,
  lang: string = DEFAULT_LANG,
): Promise<WikiSummary | null> {
  try {
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      `Sage ${canton}`,
    )}&format=json&srlimit=3&origin=*`;
    const json = await fetchJson<{ query?: { search?: { title: string }[] } }>(searchUrl);
    const hits = json?.query?.search ?? [];
    for (const hit of hits) {
      const summary = await fetchWikipediaSummary(hit.title, lang);
      if (summary) return summary;
    }
    return null;
  } catch (err) {
    log.warn({ canton, err }, "Wikipedia-Kantonssage konnte nicht geladen werden");
    return null;
  }
}
