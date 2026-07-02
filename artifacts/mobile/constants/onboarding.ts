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

export interface LanguageOption {
  code: string;
  label: string;
  native: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "gsw", label: "Schweizerdeutsch", native: "Schwiizerdütsch" },
  { code: "de", label: "Deutsch", native: "Deutsch" },
  { code: "fr", label: "Französisch", native: "Français" },
  { code: "it", label: "Italienisch", native: "Italiano" },
  { code: "en", label: "Englisch", native: "English" },
  { code: "zh", label: "Mandarin", native: "中文" },
  { code: "es", label: "Spanisch", native: "Español" },
  { code: "pt", label: "Portugiesisch", native: "Português (BR)" },
];

export interface ArchetypeOption {
  id: Archetype;
  title: string;
  tagline: string;
  description: string;
}

export const ARCHETYPES: ArchetypeOption[] = [
  {
    id: "reisende",
    title: "Die/der Reisende",
    tagline: "Von aussen ins Tal",
    description:
      "Du kommst von weit her und hilfst mit Wissen und Mut. Dein Blick ist der einer neugierigen Beobachterin.",
  },
  {
    id: "hueterin",
    title: "Die/der Hüter:in",
    tagline: "Der Natur verbunden",
    description:
      "Du vermittelst zwischen Menschen und Geisterwelt. Du hörst, was zwischen den Steinen flüstert.",
  },
  {
    id: "gewitzte",
    title: "Die/der Gewitzte",
    tagline: "Klugheit statt Kampf",
    description:
      "Du löst mit List, was andere mit Gewalt versuchen. Wo Gefahr droht, suchst du die Lücke.",
  },
  {
    id: "senn",
    title: "Die/der Senn:in",
    tagline: "Am Berg verwurzelt",
    description:
      "Du kennst die Alp seit jeher. Ruhig und erfahren liest du die Zeichen des Gebirges.",
  },
];

export interface AgeTierOption {
  id: AgeTier;
  title: string;
  range: string;
  description: string;
}

export const AGE_TIERS: AgeTierOption[] = [
  {
    id: "kinder",
    title: "Kinder",
    range: "ca. 6 – 11 Jahre",
    description: "Sanfte Erzählungen, unheimliche Motive entschärft.",
  },
  {
    id: "jugendliche",
    title: "Jugendliche",
    range: "ca. 12 – 15 Jahre",
    description: "Spannungsvoll, aber ohne drastische Gewalt.",
  },
  {
    id: "erwachsene",
    title: "Erwachsene",
    range: "ab 16 Jahren",
    description: "Die Sagen in ihrer ganzen düsteren Tiefe.",
  },
];
