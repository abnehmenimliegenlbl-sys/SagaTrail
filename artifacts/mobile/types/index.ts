export type Archetype = "reisende" | "hueterin" | "gewitzte" | "senn";
export type AgeTier = "kinder" | "jugendliche" | "erwachsene";

export interface Profile {
  id: string;
  name: string;
  archetype: Archetype;
  homeCanton: string;
  language: string;
  ageTier: AgeTier;
}

export interface Saga {
  id: string;
  title: string;
  canton: string;
  coreMotif: string;
  mood: string;
  summary: string;
  source: string;
  coordinates?: { lat: number; lng: number };
  isAnchorPlace: boolean;
}

export interface StoryChapter {
  id: string;
  text: string;
  isDecisionPoint: boolean;
  decision?: {
    question: string;
    options: { label: string; archetypeHint: string; tone: string }[];
  };
  chosenOptionIndex?: number;
}

export interface HikeSession {
  id: string;
  sagaId: string;
  routeName: string;
  distanceKm: number;
  ascentM: number;
  sacScale: string;
  startedAt: number;
  chapters: StoryChapter[];
  visitedPlaceIds: string[];
}

export interface Achievement {
  id: string;
  sagaTitle: string;
  unlockedAt: number;
}
