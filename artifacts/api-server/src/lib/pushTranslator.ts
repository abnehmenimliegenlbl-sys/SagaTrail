import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { Logger } from "pino";
import { LANGUAGE_LABEL } from "./storyGenerator";

const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 1024;

export interface PushText {
  title: string;
  body: string;
}

/**
 * Übersetzt eine Push-Nachricht (Titel + Text) in mehrere Zielsprachen in
 * EINEM Anthropic-Aufruf. Deutsch (de) und Schweizerdeutsch (gsw) behalten
 * den Originaltext (gsw-Regel: Text bleibt Hochdeutsch).
 * Schlägt die Übersetzung fehl, fällt jede Sprache auf das Original zurück.
 */
export async function translatePush(
  original: PushText,
  langs: string[],
  log: Logger,
): Promise<Map<string, PushText>> {
  const result = new Map<string, PushText>();
  const zuUebersetzen = [...new Set(langs)].filter((l) => l !== "de" && l !== "gsw");
  for (const l of langs) result.set(l, original); // Fallback: Original

  if (zuUebersetzen.length === 0) return result;

  const liste = zuUebersetzen
    .map((l) => `"${l}" (${LANGUAGE_LABEL[l] ?? l})`)
    .join(", ");
  const prompt = [
    `Translate this push notification into the following languages: ${liste}.`,
    "Keep it short and natural (title max 100 chars, body max 200 chars). Keep emojis.",
    "Return ONLY a valid JSON object mapping each language code to {\"title\": ..., \"body\": ...}.",
    "",
    `title: ${JSON.stringify(original.title)}`,
    `body: ${JSON.stringify(original.body)}`,
  ].join("\n");

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    });
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Keine JSON-Antwort");
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<
      string,
      { title?: unknown; body?: unknown }
    >;
    for (const l of zuUebersetzen) {
      const e = parsed[l];
      if (e && typeof e.title === "string" && typeof e.body === "string" && e.title && e.body) {
        result.set(l, { title: e.title.slice(0, 100), body: e.body.slice(0, 200) });
      } else {
        log.warn({ lang: l }, "Push-Übersetzung fehlt — Original wird verwendet");
      }
    }
  } catch (err) {
    log.warn({ err }, "Push-Übersetzung fehlgeschlagen — alle Sprachen erhalten das Original");
  }
  return result;
}
