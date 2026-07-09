import { createUseStrings, StringsDict } from "../createStrings";

export interface SearchProgressStrings {
  title: string;
  stepSearching: (cantonName: string) => string;
  stepFiltering: string;
  stepLoadingElevation: string;
  stepCompiling: string;
  hint: string;
}

const SEARCH_PROGRESS_STRINGS: StringsDict<SearchProgressStrings> = {
  de: {
    title: "Echte Wanderrouten werden gesucht",
    stepSearching: (cantonName) => `${cantonName || "Kanton"} wird durchsucht …`,
    stepFiltering: "Passende Routen werden herausgefiltert …",
    stepLoadingElevation: "Höhenprofile von swisstopo werden geladen …",
    stepCompiling: "Routen werden zusammengestellt …",
    hint: "Die erste Suche eines Kantons dauert einen Moment, danach geht es schnell.",
  },
  gsw: {
    title: "Ächti Wanderroute wärdet gsuecht",
    stepSearching: (cantonName) => `${cantonName || "Kanton"} wird dursuecht …`,
    stepFiltering: "Passendi Route wärdet usegfilteret …",
    stepLoadingElevation: "Höheprofile vo swisstopo wärdet glade …",
    stepCompiling: "Route wärdet zämegstellt …",
    hint: "Die erschti Suechi vomne Kanton duuret en Momänt, dernah gahts schnäll.",
  },
  fr: {
    title: "Recherche d'itinéraires de randonnée",
    stepSearching: (cantonName) => `Recherche dans le canton de ${cantonName || "Kanton"}…`,
    stepFiltering: "Filtrage des itinéraires adaptés…",
    stepLoadingElevation: "Chargement des profils d'altitude swisstopo…",
    stepCompiling: "Assemblage des itinéraires…",
    hint: "La première recherche pour un canton prend un moment, les suivantes seront rapides.",
  },
  it: {
    title: "Ricerca di veri percorsi escursionistici",
    stepSearching: (cantonName) => `Ricerca nel cantone ${cantonName || "Kanton"}…`,
    stepFiltering: "Filtraggio dei percorsi adatti…",
    stepLoadingElevation: "Caricamento dei profils altimetrici swisstopo…",
    stepCompiling: "Assemblaggio dei percorsi…",
    hint: "La prima ricerca in un cantone richiede un momento, poi sarà veloce.",
  },
  en: {
    title: "Searching for real hiking routes",
    stepSearching: (cantonName) => `Searching ${cantonName || "canton"}…`,
    stepFiltering: "Filtering matching routes…",
    stepLoadingElevation: "Loading elevation profiles from swisstopo…",
    stepCompiling: "Compiling routes…",
    hint: "The first search of a canton takes a moment, after that it's fast.",
  },
  zh: {
    title: "正在寻找真实的徒步路线",
    stepSearching: (cantonName) => `正在搜索 ${cantonName || "该州"}…`,
    stepFiltering: "正在筛选匹配路线…",
    stepLoadingElevation: "正在从 swisstopo 加载海拔数据…",
    stepCompiling: "正在汇编路线…",
    hint: "各州的首次搜索需要一点时间，之后会很快。",
  },
  es: {
    title: "Buscando rutas de senderismo reales",
    stepSearching: (cantonName) => `Buscando en el cantón ${cantonName || "Kanton"}…`,
    stepFiltering: "Filtrando rutas adecuadas…",
    stepLoadingElevation: "Cargando perfiles de altitud de swisstopo…",
    stepCompiling: "Compilando rutas…",
    hint: "La primera búsqueda de un cantón tarda un momento, después es rápido.",
  },
  pt: {
    title: "Buscando rotas de caminhada reais",
    stepSearching: (cantonName) => `Buscando no cantão ${cantonName || "Kanton"}…`,
    stepFiltering: "Filtrando rotas adequadas…",
    stepLoadingElevation: "Carregando perfis de altitude do swisstopo…",
    stepCompiling: "Compilando rotas…",
    hint: "A primeira busca de um cantão leva um momento, depois será rápida.",
  },
  ru: {
    title: "Поиск настоящих пеших маршрутов",
    stepSearching: (cantonName) => `Поиск в кантоне ${cantonName || "Kanton"}…`,
    stepFiltering: "Отбор подходящих маршрутов…",
    stepLoadingElevation: "Загрузка профилей высот swisstopo…",
    stepCompiling: "Составление маршрутов…",
    hint: "Первый поиск по кантону занимает немного времени, потом всё будет быстро.",
  },
};

export const useSearchProgressStrings = createUseStrings(SEARCH_PROGRESS_STRINGS);
