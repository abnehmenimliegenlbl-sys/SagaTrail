import { createUseStrings, StringsDict } from "../createStrings";

/**
 * Beschriftungen der auf-/zuklappbaren Kartenlegende. Sie werden als reine
 * Strings in das Leaflet-HTML (swisstopoMapHtml.ts) uebergeben, da die Karte
 * in einer WebView/einem iframe laeuft und dort keine React-Hooks verfuegbar
 * sind.
 *
 * Die Wanderweg-Farben stammen vom Waymarked-Trails-Overlay und richten sich
 * nach der OSM-Netzwerkstufe: violett = international, rot = national,
 * blau = regional, gelb = lokal. Verlaufen mehrere Routen auf demselben Weg,
 * wechseln sich deren Farben abschnittsweise ab (z. B. rot-blau gestreift).
 * Die Nummern-Schilder sind die Routennummern: gruen = Schweizer
 * Wanderland-Routen (national/regional), weiss = uebrige/lokale Routen.
 */
export interface MapStrings {
  legendTitle: string;
  legendRoute: string;
  legendStart: string;
  legendZiel: string;
  legendPosition: string;
  legendWegInternational: string;
  legendWegNational: string;
  legendWegRegional: string;
  legendWegLokal: string;
  legendWegMehrfach: string;
  legendNummerWanderland: string;
  legendNummerLokal: string;
  legendSeilbahn: string;
  legendSeilbahnStation: string;
  legendPoi: string;
}

const MAP_STRINGS: StringsDict<MapStrings> = {
  de: {
    legendTitle: "Legende",
    legendRoute: "Routenverlauf",
    legendStart: "Startpunkt",
    legendZiel: "Ziel",
    legendPosition: "Deine Position",
    legendWegInternational: "Internationale Wanderroute",
    legendWegNational: "Nationale Wanderroute",
    legendWegRegional: "Regionale Wanderroute",
    legendWegLokal: "Lokale Wanderroute",
    legendWegMehrfach: "Mehrere Routen überlagert",
    legendNummerWanderland: "Routennummer national/regional",
    legendNummerLokal: "Routennummer lokal",
    legendSeilbahn: "Seilbahn",
    legendSeilbahnStation: "Seilbahnstation",
    legendPoi: "Sehenswürdigkeit",
  },
  gsw: {
    legendTitle: "Legände",
    legendRoute: "Routeverlauf",
    legendStart: "Startpunkt",
    legendZiel: "Ziil",
    legendPosition: "Dini Position",
    legendWegInternational: "Internationali Wanderroute",
    legendWegNational: "Nationali Wanderroute",
    legendWegRegional: "Regionali Wanderroute",
    legendWegLokal: "Lokali Wanderroute",
    legendWegMehrfach: "Mehreri Route übernand",
    legendNummerWanderland: "Routenummere national/regional",
    legendNummerLokal: "Routenummere lokal",
    legendSeilbahn: "Seilbahn",
    legendSeilbahnStation: "Seilbahnstation",
    legendPoi: "Sehenswürdigkeit",
  },
  fr: {
    legendTitle: "Légende",
    legendRoute: "Tracé de l'itinéraire",
    legendStart: "Point de départ",
    legendZiel: "Arrivée",
    legendPosition: "Votre position",
    legendWegInternational: "Itinéraire international",
    legendWegNational: "Itinéraire national",
    legendWegRegional: "Itinéraire régional",
    legendWegLokal: "Itinéraire local",
    legendWegMehrfach: "Itinéraires superposés",
    legendNummerWanderland: "Numéro d'itinéraire national/régional",
    legendNummerLokal: "Numéro d'itinéraire local",
    legendSeilbahn: "Téléphérique",
    legendSeilbahnStation: "Station de téléphérique",
    legendPoi: "Curiosité",
  },
  it: {
    legendTitle: "Legenda",
    legendRoute: "Tracciato del percorso",
    legendStart: "Punto di partenza",
    legendZiel: "Arrivo",
    legendPosition: "La tua posizione",
    legendWegInternational: "Itinerario internazionale",
    legendWegNational: "Itinerario nazionale",
    legendWegRegional: "Itinerario regionale",
    legendWegLokal: "Itinerario locale",
    legendWegMehrfach: "Itinerari sovrapposti",
    legendNummerWanderland: "Numero di itinerario nazionale/regionale",
    legendNummerLokal: "Numero di itinerario locale",
    legendSeilbahn: "Funivia",
    legendSeilbahnStation: "Stazione della funivia",
    legendPoi: "Punto d'interesse",
  },
  en: {
    legendTitle: "Legend",
    legendRoute: "Route line",
    legendStart: "Starting point",
    legendZiel: "Destination",
    legendPosition: "Your position",
    legendWegInternational: "International hiking route",
    legendWegNational: "National hiking route",
    legendWegRegional: "Regional hiking route",
    legendWegLokal: "Local hiking route",
    legendWegMehrfach: "Overlapping routes",
    legendNummerWanderland: "Route number, national/regional",
    legendNummerLokal: "Route number, local",
    legendSeilbahn: "Cable car",
    legendSeilbahnStation: "Cable car station",
    legendPoi: "Point of interest",
  },
  zh: {
    legendTitle: "图例",
    legendRoute: "路线走向",
    legendStart: "起点",
    legendZiel: "终点",
    legendPosition: "你的位置",
    legendWegInternational: "国际远足路线",
    legendWegNational: "国家级远足路线",
    legendWegRegional: "区域级远足路线",
    legendWegLokal: "地方远足路线",
    legendWegMehrfach: "多条路线重叠",
    legendNummerWanderland: "路线编号（国家/区域）",
    legendNummerLokal: "路线编号（地方）",
    legendSeilbahn: "缆车",
    legendSeilbahnStation: "缆车站",
    legendPoi: "景点",
  },
  es: {
    legendTitle: "Leyenda",
    legendRoute: "Trazado de la ruta",
    legendStart: "Punto de partida",
    legendZiel: "Destino",
    legendPosition: "Tu posición",
    legendWegInternational: "Ruta internacional",
    legendWegNational: "Ruta nacional",
    legendWegRegional: "Ruta regional",
    legendWegLokal: "Ruta local",
    legendWegMehrfach: "Rutas superpuestas",
    legendNummerWanderland: "Número de ruta nacional/regional",
    legendNummerLokal: "Número de ruta local",
    legendSeilbahn: "Teleférico",
    legendSeilbahnStation: "Estación del teleférico",
    legendPoi: "Punto de interés",
  },
  pt: {
    legendTitle: "Legenda",
    legendRoute: "Traçado da rota",
    legendStart: "Ponto de partida",
    legendZiel: "Destino",
    legendPosition: "Sua posição",
    legendWegInternational: "Rota internacional",
    legendWegNational: "Rota nacional",
    legendWegRegional: "Rota regional",
    legendWegLokal: "Rota local",
    legendWegMehrfach: "Rotas sobrepostas",
    legendNummerWanderland: "Número de rota nacional/regional",
    legendNummerLokal: "Número de rota local",
    legendSeilbahn: "Teleférico",
    legendSeilbahnStation: "Estação do teleférico",
    legendPoi: "Ponto de interesse",
  },
};

export const useMapStrings = createUseStrings(MAP_STRINGS);
