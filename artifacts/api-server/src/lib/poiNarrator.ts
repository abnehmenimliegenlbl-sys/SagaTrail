import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { Logger } from "pino";
import { LANGUAGE_LABEL } from "./storyGenerator";

/**
 * Formt einen rohen Wikipedia-Auszug eines Point of Interest per KI in einen
 * kurzen, atmosphaerischen Text im Erzaehlstil der App-Sagen um. Das
 * Detail-Modal beim Antippen eines POI-Markers zeigt so keine trockene
 * Enzyklopaedie-Sprache, sondern denselben Ton wie die Sagen selbst.
 *
 * Ohne Wikipedia-Auszug (viele kleine POIs haben keinen Artikel) entsteht
 * stattdessen ein kurzer, bewusst zurueckhaltender Kontext aus Name und
 * OSM-Kategorie: Was fuer ein Ort das typischerweise ist -- OHNE erfundene
 * Fakten, Jahreszahlen oder Geschichten zu genau diesem Ort.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 512;

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
  return `${input.lang}::${input.name}::${input.extract ?? ""}::${input.kind ?? ""}::${input.osmContext ?? ""}`;
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
    // tourism
    "tourism=artwork":            "Kunstobjekt / öffentliches Kunstwerk",
    "tourism=attraction":         "Sehenswürdigkeit",
    "tourism=viewpoint":          "Aussichtspunkt",
    "tourism=museum":             "Museum",
  };
  return MAP[kind] ?? kind;
}

function buildPrompt(input: PoiNarrationInput): string {
  const langLabel = LANGUAGE_LABEL[input.lang] ?? "Hochdeutsch";
  const kindLabel = translateKind(input.kind);
  const kopf = [
    "Du bist derselbe Erzähler, der in einer Schweizer Wander-App regionale Sagen live erzählt.",
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
    "- 2 bis 8 Sätze, keine Aufzählungen, keine Überschrift.",
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

  if (input.extract) {
    return [
      ...kopf,
      "",
      "Forme den folgenden nüchternen Wikipedia-Auszug über diesen Ort in einen kurzen,",
      "atmosphärischen Erzähltext im selben Sagen-Erzählton um -- so, als würdest du der",
      "wandernden Person im Vorbeigehen davon erzählen.",
      "",
      `Ort: "${input.name}"`,
      `Objekttyp: ${kindLabel}`,
      `Wikipedia-Auszug: ${input.extract}`,
      ...osmBlock,
      ...fuss,
      "- Erfinde KEINE neuen Fakten, Ereignisse oder Sagen -- nutze ausschliesslich die Angaben aus Auszug und OSM-Kontext.",
    ].join("\n");
  }

  // Ohne Wikipedia-Auszug: Name + OSM-Kategorie + optionaler OSM-Kontext bekannt.
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
    "- Wenn kein OSM-Kontext vorhanden: beschreibe nur, was ein Objekt des Typs «" + kindLabel + "»",
    "  typischerweise ist und warum es für Wandernde interessant sein kann.",
    "- KEIN Satz der behauptet, was an genau diesem Ort passiert ist oder wer ihn gebaut hat,",
    "  es sei denn, dies steht explizit im OSM-Kontext.",
  ].join("\n");
}

export async function narratePoi(
  input: PoiNarrationInput,
  log: Logger,
): Promise<string> {
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
