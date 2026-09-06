import { AgeTier, Archetype, Saga, StoryChapter } from "../types";
import { detectNavigationCues } from "./navigationCues";
import { resolveLang, STORY_PACKS } from "./storyContent";

/**
 * Deterministische Story-Engine (ohne KI in diesem Build).
 *
 * Baut aus einer Sage + Archetyp + Alterstufe + Sprache 4-6 atmosphaerische
 * Kapitel im Praesens zusammen, mit ein bis zwei Wahrnehmungs-Entscheidungen.
 * Die wandernde Person ist stets Zeuge, nie Held — der Ausgang der Sage
 * bleibt unveraenderlich. Entscheidungen betreffen nur Haltung und Blick.
 *
 * Die erzaehlten Texte folgen der gewaehlten Sprache; der App-Rahmen bleibt
 * deutsch.
 */
export function generateStory(
  saga: Saga,
  archetype: Archetype,
  ageTier: AgeTier,
  languageCode?: string
): StoryChapter[] {
  const lang = resolveLang(languageCode);
  const pack = STORY_PACKS[lang];
  const isKinder = ageTier === "kinder";
  // Zusammenfassung in Zielsprache direkt aus der kuratierten Sage; Deutsch
  // dient als Fallback, falls eine Sprache noch fehlt.
  const summary = saga.summaries[lang]?.text ?? saga.summary;
  const chapters: StoryChapter[] = [];

  // Kapitel 1 — Ankunft
  chapters.push({
    id: "ch1",
    text: pack.ch1(saga.canton, saga.title, pack.archetypeLens[archetype]),
    isDecisionPoint: false,
  });

  // Kapitel 2 — das Motiv erwacht
  chapters.push({
    id: "ch2",
    text: pack.ch2(summary),
    isDecisionPoint: false,
  });

  // Kapitel 3 — erste Wahrnehmungsentscheidung
  chapters.push({
    id: "ch3",
    text: isKinder ? pack.ch3Kinder : pack.ch3Adult,
    isDecisionPoint: true,
    decision: {
      question: pack.ch3Question,
      options: pack.ch3Options,
    },
  });

  // Kapitel 4 — Hoehepunkt
  chapters.push({
    id: "ch4",
    text: pack.ch4,
    isDecisionPoint: false,
  });

  // Kapitel 5 — zweite Wahrnehmungsentscheidung (nur ab Jugendlichen)
  if (!isKinder) {
    chapters.push({
      id: "ch5",
      text: pack.ch5Text,
      isDecisionPoint: true,
      decision: {
        question: pack.ch5Question,
        options: pack.ch5Options,
      },
    });
  }

  // Schlusskapitel
  chapters.push({
    id: "ch-final",
    text: pack.chFinal,
    isDecisionPoint: false,
  });

  return chapters;
}

/**
 * Flechtet Navigationshinweise ("an der naechsten Weggabelung links/rechts")
 * nahtlos in bereits erzeugte Kapitel ein — egal ob diese lokal, vom Server
 * oder als Download geladen wurden. Die Hinweise stammen ausschliesslich aus
 * echter Routen-Geometrie (siehe navigationCues.ts); ohne Geometrie bleiben
 * die Kapitel unveraendert. Ankunfts- und Schlusskapitel bleiben frei davon.
 */
export function weaveNavigationCues(
  chapters: StoryChapter[],
  saga: Saga,
  route: { geometry?: number[][] } | null | undefined,
  languageCode?: string
): StoryChapter[] {
  if (!route?.geometry || chapters.length < 3) return chapters;

  const eligible = chapters
    .map((_, i) => i)
    .filter((i) => i > 0 && i < chapters.length - 1);
  if (eligible.length === 0) return chapters;

  const cues = detectNavigationCues(route.geometry, eligible.length);
  if (cues.length === 0) return chapters;

  const lang = resolveLang(languageCode);
  const pack = STORY_PACKS[lang];
  const landmark = saga.title;

  const result = [...chapters];
  const used = new Set<number>();
  for (const cue of cues) {
    let pos = Math.round(cue.distanceFraction * (eligible.length - 1));
    pos = Math.max(0, Math.min(eligible.length - 1, pos));
    while (used.has(pos) && pos < eligible.length - 1) pos++;
    if (used.has(pos)) continue;
    used.add(pos);
    const targetIdx = eligible[pos];
    result[targetIdx] = {
      ...result[targetIdx],
      text: `${result[targetIdx].text} ${pack.navCue(cue.direction, landmark)}`,
    };
  }
  return result;
}
