import { AgeTier, Archetype, Saga, StoryChapter } from "../types";
import { Lang, resolveLang, STORY_PACKS } from "./storyContent";
import { getLocalizedSagaTitle } from "./sagaTitle";

const FALLBACK_INTERLUDES: Record<
  Lang,
  { afterClimax: string; afterDecision: string; beforeFinal: string }
> = {
  de: {
    afterClimax:
      "Der Weg führt weiter, und zwischen den Bäumen wird die Spur der alten Geschichte deutlicher. Jeder Schritt verbindet die Gegenwart mit dem, was hier einst geschah.",
    afterDecision:
      "Deine Antwort bleibt bei dir, während sich die Landschaft wandelt. Die Sage nimmt ihren unveränderlichen Lauf und zeigt nun ihre tiefere Bedeutung.",
    beforeFinal:
      "Für einen Moment wird es still. Du blickst zurück auf den Weg und erkennst, dass nicht nur die Sage, sondern auch dein eigener Blick sich verändert hat.",
  },
  gsw: {
    afterClimax:
      "De Wäg füehrt wiiter, und zwüsche de Bäum wird d Spur vo de alte Gschicht immer düütlicher. Jede Schritt verbindet d Gegenwart mit dem, was da einisch passiert isch.",
    afterDecision:
      "Dini Antwort bliibt bi dir, während sich d Landschaft verändert. D Sag nimmt ihre unveränderlichi Lauf und zeigt jetzt ihri tüüferi Bedüütig.",
    beforeFinal:
      "Für en Momänt wird alles still. Du luegsch zrugg uf de Wäg und merkisch, dass nöd nume d Sag, sondern au din eigete Blick sich verändert hät.",
  },
  fr: {
    afterClimax:
      "Le chemin continue, et la trace de l’ancienne histoire devient plus claire entre les arbres. Chaque pas relie le présent à ce qui s’est passé ici autrefois.",
    afterDecision:
      "Ta réponse reste avec toi tandis que le paysage change. La légende poursuit son cours immuable et révèle maintenant son sens profond.",
    beforeFinal:
      "Pendant un instant, tout devient silencieux. Tu regardes le chemin parcouru et comprends que ton regard a changé avec la légende.",
  },
  it: {
    afterClimax:
      "Il sentiero continua e tra gli alberi la traccia dell’antica storia diventa più chiara. Ogni passo unisce il presente a ciò che qui è accaduto un tempo.",
    afterDecision:
      "La tua risposta resta con te mentre il paesaggio cambia. La leggenda segue il suo corso immutabile e ora mostra il suo significato più profondo.",
    beforeFinal:
      "Per un momento tutto tace. Guardi il sentiero percorso e capisci che insieme alla leggenda è cambiato anche il tuo sguardo.",
  },
  en: {
    afterClimax:
      "The path continues, and the trace of the old story grows clearer between the trees. Every step connects the present with what happened here long ago.",
    afterDecision:
      "Your answer stays with you as the landscape changes. The legend follows its unchanging course and now reveals its deeper meaning.",
    beforeFinal:
      "For a moment, everything falls silent. You look back along the path and realize that your own way of seeing has changed with the story.",
  },
  zh: {
    afterClimax:
      "小路继续向前，古老故事的痕迹在树林间变得更加清晰。每一步都把现在与很久以前发生的事情连接起来。",
    afterDecision:
      "当景色不断变化时，你的回答仍留在心中。传说沿着不可改变的轨迹继续，也展现出更深的意义。",
    beforeFinal:
      "一切安静了片刻。你回望走过的路，发现不仅传说改变了你的目光，你的目光也改变了传说。",
  },
  es: {
    afterClimax:
      "El sendero continúa y la huella de la antigua historia se vuelve más clara entre los árboles. Cada paso une el presente con lo que ocurrió aquí hace mucho tiempo.",
    afterDecision:
      "Tu respuesta permanece contigo mientras cambia el paisaje. La leyenda sigue su curso inmutable y revela ahora su significado más profundo.",
    beforeFinal:
      "Durante un instante todo queda en silencio. Miras el camino recorrido y comprendes que tu manera de ver también ha cambiado con la historia.",
  },
  pt: {
    afterClimax:
      "O caminho continua, e o rasto da antiga história fica mais claro entre as árvores. Cada passo liga o presente ao que aconteceu aqui há muito tempo.",
    afterDecision:
      "A tua resposta fica contigo enquanto a paisagem muda. A lenda segue o seu curso imutável e revela agora o seu significado mais profundo.",
    beforeFinal:
      "Por um instante, tudo fica em silêncio. Olhas para o caminho percorrido e percebes que o teu próprio olhar mudou com a história.",
  },
  ru: {
    afterClimax:
      "Тропа продолжается, и след древней истории становится яснее среди деревьев. Каждый шаг соединяет настоящее с тем, что произошло здесь давным-давно.",
    afterDecision:
      "Твой ответ остаётся с тобой, пока пейзаж меняется. Легенда идёт своим неизменным путём и теперь открывает более глубокий смысл.",
    beforeFinal:
      "На мгновение всё стихает. Ты оглядываешь пройденный путь и понимаешь, что вместе с легендой изменился и твой взгляд.",
  },
};

/**
 * Deterministische Story-Engine (ohne KI in diesem Build).
 *
 * Baut aus einer Sage + Archetyp + Alterstufe + Sprache acht atmosphaerische
 * Kapitel im Praesens zusammen, mit einem oder zwei Wahrnehmungs-Entscheidungen.
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
  const interludes = FALLBACK_INTERLUDES[lang];
  const isKinder = ageTier === "kinder";
  // Zusammenfassung in Zielsprache direkt aus der kuratierten Sage; Deutsch
  // dient als Fallback, falls eine Sprache noch fehlt.
  const summary = saga.summaries[lang]?.text ?? saga.summary;
  const chapters: StoryChapter[] = [];

  // Kapitel 1 — Ankunft
  chapters.push({
    id: "ch1",
    text: pack.ch1(
      saga.canton,
      getLocalizedSagaTitle(saga, lang),
      pack.archetypeLens[archetype],
    ),
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

  // Kapitel 5 — Nachhall des Höhepunkts
  chapters.push({
    id: "ch5-echo",
    text: interludes.afterClimax,
    isDecisionPoint: false,
  });

  // Kapitel 6 — zweite Wahrnehmungsentscheidung (nur ab Jugendlichen)
  if (!isKinder) {
    chapters.push({
      id: "ch6",
      text: pack.ch5Text,
      isDecisionPoint: true,
      decision: {
        question: pack.ch5Question,
        options: pack.ch5Options,
      },
    });
  }

  // Kapitel 7 — Nachhall der Entscheidung
  chapters.push({
    id: "ch7-reflection",
    text: interludes.afterDecision,
    isDecisionPoint: false,
  });

  // Kapitel 8 — Schlusskapitel
  chapters.push({
    id: "ch-final",
    text: interludes.beforeFinal + " " + pack.chFinal,
    isDecisionPoint: false,
  });

  return chapters;
}
