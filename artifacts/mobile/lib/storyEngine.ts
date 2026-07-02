import { AgeTier, Archetype, Saga, StoryChapter } from "../types";

/**
 * Deterministische Story-Engine (ohne KI in diesem Build).
 *
 * Baut aus einer Sage + Archetyp + Alterstufe 4-6 atmosphaerische Kapitel
 * im Praesens zusammen, mit ein bis zwei Wahrnehmungs-Entscheidungen.
 * Der/die Wandernde ist stets Zeug:in, nie Held:in — der Ausgang der Sage
 * bleibt unveraenderlich. Entscheidungen betreffen nur Haltung und Blick.
 */

const archetypeLens: Record<Archetype, string> = {
  reisende:
    "Als Reisende:r kommst du von aussen. Dein wacher Blick misst jede Bewegung im Nebel.",
  hueterin:
    "Als Hueter:in bist du dem Land verbunden. Du vernimmst das Fluestern zwischen den Steinen.",
  gewitzte:
    "Als Gewitzte:r suchst du die Luecke in jeder Drohung. Wo andere Angst spueren, suchst du den Ausweg.",
  senn: "Als Senn:in kennst du den Berg. Du liest die Zeichen ruhig, so wie du es seit jeher tust.",
};

function soften(text: string, isKinder: boolean): string {
  if (!isKinder) return text;
  return text
    .replace(/Blut/g, "Schatten")
    .replace(/Tod/g, "tiefer Schlaf")
    .replace(/stirbt/g, "verschwindet");
}

export function generateStory(
  saga: Saga,
  archetype: Archetype,
  ageTier: AgeTier
): StoryChapter[] {
  const isKinder = ageTier === "kinder";
  const chapters: StoryChapter[] = [];

  // Kapitel 1 — Ankunft
  chapters.push({
    id: "ch1",
    text: soften(
      `Der Pfad windet sich ins Herz von ${saga.canton}. Kalte Luft streicht dir ueber das Gesicht, und du spuerst, wie alt dieser Ort ist. ${archetypeLens[archetype]} Die Sage von ${saga.title} liegt greifbar in der Luft.`,
      isKinder
    ),
    isDecisionPoint: false,
  });

  // Kapitel 2 — das Motiv erwacht
  chapters.push({
    id: "ch2",
    text: soften(
      `Vor dir oeffnet sich die Szenerie. ${saga.summary} Du bist nur Zeug:in dieses uralten Geschehens — und doch zieht es dich hinein.`,
      isKinder
    ),
    isDecisionPoint: false,
  });

  // Kapitel 3 — erste Wahrnehmungsentscheidung
  chapters.push({
    id: "ch3",
    text: soften(
      isKinder
        ? "Ein Schatten gleitet ueber den Weg. Er wirkt fremd, aber nicht boese. Etwas bewegt sich am Rand deines Blicks."
        : "Ein tiefer Schatten faellt ueber den Weg, und ein dumpfes Grollen steigt aus dem Fels. Etwas bewegt sich am Rand deines Blicks.",
      isKinder
    ),
    isDecisionPoint: true,
    decision: {
      question: "Wie begegnest du dem, was sich naehert?",
      options: [
        {
          label: "Ich trete einen Schritt vor und halte stand.",
          archetypeHint: "Mut der Reisenden",
          tone: "mutig",
        },
        {
          label: "Ich bleibe still und beobachte.",
          archetypeHint: "Ruhe der Senn:in",
          tone: "bedacht",
        },
        {
          label: "Ich suche im Schatten nach einem Zeichen.",
          archetypeHint: "List der Gewitzten",
          tone: "wachsam",
        },
      ],
    },
  });

  // Kapitel 4 — Hoehepunkt
  chapters.push({
    id: "ch4",
    text: soften(
      `Das Grollen verstummt. Was hier einst geschah, entfaltet sich vor deinen Augen, unabaenderlich wie der Lauf des Wassers. Du erkennst: Die Legende ist mehr als ein Maerchen — sie atmet noch immer in diesem Tal.`,
      isKinder
    ),
    isDecisionPoint: false,
  });

  // Kapitel 5 — zweite Wahrnehmungsentscheidung (nur ab Jugendlichen)
  if (!isKinder) {
    chapters.push({
      id: "ch5",
      text: "Ein letztes Mal wendet sich das Geschehen dir zu, als wolle es dich fragen, was du mitnimmst von diesem Ort.",
      isDecisionPoint: true,
      decision: {
        question: "Was traegst du aus dieser Begegnung fort?",
        options: [
          {
            label: "Ehrfurcht vor dem, was groesser ist als ich.",
            archetypeHint: "Demut",
            tone: "ehrfuerchtig",
          },
          {
            label: "Die Gewissheit, dass Geschichten wahr sein koennen.",
            archetypeHint: "Erkenntnis",
            tone: "nachdenklich",
          },
        ],
      },
    });
  }

  // Schlusskapitel
  chapters.push({
    id: "ch-final",
    text: soften(
      "Der Moment vergeht. Die Natur nimmt ihren gewohnten Lauf wieder auf, der Wind legt sich. Du ziehst weiter, gezeichnet von dieser Begegnung, und das Tal behaelt sein Geheimnis — bis zur naechsten, die vorbeikommt.",
      isKinder
    ),
    isDecisionPoint: false,
  });

  return chapters;
}
