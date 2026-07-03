import * as Localization from "expo-localization";

import { DEFAULT_LANGUAGE, isSupportedLanguage, LanguageCode } from "./languageCode";

/**
 * Ermittelt die Systemsprache des Geraets und bildet sie auf eine der von
 * SagaTrail unterstuetzten Sprachen ab. Wird NUR beim allerersten Start
 * verwendet (bevor ein Profil existiert) — sobald der Nutzer aktiv eine
 * Sprache waehlt, hat diese fuer immer Vorrang (siehe AppContext).
 *
 * "gsw" (Schweizerdeutsch) hat keinen eigenen ISO-Sprachcode auf den
 * meisten Geraeten und wird daher nie automatisch erkannt — nur explizit
 * waehlbar. Ist die Systemsprache nicht unterstuetzt, faellt die App auf
 * Englisch zurueck (nicht Deutsch).
 */
export function detectSystemLanguage(): LanguageCode {
  try {
    const locales = Localization.getLocales();
    for (const locale of locales) {
      const code = locale.languageCode?.toLowerCase();
      if (isSupportedLanguage(code)) return code;
    }
  } catch {
    // Localization-API nicht verfuegbar (z. B. bestimmte Web-Umgebungen)
  }
  return DEFAULT_LANGUAGE;
}
