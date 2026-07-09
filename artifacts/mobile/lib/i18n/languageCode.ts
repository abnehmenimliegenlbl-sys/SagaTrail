/**
 * Sprachcode-Typ fuer die App-UI (Chrome) sowie die Sagen-Erzaehlung.
 * Muss exakt mit `LANGUAGES` in `constants/onboarding.ts` und mit den
 * Sprachpaketen in `lib/storyContent.ts` (`Lang`) uebereinstimmen.
 */
export type LanguageCode =
  | "de"
  | "gsw"
  | "fr"
  | "it"
  | "en"
  | "zh"
  | "es"
  | "pt"
  | "ru";

export const SUPPORTED_LANGUAGES: LanguageCode[] = [
  "de",
  "gsw",
  "fr",
  "it",
  "en",
  "zh",
  "es",
  "pt",
  "ru",
];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function isSupportedLanguage(code: string | null | undefined): code is LanguageCode {
  return !!code && (SUPPORTED_LANGUAGES as string[]).includes(code);
}

/**
 * Endonyme (Eigenbezeichnungen) der Sprachen — sprachunabhaengig, da sie
 * per Definition immer in der jeweiligen Sprache selbst geschrieben
 * werden (z.B. "Français" bleibt "Français", egal in welcher UI-Sprache
 * man sich befindet). Uebersetzte Fremdbezeichnungen (z.B. "Französisch"
 * auf Deutsch) liegen in `lib/i18n/screens/onboarding.ts`
 * (`OnboardingStrings.languageNames`).
 */
export const NATIVE_LANGUAGE_NAMES: Record<LanguageCode, string> = {
  gsw: "Schwiizerdütsch",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  en: "English",
  zh: "中文",
  es: "Español",
  pt: "Português (BR)",
  ru: "Русский",
};
