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

function buildPrompt(input: PoiNarrationInput): string {
  const langLabel = LANGUAGE_LABEL[input.lang] ?? "Hochdeutsch";
  const kopf = [
    "Du bist derselbe Erzähler, der in einer Schweizer Wander-App regionale Sagen live erzählt.",
    "Eine wandernde Person kommt unterwegs an einem realen Ort vorbei.",
    "",
    // Schweizer Dialekt-Hinweis — gilt für alle Zweige:
    "WICHTIG – Schweizerdeutsche Ortsnamen:",
    "Viele Ortsnamen in der Schweiz sind schweizerdeutsch (Mundart). Interpretiere sie sprachlich korrekt:",
    "Beispiele: 'Törli'=kleines Tor, 'Gässli'=kleine Gasse, 'Brugg'/'Brüggli'=Brücke,",
    "'Muul halte'/'Muulhalte'=Mund halten (Schweigegebot), 'Chilch'=Kirche, 'Bächli'=kleines Bächlein,",
    "'Stäg'=Steg, 'Badi'=Badeanstalt, 'Wäg'=Weg, 'Hüsli'=kleines Haus, 'Rötel'=Röte/Rotstein,",
    "'Gupf'=Gipfel, 'Rank'=Kurve, 'Gmünd'=Mündung, 'Stei'=Stein, 'Witi'=weite Ebene.",
    "Leite den Inhalt AUS DEM KORREKTEN SPRACHSINN DES NAMENS ab — nie aus einer anderen Sprache",
    "oder zufälligen Ähnlichkeiten ('Muul' ist NICHT Maultier, 'Törli' ist NICHT ein Eigenname).",
  ];
  const fuss = [
    "",
    `Zielsprache: ${langLabel}. Schreibe ausschliesslich in dieser Sprache.`,
    "",
    "Strikte Regeln:",
    "- Schreibe im Präsens, in der Du-Anrede.",
    "- Verwende KEIN Gendern (keine Formen wie 'Wanderer*innen'); nutze neutrale oder generische Formen.",
    "- 2 bis 4 Sätze, keine Aufzählungen, keine Überschrift.",
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
      `OpenStreetMap-Kategorie: ${input.kind ?? "unbekannt"}`,
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
    "Bekannt sind sein Name, seine OpenStreetMap-Kategorie und — falls vorhanden — zusätzliche OSM-Informationen.",
    "Schreibe einen kurzen, atmosphärischen Erzähltext der:",
    "1. Den korrekten sprachlichen Sinn des Namens nutzt (Schweizerdeutsch beachten, s.o.).",
    "2. Die verifizierte OSM-Information einbezieht (falls vorhanden).",
    "3. Die wandernde Person einlädt, genauer hinzuschauen.",
    "",
    `Ort: "${input.name}"`,
    `OpenStreetMap-Kategorie: ${input.kind ?? "unbekannt"}`,
    ...osmBlock,
    ...fuss,
    "- Wenn der Name auf eine bekannte historische Person hinweist, erwähne kurz wer sie war.",
    "- Erfinde KEINE ungesicherten Details, Jahreszahlen oder Ereignisse.",
    "- Wenn weder Name noch Kategorie konkreten Inhalt liefern, erkläre was diese Kategorie typischerweise bedeutet.",
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
