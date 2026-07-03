import { useApp } from "@/contexts/AppContext";

import { LanguageCode, SUPPORTED_LANGUAGES } from "./languageCode";

/**
 * Erzwingt zur Kompilierzeit, dass ein Uebersetzungs-Dictionary fuer JEDE
 * unterstuetzte Sprache einen vollstaendigen Eintrag hat (kein stiller
 * Fallback auf Deutsch/Englisch bei fehlenden Uebersetzungen).
 */
export type StringsDict<T> = Record<LanguageCode, T>;

/**
 * Erzeugt einen React-Hook, der das Uebersetzungs-Objekt der aktuell
 * aktiven Sprache liefert (aus `AppContext.language`: Profil-Sprache oder
 * — vor Onboarding-Abschluss — die erkannte/gewaehlte Standardsprache).
 */
export function createUseStrings<T>(dict: StringsDict<T>) {
  return function useStrings(): T {
    const { language } = useApp();
    return dict[language];
  };
}

export { SUPPORTED_LANGUAGES };
export type { LanguageCode };
