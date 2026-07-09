import { Lang } from "./storyContent";

/**
 * Erkennt, welche Entscheidungsoption ein gesprochener Satz meint — ohne
 * Tastendruck. Zwei Strategien, in dieser Reihenfolge:
 *
 * 1. Ordnungswort ("eins"/"zwei"/"drei", "one"/"two" ...) — am zuverlaessigsten,
 *    weil die App den Nutzenden beim Vorlesen der Optionen explizit die
 *    Nummer nennt.
 * 2. Stichwort-Ueberschneidung mit dem Options-Label/archetypeHint — falls
 *    stattdessen ein Teil der eigentlichen Antwort gesprochen wird.
 *
 * Bei Unklarheit (kein Treffer oder Gleichstand) wird `null` zurueckgegeben,
 * damit die aufrufende Seite weiter zuhoert statt eine falsche Wahl zu raten.
 */

const ORDINAL_WORDS: Record<Lang, string[][]> = {
  de: [
    ["eins", "erste", "erstes", "erster", "1"],
    ["zwei", "zweite", "zweites", "zweiter", "2"],
    ["drei", "dritte", "drittes", "dritter", "3"],
  ],
  gsw: [
    ["eis", "eint", "erschti", "erschts", "1"],
    ["zwei", "zwöiti", "zwöits", "2"],
    ["drü", "dritti", "drits", "3"],
  ],
  fr: [
    ["un", "une", "premier", "première", "1"],
    ["deux", "deuxième", "2"],
    ["trois", "troisième", "3"],
  ],
  it: [
    ["uno", "una", "primo", "prima", "1"],
    ["due", "secondo", "seconda", "2"],
    ["tre", "terzo", "terza", "3"],
  ],
  en: [
    ["one", "first", "1"],
    ["two", "second", "2"],
    ["three", "third", "3"],
  ],
  zh: [
    ["一", "第一", "1"],
    ["二", "第二", "两", "2"],
    ["三", "第三", "3"],
  ],
  es: [
    ["uno", "una", "primero", "primera", "1"],
    ["dos", "segundo", "segunda", "2"],
    ["tres", "tercero", "tercera", "3"],
  ],
  pt: [
    ["um", "uma", "primeiro", "primeira", "1"],
    ["dois", "duas", "segundo", "segunda", "2"],
    ["três", "terceiro", "terceira", "3"],
  ],
  ru: [
    ["один", "первый", "первое", "1"],
    ["два", "второй", "второе", "2"],
    ["три", "третий", "третье", "3"],
  ],
};

/** Entfernt Satzzeichen/Akzente und normalisiert Gross-/Kleinschreibung. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim();
}

/** Zerlegt Label/Hinweis in aussagekraeftige Woerter (kurze Fuellwoerter raus). */
function significantWords(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

export interface VoiceMatchOption {
  label: string;
  archetypeHint: string;
}

export function matchDecisionOption(
  transcript: string,
  lang: Lang,
  options: VoiceMatchOption[]
): number | null {
  const normalized = normalize(transcript);
  if (!normalized) return null;

  const ordinals = ORDINAL_WORDS[lang] ?? ORDINAL_WORDS.de;
  const spokenWords = new Set(normalized.split(/\s+/));
  for (let i = 0; i < options.length && i < ordinals.length; i++) {
    if (ordinals[i].some((word) => spokenWords.has(word))) {
      return i;
    }
  }

  let bestIndex: number | null = null;
  let bestScore = 0;
  let tie = false;
  options.forEach((opt, i) => {
    const words = [...significantWords(opt.label), ...significantWords(opt.archetypeHint)];
    if (words.length === 0) return;
    const score = words.filter((w) => normalized.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
      tie = false;
    } else if (score === bestScore && score > 0) {
      tie = true;
    }
  });

  if (bestScore === 0 || tie) return null;
  return bestIndex;
}
