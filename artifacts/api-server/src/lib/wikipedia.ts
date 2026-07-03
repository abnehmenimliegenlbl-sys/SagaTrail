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
  };
}

interface WikidataEntityResponse {
  entities?: Record<string, { sitelinks?: Record<string, { title?: string }> }>;
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
