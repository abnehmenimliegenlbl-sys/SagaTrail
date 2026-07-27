import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { Logger } from "pino";
import { LANGUAGE_LABEL } from "./storyGenerator";

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 512;
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2h

interface TranslationResult {
  beschreibung: string | null;
  angebot: string | null;
}

interface CacheEntry {
  result: TranslationResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(partnerId: string, lang: string): string {
  return `${lang}::${partnerId}`;
}

export async function translatePartnerContent(
  partnerId: string,
  beschreibung: string | null,
  angebot: string | null,
  lang: string,
  log: Logger,
): Promise<TranslationResult> {
  // Nichts zu uebersetzen
  if (!beschreibung && !angebot) return { beschreibung: null, angebot: null };

  const key = cacheKey(partnerId, lang);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const langLabel = LANGUAGE_LABEL[lang] ?? lang;

  const parts: string[] = [
    `Translate the following partner content into ${langLabel}.`,
    "The source text may be in any language (German, French, Italian, etc.).",
    "Return ONLY a valid JSON object with exactly these two keys: beschreibung and angebot.",
    "Keep null for any field that has no content. Do not add any text outside the JSON.",
    "",
  ];
  if (beschreibung) parts.push(`beschreibung: "${beschreibung}"`);
  else parts.push(`beschreibung: null`);
  if (angebot) parts.push(`angebot: "${angebot}"`);
  else parts.push(`angebot: null`);

  const prompt = parts.join("\n");

  log.info({ partnerId, lang }, "Partner-Inhalt wird übersetzt");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Keine Antwort vom Übersetzer");

  // JSON aus Antwort extrahieren (Haiku gibt manchmal ```json ... ``` zurück)
  const raw = textBlock.text.trim().replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(raw) as TranslationResult;

  const result: TranslationResult = {
    beschreibung: parsed.beschreibung ?? null,
    angebot: parsed.angebot ?? null,
  };

  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
