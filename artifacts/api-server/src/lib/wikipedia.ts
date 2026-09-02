import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { Logger } from "pino";
import { haversineM } from "./geo";

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
const WIKIMEDIA_MIN_GAP_MS = 400;
let lastWikimediaRequestAt = 0;
let wikimediaRequestQueue: Promise<void> = Promise.resolve();

export interface WikiSummary {
  title: string;
  extract: string;
  url: string;
  lang: string;
  image: string | null;
}

export interface CommonsImageMatch {
  url: string;
  description: string | null;
  descriptionUrl: string;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  let result: T | null = null;
  const request = wikimediaRequestQueue.then(async () => {
    const waitMs = Math.max(0, WIKIMEDIA_MIN_GAP_MS - (Date.now() - lastWikimediaRequestAt));
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastWikimediaRequestAt = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: controller.signal,
      });
      if (res.ok) result = (await res.json()) as T;
    } catch {
      result = null;
    } finally {
      clearTimeout(timer);
    }
  });
  // Die Queue muss auch nach einem Fehler weiterlaufen.
  wikimediaRequestQueue = request.then(() => undefined, () => undefined);
  await request;
  return result;
}

interface WikiRestSummary {
  title?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
  type?: string;
  thumbnail?: { source?: string };
  originalimage?: { source?: string };
  coordinates?: { lat?: number; lon?: number };
}

/**
 * Laedt die Kurzzusammenfassung eines konkreten Wikipedia-Artikeltitels.
 *
 * Optional: refLat/refLng + maxDistKm — wenn der Artikel eigene Koordinaten hat
 * und diese weiter als maxDistKm vom POI entfernt sind, wird null zurueckgegeben.
 * Verhindert, dass OSM-Tags auf den falschen gleichnamigen Artikel zeigen
 * (z.B. Basler "Pfalz"-Platz → "Rheinland-Pfalz" (Deutschland)).
 */
export async function fetchWikipediaSummary(
  title: string,
  lang: string = DEFAULT_LANG,
  refLat?: number,
  refLng?: number,
  maxDistKm: number = 50,
  requireCoordinates: boolean = false,
): Promise<WikiSummary | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const json = await fetchJson<WikiRestSummary>(url);
  if (!json || !json.extract || json.type === "disambiguation") return null;
  if (
    requireCoordinates &&
    (json.coordinates?.lat === undefined || json.coordinates?.lon === undefined)
  ) {
    return null;
  }
  if (
    refLat !== undefined && refLng !== undefined &&
    json.coordinates?.lat !== undefined && json.coordinates?.lon !== undefined
  ) {
    const distM = haversineM(
      { lat: refLat, lng: refLng },
      { lat: json.coordinates.lat, lng: json.coordinates.lon },
    );
    if (distM > maxDistKm * 1000) return null;
  }
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
      labels?: Record<string, { language?: string; value?: string }>;
      descriptions?: Record<string, { language?: string; value?: string }>;
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
 * Laedt das Hauptbild (Wikidata-Property P18) eines Objekts ueber die
 * Wikimedia-Commons-imageinfo-API und gibt eine direkte upload.wikimedia.org-
 * Thumbnail-URL zurueck (kein Redirect-Chain, funktioniert zuverlässig in RN).
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
  return commonsImageUrl(filename, widthPx);
}

/**
 * Laedt das erste Bild aus der Wikimedia-Commons-Kategorie eines Wikidata-Objekts
 * (Property P373). Greift fuer Objekte, die kein P18-Hauptbild haben, aber eine
 * ganze Kategorie mit Fotos besitzen — haeufig bei Schweizer Burgen, Warten,
 * Kapellen und archaeologischen Staetten.
 */
export async function fetchWikidataCommonsCategory(
  qid: string,
  widthPx = 600,
): Promise<string | null> {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(qid)}.json`;
  const json = await fetchJson<WikidataClaimsResponse>(url);
  const entity = json?.entities?.[qid];
  const p373 = entity?.claims?.["P373"];
  const category = p373?.[0]?.mainsnak?.datavalue?.value;
  if (typeof category !== "string" || !category) return null;

  const apiUrl =
    `https://commons.wikimedia.org/w/api.php?action=query` +
    `&generator=categorymembers&gcmtitle=${encodeURIComponent(`Category:${category}`)}` +
    `&gcmnamespace=6&gcmlimit=5` +
    `&prop=imageinfo&iiprop=url&iiurlwidth=${widthPx}` +
    `&format=json&origin=*`;
  const catJson = await fetchJson<{
    query?: { pages?: Record<string, { title?: string; imageinfo?: { thumburl?: string; url?: string }[] }> };
  }>(apiUrl);
  const pages = Object.values(catJson?.query?.pages ?? {});
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const imgUrl = info?.thumburl ?? info?.url;
    if (imgUrl) return imgUrl;
  }
  return null;
}

/**
 * Extrahiert verifizierte Fakten aus einem Wikidata-Eintrag.
 *
 * Schritt 1: Entity-JSON laden (Beschreibung + Claims).
 * Schritt 2: Q-ID-Werte aus strukturierten Properties (P138 benannt nach,
 *   P84 Architekt, P170 Gestaltet von, P186 Material, P140 Religion)
 *   sammeln und per Batch-API in einem zweiten Request in lesbare Namen
 *   aufloesen.
 *
 * Ergebnis: "Trinkbrunnen in Basel, benannt nach Friedrich Nietzsche.
 *   Benannt nach: Friedrich Nietzsche. Material: Kalkstein. Eingeweiht/erbaut: 2015."
 *
 * Dient als `extract` an den POI-Narrator — Claude bekommt verifizierte
 * Fakten statt aus dem Trainings-Wissen zu raten.
 */
export async function fetchWikidataFacts(
  qid: string,
  lang: string = DEFAULT_LANG,
): Promise<string | null> {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(qid)}.json`;
  const json = await fetchJson<WikidataClaimsResponse>(url);
  const entity = json?.entities?.[qid];
  if (!entity) return null;

  const parts: string[] = [];

  // Beschreibung (z.B. "Trinkbrunnen in Basel, benannt nach Friedrich Nietzsche")
  const desc =
    entity.descriptions?.[lang]?.value ??
    entity.descriptions?.["de"]?.value ??
    entity.descriptions?.["en"]?.value;
  if (desc) parts.push(desc);

  // Properties mit Q-Item-Werten die per Batch aufgeloest werden muessen.
  // Reihenfolge bestimmt Ausgabe-Reihenfolge.
  const Q_PROPS: Array<[string, string]> = [
    ["P138", "Benannt nach"],   // named after
    ["P84",  "Architekt"],      // architect
    ["P170", "Gestaltet von"],  // creator (Kunstwerke/Denkmäler)
    ["P186", "Material"],       // material used
    ["P140", "Religion"],       // religion (Kapellen, Kirchen)
  ];

  // Alle Q-IDs einsammeln (max 2 Werte pro Property, um Token zu sparen)
  const pendingQids: string[] = [];
  for (const [prop] of Q_PROPS) {
    for (const claim of (entity.claims?.[prop] ?? []).slice(0, 2)) {
      const val = claim.mainsnak?.datavalue?.value;
      if (val && typeof val === "object" && "id" in (val as object)) {
        const itemQid = (val as { id: string }).id;
        if (!pendingQids.includes(itemQid)) pendingQids.push(itemQid);
      }
    }
  }

  // Batch-Label-Lookup — ein einziger Request für alle Q-IDs
  const qidToLabel = new Map<string, string>();
  if (pendingQids.length > 0) {
    const batchUrl =
      `https://www.wikidata.org/w/api.php?action=wbgetentities` +
      `&ids=${encodeURIComponent(pendingQids.join("|"))}` +
      `&props=labels&languages=${lang}|de|en&format=json&origin=*`;
    const batchJson = await fetchJson<{
      entities?: Record<string, { labels?: Record<string, { value?: string }> }>;
    }>(batchUrl);
    for (const [q, data] of Object.entries(batchJson?.entities ?? {})) {
      const label =
        data.labels?.[lang]?.value ??
        data.labels?.["de"]?.value ??
        data.labels?.["en"]?.value;
      if (label) qidToLabel.set(q, label);
    }
  }

  // Aufgeloeste Labels in lesbaren Text umwandeln
  for (const [prop, label] of Q_PROPS) {
    const resolved: string[] = [];
    for (const claim of (entity.claims?.[prop] ?? []).slice(0, 2)) {
      const val = claim.mainsnak?.datavalue?.value;
      if (val && typeof val === "object" && "id" in (val as object)) {
        const name = qidToLabel.get((val as { id: string }).id);
        if (name) resolved.push(name);
      }
    }
    if (resolved.length > 0) parts.push(`${label}: ${resolved.join(", ")}.`);
  }

  // Einweihungs- / Erbauungsjahr (P571) — Zeitwert, kein Q-Item
  const p571Val = entity.claims?.["P571"]?.[0]?.mainsnak?.datavalue?.value;
  if (p571Val && typeof p571Val === "object" && "time" in (p571Val as object)) {
    const year = ((p571Val as { time: string }).time ?? "").match(/\+(\d{4})/)?.[1];
    if (year) parts.push(`Eingeweiht/erbaut: ${year}.`);
  }

  if (parts.length === 0) return null;
  return parts.join(" ");
}

/**
 * Laedt die direkte Thumbnail-URL einer Commons-Datei ueber die imageinfo-API.
 * Liefert eine upload.wikimedia.org-URL ohne Weiterleitungsketten.
 */
async function commonsImageUrl(filename: string, widthPx = 600): Promise<string | null> {
  const title = `File:${filename}`;
  const apiUrl =
    `https://commons.wikimedia.org/w/api.php?action=query` +
    `&titles=${encodeURIComponent(title)}` +
    `&prop=imageinfo&iiprop=url&iiurlwidth=${widthPx}` +
    `&format=json&origin=*`;
  const json = await fetchJson<{
    query?: { pages?: Record<string, { imageinfo?: { thumburl?: string; url?: string }[] }> };
  }>(apiUrl);
  const pages = Object.values(json?.query?.pages ?? {});
  const info = pages[0]?.imageinfo?.[0];
  return info?.thumburl ?? info?.url ?? null;
}

/**
 * Durchsucht die Bilderliste eines Wikipedia-Artikels nach einem Foto, dessen
 * Dateiname Schluesselwoerter des POI-Namens enthaelt. Greift fuer Faelle wie
 * "Georg Herwegh Denkmal" → Artikel "Georg Herwegh" (Portrait als Hauptbild,
 * aber Denkmal-Foto irgendwo im Artikel). Normalisiert sowohl Dateinamen als
 * auch den POI-Namen: Umlaute, Bindestriche und Leerzeichen werden angeglichen.
 */
export async function fetchWikipediaArticleImageByPoiName(
  articleTitle: string,
  poiName: string,
  lang: string = DEFAULT_LANG,
  widthPx = 600,
): Promise<string | null> {
  const listUrl =
    `https://${lang}.wikipedia.org/w/api.php?action=query` +
    `&titles=${encodeURIComponent(articleTitle)}` +
    `&prop=images&imlimit=30&format=json&origin=*`;
  const json = await fetchJson<{
    query?: { pages?: Record<string, { images?: { title: string }[] }> };
  }>(listUrl);
  const pages = Object.values(json?.query?.pages ?? {});
  const images = pages[0]?.images ?? [];

  // Schluesselwoerter aus POI-Namen ableiten (≥4 Buchstaben, stopwords ignorieren)
  const stopwords = new Set(["der", "die", "das", "von", "des", "und", "the", "of"]);
  const rawWords = poiName.toLowerCase()
    .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
    .split(/[\s\-_]+/)
    .filter((w) => w.length >= 4 && !stopwords.has(w));

  for (const img of images) {
    const filename = img.title.replace(/^File:/i, "");
    const fnNorm = filename.toLowerCase()
      .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9]/g, "");
    // Mindestens 2 Schluesselwoerter muessen im Dateinamen vorkommen
    const matches = rawWords.filter((w) => fnNorm.includes(w));
    if (matches.length >= Math.min(2, rawWords.length)) {
      const url = await commonsImageUrl(filename, widthPx);
      if (url) return url;
    }
  }
  return null;
}

/**
 * Sucht das naechstgelegene Wikimedia-Commons-Foto innerhalb von radiusM Metern
 * und gibt eine direkte Thumbnail-URL zurueck. Wird als Fallback eingesetzt,
 * wenn weder Wikipedia noch Wikidata ein Bild liefern.
 *
 * Verwendet generator=geosearch + prop=imageinfo in EINEM Request statt
 * geosearch (Request 1) + imageinfo pro Treffer (Request N) — reduziert
 * Requests drastisch bei vielen gleichzeitigen POI-Enrichments.
 */
export async function fetchNearbyCommonsImage(
  lat: number,
  lng: number,
  radiusM = 300,
  widthPx = 600,
  nameHint?: string | null,
): Promise<string | null> {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query` +
    `&generator=geosearch&ggscoord=${lat}%7C${lng}&ggsradius=${radiusM}` +
    `&ggsnamespace=6&ggslimit=10` +
    `&prop=imageinfo&iiprop=url&iiurlwidth=${widthPx}` +
    `&format=json&origin=*`;
  const json = await fetchJson<{
    query?: { pages?: Record<string, { title?: string; imageinfo?: { thumburl?: string; url?: string }[] }> };
  }>(url);
  const pages = Object.values(json?.query?.pages ?? {});
  // Relevanz-Filter: ist ein nameHint gegeben, nur Dateien akzeptieren, deren
  // Dateiname mindestens ein Namens-/Typ-Keyword enthaelt. Ein zufaelliges
  // Nachbarschaftsfoto (Lok, Bahnhof, Strassenschild …) ist schlechter als
  // gar kein Bild.
  const norm = (s: string) =>
    s.toLowerCase()
      .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9]/g, "");
  const hintTokens = (nameHint ?? "")
    .toLowerCase()
    .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
    .split(/[\s\-_\.\/\\,;:()\[\]]+/)
    .filter((t) => t.length >= 3);
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const thumb = info?.thumburl ?? info?.url;
    if (!thumb) continue;
    if (hintTokens.length > 0) {
      const fn = norm((page.title ?? "").replace(/^File:/i, ""));
      if (!hintTokens.some((t) => fn.includes(t))) continue;
    }
    return thumb;
  }
  return null;
}

/**
 * Sucht auf Wikimedia Commons nach Dateien, deren Name den POI-Namen enthaelt.
 * Findet Bilder, die weder per Geo-Tag noch per Wikidata-P18 verknuepft sind
 * (z.B. kommunale Brunnen, Skulpturen, kleine Kapellen).
 *
 * Verwendet generator=search + prop=imageinfo in EINEM Request statt
 * search (Request 1) + imageinfo pro Treffer (Request N).
 */
export async function fetchCommonsImageByName(
  name: string,
  widthPx = 600,
  locationHint?: string,
): Promise<CommonsImageMatch | null> {
  // Keywords generisch extrahieren: jedes Nicht-Wort-Zeichen (Bindestrich,
  // Punkt, Klammer, Schrägstrich …) ist Wort-Trenner. Stopwords und sehr
  // kurze Token (≤2 Zeichen) werden ignoriert.
  // "Georg-Herwegh-Denkmal" → ["georg","herwegh","denkmal"]
  // "Kapelle St. Josef (Hauptgasse)" → ["kapelle","josef","hauptgasse"]
  const STOPWORDS = new Set([
    "der","die","das","des","dem","den","ein","eine","und","oder",
    "von","vom","bei","am","an","im","in","zu","zur","zum",
    "the","of","at","by","in","st","nr","no","num",
  ]);
  const tokens = name
    .toLowerCase()
    .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
    .split(/[\s\-_\.\/\\,;:()\[\]]+/)
    .filter(t => t.length >= 3 && !STOPWORDS.has(t));

  if (tokens.length === 0) return null;

  // Suchbegriffe: zuerst Name + Ortskontext (entspricht der erfolgreichen
  // Google-Suche "Hindenburg Denkmal Lörrach"), danach der reine Name.
  // Der Ortskontext kommt aus Nominatim und wird nur on-demand beim Öffnen
  // eines POIs ermittelt.
  const nameSearch = tokens.join(" ");
  // Nominatim kann Verwaltungszusätze wie "(Kernstadt)" zurückgeben. Diese
  // sind für Commons-Suchbegriffe zu speziell und stehen meist nicht in
  // Dateiname, Kategorie oder Bildbeschreibung.
  const broadLocationHint = (locationHint ?? "")
    .replace(/\s*\([^)]*\)/g, "")
    .trim();
  const suchbegriffe: string[] = [
    ...(broadLocationHint ? [`${nameSearch} ${broadLocationHint}`] : []),
    nameSearch,
  ];
  if (tokens.length > 2) {
    suchbegriffe.push(tokens.slice(0, 2).join(" "));
  }
  const locationTokens = broadLocationHint
    .toLowerCase()
    .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
    .split(/[\s\-_\.\/\\,;:()\[\]]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

  for (const begriff of suchbegriffe) {
    const url =
      `https://commons.wikimedia.org/w/api.php?action=query` +
      `&generator=search&gsrsearch=${encodeURIComponent(begriff)}` +
      `&gsrnamespace=6&gsrlimit=5` +
      `&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=${widthPx}` +
      `&format=json&origin=*`;
    const json = await fetchJson<{
      query?: {
        pages?: Record<string, {
          title: string;
          index?: number;
          imageinfo?: {
            thumburl?: string;
            url?: string;
            descriptionurl?: string;
            extmetadata?: {
              Categories?: { value?: string };
              ImageDescription?: { value?: string };
            };
          }[];
        }>;
      };
    }>(url);
    // Nach Suchrelevanz (index) sortieren, NICHT nach Page-ID. Object.values()
    // liefert Seiten in numerisch aufsteigender Page-ID-Reihenfolge (aeltere Dateien
    // zuerst), was z.B. Portrait-Fotos vor Denkmal-Fotos stellt. index=1 ist die
    // relevanteste Suchantwort der MediaWiki-Suchmaschine.
    const pages = Object.values(json?.query?.pages ?? {})
      .sort((a, b) => (a.index ?? 999) - (b.index ?? 999));
    // Erst Dateien bevorzugen deren Name ≥1 POI-Keyword enthaelt (Denkmal-Foto vor
    // Portrait), danach alle restlichen Treffer mit Thumbnail als Fallback.
    const norm = (s: string) =>
      s.toLowerCase()
        .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
        .replace(/[^a-z0-9]/g, "");
    const withThumb = pages.filter((p) => p.imageinfo?.[0]?.thumburl ?? p.imageinfo?.[0]?.url);
    const stripHtml = (value: string) => value.replace(/<[^>]+>/g, " ");
    const hasLocationHint = (p: (typeof pages)[number]) => {
      if (locationTokens.length === 0) return true;
      const info = p.imageinfo?.[0]?.extmetadata;
      const searchable = norm([
        p.title,
        info?.Categories?.value ?? "",
        stripHtml(info?.ImageDescription?.value ?? ""),
      ].join(" "));
      return locationTokens.some((token) => searchable.includes(token));
    };
    const hasNameToken = (p: (typeof pages)[number]) => {
      const fn = norm(p.title.replace(/^File:/i, ""));
      return tokens.some((t) => fn.includes(t));
    };
    // Bei einer ortsbezogenen Suche muss der Ort auch in Dateiname,
    // Kategorie oder Beschreibung vorkommen. So wird ein Suchmaschinen-
    // Treffer aus einem anderen Ort nicht als vermeintlich passend akzeptiert.
    const locationMatch = withThumb.filter(hasLocationHint);
    if (locationTokens.length > 0 && locationMatch.length === 0) continue;
    const keywordMatch = withThumb.find((p) => {
      const fn = norm(p.title.replace(/^File:/i, ""));
      return tokens.some((t) => fn.includes(t));
    });
    const best =
      locationMatch.find(hasNameToken) ??
      (locationTokens.length === 0 ? keywordMatch ?? withThumb[0] : undefined);
    if (best) {
      const info = best.imageinfo?.[0];
      const thumb = info?.thumburl ?? info?.url;
      if (thumb) {
        const description = info?.extmetadata?.ImageDescription?.value
          ? stripHtml(info.extmetadata.ImageDescription.value).replace(/\s+/g, " ").trim()
          : null;
        const descriptionUrl =
          info?.descriptionurl ??
          `https://commons.wikimedia.org/wiki/${encodeURIComponent(best.title.replace(/^File:/i, ""))}`;
        return { url: thumb, description: description || null, descriptionUrl };
      }
    }
  }
  return null;
}

/**
 * Loest eine OSM-`wikipedia`-Tag-Angabe ("de:Artikelname" oder nur
 * "Artikelname") in eine Zusammenfassung auf.
 */
export async function resolveOsmWikipediaTag(
  tag: string,
  fallbackLang: string = DEFAULT_LANG,
  refLat?: number,
  refLng?: number,
): Promise<WikiSummary | null> {
  const match = /^([a-z-]{2,})\s*:\s*(.+)$/.exec(tag.trim());
  const lang = match ? match[1] : fallbackLang;
  const title = match ? match[2] : tag.trim();
  return fetchWikipediaSummary(title, lang, refLat, refLng);
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
 *
 * Asymmetrischer Sonderfall — KEIN Match wenn:
 *   Artikel-Titel ⊂ POI-Name  UND  POI-Name ⊄ Artikel-Titel
 *   UND  Artikel-Titel < 70 % der Laenge des POI-Namens
 *
 * Das verhindert, dass ein Artikel ueber ein grosses geografisches Objekt
 * (See, Berg, Fluss) als Beschreibung fuer ein kleines POI-Objekt akzeptiert
 * wird, das zufaellig diesen Gebietsname im Namen traegt.
 *
 * Beispiele:
 *   "Genfersee" (9) ⊂ "kreuzamgenfersee" (15)  → 60 % < 70 % → KEIN Match ✓
 *   "Pilatus"   (7) ⊂ "hoehlampilatus"   (13)  → 54 % < 70 % → KEIN Match ✓
 *   "Basiliskenbrunnen" (18) ⊂ "basiliskenbrunnenbasel" (21) → 86 % > 70 % → Match ✓
 */
function namesRoughlyMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na.length < 4 || nb.length < 4) return na === nb;
  if (na.includes(nb) || nb.includes(na)) {
    // Artikel-Titel ist Teilmenge des (laengeren) POI-Namens, aber nicht umgekehrt
    // → Artikel beschreibt nur den geografischen Kontext, nicht das Objekt selbst.
    // AUSNAHME: Steht der Artikel-Titel am Anfang des POI-Namens, ist er der Kern-Name
    // mit angehängtem Orts-Qualifier (z.B. "Nietzsche-Haus" in "Nietzsche-Haus Sils Maria").
    if (nb.includes(na) && !na.includes(nb) && na.length / nb.length < 0.70) {
      if (nb.startsWith(na) && na.length / nb.length >= 0.50) return true; // Kern-Name + Ort-Qualifier → OK
      return false;
    }
    return true;
  }
  const prefix = commonPrefixLength(na, nb);
  return prefix >= Math.ceil(Math.min(na.length, nb.length) * 0.6);
}

interface GeoSearchResponse {
  query?: { geosearch?: { title: string; dist: number }[] };
}

/**
 * Prueft ob ein Wikipedia-Auszug thematisch zum OSM-POI-Typ passt.
 *
 * Verhindert, dass Artikel ueber Musik, Filme, Buecher etc. als Beschreibung
 * fuer physische Orte ausgegeben werden. Klassisches Fehlbeispiel:
 *  POI "Lass deine Steine hier" (tourism=attraction, Via Jacobi)
 *  → Wikipedia findet Album "Laß deine Steine hier" von Ton Steine Scherben
 *  → kein Geo-Filter greift (Album hat keine WP-Koordinaten)
 *  → Falschartikel wird akzeptiert, KI-Fallback nie aufgerufen
 *
 * Wird nur auf auto-gesuchte Artikel angewendet (NICHT auf explizite
 * OSM-wikipedia-Tags, denen wir vertrauen).
 */
export function isExtractDomainCoherent(extract: string, kind: string | undefined): boolean {
  if (!kind) return true;
  // Nur fuer eindeutig physische POI-Typen pruefen
  const PHYSICAL_PREFIXES = [
    "historic=", "tourism=", "natural=", "man_made=", "amenity=", "geological=",
  ];
  if (!PHYSICAL_PREFIXES.some(p => kind.startsWith(p))) return true;

  // Schluesselwoerter die auf Nicht-Orte hinweisen (Medien, Personen, Begriffe)
  const NON_PLACE_KEYWORDS = [
    // Musik
    " album", "album ", "studioalbum", "livealbum", "kompilation",
    "single ", "ep ", "lp ", " ep,", " lp,",
    "lied ", " lied ", "lieder", "titelsong", "titelstück",
    "rockband", "punkband", "musikband", "musikgruppe",
    "diskografie", "diskographie", "discography",
    "musiker", "komponist", "komponierte",
    "sänger", "sängerin", "rapper", "rapperin",
    "schallplatte", "vinyl", "veröffentlicht von",
    // Filme / Serien
    "spielfilm", "kinofilm", "fernsehfilm", "dokumentarfilm",
    "fernsehserie", " serie ", "staffel ", "folge ", "episode ",
    // Buecher / Sonstiges
    "roman ", " roman,", "sachbuch", "novelle",
  ];
  const ext = extract.toLowerCase();
  return !NON_PLACE_KEYWORDS.some(kw => ext.includes(kw));
}

/**
 * Sucht einen Wikipedia-Artikel fuer einen benannten Ort ueber die
 * Geo-Suche (Artikel mit Koordinaten im Umkreis) und gleicht die Titel
 * unscharf mit dem OSM-Namen ab. Dritte Stufe der POI-Anreicherung, wenn
 * das OSM-Objekt weder wikipedia- noch wikidata-Tag traegt.
 *
 * kind wird mitgegeben, damit domain-inkohaerente Artikel (z.B. Musik-Alben
 * fuer einen Wanderweg-POI) erkannt und verworfen werden.
 */
export async function searchNearbyWikipedia(
  name: string,
  lat: number,
  lng: number,
  lang: string = DEFAULT_LANG,
  kind?: string,
): Promise<WikiSummary | null> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}%7C${lng}&gsradius=300&gslimit=10&format=json&origin=*`;
  const json = await fetchJson<GeoSearchResponse>(url);
  const allGeoHits = (json?.query?.geosearch ?? []).sort((a, b) => a.dist - b.dist);

  // Erste Geo-Runde: Namensabgleich innerhalb 300m.
  const nameMatchedHits = allGeoHits.filter((h) => namesRoughlyMatch(h.title, name));
  for (const hit of nameMatchedHits) {
    const summary = await fetchWikipediaSummary(hit.title, lang, lat, lng);
    if (summary && isExtractDomainCoherent(summary.extract, kind)) return summary;
  }

  // Zweite Geo-Runde: sehr nahe Artikel (< 100m) ohne Namensabgleich nur bei
  // archäologischen Stätten akzeptieren. Dort heissen OSM- und Wikipedia-
  // Objekte oft komplett anders (z.B. "Römische Warte Au-hard" → "Burgus
  // Au-hard"). Bei Denkmälern, Aussichtspunkten usw. wäre diese Regel zu
  // großzügig: Ein benachbarter Sender oder ein anderes Bauwerk könnte sonst
  // als Beschreibung des angeklickten POIs erscheinen.
  // Bei < 100m Abstand ist es praktisch sicher dasselbe Objekt.
  if (kind === "historic=archaeological_site") {
    const veryNearHits = allGeoHits.filter(
      (h) => h.dist < 100 && !nameMatchedHits.some((m) => m.title === h.title),
    );
    for (const hit of veryNearHits) {
      const summary = await fetchWikipediaSummary(hit.title, lang, lat, lng);
      if (summary && isExtractDomainCoherent(summary.extract, kind)) return summary;
    }
  }

  // Dritte Stufe: Titelsuche nach dem Namen — greift, wenn der Artikel keine
  // Koordinaten in der Naehe traegt (z.B. beschreibt "Basiliskenbrunnen" alle
  // Basler Basilisken-Brunnen gemeinsam, ohne Einzelkoordinaten).
  // Koordinaten werden mitgegeben: wenn der Artikel trotzdem weit weg ist
  // (z.B. "Pfalz" → "Rheinland-Pfalz" via Titelsuche), wird er verworfen.
  // Domain-Filter: Artikel ueber Musik-Alben, Filme etc. werden fuer physische
  // POI-Typen abgelehnt (z.B. "Lass deine Steine hier" = Ton-Steine-Scherben-
  // Album hat keine Koordinaten → ohne Filter fälschlicherweise akzeptiert).
  const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&srlimit=5&origin=*`;
  const searchJson = await fetchJson<{ query?: { search?: { title: string }[] } }>(searchUrl);
  // Strikterer Vergleich als namesRoughlyMatch: Titelsuche findet Artikel per
  // Keyword-Relevanz, nicht per Naehe — ein Artikel darf daher max. 30 %
  // laenger sein als der POI-Name, um Fehlzuordnungen zu vermeiden
  // (z.B. "Pfalz" → "Kurpfalz": 8/5 = 1.6 > 1.3 → abgelehnt).
  const maxLen = normalizeName(name).length * 1.3;
  const titleHits = (searchJson?.query?.search ?? []).filter((h) => {
    if (!namesRoughlyMatch(h.title, name)) return false;
    return normalizeName(h.title).length <= maxLen;
  });
  for (const hit of titleHits) {
    const summary = await fetchWikipediaSummary(hit.title, lang, lat, lng);
    if (summary && isExtractDomainCoherent(summary.extract, kind)) return summary;
  }

  // Vierte Stufe: Wikipedia-Volltext-Suche — findet Artikel, in deren Text
  // der POI-Name vorkommt, auch wenn Titel ganz verschieden ist
  // (z.B. "Grenzstein 151" → "Rechtsrheinischer Grenzverlauf um Basel").
  // Doppeltes Sicherheitsnetz: Artikel muss (a) Koordinaten innerhalb 5 km
  // haben UND (b) entweder den Namen im Titel tragen ODER innerhalb 2 km
  // liegen. Ohne (b) landen Stadt-Artikel wie "Lörrach" als Beschreibung
  // für einen POI "Fasnachtsfeuer", weil der Stadtartikel das Wort im Text
  // erwähnt, aber thematisch nichts mit dem POI zu tun hat.
  const fulltextUrl =
    `https://${lang}.wikipedia.org/w/api.php?action=query&list=search` +
    `&srsearch=${encodeURIComponent(name)}&srwhat=text&format=json&srlimit=5&origin=*`;
  const fulltextJson = await fetchJson<{ query?: { search?: { title: string }[] } }>(fulltextUrl);
  const fulltextHits = fulltextJson?.query?.search ?? [];
  for (const hit of fulltextHits) {
    // Artikel darf nicht schon durch Titelsuche abgelehnt worden sein
    if (titleHits.some((t) => t.title === hit.title)) continue;
    // Namensabgleich: Titel muss POI-Name grob enthalten (oder umgekehrt)
    const titleMatches = namesRoughlyMatch(hit.title, name);
    // maxDistKm=5 grundsätzlich; bei Titelübereinstimmung 5 km genug,
    // bei reinem Geo-Treffer (archäologische Objekte etc.) max 2 km.
    const maxDist = titleMatches ? 5 : 2;
    const summary = await fetchWikipediaSummary(
      hit.title,
      lang,
      lat,
      lng,
      maxDist,
      !titleMatches,
    );
    if (summary && isExtractDomainCoherent(summary.extract, kind)) return summary;
  }

  return null;
}

// Separater In-Memory-Cache fuer KI-generierte POI-Informationen.
// Laengere TTL als Wikipedia (7 Tage), da KI-Antworten nicht veralten.
const AI_POI_CACHE_MAX = 300;
const aiPoiCache = new Map<string, { at: number; summary: WikiSummary | null }>();
const AI_POI_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Vierte Anreicherungsstufe: fragt Claude nach faktischem Wissen ueber einen
 * konkreten Schweizer POI, wenn alle Wikipedia-Pfade erfolglos waren.
 *
 * Claude antwortet entweder mit 2–3 faktischen Saetzen ODER mit dem Wort
 * "UNBEKANNT" (wenn kein konkretes Wissen vorliegt). Letzteres wird als null
 * zurueckgegeben, damit kein halluzinierter Inhalt in die App gelangt.
 *
 * Ergebnisse (inkl. null) werden 7 Tage gecacht, um Kosten zu minimieren.
 */
export async function searchAiPoiKnowledge(
  name: string,
  kind: string,
  lang: string = DEFAULT_LANG,
  lat?: number,
  lng?: number,
): Promise<WikiSummary | null> {
  const key = `${lang}::${name}::${kind}`;
  const hit = aiPoiCache.get(key);
  if (hit && Date.now() - hit.at < AI_POI_TTL_MS) return hit.summary;

  const langLabels: Record<string, string> = {
    de: "Deutsch", en: "English", fr: "Français", it: "Italiano",
    es: "Español", pt: "Português", zh: "中文", ru: "Русский",
  };
  const langLabel = langLabels[lang] ?? "Deutsch";
  const coordHint = lat !== undefined && lng !== undefined
    ? `Koordinaten: ${lat.toFixed(4)}, ${lng.toFixed(4)} (Schweiz)`
    : `Region: Schweiz`;

  const prompt = [
    `Du bist ein Experte für Schweizer Kulturgeschichte und Sehenswürdigkeiten.`,
    ``,
    `Ort: "${name}"`,
    `OSM-Kategorie: ${kind}`,
    coordHint,
    ``,
    `Aufgabe: Schreibe 2–3 faktische Sätze über genau diesen Ort an den angegebenen`,
    `Koordinaten (Bedeutung, Geschichte, was man vor Ort sieht). Antworte auf ${langLabel}.`,
    ``,
    `Wichtig: Beziehe dich NUR auf diesen konkreten Ort, nicht auf andere Orte`,
    `gleichen Namens in anderen Städten oder Ländern.`,
    ``,
    `Wenn du diesen konkreten Ort nicht kennst oder keine verlässlichen Fakten hast,`,
    `antworte ausschliesslich mit dem Wort: UNBEKANNT`,
    ``,
    `Keine Einleitung, keine Erklärungen — nur den Sachtext oder UNBEKANNT.`,
  ].join("\n");

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const text = textBlock?.type === "text" ? textBlock.text.trim() : "";
    if (!text || text.toUpperCase().startsWith("UNBEKANNT") || text.length < 20) {
      if (aiPoiCache.size >= AI_POI_CACHE_MAX) { const k = aiPoiCache.keys().next().value; if (k !== undefined) aiPoiCache.delete(k); }
      aiPoiCache.set(key, { at: Date.now(), summary: null });
      return null;
    }
    const summary: WikiSummary = { title: name, extract: text, url: "", lang, image: null };
    if (aiPoiCache.size >= AI_POI_CACHE_MAX) { const k = aiPoiCache.keys().next().value; if (k !== undefined) aiPoiCache.delete(k); }
    aiPoiCache.set(key, { at: Date.now(), summary });
    return summary;
  } catch {
    return null;
  }
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
