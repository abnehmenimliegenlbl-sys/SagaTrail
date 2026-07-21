import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { Logger } from "pino";
import { LANGUAGE_LABEL } from "./storyGenerator";

/**
 * Generiert einen kurzen, atmosphaerischen Text, der einen Premium-Partnerbetrieb
 * organisch in den Kontext der laufenden Sage einwebt — sobald die wandernde Person
 * sich auf 500 m nähert.
 *
 * Strikte Anti-Halluzinations-Regeln: Nur Sagentitel, coreMotif sowie der
 * uebergebene Angebotstext oder die Beschreibung des Partners werden als
 * Fakten genutzt. Nichts wird erfunden.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 256;

export interface PartnerNarrationInput {
  sagaTitle: string;
  coreMotif: string;
  partnerName: string;
  angebot?: string | null;
  beschreibung?: string | null;
  lang: string;
}

interface CacheEntry {
  text: string;
  expiresAt: number;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — genuegt fuer eine Wandersaison
const cache = new Map<string, CacheEntry>();

function cacheKey(input: PartnerNarrationInput): string {
  return `${input.lang}::${input.sagaTitle}::${input.partnerName}::${input.angebot ?? ""}::${input.beschreibung ?? ""}`;
}

function buildPrompt(input: PartnerNarrationInput): string {
  const langLabel = LANGUAGE_LABEL[input.lang] ?? "Hochdeutsch";

  const partnerInfo: string[] = [`Partnerbetrieb: "${input.partnerName}"`];
  if (input.angebot?.trim()) {
    partnerInfo.push(`Angebot für SagaTrail-Wanderer: "${input.angebot.trim()}"`);
  }
  if (input.beschreibung?.trim()) {
    partnerInfo.push(`Kurzbeschreibung: "${input.beschreibung.trim()}"`);
  }

  return [
    "Du bist derselbe Erzähler, der in einer Schweizer Wander-App regionale Sagen live erzählt.",
    "Eine wandernde Person nähert sich einem Partnerbetrieb entlang des Weges.",
    "",
    `Aktuelle Sage: "${input.sagaTitle}"`,
    `Sagenmotiv: "${input.coreMotif || input.sagaTitle}"`,
    "",
    ...partnerInfo,
    "",
    "Schreibe 2–3 Sätze, die den Partnerbetrieb natürlich in den Kontext der laufenden Sage einweben.",
    "Nutze dabei ausschliesslich die oben genannten Informationen.",
    "",
    `Zielsprache: ${langLabel}. Schreibe ausschliesslich in dieser Sprache.`,
    "",
    "Strikte Regeln:",
    "- Schreibe im Präsens, in der Du-Anrede.",
    "- Verwende KEIN Gendern; nutze neutrale oder generische Formen.",
    "- 2 bis 3 Sätze, keine Aufzählungen, keine Überschrift.",
    "- Antworte AUSSCHLIESSLICH mit dem reinen Erzähltext, ohne Anführungszeichen, ohne Markdown.",
    "- Erfinde KEINE Fakten, Jahreszahlen oder Ereignisse, die nicht in den obigen Angaben stehen.",
    "- Das Sagenmotiv dient als Atmosphäre — zitiere die Sage nicht wörtlich und erfinde keine Sagen-Details.",
    "- Wenn ein Angebot angegeben ist, erwähne es konkret.",
  ].join("\n");
}

export async function narratePartner(
  input: PartnerNarrationInput,
  log: Logger,
): Promise<string> {
  const key = cacheKey(input);
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.text;
  }

  log.info(
    { partner: input.partnerName, saga: input.sagaTitle, lang: input.lang },
    "Partner-Sagen-Anpreisung wird generiert",
  );

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
  if (!text) throw new Error("Anthropic-Antwort ist leer");

  cache.set(key, { text, expiresAt: now + CACHE_TTL_MS });
  return text;
}
