import { SAGAS } from "./sagas";
import { LatLng, Saga } from "../types";

/**
 * Wanderrouten sind der Einstieg in SagaTrail: Zuerst waehlt man eine Route,
 * danach die dazu passende Sage. Jede Route ist (in diesem Build) fest einer
 * Sage zugeordnet. Kennwerte sind statische Richtwerte, klar gekennzeichnet.
 * `coordinates` markiert den Ausgangspunkt und dient als Kartenmittelpunkt der
 * swisstopo-Karte; Live-Wetterdaten folgen in einer spaeteren Ausbaustufe.
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
  /** Ausgangspunkt der Route (Kartenmittelpunkt) */
  coordinates: LatLng;
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
    coordinates: { lat: 46.6529, lng: 8.5837 },
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
    coordinates: { lat: 47.0489, lng: 8.547 },
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
    coordinates: { lat: 46.9142, lng: 9.1764 },
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
    coordinates: { lat: 46.406, lng: 7.774 },
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
    coordinates: { lat: 46.5686, lng: 7.6489 },
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
    coordinates: { lat: 46.6994, lng: 9.4519 },
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
    coordinates: { lat: 45.9967, lng: 8.9469 },
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
    coordinates: { lat: 46.979, lng: 8.2554 },
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
    coordinates: { lat: 46.9573, lng: 8.6083 },
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
    coordinates: { lat: 45.9876, lng: 7.7043 },
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
    coordinates: { lat: 46.8331, lng: 9.2807 },
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
    coordinates: { lat: 47.0576, lng: 8.4852 },
    featured: false,
  },
  {
    id: "habsburg",
    sagaId: "habsburg",
    name: "Habsburg-Höhenweg",
    region: "Aargau",
    distanceKm: 5.5,
    ascentM: 220,
    minutes: 130,
    sac: "T2",
    terrain: "Aussichtsreicher Jurahöhenweg über dem Aaretal",
    coordinates: { lat: 47.4617, lng: 8.1836 },
    featured: false,
  },
  {
    id: "gaebris",
    sagaId: "gaebris",
    name: "Gäbris-Panoramaweg",
    region: "Appenzell Ausserrhoden",
    distanceKm: 7.2,
    ascentM: 430,
    minutes: 195,
    sac: "T2",
    terrain: "Aussichtshügel mit Blick auf Alpstein und Bodensee",
    coordinates: { lat: 47.375, lng: 9.47 },
    featured: false,
  },
  {
    id: "wildkirchli",
    sagaId: "wildkirchli",
    name: "Ebenalp – Wildkirchli",
    region: "Appenzell Innerrhoden",
    distanceKm: 6.0,
    ascentM: 520,
    minutes: 180,
    sac: "T3",
    terrain: "Steiler Alpstein-Steig zu Höhle und Felsenkapelle",
    coordinates: { lat: 47.284, lng: 9.427 },
    featured: true,
  },
  {
    id: "reichenstein",
    sagaId: "reichenstein",
    name: "Ermitage – Reichenstein",
    region: "Basel-Landschaft",
    distanceKm: 6.4,
    ascentM: 310,
    minutes: 160,
    sac: "T2",
    terrain: "Waldweg zu drei Burgruinen bei Arlesheim",
    coordinates: { lat: 47.492, lng: 7.617 },
    featured: false,
  },
  {
    id: "basilisk",
    sagaId: "basilisk",
    name: "Basler Rheinuferweg",
    region: "Basel-Stadt",
    distanceKm: 4.5,
    ascentM: 40,
    minutes: 80,
    sac: "T1",
    terrain: "Flacher Stadtspaziergang am Rhein durch die Altstadt",
    coordinates: { lat: 47.5596, lng: 7.5886 },
    featured: false,
  },
  {
    id: "moleson",
    sagaId: "moleson",
    name: "Moléson-Gipfelweg",
    region: "Freiburg",
    distanceKm: 8.4,
    ascentM: 760,
    minutes: 250,
    sac: "T3",
    terrain: "Aussichtsgipfel über der Gruyère",
    coordinates: { lat: 46.554, lng: 7.017 },
    featured: false,
  },
  {
    id: "leman",
    sagaId: "leman",
    name: "Uferweg Rade de Genève",
    region: "Genf",
    distanceKm: 5.0,
    ascentM: 30,
    minutes: 90,
    sac: "T1",
    terrain: "Flache Seepromenade am Genfersee",
    coordinates: { lat: 46.207, lng: 6.155 },
    featured: false,
  },
  {
    id: "vouivre",
    sagaId: "vouivre",
    name: "Doubs-Uferweg Saint-Ursanne",
    region: "Jura",
    distanceKm: 7.6,
    ascentM: 260,
    minutes: 185,
    sac: "T2",
    terrain: "Flussweg durch die Schluchten des Doubs",
    coordinates: { lat: 47.358, lng: 7.155 },
    featured: false,
  },
  {
    id: "creux-du-van",
    sagaId: "creux-du-van",
    name: "Creux du Van – Felsenrund",
    region: "Neuenburg",
    distanceKm: 11.0,
    ascentM: 680,
    minutes: 300,
    sac: "T3",
    terrain: "Höhenweg entlang des gewaltigen Felskessels",
    coordinates: { lat: 46.933, lng: 6.73 },
    featured: true,
  },
  {
    id: "buochserhorn",
    sagaId: "buochserhorn",
    name: "Niederrickenbach – Buochserhorn",
    region: "Nidwalden",
    distanceKm: 9.0,
    ascentM: 820,
    minutes: 270,
    sac: "T3",
    terrain: "Aussichtsgipfel über dem Vierwaldstättersee",
    coordinates: { lat: 46.965, lng: 8.404 },
    featured: false,
  },
  {
    id: "ranft",
    sagaId: "ranft",
    name: "Flüeli-Ranft Pilgerweg",
    region: "Obwalden",
    distanceKm: 5.2,
    ascentM: 210,
    minutes: 120,
    sac: "T1",
    terrain: "Sanfter Pilgerweg zur Ranftschlucht",
    coordinates: { lat: 46.874, lng: 8.252 },
    featured: false,
  },
  {
    id: "rheinfall",
    sagaId: "rheinfall",
    name: "Rheinfall – Schloss Laufen",
    region: "Schaffhausen",
    distanceKm: 4.0,
    ascentM: 120,
    minutes: 90,
    sac: "T1",
    terrain: "Uferweg am größten Wasserfall Europas",
    coordinates: { lat: 47.677, lng: 8.615 },
    featured: false,
  },
  {
    id: "verena",
    sagaId: "verena",
    name: "Verenaschlucht – Einsiedelei",
    region: "Solothurn",
    distanceKm: 4.6,
    ascentM: 190,
    minutes: 105,
    sac: "T1",
    terrain: "Schattige Schlucht zur Einsiedelei",
    coordinates: { lat: 47.219, lng: 7.527 },
    featured: false,
  },
  {
    id: "gallus",
    sagaId: "gallus",
    name: "Mülenenschlucht – Gallussteg",
    region: "St. Gallen",
    distanceKm: 6.6,
    ascentM: 340,
    minutes: 165,
    sac: "T2",
    terrain: "Wilder Schluchtweg über der Steinach",
    coordinates: { lat: 47.425, lng: 9.392 },
    featured: true,
  },
  {
    id: "nollen",
    sagaId: "nollen",
    name: "Nollen-Höhenweg",
    region: "Thurgau",
    distanceKm: 7.8,
    ascentM: 400,
    minutes: 200,
    sac: "T2",
    terrain: "Bewaldeter Aussichtshügel im Hinterthurgau",
    coordinates: { lat: 47.502, lng: 9.028 },
    featured: false,
  },
  {
    id: "grotte-aux-fees",
    sagaId: "grotte-aux-fees",
    name: "Vallorbe – Source de l'Orbe",
    region: "Waadt",
    distanceKm: 5.8,
    ascentM: 230,
    minutes: 140,
    sac: "T2",
    terrain: "Waldweg zur Quelle und den Feengrotten",
    coordinates: { lat: 46.712, lng: 6.383 },
    featured: false,
  },
  {
    id: "zugersee",
    sagaId: "zugersee",
    name: "Zugerberg-Höhenweg",
    region: "Zug",
    distanceKm: 8.0,
    ascentM: 590,
    minutes: 210,
    sac: "T2",
    terrain: "Aussichtsberg über Stadt und Zugersee",
    coordinates: { lat: 47.132, lng: 8.542 },
    featured: false,
  },
  {
    id: "fraumuenster",
    sagaId: "fraumuenster",
    name: "Zürichberg-Waldweg",
    region: "Zürich",
    distanceKm: 6.2,
    ascentM: 280,
    minutes: 140,
    sac: "T1",
    terrain: "Stadtnaher Höhenweg über Wald und See",
    coordinates: { lat: 47.39, lng: 8.57 },
    featured: false,
  },
];

export function getRoute(id?: string): HikingRoute | undefined {
  return ROUTES.find((r) => r.id === id);
}

export function getSagaForRoute(route: HikingRoute): Saga | undefined {
  return SAGAS.find((s) => s.id === route.sagaId);
}

/** Findet die Route zu einer Sage (fuer den Live-Hike, der nach sagaId startet). */
export function getRouteBySaga(sagaId?: string): HikingRoute | undefined {
  return ROUTES.find((r) => r.sagaId === sagaId);
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
