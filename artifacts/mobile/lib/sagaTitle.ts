import type { Saga } from "@/types";

/**
 * Sagentitel zeigen nur den eigentlichen Namen. Orts-, Sprach- oder
 * Alternativtitel in Klammern gehören nicht in die sichtbare Überschrift.
 */
export function ohneKlammerzusatz(title: string): string {
  const original = title.trim();
  let cleaned = original;

  // Mehrfach ausführen, damit auch verschachtelte Klammerausdrücke sauber
  // entfernt werden.
  while (/\([^()]*\)/.test(cleaned)) {
    cleaned = cleaned.replace(/\s*\([^()]*\)/g, "");
  }

  return cleaned.replace(/\s{2,}/g, " ").trim() || original;
}

export function normalizeSagaTitle(saga: Saga): Saga {
  const summaries = Object.fromEntries(
    Object.entries(saga.summaries ?? {}).map(([language, summary]) => [
      language,
      summary.title
        ? { ...summary, title: ohneKlammerzusatz(summary.title) }
        : summary,
    ]),
  );

  return {
    ...saga,
    title: ohneKlammerzusatz(saga.title),
    summaries,
  };
}

export function normalizeSagaTitles(sagas: Saga[]): Saga[] {
  return sagas.map(normalizeSagaTitle);
}