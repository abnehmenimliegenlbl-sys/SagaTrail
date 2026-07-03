import { AgeTier, Archetype } from "@/types";

export const CANTONS: string[] = [
  "Aargau",
  "Appenzell Ausserrhoden",
  "Appenzell Innerrhoden",
  "Basel-Landschaft",
  "Basel-Stadt",
  "Bern",
  "Freiburg",
  "Genf",
  "Glarus",
  "Graubünden",
  "Jura",
  "Luzern",
  "Neuenburg",
  "Nidwalden",
  "Obwalden",
  "Schaffhausen",
  "Schwyz",
  "Solothurn",
  "St. Gallen",
  "Tessin",
  "Thurgau",
  "Uri",
  "Waadt",
  "Wallis",
  "Zug",
  "Zürich",
];

// Anzeigenamen (label/native) sowie Titel/Taglines/Beschreibungen sind
// sprachabhaengig und leben ausschliesslich in
// `lib/i18n/screens/onboarding.ts` (OnboardingStrings.languageNames /
// .archetypes / .ageTiers), damit es keinen stillen Fallback auf
// Deutsch gibt. Hier bleiben nur die stabilen IDs/Codes.

export interface LanguageOption {
  code: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "gsw" },
  { code: "de" },
  { code: "fr" },
  { code: "it" },
  { code: "en" },
  { code: "zh" },
  { code: "es" },
  { code: "pt" },
];

export interface ArchetypeOption {
  id: Archetype;
}

export const ARCHETYPES: ArchetypeOption[] = [
  { id: "reisende" },
  { id: "hueterin" },
  { id: "gewitzte" },
  { id: "senn" },
];

export interface AgeTierOption {
  id: AgeTier;
}

export const AGE_TIERS: AgeTierOption[] = [
  { id: "kinder" },
  { id: "jugendliche" },
  { id: "erwachsene" },
];
