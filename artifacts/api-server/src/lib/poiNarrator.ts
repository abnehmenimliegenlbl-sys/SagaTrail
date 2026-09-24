import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { Logger } from "pino";
import { getCuratedPoiNarration } from "./curatedPoiInfo";
import { LANGUAGE_LABEL } from "./storyGenerator";

/**
 * Formt einen rohen Wikipedia-Auszug eines Point of Interest per KI in einen
 * kurzen, atmosphaerischen Text im Erzaehlstil der App-Sagen um. Das
 * Detail-Modal beim Antippen eines POI-Markers zeigt so keine trockene
 * Enzyklopaedie-Sprache, sondern denselben Ton wie die Sagen selbst.
 *
 * Ohne Auszug und ohne verifizierten OSM-Kontext wird kein generischer
 * Kategorie-Text erzeugt; stattdessen wird transparent auf fehlende Details
 * hingewiesen.
 */

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 512;
const NO_VERIFIED_DETAILS: Record<string, string> = {
  de: "Zu diesem Ort liegen derzeit keine verlässlichen Detailinformationen vor.",
  gsw: "Zu diesem Ort liegen derzeit keine verlässlichen Detailinformationen vor.",
  en: "Reliable background information for this place is not available yet.",
  fr: "Aucune information fiable sur ce lieu n’est disponible pour le moment.",
  it: "Al momento non sono disponibili informazioni affidabili su questo luogo.",
  es: "Por ahora no hay información fiable disponible sobre este lugar.",
  pt: "Ainda não há informações fiáveis disponíveis sobre este local.",
  zh: "目前没有关于此地点的可靠背景信息。",
  ru: "Надёжная информация об этом месте пока недоступна.",
};

interface PoiNarrationInput {
  name: string;
  extract?: string;
  kind?: string;
  lang: string;
  /** Kuratierter OSM-Kontext (note, inscription, alt_name …) — gibt Claude verifizierte Fakten. */
  osmContext?: string;
}

interface CacheEntry {
  text: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheKey(input: PoiNarrationInput): string {
  return `poi-narration-v2::${input.lang}::${input.name}::${input.extract ?? ""}::${input.kind ?? ""}::${input.osmContext ?? ""}`;
}

/** Uebersetzt rohe OSM-Kind-Tags ("historic=boundary_stone") in lesbare
 *  deutsche Bezeichnungen, damit Claude den Objekttyp sofort versteht.
 *  Unbekannte Werte werden unveraendert uebergeben. */
function translateKind(kind: string | undefined): string {
  if (!kind) return "unbekannt";
  const MAP: Record<string, string> = {
    // historic
    "historic=boundary_stone":    "Historischer Grenzstein",
    "historic=ruins":             "Historische Ruine",
    "historic=castle":            "Burg oder Schloss",
    "historic=manor":             "Historisches Herrenhaus",
    "historic=monument":          "Denkmal",
    "historic=memorial":          "Gedenkstätte oder Mahnmal",
    "historic=wayside_cross":     "Wegkreuz (Bildstock)",
    "historic=wayside_shrine":    "Wegkapelle oder Wegschrein",
    "historic=church":            "Historische Kirche",
    "historic=city_gate":         "Historisches Stadttor",
    "historic=fort":              "Historische Festung",
    "historic=archaeological_site": "Archäologische Fundstätte",
    "historic=milestone":         "Historischer Meilenstein",
    "historic=battlefield":       "Historisches Schlachtfeld",
    "historic=mine":              "Historische Mine oder Bergwerk",
    "historic=building":          "Historisches Gebäude",
    "historic=tomb":              "Historisches Grabmal",
    "historic=yes":               "Historisches Objekt",
    "highway=bus_stop":           "Bushaltestelle",
    "railway=station":            "Bahnhof",
    "railway=halt":               "Bahn-Haltestelle",
    "railway=tram_stop":          "Tramhaltestelle",
    // saga
    "saga=heart":                 "Herzort der Sage",
    // tourism
    "tourism=artwork":            "Kunstobjekt / öffentliches Kunstwerk",
    "tourism=attraction":         "Sehenswürdigkeit",
    "tourism=viewpoint":          "Aussichtspunkt",
    "tourism=museum":             "Museum",
  };
  return MAP[kind] ?? kind;
}

/**
 * Erkennt institutionelle/behördliche Kategoriewörter im POI-Namen.
 * Wenn ein solches Wort vorhanden ist, IST die Kategorie das eigentliche Objekt —
 * nicht der geografische Zusatz im Namen (z.B. "Huetstock" in "Jagdbanngebiet Huetstock").
 * Gibt das erkannte Kategoriewort zurück oder null.
 */
function detectInstitutionalCategory(name: string): string | null {
  const lower = name.toLowerCase();
  const CATEGORIES: [string, string][] = [
    ["jagdbanngebiet",        "Jagdbanngebiet (Bundesschutzzone für Wildtiere)"],
    ["wildschutzgebiet",      "Wildschutzgebiet"],
    ["wildreservat",          "Wildreservat"],
    ["naturschutzgebiet",     "Naturschutzgebiet"],
    ["naturreservat",         "Naturreservat"],
    ["bundesreservat",        "Bundesreservat"],
    ["wildnisgebiet",         "Wildnisgebiet"],
    ["nationalpark",          "Nationalpark"],
    ["regionaler naturpark",  "Regionaler Naturpark"],
    ["naturpark",             "Naturpark"],
    ["vogelschutzreservat",   "Vogelschutzreservat"],
    ["moorlandschaft",        "Moorlandschaft (Bundesinventar)"],
    ["hochmoor",              "Hochmoor (Bundesinventar)"],
    ["flachmoor",             "Flachmoor (Bundesinventar)"],
    ["auengebiet",            "Auengebiet (Bundesinventar)"],
  ];
  for (const [key, label] of CATEGORIES) {
    if (lower.includes(key)) return label;
  }
  return null;
}

function buildPrompt(input: PoiNarrationInput): string {
  const langLabel = LANGUAGE_LABEL[input.lang] ?? "Hochdeutsch";
  const kindLabel = translateKind(input.kind);
  const institutionalCategory = detectInstitutionalCategory(input.name);
  const kopf = [
    "Du verfasst für eine Schweizer Wander-App kurze, quellengebundene Ortsinformationen.",
    "Eine wandernde Person kommt unterwegs an einem realen Ort vorbei.",
    "",
    // Schweizer Dialekt-Hinweis — nur zur korrekten Übersetzung des Namens:
    "WICHTIG – Schweizerdeutsche Ortsnamen:",
    "Viele Ortsnamen in der Schweiz sind schweizerdeutsch (Mundart). Übersetze sie sprachlich korrekt,",
    "aber leite daraus KEINE inhaltlichen Behauptungen über diesen konkreten Ort ab.",
    "Beispiele: 'Törli'=kleines Tor, 'Gässli'=kleine Gasse, 'Brugg'/'Brüggli'=Brücke,",
    "'Muul halte'/'Muulhalte'=Mund halten, 'Chilch'=Kirche, 'Bächli'=kleines Bächlein,",
    "'Stäg'=Steg, 'Badi'=Badeanstalt, 'Gupf'=Gipfel, 'Stei'=Stein, 'Witi'=weite Ebene.",
    "Korrekte Übersetzung: 'Törli' = kleines Tor. NICHT: erfinde eine Geschichte über das Tor.",
    "'Muul' ist NICHT Maultier. Zufällige Ähnlichkeiten zu anderen Sprachen ignorieren.",
  ];
  const fuss = [
    "",
    `Zielsprache: ${langLabel}. Schreibe ausschliesslich in dieser Sprache.`,
    "",
    "Strikte Regeln:",
    "- Schreibe im Präsens, in der Du-Anrede.",
    "- Verwende KEIN Gendern (keine Formen wie 'Wanderer*innen'); nutze neutrale oder generische Formen.",
    "- 1 bis 4 Sätze, keine Aufzählungen, keine Überschrift.",
    "- Schreibe einen sachlichen Ortsbericht, keine erfundene Szene.",
    "- Keine Metaphern, Personifizierungen oder szenischen Ausschmückungen.",
    "- Leite keine Jahreszeiten, Zeiträume, Ursachen, Abläufe oder Regelmäßigkeiten ab, die nicht ausdrücklich in den Quellen stehen.",
    "- Jeder Satz muss mindestens eine konkrete Information aus den Quellen enthalten.",
    "- Fülle den Text nicht mit allgemeinen Aussagen über die Objektkategorie auf; bei wenigen Fakten schreibe entsprechend kurz.",
    "- Kein einladender Abschlusssatz: KEINE Formulierungen wie 'Schau genauer hin', 'Vielleicht findest du noch etwas',",
    "  'Halte die Augen offen', 'Nimm dir einen Moment' oder ähnliche Handlungsaufforderungen am Ende.",
    "  Der Text endet mit einer faktischen Aussage, nicht mit einer Einladung.",
    "- Antworte AUSSCHLIESSLICH mit dem reinen Erzähltext, ohne Anführungszeichen, ohne Markdown, ohne Praeambel.",
    "- Wenn der Name eine reine Zahl oder ein kurzer Code ist (z.B. '42', 'K17', 'B.3'),",
    "  ist er eine Kennnummer dieses Objekts — KEIN kultureller Verweis, KEIN Filmzitat.",
  ];

  // OSM-Kontext-Block (falls vorhanden) — kommt vor fuss, nach dem Orts-Block
  const osmBlock = input.osmContext
    ? [
        "",
        "Zusätzliche verifizierte Informationen aus OpenStreetMap:",
        input.osmContext,
        "(Nutze diese Informationen bevorzugt — sie sind faktisch gesichert.)",
      ]
    : [];

  if (input.extract?.trim()) {
    // Wenn der Name eine institutionelle Kategorie enthält (z.B. "Jagdbanngebiet"),
    // beschreibt der Wikipedia-Auszug oft nur die geografische Lage (den Berg, das Tal),
    // nicht die Institution selbst. Explizit klarstellen, was das Hauptthema ist.
    const institutionalNote = institutionalCategory
      ? [
          "",
          `WICHTIG: Der POI-Name enthält eine institutionelle Kategorie: "${institutionalCategory}".`,
           "Der Ortsauszug beschreibt möglicherweise das geografische Objekt (Berg, Tal, Gewässer),",
          "das Teil des Namens ist — NICHT die Institution selbst.",
          `Dein Text soll erklären, was ein ${institutionalCategory} ist und welche Bedeutung`,
           "es für Natur und Wandernde hat. Nutze den Ortsauszug nur als geografischen Kontext",
          "(Lage, Größe, Höhe) — beschreibe NICHT primär das geografische Objekt.",
        ]
      : [];

    return [
      ...kopf,
      "",
      "Forme den folgenden nüchternen Ortsauszug in einen kurzen, konkreten und",
      "faktengebundenen Text für eine wandernde Person um.",
      "",
      `Ort: "${input.name}"`,
      `Objekttyp: ${kindLabel}`,
      `Ortsauszug: ${input.extract.trim()}`,
      ...institutionalNote,
      ...osmBlock,
      ...fuss,
      "- Erfinde KEINE neuen Fakten, Ereignisse oder Sagen -- nutze ausschliesslich die Angaben aus Auszug und OSM-Kontext.",
      "- Verwechsle den POI-Typ nicht mit einem gleichnamigen Ziel in der Nähe. Eine Bushaltestelle ist nicht selbst der Park, dessen Namen sie trägt.",
    ].join("\n");
  }

  // Ohne Auszug, aber mit OSM-Kontext: nur die konkreten Tags erzählen.
  return [
    ...kopf,
    "",
    "Zu diesem Ort gibt es keinen Wikipedia-Artikel.",
    "Dir sind bekannt: der Name, die OpenStreetMap-Kategorie und — falls vorhanden — zusätzliche OSM-Informationen.",
    "",
    `Ort: "${input.name}"`,
    `Objekttyp: ${kindLabel}`,
    ...osmBlock,
    ...fuss,
    "",
    "STRIKTE FAKTEN-REGELN (besonders wichtig ohne Wikipedia-Auszug):",
    "- Stütze dich NUR auf die obigen Angaben (Kategorie + OSM-Kontext).",
    "- Erfinde KEINE Fakten, Jahreszahlen, Ereignisse oder Geschichten zu genau diesem Ort.",
    "- Leite KEINEN Inhalt aus dem Namen ab — der Name ist ein Label, kein Faktum.",
    "  Beispiel: 'Lass deine Steine hier' → NICHT: 'Hier legen Pilger Steine nieder als Symbol ...'",
    "  (Das wäre erfunden, solange kein OSM-Kontext oder Wikipedia-Artikel das belegt.)",
    "- Wenn OSM-Kontext vorhanden: nutze ihn vollständig und wörtlich.",
    "- Erkläre nicht, was ein Objekt dieses Typs typischerweise ist oder warum es allgemein interessant sein könnte.",
    "- KEIN Satz der behauptet, was an genau diesem Ort passiert ist oder wer ihn gebaut hat,",
    "  es sei denn, dies steht explizit im OSM-Kontext.",
  ].join("\n");
}

export async function narratePoi(
  input: PoiNarrationInput,
  log: Logger,
): Promise<string> {
  const curatedNarration = getCuratedPoiNarration(
    input.name,
    input.kind ?? "",
    input.extract ?? "",
    input.lang,
  );
  if (curatedNarration) {
    log.info(
      { name: input.name, kind: input.kind, lang: input.lang },
      "POI-Erzählung direkt aus verifizierter Ortsquelle geliefert",
    );
    return curatedNarration;
  }

  if (!input.extract?.trim() && !input.osmContext?.trim()) {
    log.info(
      { name: input.name, kind: input.kind },
      "POI-Erzählung ohne verifizierte Detailquelle ausgelassen",
    );
    return NO_VERIFIED_DETAILS[input.lang] ?? NO_VERIFIED_DETAILS.de;
  }

  const key = cacheKey(input);
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.text;
  }

  log.info({ name: input.name, lang: input.lang }, "POI-Erzaehlton-Umschreibung startet");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: buildPrompt(input) }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic-Antwort ohne Textinhalt");
  }

  const text = textBlock.text.trim();
  if (!text) {
    throw new Error("Anthropic-Antwort ist leer");
  }

  cache.set(key, { text, expiresAt: now + CACHE_TTL_MS });
  return text;
}
