import type { Logger } from "pino";

/**
 * Repraesentatives Foto fuer eine Route ueber die Wikimedia-Commons-Geosuche
 * (kostenlos, kein API-Key). Bevorzugt Fotos, deren Aufnahmemonat zur
 * aktuellen Jahreszeit passt (aus den EXIF-/Extmetadata-Angaben von Commons);
 * gibt es keins, faellt die Auswahl auf das bestplatzierte Foto ueberhaupt.
 * Findet sich gar nichts, liefert der Endpunkt null und der Client zeigt
 * sein eigenes Fallback-Bild.
 */

const COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php";
const REQUEST_TIMEOUT_MS = 20000;
const SUCH_RADIUS_M = 5000;
const MAX_KANDIDATEN = 30;
const THUMB_BREITE_PX = 800;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 h — Fotos aendern sich kaum
const NEGATIV_TTL_MS = 30 * 60 * 1000; // 30 min bei echtem "nichts gefunden"
// Ein technischer Fehlschlag (Timeout, 429 trotz Retries) ist etwas anderes
// als "kein Foto vorhanden" — den nur kurz cachen, damit die naechste Anzeige
// (Bildschirm neu geoeffnet, erneuter Scroll) es bald wieder versucht.
const FEHLER_TTL_MS = 90 * 1000; // 90 s
// Commons drosselt bei vielen gleichzeitigen Anfragen (429) — wenn z.B. eine
// ganze Routenliste auf einmal Fotos laedt. Drei Gegenmassnahmen:
// 1) nur wenige Anfragen gleichzeitig rausschicken (Warteschlange),
// 2) zwischen dem Start je zweier Anfragen mindestens eine Mindestpause,
// 3) bei 429 mit kurzer Pause automatisch erneut versuchen.
const MAX_GLEICHZEITIG = 2;
const MIN_ABSTAND_MS = 350;
const RETRY_VERSUCHE = 4;
const RETRY_PAUSE_MS = 1500;

let aktiveAnfragen = 0;
let letzterStartMs = 0;
const warteschlange: Array<() => void> = [];

async function mitDrosselung<T>(aufgabe: () => Promise<T>): Promise<T> {
  if (aktiveAnfragen >= MAX_GLEICHZEITIG) {
    await new Promise<void>((resolve) => warteschlange.push(resolve));
  }
  aktiveAnfragen += 1;
  try {
    const wartenBisMs = letzterStartMs + MIN_ABSTAND_MS - Date.now();
    if (wartenBisMs > 0) await verzoegern(wartenBisMs);
    letzterStartMs = Date.now();
    return await aufgabe();
  } finally {
    aktiveAnfragen -= 1;
    const naechste = warteschlange.shift();
    if (naechste) naechste();
  }
}

function verzoegern(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RoutePhoto {
  photoUrl: string | null;
  attribution: string | null;
}

interface CacheEintrag {
  wert: RoutePhoto;
  bisMs: number;
}

const cache = new Map<string, CacheEintrag>();

type Jahreszeit = "fruehling" | "sommer" | "herbst" | "winter";

function jahreszeitVonMonat(monat: number): Jahreszeit {
  if (monat >= 3 && monat <= 5) return "fruehling";
  if (monat >= 6 && monat <= 8) return "sommer";
  if (monat >= 9 && monat <= 11) return "herbst";
  return "winter";
}

interface CommonsPage {
  title?: string;
  imageinfo?: Array<{
    thumburl?: string;
    url?: string;
    extmetadata?: {
      DateTimeOriginal?: { value?: string };
      Artist?: { value?: string };
      LicenseShortName?: { value?: string };
    };
  }>;
}

interface CommonsResponse {
  query?: {
    pages?: Record<string, CommonsPage>;
  };
}

/** Aufnahmemonat aus dem Commons-Datumsfeld ziehen (z. B. "2019-07-14 …"). */
function aufnahmeMonat(roh: string | undefined): number | null {
  if (!roh) return null;
  const treffer = roh.match(/(\d{4})-(\d{2})/);
  if (!treffer) return null;
  const monat = Number(treffer[2]);
  return monat >= 1 && monat <= 12 ? monat : null;
}

function htmlZuText(roh: string | undefined): string | null {
  if (!roh) return null;
  const text = roh.replace(/<[^>]*>/g, "").trim();
  return text.length > 0 ? text : null;
}

/** Offensichtlich ungeeignete Dateien (Karten, Wappen, Infrastruktur, Innenräume) aussieben. */
function wirktWieFoto(titel: string, fuerSage = false): boolean {
  const klein = titel.toLowerCase();
  if (!/\.(jpe?g)$/.test(klein)) return false;
  const verboten = [
    // Kartographie & Symbole
    "map", "karte", "wappen", "coat_of_arms", "logo", "diagram", "plan_",
    "schema", "chart", "infographic",
    // Infrastruktur & Verkehr
    "timetable", "fahrplan", "bahnhof", "station", "parkplatz", "parking",
    "lok", "train", "zug_", "railcar", "tram", "bus_", "wagen", "bahn_",
    "strassenbahnhaltestelle", "haltestelle", "autobahn",
    // Schilder & Tafeln (für Sagen deaktiviert — Denkmaltafeln sind relevant)
    ...(!fuerSage ? ["schild", "sign", "tafel", "plaque", "wegweiser", "hinweistafel"] : []),
    // Innenräume & Gebäude-Details
    "interior", "innen", "inside", "decke_",
    "ceiling", "fenster_", "window_", "tuer_", "door_",
    // Portraits & Personenfotos
    "portrait", "porträt", "person_", "people_", "crowd_",
    // Dokumente & Objekte
    "document", "urkunde", "münze", "coin_", "stamp_", "briefmarke",
    "book_", "buch_",
  ];
  return !verboten.some((wort) => klein.includes(wort));
}

/**
 * Fuehrt einen Commons-Request gedrosselt (max. MAX_GLEICHZEITIG parallel) und
 * mit automatischem Retry bei 429 (Rate-Limit) aus. Ein 429 fuehrt NICHT
 * sofort zum Aufgeben, sondern zu einer kurzen Pause und einem neuen Versuch —
 * genau das war die Ursache dafuer, dass in langen Listen die zuletzt
 * geladenen Karten oft kein Foto bekamen.
 */
async function commonsFetch(params: URLSearchParams, userAgent: string): Promise<CommonsPage[]> {
  return mitDrosselung(async () => {
    let letzterFehler: unknown;
    for (let versuch = 1; versuch <= RETRY_VERSUCHE; versuch += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(`${COMMONS_API_URL}?${params}`, {
          signal: controller.signal,
          headers: { "User-Agent": userAgent },
        });
        if (res.status === 429) {
          throw new Error("Commons-API-Status 429");
        }
        if (!res.ok) throw new Error(`Commons-API-Status ${res.status}`);
        const data = (await res.json()) as CommonsResponse;
        return Object.values(data.query?.pages ?? {});
      } catch (err) {
        letzterFehler = err;
        const istRateLimit = err instanceof Error && err.message.includes("429");
        const weitereVersucheUebrig = versuch < RETRY_VERSUCHE;
        if (istRateLimit && weitereVersucheUebrig) {
          await verzoegern(RETRY_PAUSE_MS * versuch);
          continue;
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }
    throw letzterFehler;
  });
}

/**
 * Kürzt einen langen Bildmotiv-Suchbegriff auf die 2 spezifischsten Ortsnamen.
 * Kurze Beschreibungen (< 5 Wörter) werden unverändert genutzt. Bei langen
 * Szenen-Beschreibungen (typisch für Paketesagen) werden die letzten 2
 * grossgeschriebenen Wörter (≥ 4 Buchstaben) extrahiert — das sind im Deutschen
 * erfahrungsgemäss die ortskonkretesten Nomen/Eigennamen.
 * Beispiel: "Hexe verwandelt sich Katze Nacht Gais Appenzellerland"
 *         → "Gais Appenzellerland"
 */
function extrahiereSuchbegriff(query: string): string {
  const wörter = query.trim().split(/\s+/);
  if (wörter.length < 5) return query;
  const nomen = wörter.filter(
    (w, i) => i > 0 && /^[A-ZÄÖÜ]/.test(w) && w.length >= 4,
  );
  if (nomen.length < 2) return wörter.slice(-2).join(" ");
  return nomen.slice(-2).join(" ");
}

async function sucheCommonsFotosNachText(query: string): Promise<CommonsPage[]> {
  const effektiverBegriff = extrahiereSuchbegriff(query);
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "1",
    generator: "search",
    gsrsearch: `${effektiverBegriff} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: String(MAX_KANDIDATEN),
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: String(THUMB_BREITE_PX),
    iiextmetadatafilter: "DateTimeOriginal|Artist|LicenseShortName",
  });
  return commonsFetch(params, "SagaTrail/1.0 (Sagenfoto-Suche)");
}

async function sucheCommonsFotos(lat: number, lng: number): Promise<CommonsPage[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "1",
    generator: "geosearch",
    ggscoord: `${lat}|${lng}`,
    ggsradius: String(SUCH_RADIUS_M),
    ggslimit: String(MAX_KANDIDATEN),
    ggsnamespace: "6",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: String(THUMB_BREITE_PX),
    iiextmetadatafilter: "DateTimeOriginal|Artist|LicenseShortName",
  });
  return commonsFetch(params, "SagaTrail/1.0 (Routenfoto-Suche)");
}

/**
 * Hinweise im Dateititel, dass ein Foto Natur/Landschaft/Wandergebiet zeigt.
 * Rein heuristisch — Commons-Titel sind frei vergeben.
 */
const LANDSCHAFTS_HINWEISE = [
  // Aussicht & Panorama
  "panorama", "view", "aussicht", "blick", "rundblick", "fernblick",
  // Landschaft allgemein
  "landschaft", "landscape", "natur", "nature", "scenery",
  // Gelaende & Topographie
  "tal", "valley", "berg", "mountain", "gipfel", "peak", "summit",
  "alp", "alpe", "alpen", "alps", "hochalp", "voralp",
  "pass", "sattel", "col_", "joch",
  "schlucht", "gorge", "klamm", "tobel", "graben",
  "hügel", "hugel", "kuppe",
  // Wasser
  "see", "lake", "fluss", "river", "bach", "stream",
  "wasserfall", "waterfall", "fall_", "falls_",
  "gletscher", "glacier",
  "moor", "ried", "sumpf",
  // Vegetation & Gelände
  "wald", "forest", "wood_", "woods",
  "wiese", "meadow", "weide", "alm",
  "feld", "field", "grain",
  "weinberg", "vineyard",
  // Wanderwege & Infrastruktur (draussen)
  "wanderweg", "trail", "pfad", "path_", "weg_",
  "bruecke", "brücke", "bridge",
  "dorf", "village", "weiler",
  // Geo-Referenz Schweiz
  "switzerland", "schweiz", "svizzera", "suisse",
  "appenzell", "graubünden", "graubuenden", "tessin", "wallis", "bern", "luzern",
];

function landschaftsBonus(titel: string): number {
  const klein = titel.toLowerCase();
  const treffer = LANDSCHAFTS_HINWEISE.filter((wort) => klein.includes(wort)).length;
  // 0 = kein Hinweis, 1 = ein Hinweis, 2 = mehrere Hinweise (stärkeres Signal)
  return Math.min(treffer, 2);
}

/**
 * Wählt das beste Foto aus den Geo-Suchergebnissen.
 * Gibt null zurück wenn kein Ergebnis mit Landschafts-Hinweis gefunden wird —
 * signalisiert dem Aufrufer, dass er eine Textsuche als Fallback starten soll.
 */
function wähleFoto(seiten: CommonsPage[], jetzt: Date, erlaubeOhneLandschaft = false): RoutePhoto | null {
  const zielJahreszeit = jahreszeitVonMonat(jetzt.getMonth() + 1);
  const kandidaten = seiten
    .filter((s) => s.title && wirktWieFoto(s.title) && s.imageinfo?.[0]?.thumburl)
    .map((s, index) => {
      const info = s.imageinfo![0]!;
      const monat = aufnahmeMonat(info.extmetadata?.DateTimeOriginal?.value);
      return {
        url: info.thumburl ?? info.url ?? null,
        passtZurSaison: monat != null && jahreszeitVonMonat(monat) === zielJahreszeit,
        landschaft: landschaftsBonus(s.title!),
        index,
        autor: htmlZuText(info.extmetadata?.Artist?.value),
        lizenz: htmlZuText(info.extmetadata?.LicenseShortName?.value),
      };
    })
    .filter((k) => k.url != null);
  if (kandidaten.length === 0) return null;

  // Strenge Auswahl: nur Kandidaten mit Landschafts-Hinweis im Titel.
  // Wenn keine solchen vorhanden und erlaubeOhneLandschaft=false → null zurück
  // (Aufrufer macht Fallback-Textsuche mit Routenname).
  const mitLandschaft = kandidaten.filter((k) => k.landschaft > 0);
  const pool = mitLandschaft.length > 0 ? mitLandschaft : (erlaubeOhneLandschaft ? kandidaten : []);
  if (pool.length === 0) return null;

  // Reihung: mehr Landschafts-Hinweise > Saisonpassung > näher am Startpunkt
  pool.sort(
    (a, b) =>
      b.landschaft - a.landschaft ||
      Number(b.passtZurSaison) - Number(a.passtZurSaison) ||
      a.index - b.index,
  );
  const gewaehlt = pool[0]!;
  const attribution = [gewaehlt.autor, gewaehlt.lizenz, "Wikimedia Commons"]
    .filter((teil): teil is string => teil != null)
    .join(" · ");
  return { photoUrl: gewaehlt.url, attribution };
}

/**
 * Titelrelevanz eines Fotos zum Suchbegriff (fuer Saga-Fotos).
 * Zaehlt wie viele normalisierte Suchwoerter im Dateinamen auftauchen —
 * hoehere Übereinstimmung = das Bild zeigt wahrscheinlich genau das Motiv.
 */
function titelRelevanz(titel: string, queryWoerter: string[]): number {
  const klein = titel.toLowerCase();
  return queryWoerter.filter((w) => klein.includes(w)).length;
}

/**
 * Bestplatziertes brauchbares Foto aus einer Volltextsuche waehlen.
 * Mit optionalem `query` werden Kandidaten nach Titelrelevanz nachgeordnet —
 * ein Bild dessen Dateiname Woerter aus dem Motiv-Suchbegriff enthaelt,
 * bekommt Vorrang vor einem thematisch fernen aber relevanzsortiert hoeher
 * platzierten Treffer.
 */
function wähleTextFoto(seiten: CommonsPage[], query?: string, fuerSage = false): RoutePhoto | null {
  const queryWoerter = query
    ? query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3)
    : [];
  const kandidaten = seiten
    .filter((s) => s.title && wirktWieFoto(s.title, fuerSage) && s.imageinfo?.[0]?.thumburl)
    .map((s, index) => {
      const info = s.imageinfo![0]!;
      return {
        url: info.thumburl ?? info.url ?? null,
        relevanz: queryWoerter.length > 0 ? titelRelevanz(s.title!, queryWoerter) : 0,
        index,
        autor: htmlZuText(info.extmetadata?.Artist?.value),
        lizenz: htmlZuText(info.extmetadata?.LicenseShortName?.value),
      };
    })
    .filter((k) => k.url != null);
  if (kandidaten.length === 0) return null;
  // Reihung: Titelrelevanz zuerst, dann ursprüngliche Relevanzsortierung der API
  kandidaten.sort((a, b) => b.relevanz - a.relevanz || a.index - b.index);
  const gewaehlt = kandidaten[0]!;
  const attribution = [gewaehlt.autor, gewaehlt.lizenz, "Wikimedia Commons"]
    .filter((teil): teil is string => teil != null)
    .join(" · ");
  return { photoUrl: gewaehlt.url, attribution };
}

/**
 * Laedt ein repraesentatives Foto fuer eine Sage.
 *
 * Zwei-Phasen-Suche:
 * 1. Textsuche mit dem vollen Bildmotiv-Begriff (z. B. "Vogel Gryff Basel").
 *    Kandidaten werden nach Titelrelevanz nachgeordnet — Dateien deren Namen
 *    Woerter aus dem Motiv enthalten, haben Vorrang.
 * 2. Falls Phase 1 leer: Suche mit dem ersten Hauptwort des Motivs
 *    (z. B. nur "Vogel Gryff"), um breitere Treffer zu finden.
 *
 * Denkmaltafeln und Skulpturen-Schilder sind fuer Sagen bewusst erlaubt
 * (fuerSage=true) — ein Denkmal-Schild ist bei einer Legendenstätte relevant.
 */
export async function getCachedSagaPhoto(query: string, log: Logger): Promise<RoutePhoto> {
  const schluessel = `text:${query.trim().toLowerCase()}`;
  const jetztMs = Date.now();
  const vorhanden = cache.get(schluessel);
  if (vorhanden && vorhanden.bisMs > jetztMs) return vorhanden.wert;
  try {
    // Phase 1: Volltextsuche mit vollständigem Bildmotiv
    const seiten = await sucheCommonsFotosNachText(query);
    const foto = wähleTextFoto(seiten, query, true);
    if (foto) {
      cache.set(schluessel, { wert: foto, bisMs: jetztMs + CACHE_TTL_MS });
      return foto;
    }

    // Phase 2: Fallback mit gekürztem Suchbegriff (erste 2 Hauptwoerter)
    const woerter = query.trim().split(/\s+/);
    if (woerter.length > 2) {
      const kurzBegriff = woerter.slice(0, 2).join(" ");
      const kurzSeiten = await sucheCommonsFotosNachText(kurzBegriff);
      const kurzFoto = wähleTextFoto(kurzSeiten, kurzBegriff, true);
      if (kurzFoto) {
        cache.set(schluessel, { wert: kurzFoto, bisMs: jetztMs + CACHE_TTL_MS });
        return kurzFoto;
      }
    }

    const wert: RoutePhoto = { photoUrl: null, attribution: null };
    cache.set(schluessel, { wert, bisMs: jetztMs + NEGATIV_TTL_MS });
    return wert;
  } catch (err) {
    log.warn({ query, err }, "Commons-Sagenfoto (Textsuche) konnte nicht geladen werden");
    const wert: RoutePhoto = { photoUrl: null, attribution: null };
    cache.set(schluessel, { wert, bisMs: jetztMs + FEHLER_TTL_MS });
    return wert;
  }
}

/**
 * Laedt ein repraesentatives Foto fuer eine Wanderroute.
 *
 * Zwei-Phasen-Suche:
 * 1. Geosuche (5 km Radius) — nur Treffer mit Landschafts-Hinweis im Titel.
 * 2. Falls Phase 1 leer: Textsuche mit dem Routennamen (+ "Wanderweg"),
 *    damit Routen mit bekanntem Namen ein thematisch passendes Foto bekommen.
 * 3. Letzter Fallback: Geo-Ergebnis ohne Landschafts-Anforderung nehmen,
 *    sofern ueberhaupt etwas vorhanden ist.
 *
 * Der optionale `routeName`-Parameter aktiviert Phase 2.
 */
export async function getCachedRoutePhoto(
  lat: number,
  lng: number,
  log: Logger,
  routeName?: string,
): Promise<RoutePhoto> {
  // Rasterung auf ~100 m, damit nahe Startpunkte denselben Cache-Schluessel teilen
  const schluessel = `${lat.toFixed(3)}|${lng.toFixed(3)}`;
  const jetztMs = Date.now();
  const vorhanden = cache.get(schluessel);
  if (vorhanden && vorhanden.bisMs > jetztMs) return vorhanden.wert;
  try {
    const jetzt = new Date();

    // Phase 1: Geosuche — streng (nur mit Landschafts-Hinweis)
    const geoSeiten = await sucheCommonsFotos(lat, lng);
    const geoFoto = wähleFoto(geoSeiten, jetzt, false);
    if (geoFoto) {
      cache.set(schluessel, { wert: geoFoto, bisMs: jetztMs + CACHE_TTL_MS });
      return geoFoto;
    }

    // Phase 2: Textsuche mit Routenname (wenn verfügbar)
    if (routeName) {
      const suchbegriff = routeName.length > 30
        ? routeName.split(/[·\-–]/)[0]!.trim()
        : routeName;
      const textSeiten = await sucheCommonsFotosNachText(`${suchbegriff} Wanderweg`);
      const textFoto = wähleTextFoto(textSeiten, suchbegriff);
      if (textFoto) {
        cache.set(schluessel, { wert: textFoto, bisMs: jetztMs + CACHE_TTL_MS });
        return textFoto;
      }
    }

    // Phase 3: Geo-Ergebnis ohne Landschafts-Anforderung (letzter Fallback)
    const fallbackFoto = wähleFoto(geoSeiten, jetzt, true);
    const wert: RoutePhoto = fallbackFoto ?? { photoUrl: null, attribution: null };
    cache.set(schluessel, {
      wert,
      bisMs: jetztMs + (fallbackFoto ? CACHE_TTL_MS : NEGATIV_TTL_MS),
    });
    return wert;
  } catch (err) {
    log.warn({ lat, lng, routeName, err }, "Commons-Routenfoto konnte nicht geladen werden");
    const wert: RoutePhoto = { photoUrl: null, attribution: null };
    cache.set(schluessel, { wert, bisMs: jetztMs + FEHLER_TTL_MS });
    return wert;
  }
}
