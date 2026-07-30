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
const SUCH_RADIUS_M = 2000;
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

// Welche Foto-URL wurde bereits fuer welchen Cache-Schluessel (Route/Ort)
// vergeben? Verhindert, dass dasselbe Bild fuer viele verschiedene Routen
// wiederverwendet wird (z. B. ein generischer Textsuche-Treffer, der frueher
// bei hunderten Code-Routen landete).
const vergebeneUrls = new Map<string, string>();

function urlFreiFuer(url: string | null, schluessel: string | undefined): boolean {
  if (!url || !schluessel) return true;
  const inhaber = vergebeneUrls.get(url);
  return inhaber === undefined || inhaber === schluessel;
}

function urlVergeben(url: string | null, schluessel: string | undefined): void {
  if (url && schluessel && !vergebeneUrls.has(url)) vergebeneUrls.set(url, schluessel);
}

/**
 * Vorbelegung der vergebenen URLs mit bereits in der DB gespeicherten
 * Foto-URLs (beim Serverstart). Ohne diese Vorbelegung "vergisst" der Server
 * nach jedem Neustart, welche Bilder schon an Routen vergeben sind, und
 * benachbarte Routen koennen dasselbe Panoramabild erneut waehlen.
 * Der Sentinel-Inhaber "db:<url>" stimmt mit keinem Request-Schluessel
 * ueberein, d.h. urlFreiFuer() liefert fuer alle neuen Anfragen false.
 */
export function vorbelegeVergebeneUrls(urls: Array<string | null>): number {
  let neu = 0;
  for (const url of urls) {
    if (url && !vergebeneUrls.has(url)) {
      vergebeneUrls.set(url, `db:${url}`);
      neu += 1;
    }
  }
  return neu;
}

// Grobe Bounding-Box Schweiz + Liechtenstein: Treffer ausserhalb sind fuer
// Wanderrouten sicher irrelevant (z. B. US-Feuerwachtuerme aus der Textsuche).
function inSchweizOderFL(lat: number, lon: number): boolean {
  return lat >= 45.7 && lat <= 47.95 && lon >= 5.8 && lon <= 10.6;
}

type Jahreszeit = "fruehling" | "sommer" | "herbst" | "winter";

function jahreszeitVonMonat(monat: number): Jahreszeit {
  if (monat >= 3 && monat <= 5) return "fruehling";
  if (monat >= 6 && monat <= 8) return "sommer";
  if (monat >= 9 && monat <= 11) return "herbst";
  return "winter";
}

interface CommonsPage {
  title?: string;
  coordinates?: Array<{ lat?: number; lon?: number }>;
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
    // Gebäude & Stadtbilder (für Wanderrouten ungeeignet)
    "building", "gebäude", "gebaude", "fassade", "facade",
    "strasse", "straße", "street_", "_street", "gasse_", "_gasse",
    "rathaus", "kirche_", "_kirche", "church_", "_church",
    "haus_", "_haus", "_house", "house_",
    "stadtblick", "stadtansicht", "innenstadt",
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

/**
 * Zerlegt einen Routennamen in seine Bestandteile für die Commons-Suche.
 * Gibt { start, ziel } zurück — start = Routenname + Startort,
 *                                ziel  = Routenname + Zielort.
 * Beispiel: "60 Via Rhenana Etappe 8 Laufenburg - Bad Säckingen"
 *   → start: "Via Rhenana Laufenburg"  |  ziel: "Via Rhenana Bad Säckingen"
 * Beispiel: "24 Thurweg Etappe 1 Wildhaus, Gamplüt - Nesslau"
 *   → start: "Thurweg Wildhaus"         |  ziel: "Thurweg Nesslau"
 * Beispiel: "K4 AG Fricktal-Rhein-Weg"
 *   → start: "Fricktal-Rhein-Weg"       |  ziel: null (kein Von-Bis)
 */
function bautRouteSuchbegriffe(routeName: string): { start: string; ziel: string | null } {
  // Führende Nummer entfernen
  let name = routeName.replace(/^\d{1,3}\s+/, "").trim();
  // K-Routen: "K4 AG Name" → "Name"
  name = name.replace(/^K\d+\s+[A-Z]{2}\s+/, "").trim();
  // "Etappe N " entfernen
  name = name.replace(/\s+Etappe\s+\d+[a-z]?\s+/i, " ").trim();

  // Reinen Routennamen (ohne Strecke) extrahieren
  const teile = name.split(/\s+[-–]\s+/);
  const vonTeil = teile[0]!.trim();
  const bisTeil = teile[1]?.trim() ?? null;

  // Routenname = alles vor dem ersten Grossbuchstaben-Wort das nach einem
  // bekannten Trailnamen-Wort kommt — heuristisch: letztes Wort im vonTeil
  // wenn vonTeil > 1 Wort: erster Teil ist Trailname, Rest ist Startort.
  const vonWörter = vonTeil.split(/\s+/);
  // Trailname: alle Wörter die NICHT ein Ortsname (Komma-bereinigt) sind —
  // einfache Heuristik: nimm alles bis auf das letzte Wort als Trailname.
  const trailname = vonWörter.length > 1
    ? vonWörter.slice(0, -1).join(" ")
    : vonTeil;
  const startOrt = vonWörter.length > 1
    ? vonWörter.at(-1)!.split(",")[0]!.trim()
    : "";
  const zielOrt = bisTeil ? bisTeil.split(",")[0]!.trim() : null;

  const start = [trailname, startOrt].filter(Boolean).slice(0, 4).join(" ");
  const ziel = zielOrt ? [trailname, zielOrt].filter(Boolean).slice(0, 4).join(" ") : null;
  return { start, ziel };
}

/** Rückwärtskompatibel: gibt nur den Start-Suchbegriff zurück. */
function bautRouteSuchbegriff(routeName: string): string {
  return bautRouteSuchbegriffe(routeName).start;
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
    prop: "imageinfo|coordinates",
    colimit: "max",
    iiprop: "url|extmetadata",
    iiurlwidth: String(THUMB_BREITE_PX),
    iiextmetadatafilter: "DateTimeOriginal|Artist|LicenseShortName",
  });
  return commonsFetch(params, "SagaTrail/1.0 (Sagenfoto-Suche)");
}

async function sucheCommonsFotos(lat: number, lng: number, radiusM = SUCH_RADIUS_M): Promise<CommonsPage[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "1",
    generator: "geosearch",
    ggscoord: `${lat}|${lng}`,
    ggsradius: String(radiusM),
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
function wähleFoto(
  seiten: CommonsPage[],
  jetzt: Date,
  erlaubeOhneLandschaft = false,
  schluessel?: string,
): RoutePhoto | null {
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
  // Bevorzugt ein Bild das noch keine andere Route nutzt; wenn alle schon
  // vergeben sind, ist der lokale Geo-Treffer dennoch akzeptabel.
  const gewaehlt = pool.find((k) => urlFreiFuer(k.url, schluessel)) ?? pool[0]!;
  urlVergeben(gewaehlt.url, schluessel);
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
function wähleTextFoto(
  seiten: CommonsPage[],
  query?: string,
  fuerSage = false,
  schluessel?: string,
): RoutePhoto | null {
  const queryWoerter = query
    ? query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3)
    : [];
  const kandidaten = seiten
    .filter((s) => s.title && wirktWieFoto(s.title, fuerSage) && s.imageinfo?.[0]?.thumburl)
    .map((s, index) => {
      const info = s.imageinfo![0]!;
      const koord = s.coordinates?.[0];
      return {
        url: info.thumburl ?? info.url ?? null,
        relevanz: queryWoerter.length > 0 ? titelRelevanz(s.title!, queryWoerter) : 0,
        koordLat: typeof koord?.lat === "number" ? koord.lat : null,
        koordLon: typeof koord?.lon === "number" ? koord.lon : null,
        index,
        autor: htmlZuText(info.extmetadata?.Artist?.value),
        lizenz: htmlZuText(info.extmetadata?.LicenseShortName?.value),
      };
    })
    .filter((k) => k.url != null)
    // Geo-Relevanz fuer Routen-Textsuche: Treffer mit Koordinaten ausserhalb
    // der Schweiz/Liechtenstein verwerfen (z. B. US-Feuerwachturm). Treffer
    // OHNE Koordinaten nur behalten, wenn der Dateiname tatsaechlich Woerter
    // aus dem Routennamen enthaelt — sonst sind es generische Streutreffer.
    .filter((k) => {
      if (fuerSage) return true;
      if (k.koordLat != null && k.koordLon != null) {
        return inSchweizOderFL(k.koordLat, k.koordLon);
      }
      return k.relevanz > 0;
    });
  if (kandidaten.length === 0) return null;
  // Reihung: Titelrelevanz zuerst, dann ursprüngliche Relevanzsortierung der API
  kandidaten.sort((a, b) => b.relevanz - a.relevanz || a.index - b.index);
  // Textsuche-Treffer sind nicht ortsgebunden — ein bereits anderswo vergebenes
  // Bild NICHT wiederverwenden (sonst bekommen viele Routen dasselbe Foto).
  const gewaehlt = fuerSage
    ? kandidaten[0]!
    : kandidaten.find((k) => urlFreiFuer(k.url, schluessel));
  if (!gewaehlt) return null;
  urlVergeben(gewaehlt.url, schluessel);
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
 * Strategie (benannte Routen — hat routeName):
 * 1. Textsuche mit präzisem Suchbegriff aus Routenname + Startort
 *    (z. B. "Via Rhenana Laufenburg Wanderweg") — Trail-spezifisch.
 * 2. Geosuche (2 km Radius) — nur Treffer mit Landschafts-Hinweis.
 * 3. Geo-Ergebnis ohne Landschafts-Anforderung (letzter Fallback).
 *
 * Lokale Routen ohne Namen: direkt Geosuche.
 *
 * Cache-Schluessel: routeName wenn vorhanden (jede Route bekommt ihr eigenes
 * Foto), sonst Koordinatenraster (100 m).
 */
export async function getCachedRoutePhoto(
  lat: number,
  lng: number,
  log: Logger,
  routeName?: string,
): Promise<RoutePhoto> {
  // Jede benannte Route bekommt ihren eigenen Cache-Schluessel —
  // verhindert dass zwei Routen am gleichen Startpunkt dasselbe Foto teilen.
  const schluessel = routeName
    ? `name:${routeName.toLowerCase()}`
    : `${lat.toFixed(3)}|${lng.toFixed(3)}`;
  const jetztMs = Date.now();
  const vorhanden = cache.get(schluessel);
  if (vorhanden && vorhanden.bisMs > jetztMs) return vorhanden.wert;
  try {
    const jetzt = new Date();

    // Phase 1 (nur bei benannten Routen): Textsuche mit Startort, dann Zielort.
    // Bevorzugt Trail-Name + Ort, damit das Foto zur Route passt statt
    // zum nächsten Gebäude innerhalb des Geo-Radius.
    if (routeName) {
      const { start: startBegriff, ziel: zielBegriff } = bautRouteSuchbegriffe(routeName);

      // 1a: Startort
      const startSeiten = await sucheCommonsFotosNachText(`${startBegriff} Wanderweg`);
      const startFoto = wähleTextFoto(startSeiten, startBegriff, false, schluessel);
      if (startFoto) {
        cache.set(schluessel, { wert: startFoto, bisMs: jetztMs + CACHE_TTL_MS });
        return startFoto;
      }

      // 1b: Zielort (falls vorhanden und Start nichts ergab)
      if (zielBegriff) {
        const zielSeiten = await sucheCommonsFotosNachText(`${zielBegriff} Wanderweg`);
        const zielFoto = wähleTextFoto(zielSeiten, zielBegriff, false, schluessel);
        if (zielFoto) {
          cache.set(schluessel, { wert: zielFoto, bisMs: jetztMs + CACHE_TTL_MS });
          return zielFoto;
        }
      }
    }

    // Phase 2: Geosuche (2 km Radius) — streng, nur mit Landschafts-Hinweis
    const geoSeiten = await sucheCommonsFotos(lat, lng);
    const geoFoto = wähleFoto(geoSeiten, jetzt, false, schluessel);
    if (geoFoto) {
      cache.set(schluessel, { wert: geoFoto, bisMs: jetztMs + CACHE_TTL_MS });
      return geoFoto;
    }

    // Phase 3: Geo-Ergebnis ohne Landschafts-Anforderung
    const fallbackFoto = wähleFoto(geoSeiten, jetzt, true, schluessel);
    if (fallbackFoto) {
      cache.set(schluessel, { wert: fallbackFoto, bisMs: jetztMs + CACHE_TTL_MS });
      return fallbackFoto;
    }

    // Phase 4: Weiterer Geo-Radius (5 km) — für abgelegene Routen ohne nahe Commons-Bilder
    const weitSeiten = await sucheCommonsFotos(lat, lng, 5000);
    const weitFoto = wähleFoto(weitSeiten, jetzt, false, schluessel) ?? wähleFoto(weitSeiten, jetzt, true, schluessel);
    const wert: RoutePhoto = weitFoto ?? { photoUrl: null, attribution: null };
    cache.set(schluessel, {
      wert,
      bisMs: jetztMs + (weitFoto ? CACHE_TTL_MS : NEGATIV_TTL_MS),
    });
    return wert;
  } catch (err) {
    log.warn({ lat, lng, routeName, err }, "Commons-Routenfoto konnte nicht geladen werden");
    const wert: RoutePhoto = { photoUrl: null, attribution: null };
    cache.set(schluessel, { wert, bisMs: jetztMs + FEHLER_TTL_MS });
    return wert;
  }
}
