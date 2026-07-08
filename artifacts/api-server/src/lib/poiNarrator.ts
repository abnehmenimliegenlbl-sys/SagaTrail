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
}

interface CacheEntry {
  text: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheKey(input: PoiNarrationInput): string {
  return `${input.lang}::${input.name}::${input.extract ?? ""}::${input.kind ?? ""}`;
}

function buildPrompt(input: PoiNarrationInput): string {
  const langLabel = LANGUAGE_LABEL[input.lang] ?? "Hochdeutsch";
  const kopf = [
    "Du bist derselbe Erzähler, der in einer Schweizer Wander-App regionale Sagen live erzählt.",
    "Eine wandernde Person kommt unterwegs an einem realen Ort vorbei.",
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
  ];

  if (input.extract) {
    return [
      ...kopf,
      "Forme den folgenden nüchternen Wikipedia-Auszug über diesen Ort in einen kurzen,",
      "atmosphärischen Erzähltext im selben Sagen-Erzählton um -- so, als würdest du der",
      "wandernden Person im Vorbeigehen davon erzählen.",
      "",
      `Ort: "${input.name}"`,
      `Wikipedia-Auszug: ${input.extract}`,
      ...fuss,
      "- Erfinde KEINE neuen Fakten, Ereignisse oder Sagen -- nutze ausschliesslich die Angaben aus dem Auszug.",
    ].join("\n");
  }

  // Ohne Wikipedia-Auszug: nur Name + OSM-Kategorie sind bekannt. Der Text
  // erklärt zurückhaltend, was für eine ART von Ort das ist, und lädt zum
  // Hinschauen ein -- ohne konkrete Fakten zu diesem Ort zu behaupten.
  return [
    ...kopf,
    "Zu diesem Ort gibt es keinen Wikipedia-Artikel -- bekannt sind nur sein Name und seine",
    "OpenStreetMap-Kategorie. Erkläre in einem kurzen, atmosphärischen Erzähltext, was für eine",
    "Art von Ort das ist (was man an so einem Ort typischerweise sieht und wozu er einst diente),",
    "und lade die wandernde Person ein, genauer hinzuschauen.",
    "",
    `Ort: "${input.name}"`,
    `OpenStreetMap-Kategorie: ${input.kind ?? "unbekannt"}`,
    ...fuss,
    "- Behaupte KEINE konkreten Fakten zu genau diesem Ort: keine Jahreszahlen, keine Namen von Personen, keine erfundenen Ereignisse oder Sagen.",
    "- Sprich nur über das, was die Kategorie allgemein bedeutet, und über das, was der Name offensichtlich hergibt.",
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
