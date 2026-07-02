import { SAGAS } from "./sagas";
import { Saga } from "../types";

/**
 * Wanderrouten sind der Einstieg in SagaTrail: Zuerst waehlt man eine Route,
 * danach die dazu passende Sage. Jede Route ist (in diesem Build) fest einer
 * Sage zugeordnet. Kennwerte sind statische Richtwerte, klar gekennzeichnet;
 * Live-Daten (swisstopo, Wetter) folgen in einer spaeteren Ausbaustufe.
 */
export interface HikingRoute {
  id: string;
  sagaId: string;
  name: string;
  region: string;
  distanceKm: number;
  ascentM: number;
  minutes: number;
  sac: string;
  /** Landschaftlicher Kurzcharakter der Route */
  terrain: string;
  /** Wird als grosse Ankerroute auf der Startseite hervorgehoben */
  featured: boolean;
}

export const ROUTES: HikingRoute[] = [
  {
    id: "teufelsbrucke",
    sagaId: "teufelsbrucke",
    name: "Schöllenen-Schlucht",
    region: "Uri",
    distanceKm: 6.4,
    ascentM: 480,
    minutes: 165,
    sac: "T3",
    terrain: "Schluchtsteig entlang der tosenden Reuss",
    featured: true,
  },
  {
    id: "rossberg",
    sagaId: "rossberg",
    name: "Bergsturz-Weg Goldau",
    region: "Schwyz",
    distanceKm: 8.1,
    ascentM: 620,
    minutes: 210,
    sac: "T2",
    terrain: "Bergsturzgelände mit weiten Ausblicken",
    featured: true,
  },
  {
    id: "martinsloch",
    sagaId: "martinsloch",
    name: "Martinsloch-Panorama",
    region: "Glarus",
    distanceKm: 10.2,
    ascentM: 910,
    minutes: 290,
    sac: "T4",
    terrain: "Anspruchsvoller Höhenweg mit Felspassagen",
    featured: true,
  },
  {
    id: "tschaggatta",
    sagaId: "tschaggatta",
    name: "Lötschentaler Höhenweg",
    region: "Wallis",
    distanceKm: 9.3,
    ascentM: 720,
    minutes: 240,
    sac: "T3",
    terrain: "Sonnenhang hoch über dem Lötschental",
    featured: false,
  },
  {
    id: "blausee",
    sagaId: "blausee",
    name: "Blausee-Rundweg",
    region: "Bern",
    distanceKm: 4.2,
    ascentM: 180,
    minutes: 95,
    sac: "T1",
    terrain: "Sanfter Wald- und Uferweg am See",
    featured: false,
  },
  {
    id: "viamala",
    sagaId: "viamala",
    name: "Viamala-Schlucht Steig",
    region: "Graubünden",
    distanceKm: 7.0,
    ascentM: 430,
    minutes: 175,
    sac: "T3",
    terrain: "Enge Schlucht mit steilen Treppen am Hinterrhein",
    featured: false,
  },
  {
    id: "monte-san-salvatore",
    sagaId: "monte-san-salvatore",
    name: "Sentiero San Salvatore",
    region: "Tessin",
    distanceKm: 5.6,
    ascentM: 640,
    minutes: 160,
    sac: "T2",
    terrain: "Sonniger Gipfelaufstieg über dem Luganersee",
    featured: false,
  },
  {
    id: "pilatus",
    sagaId: "pilatus",
    name: "Pilatus Drachenweg",
    region: "Luzern",
    distanceKm: 11.4,
    ascentM: 1050,
    minutes: 330,
    sac: "T3",
    terrain: "Langer Gipfelweg mit Blick über die Zentralschweiz",
    featured: false,
  },
  {
    id: "tellsplatte",
    sagaId: "tell",
    name: "Weg der Schweiz – Tellsplatte",
    region: "Uri",
    distanceKm: 12.5,
    ascentM: 540,
    minutes: 300,
    sac: "T2",
    terrain: "Uferweg hoch über dem Urnersee zur Tellskapelle",
    featured: false,
  },
  {
    id: "hoernliweg",
    sagaId: "matterhorn",
    name: "Hörnli-Aussichtsweg",
    region: "Wallis",
    distanceKm: 9.8,
    ascentM: 780,
    minutes: 285,
    sac: "T3",
    terrain: "Höhenweg mit stetem Blick auf das Matterhorn",
    featured: false,
  },
  {
    id: "caumasee",
    sagaId: "flims",
    name: "Caumasee-Rundweg",
    region: "Graubünden",
    distanceKm: 6.8,
    ascentM: 260,
    minutes: 150,
    sac: "T2",
    terrain: "Waldweg rund um den türkisblauen Caumasee",
    featured: false,
  },
  {
    id: "rigi",
    sagaId: "rigi",
    name: "Rigi Gipfelweg",
    region: "Luzern",
    distanceKm: 8.6,
    ascentM: 720,
    minutes: 240,
    sac: "T2",
    terrain: "Panoramaweg zur Königin der Berge",
    featured: false,
  },
];

export function getRoute(id?: string): HikingRoute | undefined {
  return ROUTES.find((r) => r.id === id);
}

export function getSagaForRoute(route: HikingRoute): Saga | undefined {
  return SAGAS.find((s) => s.id === route.sagaId);
}

export interface CantonWithRoutes {
  canton: string;
  routeCount: number;
}

/**
 * Kantone, fuer die es mindestens eine Wanderroute gibt — der Einstieg beginnt
 * mit der Kantonswahl. Alphabetisch sortiert fuer eine ruhige Uebersicht.
 */
export function getCantonsWithRoutes(): CantonWithRoutes[] {
  const counts = new Map<string, number>();
  for (const r of ROUTES) {
    counts.set(r.region, (counts.get(r.region) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([canton, routeCount]) => ({ canton, routeCount }))
    .sort((a, b) => a.canton.localeCompare(b.canton, "de"));
}

export function getRoutesByCanton(canton?: string): HikingRoute[] {
  if (!canton) return [];
  return ROUTES.filter((r) => r.region === canton);
}
