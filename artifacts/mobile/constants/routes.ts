import { LatLng } from "../types";

/**
 * Typdefinition einer Wanderroute. Routen sind KEIN gebuendelter Seed mehr:
 * Sie kommen ausschliesslich live pro Kanton aus den verbundenen Quellen
 * (OpenStreetMap-Relationen, angereichert mit swisstopo-Hoehen und
 * -Schwierigkeit) ueber den API-Server. Ohne Serververbindung werden keine
 * Routen angezeigt.
 */
/**
 * Grobe Saison-Einschaetzung aus maximaler Hoehe und SAC-Schwierigkeit.
 * Heuristik, KEINE amtliche Aussage zum aktuellen Zustand (siehe Server:
 * `season.ts`).
 */
export type RouteSeason = "ganzjaehrig" | "eher_sommer" | "nur_sommer";

export interface HikingRoute {
  id: string;
  sagaId: string;
  name: string;
  region: string;
  distanceKm: number;
  ascentM: number;
  /** Hoechster Punkt der Route in Metern ue. M. (swisstopo-Hoehenprofil). */
  maxElevationM: number;
  /** Grobe Saison-Einschaetzung, siehe `RouteSeason`. */
  season: RouteSeason;
  minutes: number;
  sac: string;
  /** Landschaftlicher Kurzcharakter der Route */
  terrain: string;
  /** Ausgangspunkt der Route (Kartenmittelpunkt) */
  coordinates: LatLng;
  /** Ausgeduennter Wegverlauf als [lat, lng]-Paare (aus OSM). */
  geometry?: number[][];
  /** Wird als grosse Ankerroute auf der Startseite hervorgehoben */
  featured: boolean;
}

/** Kanton mit der Anzahl aktuell bekannter Routen (nur als Vorschau). */
export interface CantonWithRoutes {
  canton: string;
  routeCount: number;
}
