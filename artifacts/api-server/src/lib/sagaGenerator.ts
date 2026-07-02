import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { Logger } from "pino";
import type { ExternalRouteRow } from "@workspace/db";

/**
 * KI-gestuetzte Erzeugung einer ortsverankerten Schweizer Sage zu einer real
 * existierenden Wanderroute (aus OpenStreetMap). Die Sage ist am Verlauf der
 * Route verankert (Name, Kanton, Umgebung) und im Stil echter regionaler Sagen
 * gehalten. Erzeugt nur die Sagen-Metadaten; die kapitelweise Erzaehlung
 * entsteht spaeter ueber storyGenerator.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;

export interface GeneratedSaga {
  title: string;
  coreMotif: string;
  mood: string;
  summary: string;
}

function buildPrompt(route: ExternalRouteRow): string {
  return [
    "Du bist Kenner:in der Schweizer Sagenwelt und schreibst fuer eine Wander-App.",
    "Erfinde eine stimmige, regional glaubwuerdige Sage (Sagen-Motiv), die entlang einer bestimmten realen Wanderroute spielt.",
    "",
    `Wanderroute: "${route.name}"${route.ref ? ` (Route ${route.ref})` : ""}`,
    `Kanton: ${route.canton}`,
    `Laenge: ca. ${route.distanceKm.toFixed(1)} km, Aufstieg ca. ${Math.round(route.ascentM)} Hoehenmeter.`,
    "",
    "Regeln:",
    "- Verankere die Sage klar in dieser Landschaft/Region (Berge, Taeler, Alpen, Wasser, Kapellen, alte Wege).",
    "- Stil echter Schweizer Sagen: Geister, Senn:innen, Drachen, verwunschene Orte, Fluch und Suehne, Warnungen der Ahnen.",
    "- Schreibe ausschliesslich auf Deutsch. Verwende das scharfe ß (nicht ss). Keine Emojis.",
    "- Erfinde keine realen historischen Personen; halte es sagenhaft, nicht faktenbehauptend.",
    "",
    "Antworte AUSSCHLIESSLICH mit reinem JSON (kein Markdown, keine Code-Fences) in exakt dieser Struktur:",
    '{"title":"Kurzer Sagentitel","coreMotif":"Kernmotiv in 3-6 Woertern","mood":"Stimmung in 1-3 Woertern","summary":"2 bis 4 Saetze, welche die Sage umreissen."}',
  ].join("\n");
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return trimmed;
}

export async function generateSagaForRoute(
  route: ExternalRouteRow,
  log: Logger,
): Promise<GeneratedSaga> {
  const prompt = buildPrompt(route);
  log.info({ routeId: route.id, canton: route.canton }, "Anthropic Sagen-Generierung startet");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic-Antwort ohne Textinhalt");
  }

  const parsed = JSON.parse(extractJson(textBlock.text)) as Partial<GeneratedSaga>;
  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  if (!title || !summary) {
    throw new Error("KI-Sage unvollstaendig (title/summary fehlen)");
  }
  return {
    title,
    coreMotif:
      typeof parsed.coreMotif === "string" && parsed.coreMotif.trim()
        ? parsed.coreMotif.trim()
        : "Verwunschener Weg",
    mood:
      typeof parsed.mood === "string" && parsed.mood.trim()
        ? parsed.mood.trim()
        : "geheimnisvoll",
    summary,
  };
}
