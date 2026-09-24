import { createUseStrings, StringsDict } from "../createStrings";

export interface ShareCardStrings {
  route: string;
  maxAltitude: string;
  pointsOfInterest: string;
  elevationProfile: string;
  sagaForRoute: string;
  footerTagline: string;
  footerSubtitle: string;
}

const SHARE_CARD_STRINGS: StringsDict<ShareCardStrings> = {
  de: { route: "Wanderweg", maxAltitude: "MAX. HÖHE", pointsOfInterest: "POIs", elevationProfile: "HÖHENPROFIL", sagaForRoute: "SAGE DIESER ROUTE", footerTagline: "WANDERAPP SCHWEIZ", footerSubtitle: "Sagen auf dem Trail erleben" },
  gsw: { route: "Wanderwäg", maxAltitude: "MAX. HÖCHI", pointsOfInterest: "POIs", elevationProfile: "HÖCHEPROFIL", sagaForRoute: "SAG VON DERE ROUTE", footerTagline: "WANDERAPP SCHWIIZ", footerSubtitle: "Sage uf em Trail erläbe" },
  fr: { route: "Sentier", maxAltitude: "ALTITUDE MAX.", pointsOfInterest: "POI", elevationProfile: "PROFIL D’ALTITUDE", sagaForRoute: "LÉGENDE DE CET ITINÉRAIRE", footerTagline: "APP DE RANDONNÉE SUISSE", footerSubtitle: "Vivre les légendes sur les sentiers" },
  it: { route: "Sentiero", maxAltitude: "ALTITUDINE MAX.", pointsOfInterest: "PDI", elevationProfile: "PROFILO ALTIMETRICO", sagaForRoute: "LEGGENDA DI QUESTO PERCORSO", footerTagline: "APP SVIZZERA PER ESCURSIONI", footerSubtitle: "Vivi le leggende sul sentiero" },
  en: { route: "Hiking trail", maxAltitude: "MAX. ELEVATION", pointsOfInterest: "POIs", elevationProfile: "ELEVATION PROFILE", sagaForRoute: "LEGEND OF THIS ROUTE", footerTagline: "SWISS HIKING APP", footerSubtitle: "Experience legends on the trail" },
  zh: { route: "徒步路线", maxAltitude: "最高海拔", pointsOfInterest: "兴趣点", elevationProfile: "海拔剖面", sagaForRoute: "本路线的传说", footerTagline: "瑞士徒步应用", footerSubtitle: "在山路上体验传说" },
  es: { route: "Sendero", maxAltitude: "ALTITUD MÁX.", pointsOfInterest: "PDI", elevationProfile: "PERFIL DE ELEVACIÓN", sagaForRoute: "LEYENDA DE ESTA RUTA", footerTagline: "APP SUIZA DE SENDERISMO", footerSubtitle: "Vive leyendas en el sendero" },
  pt: { route: "Trilho", maxAltitude: "ALTITUDE MÁX.", pointsOfInterest: "PDI", elevationProfile: "PERFIL DE ELEVAÇÃO", sagaForRoute: "LENDA DESTA ROTA", footerTagline: "APP SUÍÇA DE CAMINHADAS", footerSubtitle: "Vive lendas no trilho" },
  ru: { route: "Пешеходный маршрут", maxAltitude: "МАКС. ВЫСОТА", pointsOfInterest: "POI", elevationProfile: "ПРОФИЛЬ ВЫСОТЫ", sagaForRoute: "ЛЕГЕНДА ЭТОГО МАРШРУТА", footerTagline: "ШВЕЙЦАРСКОЕ ПРИЛОЖЕНИЕ ДЛЯ ПОХОДОВ", footerSubtitle: "Откройте легенды на маршруте" },
};

export const useShareCardStrings = createUseStrings(SHARE_CARD_STRINGS);