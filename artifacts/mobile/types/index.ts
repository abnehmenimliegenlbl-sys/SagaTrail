export type Archetype = "reisende" | "hueterin" | "gewitzte" | "senn";
export type AgeTier = "kinder" | "jugendliche" | "erwachsene";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Profile {
  id: string;
  name: string;
  archetype: Archetype;
  homeCanton?: string;
  language: string;
  ageTier: AgeTier;
  navAnnouncementsEnabled?: boolean;
  purchasedPacks?: string[];
}

export type KoordinatenSicherheit = "exakt" | "ungefaehr" | "nicht_lokalisierbar";

// Je Zielsprache eigenstaendig verfasste Zusammenfassung. `reviewEmpfohlen`
// markiert Sprachen, deren Qualitaet noch geprueft werden sollte.
export interface LocalizedSummary {
  text: string;
  title?: string;
  reviewEmpfohlen: boolean;
}

// Vollstaendige, nachvollziehbare Quellenangabe (gemeinfreie historische
// Sammlung). `fundstelleUrl` darf auf eine Sammelseite verweisen.
export interface SagaQuelle {
  autor: string;
  werk: string;
  jahr: string;
  fundstelleUrl: string;
}

export interface Saga {
  id: string;
  title: string;
  canton: string;
  coreMotif: string;
  // Konkreter, fotografierbarer Suchbegriff fuer das Sagenbild (z. B.
  // "Vogel Gryff Basel", "Braunbär"), unabhaengig vom Handlungsort.
  bildmotiv?: string;
  mood: string;
  // Deutsche Kurzfassung; dient als Anzeige-Default und Fallback.
  summary: string;
  // Pro Sprache eigenstaendig verfasste Zusammenfassungen (inkl. Deutsch).
  summaries: Record<string, LocalizedSummary>;
  // Kurze Regieanweisung, welche Stellen fuer juengeres Publikum abgemildert
  // werden sollten (keine drei separaten Textversionen).
  altersstufenHinweis?: string;
  // Strukturierte Quellenangabe.
  quelle?: SagaQuelle;
  // Menschlich lesbare Kurz-Quelle (aus `quelle` abgeleitet).
  source: string;
  coordinates?: LatLng;
  koordinatenSicherheit: KoordinatenSicherheit;
  isAnchorPlace: boolean;
}

export interface StoryChapter {
  id: string;
  text: string;
  isDecisionPoint: boolean;
  decision?: {
    question: string;
    /** isTimeoutDefault markiert die Option, die nach Ablauf des Countdowns automatisch gewaehlt wird */
    options: { label: string; archetypeHint: string; tone: string; isTimeoutDefault?: boolean }[];
  };
  chosenOptionIndex?: number;
}

export interface HikeSession {
  id: string;
  sagaId: string;
  /** OSM-Route-ID, falls vorhanden — wird für Navigation zur Route-Detailseite benötigt */
  routeId?: string;
  routeName: string;
  distanceKm: number;
  ascentM: number;
  sacScale: string;
  startedAt: number;
  chapters: StoryChapter[];
  visitedPlaceIds: string[];
  /** Erinnerungsfoto aus dem Wander-Tagebuch (lokale Datei-URI, optional) */
  photoUri?: string;
  /** Unterwegs aufgenommene Fotos der GPS-Foto-Challenges (lokale Datei-URIs) */
  photoUris?: string[];
  /** Schritte laut Pedometer, 0 falls Sensor nicht verfuegbar war */
  steps?: number;
  /** Effektiv verstrichene Wanderzeit in Minuten (seit Start bis Abschluss) */
  durationMin?: number;
  /** Ausgeduennter Wegverlauf als [lat, lng]-Paare, fuer die Share-Grafik */
  geometry?: number[][];
}

export interface Achievement {
  id: string;
  sagaTitle: string;
  unlockedAt: number;
}
