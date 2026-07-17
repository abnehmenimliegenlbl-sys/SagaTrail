import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { Logger } from "pino";

/**
 * Strukturelle Sagen-Eingabe fuer die Erzeugung. Bewusst nicht an eine konkrete
 * Tabelle gebunden, damit sowohl Katalog-Sagen (catalog_sagas) als auch
 * dynamisch erzeugte Routen-Sagen (route_sagas) verwendet werden koennen.
 */
export interface StorySagaInput {
  id: string;
  title: string;
  canton: string;
  coreMotif: string;
  mood: string;
  summary: string;
}

/**
 * KI-gestuetzte Erzeugung der kapitelweisen Sagen-Erzaehlung via Anthropic.
 *
 * Die wandernde Person ist stets Zeuge, nie Held — der Ausgang der Sage
 * bleibt unveraenderlich. Entscheidungen betreffen nur Haltung und Blick.
 * Sprache, Archetyp und Alterstufe steuern Ton und Wortwahl.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 8192;

export interface GeneratedDecisionOption {
  label: string;
  archetypeHint: string;
  tone: string;
}

export interface GeneratedChapter {
  id: string;
  text: string;
  isDecisionPoint: boolean;
  decision?: {
    question: string;
    options: GeneratedDecisionOption[];
  };
}

const ARCHETYPE_LABEL: Record<string, string> = {
  reisende: "Reisende (kommt von aussen, wacher, neugieriger Blick)",
  hueterin: "Hüter (dem Land verbunden, hört das Flüstern zwischen den Steinen)",
  gewitzte: "Gewitzte (sucht die Lücke in jeder Drohung, List statt Gewalt)",
  senn: "Senn (kennt den Berg, liest die Zeichen ruhig und erfahren)",
};

const AGE_LABEL: Record<string, string> = {
  kinder: "Kinder (ca. 6-11): sanfte Erzählung, unheimliche Motive entschärft, keine drastische Gewalt",
  jugendliche: "Jugendliche (ca. 12-15): spannungsvoll, aber ohne drastische Gewalt",
  erwachsene: "Erwachsene (ab 16): die Sage in ihrer ganzen düsteren Tiefe",
};

export const LANGUAGE_LABEL: Record<string, string> = {
  de: "Hochdeutsch",
  // gsw nutzt bewusst Hochdeutsch als Textsprache: Die Schweizer Faerbung kommt
  // ausschliesslich ueber die ElevenLabs-Stimmwahl (Schweizer Akzent), nicht
  // ueber Dialektschreibung. OpenAI TTS (Fallback) kann Mundarttext nicht
  // zuverlaessig aussprechen. (Nutzerentscheid 2026-07-08)
  gsw: "Hochdeutsch",
  fr: "Französisch",
  it: "Italienisch",
  en: "Englisch",
  zh: "Mandarin-Chinesisch",
  es: "Spanisch",
  pt: "Portugiesisch (brasilianisch)",
};

function buildPrompt(
  saga: StorySagaInput,
  archetype: string,
  ageTier: string,
  language: string,
): string {
  const langLabel = LANGUAGE_LABEL[language] ?? "Hochdeutsch";
  const decisionCount = ageTier === "kinder" ? 1 : 2;
  return [
    "Du bist ein meisterhafter mündlicher Erzähler für eine Schweizer Wander-App, die regionale Sagen live erzählt — in der Tradition grosser Sagenerzähler am Lagerfeuer.",
    "Erzeuge eine atmosphärische, kapitelweise Erzählung einer Schweizer Sage, die eine wandernde Person unterwegs über Kopfhörer hört.",
    "",
    "Erzählstil (sehr wichtig):",
    "- Erzähle SZENISCH, nicht zusammenfassend: zeige Momente, statt sie zu berichten. Keine Chronistenprosa, kein Nacherzähl-Ton.",
    "- Baue jede Szene mit sinnlichen Details auf, die zur Wanderung passen: Geräusche, Gerüche, Licht, Wetter, der Boden unter den Füssen.",
    "- Verwende wörtliche Rede der Sagenfiguren, wo die Sage es hergibt — knapp, altertümlich gefärbt, nie modern klingend.",
    "- Baue einen Spannungsbogen über die Kapitel: leiser Auftakt, wachsende Unruhe, Höhepunkt, Nachklang.",
    "- Jedes Kapitel hat 120 bis 200 Wörter — lang genug für echtes Eintauchen, kurz genug für eine Etappe.",
    "- Sprich die wandernde Person direkt an und verwebe die Landschaft um sie herum mit der Sage ('Der Pfad, auf dem du gehst...').",
    "- Vermeide Formulierungen wie 'Die Sage erzählt', 'Es heisst, dass', 'Der Legende nach' — erzähle die Geschichte unmittelbar, als geschehe sie jetzt.",
    "",
    `Sage: "${saga.title}" (Kanton ${saga.canton})`,
    `Kernmotiv: ${saga.coreMotif}`,
    `Stimmung: ${saga.mood}`,
    `Zusammenfassung der Sage: ${saga.summary}`,
    "",
    `Zielsprache der Erzählung: ${langLabel}. Schreibe den gesamten erzählten Text ausschliesslich in dieser Sprache.`,
    `Rolle der wandernden Person (Archetyp): ${ARCHETYPE_LABEL[archetype] ?? archetype}.`,
    `Zielgruppe (Alterstufe): ${AGE_LABEL[ageTier] ?? ageTier}.`,
    "",
    "Strikte Regeln:",
    "- Die wandernde Person ist stets Zeuge, nie Held. Der Ausgang der Sage bleibt unveränderlich.",
    "- Schreibe im Präsens, in der Du-Anrede.",
    "- Verwende KEIN Gendern (keine Formen wie 'Leser:innen', 'Wanderer*innen', 'Held/in'); nutze durchgehend neutrale oder generische Formen.",
    `- Erzeuge 4 bis 6 Kapitel, davon genau ${decisionCount} Entscheidungspunkt(e).`,
    "- Entscheidungen betreffen nur Haltung und Blick der wandernden Person, niemals den Ausgang der Sage.",
    "- Jeder Entscheidungspunkt hat eine kurze Frage und 2 bis 3 Optionen.",
    "- Jede Option hat: label (die Wahl, in Zielsprache), archetypeHint (kurzer Hinweis, in Zielsprache), tone (STABILE deutsche Kennung, eines von: mutig, bedacht, wachsam, ehrfuerchtig, nachdenklich).",
    "- Das letzte Kapitel ist ein ruhiger Abschluss ohne Entscheidung.",
    "",
    "Antworte AUSSCHLIESSLICH mit reinem JSON (kein Markdown, keine Code-Fences) in exakt dieser Struktur:",
    '{"chapters":[{"id":"ch1","text":"...","isDecisionPoint":false},{"id":"ch3","text":"...","isDecisionPoint":true,"decision":{"question":"...","options":[{"label":"...","archetypeHint":"...","tone":"mutig"}]}}]}',
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

function normalizeChapters(parsed: unknown): GeneratedChapter[] {
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !Array.isArray((parsed as { chapters?: unknown }).chapters)
  ) {
    throw new Error("KI-Antwort enthaelt kein gueltiges chapters-Array");
  }
  const chapters = (parsed as { chapters: unknown[] }).chapters;
  const result: GeneratedChapter[] = chapters.map((c, i) => {
    const obj = (c ?? {}) as Record<string, unknown>;
    const isDecisionPoint = obj.isDecisionPoint === true;
    const chapter: GeneratedChapter = {
      id: typeof obj.id === "string" && obj.id ? obj.id : `ch${i + 1}`,
      text: typeof obj.text === "string" ? obj.text : "",
      isDecisionPoint,
    };
    if (isDecisionPoint && obj.decision && typeof obj.decision === "object") {
      const dec = obj.decision as Record<string, unknown>;
      const options = Array.isArray(dec.options) ? dec.options : [];
      chapter.decision = {
        question: typeof dec.question === "string" ? dec.question : "",
        options: options.map((o) => {
          const opt = (o ?? {}) as Record<string, unknown>;
          return {
            label: typeof opt.label === "string" ? opt.label : "",
            archetypeHint: typeof opt.archetypeHint === "string" ? opt.archetypeHint : "",
            tone: typeof opt.tone === "string" ? opt.tone : "bedacht",
          };
        }),
      };
    }
    return chapter;
  });

  if (result.length < 3) {
    throw new Error("KI-Antwort liefert zu wenige Kapitel");
  }
  return result;
}

export async function generateStory(
  saga: StorySagaInput,
  archetype: string,
  ageTier: string,
  language: string,
  log: Logger,
): Promise<GeneratedChapter[]> {
  const prompt = buildPrompt(saga, archetype, ageTier, language);
  log.info({ sagaId: saga.id, archetype, ageTier, language }, "Anthropic Story-Generierung startet");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic-Antwort ohne Textinhalt");
  }

  const json = extractJson(textBlock.text);
  const parsed = JSON.parse(json);
  return normalizeChapters(parsed);
}
