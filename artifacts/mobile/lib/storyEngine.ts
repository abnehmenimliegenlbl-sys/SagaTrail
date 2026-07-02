import { AgeTier, Archetype, Saga, StoryChapter } from "../types";
import { resolveLang, STORY_PACKS } from "./storyContent";

/**
 * Deterministische Story-Engine (ohne KI in diesem Build).
 *
 * Baut aus einer Sage + Archetyp + Alterstufe + Sprache 4-6 atmosphaerische
 * Kapitel im Praesens zusammen, mit ein bis zwei Wahrnehmungs-Entscheidungen.
 * Der/die Wandernde ist stets Zeug:in, nie Held:in — der Ausgang der Sage
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
