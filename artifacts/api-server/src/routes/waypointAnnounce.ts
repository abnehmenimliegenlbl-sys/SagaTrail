/**
 * POST /waypoint-announce
 *
 * Erzeugt per KI eine kurze, saga-atmosphaerische Ansage fuer einen
 * Wandermeilenstein (25 / 50 / 75 %). Die Ansage bezieht sich sprachlich
 * auf die aktuelle Sage (Titel + coreMotif) und wird in der Zielsprache
 * des Nutzers generiert. Ergebnis wird 7 Tage lang gecacht.
 */

import { Router } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { LANGUAGE_LABEL } from "../lib/storyGenerator";
import { logger } from "../lib/logger";

const router = Router();

interface CacheEntry {
  text: string;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 160;

function buildPrompt(sagaTitle: string, coreMotif: string, pct: number, lang: string): string {
  const langLabel = LANGUAGE_LABEL[lang] ?? "Hochdeutsch";
  const stage =
    pct === 25 ? "ein Viertel"
    : pct === 50 ? "die Hälfte"
    : "drei Viertel";
  return [
    `Du bist der Erzähler einer Schweizer Wander-App. Eine wandernde Person hat gerade ${stage} der heutigen Route zurückgelegt.`,
    `Die Wanderung ist der Sage "${sagaTitle}" gewidmet (Motiv: ${coreMotif}).`,
    ``,
    `Schreibe eine einzige atmosphärische Ansage (1–2 Sätze, maximal 70 Wörter) in folgendem Stil:`,
    `- Sprich die Person direkt an (Du-Form, Präsens)`,
    `- Beziehe dich auf das Sagenmotiv "${coreMotif}" ohne es wörtlich zu benennen`,
    `- Keine Prozentangaben, keine Kilometerangaben, keine Formatierung, kein Markdown`,
    `- Zielsprache: ${langLabel} — ausschliesslich diese Sprache`,
  ].join("\n");
}

router.post("/waypoint-announce", async (req, res) => {
  const { sagaId, sagaTitle, coreMotif, pct, lang } = req.body as {
    sagaId?: string;
    sagaTitle?: string;
    coreMotif?: string;
    pct?: number;
    lang?: string;
  };
  if (!sagaId || !sagaTitle || !pct || !lang) {
    return res.status(400).json({ error: "missing_fields" });
  }
  const key = `${sagaId}::${pct}::${lang}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ text: cached.text });
  }
  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: buildPrompt(sagaTitle, coreMotif ?? sagaTitle, pct, lang),
        },
      ],
    });
    const text =
      msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
    if (text) {
      cache.set(key, { text, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return res.json({ text: text || null });
  } catch (err) {
    logger.warn({ err }, "waypoint-announce AI-Fehler");
    return res.status(500).json({ error: "ai_error" });
  }
});

export default router;
