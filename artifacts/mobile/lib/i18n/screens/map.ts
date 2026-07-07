import { createUseStrings, StringsDict } from "../createStrings";

/**
 * Beschriftungen der auf-/zuklappbaren Kartenlegende. Sie werden als reine
 * Strings in das Leaflet-HTML (swisstopoMapHtml.ts) uebergeben, da die Karte
 * in einer WebView/einem iframe laeuft und dort keine React-Hooks verfuegbar
 * sind.
 */
export interface MapStrings {
  legendTitle: string;
  legendRoute: string;
  legendStart: string;
  legendZiel: string;
  legendPosition: string;
  legendWanderwege: string;
  legendSeilbahn: string;
  legendPoi: string;
}

const MAP_STRINGS: StringsDict<MapStrings> = {
  de: {
    legendTitle: "Legende",
    legendRoute: "Routenverlauf",
    legendStart: "Startpunkt",
    legendZiel: "Ziel",
    legendPosition: "Deine Position",
    legendWanderwege: "Markierte Wanderwege",
    legendSeilbahn: "Seilbahn",
    legendPoi: "Sehenswürdigkeit",
  },
  gsw: {
    legendTitle: "Legände",
    legendRoute: "Routeverlauf",
    legendStart: "Startpunkt",
    legendZiel: "Ziil",
    legendPosition: "Dini Position",
    legendWanderwege: "Markierti Wanderwäg",
    legendSeilbahn: "Seilbahn",
    legendPoi: "Sehenswürdigkeit",
  },
  fr: {
    legendTitle: "Légende",
    legendRoute: "Tracé de l'itinéraire",
    legendStart: "Point de départ",
    legendZiel: "Arrivée",
    legendPosition: "Votre position",
    legendWanderwege: "Sentiers balisés",
    legendSeilbahn: "Téléphérique",
    legendPoi: "Curiosité",
  },
  it: {
    legendTitle: "Legenda",
    legendRoute: "Tracciato del percorso",
    legendStart: "Punto di partenza",
    legendZiel: "Arrivo",
    legendPosition: "La tua posizione",
    legendWanderwege: "Sentieri segnalati",
    legendSeilbahn: "Funivia",
    legendPoi: "Punto d'interesse",
  },
  en: {
    legendTitle: "Legend",
    legendRoute: "Route line",
    legendStart: "Starting point",
    legendZiel: "Destination",
    legendPosition: "Your position",
    legendWanderwege: "Marked hiking trails",
    legendSeilbahn: "Cable car",
    legendPoi: "Point of interest",
  },
  zh: {
    legendTitle: "图例",
    legendRoute: "路线走向",
    legendStart: "起点",
    legendZiel: "终点",
    legendPosition: "你的位置",
    legendWanderwege: "标记的徒步小径",
    legendSeilbahn: "缆车",
    legendPoi: "景点",
  },
  es: {
    legendTitle: "Leyenda",
    legendRoute: "Trazado de la ruta",
    legendStart: "Punto de partida",
    legendZiel: "Destino",
    legendPosition: "Tu posición",
    legendWanderwege: "Senderos señalizados",
    legendSeilbahn: "Teleférico",
    legendPoi: "Punto de interés",
  },
  pt: {
    legendTitle: "Legenda",
    legendRoute: "Traçado da rota",
    legendStart: "Ponto de partida",
    legendZiel: "Destino",
    legendPosition: "Sua posição",
    legendWanderwege: "Trilhas sinalizadas",
    legendSeilbahn: "Teleférico",
    legendPoi: "Ponto de interesse",
  },
};

export const useMapStrings = createUseStrings(MAP_STRINGS);
