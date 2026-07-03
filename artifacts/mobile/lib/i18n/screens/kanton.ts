import { createUseStrings, StringsDict } from "../createStrings";

export interface KantonStrings {
  eyebrow: string;
  intro: (cantonName: string) => string;
  filterTitle: string;
  distanceLabel: string;
  elevationLabel: string;
  difficultyLabel: string;
  distanceUnit: (v: number, isMax: boolean) => string;
  elevationUnit: (v: number, isMax: boolean) => string;
  difficultyUnit: (v: number) => string;
  searchButton: string;
  searchingButton: string;
  searchHint: string;
  serverError: string;
  noRoutesFound: string;
  errorDetail: string;
  emptyDetail: string;
  routesFound: (count: number) => string;
  routeFound: string;
  nextStepSaga: string;
  sacLabel: string;
}

const KANTON_STRINGS: StringsDict<KantonStrings> = {
  de: {
    eyebrow: "Schritt 2 · Filter & Suche",
    intro: (cantonName) =>
      `Lege Distanz, Höhenmeter und Schwierigkeit fest. Die App durchsucht dann eine externe Wanderdatenbank (OpenStreetMap, angereichert mit swisstopo-Höhenmetern) nach passenden Routen in ${
        cantonName || "diesem Kanton"
      }.`,
    filterTitle: "Filter",
    distanceLabel: "Distanz",
    elevationLabel: "Höhenmeter",
    difficultyLabel: "Schwierigkeit",
    distanceUnit: (v, isMax) => `${v}${isMax ? "+" : ""} km`,
    elevationUnit: (v, isMax) => `${v}${isMax ? "+" : ""} hm`,
    difficultyUnit: (v) => `T${v}`,
    searchButton: "Passende Routen suchen",
    searchingButton: "Suche läuft …",
    searchHint: "Setze deine Filter und starte die Suche, um passende Routen zu finden.",
    serverError: "Server nicht erreichbar.",
    noRoutesFound: "Keine passende Route gefunden.",
    errorDetail:
      "Routen kommen live aus OpenStreetMap und swisstopo. Prüfe deine Verbindung und suche erneut.",
    emptyDetail: "Erweitere die Filter und suche erneut.",
    routesFound: (count) => `${count} Routen gefunden.`,
    routeFound: "1 Route gefunden.",
    nextStepSaga: "Danach folgt die passende Sage.",
    sacLabel: "SAC",
  },
  gsw: {
    eyebrow: "Schritt 2 · Filter & Suechi",
    intro: (cantonName) =>
      `Leg Distanz, Höhemeter und Schwierigkeit fescht. D'App dursuecht dänn en extärni Wanderdatebank (OpenStreetMap, agrycheret mit swisstopo-Höhemeter) nach passende Route in ${
        cantonName || "däm Kanton"
      }.`,
    filterTitle: "Filter",
    distanceLabel: "Distanz",
    elevationLabel: "Höhemeter",
    difficultyLabel: "Schwierigkeit",
    distanceUnit: (v, isMax) => `${v}${isMax ? "+" : ""} km`,
    elevationUnit: (v, isMax) => `${v}${isMax ? "+" : ""} hm`,
    difficultyUnit: (v) => `T${v}`,
    searchButton: "Passendi Route sueche",
    searchingButton: "Suechi lauft …",
    searchHint: "Setz dini Filter und start d'Suechi, zum passendi Route z'finde.",
    serverError: "Server nid erreichbar.",
    noRoutesFound: "Kei passendi Route gfunde.",
    errorDetail:
      "Route chömed live us OpenStreetMap und swisstopo. Prüf dini Verbindig und suech nomal.",
    emptyDetail: "Erwiiter dini Filter und suech nomal.",
    routesFound: (count) => `${count} Route gfunde.`,
    routeFound: "1 Route gfunde.",
    nextStepSaga: "Dernah chunt die passendi Sag.",
    sacLabel: "SAC",
  },
  fr: {
    eyebrow: "Étape 2 · Filtres & Recherche",
    intro: (cantonName) =>
      `Définis la distance, le dénivelé et la difficulté. L'application recherchera ensuite dans une base de données externe (OpenStreetMap, enrichie avec les altitudes swisstopo) des itinéraires adaptés dans ${
        cantonName || "ce canton"
      }.`,
    filterTitle: "Filtres",
    distanceLabel: "Distance",
    elevationLabel: "Dénivelé",
    difficultyLabel: "Difficulté",
    distanceUnit: (v, isMax) => `${v}${isMax ? "+" : ""} km`,
    elevationUnit: (v, isMax) => `${v}${isMax ? "+" : ""} m`,
    difficultyUnit: (v) => `T${v}`,
    searchButton: "Rechercher des itinéraires",
    searchingButton: "Recherche en cours…",
    searchHint: "Configure tes filtres et lance la recherche pour trouver des itinéraires.",
    serverError: "Serveur inaccessible.",
    noRoutesFound: "Aucun itinéraire trouvé.",
    errorDetail:
      "Les itinéraires proviennent d'OpenStreetMap et swisstopo en direct. Vérifie ta connexion et réessaie.",
    emptyDetail: "Élargis tes filtres et réessaie.",
    routesFound: (count) => `${count} itinéraires trouvés.`,
    routeFound: "1 itinéraire trouvé.",
    nextStepSaga: "Ensuite, la légende correspondante suivra.",
    sacLabel: "CAS",
  },
  it: {
    eyebrow: "Passo 2 · Filtri e Ricerca",
    intro: (cantonName) =>
      `Imposta distanza, dislivello e difficoltà. L'app cercherà in un database esterno (OpenStreetMap, arricchito con i dati swisstopo) i percorsi adatti in ${
        cantonName || "questo cantone"
      }.`,
    filterTitle: "Filtri",
    distanceLabel: "Distanza",
    elevationLabel: "Dislivello",
    difficultyLabel: "Difficoltà",
    distanceUnit: (v, isMax) => `${v}${isMax ? "+" : ""} km`,
    elevationUnit: (v, isMax) => `${v}${isMax ? "+" : ""} m`,
    difficultyUnit: (v) => `T${v}`,
    searchButton: "Cerca percorsi adatti",
    searchingButton: "Ricerca in corso…",
    searchHint: "Imposta i filtri e avvia la ricerca per trovare i percorsi adatti.",
    serverError: "Server non raggiungibile.",
    noRoutesFound: "Nessun percorso trovato.",
    errorDetail:
      "I percorsi provengono da OpenStreetMap e swisstopo in tempo reale. Controlla la connessione e riprova.",
    emptyDetail: "Amplia i filtri e riprova.",
    routesFound: (count) => `${count} percorsi trovati.`,
    routeFound: "1 percorso trovato.",
    nextStepSaga: "Seguirà la leggenda corrispondente.",
    sacLabel: "SAC",
  },
  en: {
    eyebrow: "Step 2 · Filter & Search",
    intro: (cantonName) =>
      `Set distance, elevation, and difficulty. The app will then search an external hiking database (OpenStreetMap, enriched with swisstopo elevation data) for matching routes in ${
        cantonName || "this canton"
      }.`,
    filterTitle: "Filters",
    distanceLabel: "Distance",
    elevationLabel: "Elevation",
    difficultyLabel: "Difficulty",
    distanceUnit: (v, isMax) => `${v}${isMax ? "+" : ""} km`,
    elevationUnit: (v, isMax) => `${v}${isMax ? "+" : ""} m`,
    difficultyUnit: (v) => `T${v}`,
    searchButton: "Find matching routes",
    searchingButton: "Searching…",
    searchHint: "Set your filters and start the search to find matching routes.",
    serverError: "Server unreachable.",
    noRoutesFound: "No matching routes found.",
    errorDetail:
      "Routes are pulled live from OpenStreetMap and swisstopo. Check your connection and search again.",
    emptyDetail: "Expand the filters and search again.",
    routesFound: (count) => `${count} routes found.`,
    routeFound: "1 route found.",
    nextStepSaga: "The matching legend will follow.",
    sacLabel: "SAC",
  },
  zh: {
    eyebrow: "第 2 步 · 过滤与搜索",
    intro: (cantonName) =>
      `设置距离、海拔高度和难度。应用将搜索外部徒步数据库（OpenStreetMap，并结合 swisstopo 海拔数据），以查找 ${
        cantonName || "该州"
      } 内的匹配路线。`,
    filterTitle: "过滤器",
    distanceLabel: "距离",
    elevationLabel: "海拔高度",
    difficultyLabel: "难度",
    distanceUnit: (v, isMax) => `${v}${isMax ? "+" : ""} 公里`,
    elevationUnit: (v, isMax) => `${v}${isMax ? "+" : ""} 米`,
    difficultyUnit: (v) => `T${v}`,
    searchButton: "搜索匹配路线",
    searchingButton: "搜索中…",
    searchHint: "设置过滤器并开始搜索以查找匹配路线。",
    serverError: "无法连接服务器。",
    noRoutesFound: "未找到匹配路线。",
    errorDetail: "路线实时获取自 OpenStreetMap 和 swisstopo。请检查网络连接并重试。",
    emptyDetail: "扩大过滤范围并重试。",
    routesFound: (count) => `找到 ${count} 条路线。`,
    routeFound: "找到 1 条路线。",
    nextStepSaga: "随后将显示匹配的传说故事。",
    sacLabel: "SAC",
  },
  es: {
    eyebrow: "Paso 2 · Filtros y Búsqueda",
    intro: (cantonName) =>
      `Establece la distancia, el desnivel y la dificultad. La aplicación buscará en una base de datos externa (OpenStreetMap, enriquecida con datos de altitud de swisstopo) rutas adecuadas en ${
        cantonName || "este cantón"
      }.`,
    filterTitle: "Filtros",
    distanceLabel: "Distancia",
    elevationLabel: "Desnivel",
    difficultyLabel: "Dificultad",
    distanceUnit: (v, isMax) => `${v}${isMax ? "+" : ""} km`,
    elevationUnit: (v, isMax) => `${v}${isMax ? "+" : ""} m`,
    difficultyUnit: (v) => `T${v}`,
    searchButton: "Buscar rutas adecuadas",
    searchingButton: "Buscando…",
    searchHint: "Establece tus filtros y comienza la búsqueda para encontrar rutas adecuadas.",
    serverError: "Servidor no disponible.",
    noRoutesFound: "No se han encontrado rutas adecuadas.",
    errorDetail:
      "Las rutas se obtienen en vivo de OpenStreetMap y swisstopo. Comprueba tu conexión e inténtalo de nuevo.",
    emptyDetail: "Amplía los filtros e inténtalo de nuevo.",
    routesFound: (count) => `${count} rutas encontradas.`,
    routeFound: "1 ruta encontrada.",
    nextStepSaga: "A continuación, seguirá la leyenda correspondiente.",
    sacLabel: "SAC",
  },
  pt: {
    eyebrow: "Etapa 2 · Filtros e Busca",
    intro: (cantonName) =>
      `Defina a distância, o desnível e a dificuldade. O aplicativo buscará em um banco de dados externo (OpenStreetMap, enriquecido com dados de altitude do swisstopo) as rotas adequadas em ${
        cantonName || "este cantão"
      }.`,
    filterTitle: "Filtros",
    distanceLabel: "Distância",
    elevationLabel: "Desnível",
    difficultyLabel: "Dificuldade",
    distanceUnit: (v, isMax) => `${v}${isMax ? "+" : ""} km`,
    elevationUnit: (v, isMax) => `${v}${isMax ? "+" : ""} m`,
    difficultyUnit: (v) => `T${v}`,
    searchButton: "Buscar rotas adequadas",
    searchingButton: "Buscando…",
    searchHint: "Defina seus filtros e inicie a busca para encontrar rotas adequadas.",
    serverError: "Servidor inacessível.",
    noRoutesFound: "Nenhuma rota adequada encontrada.",
    errorDetail:
      "As rotas são obtidas ao vivo do OpenStreetMap e swisstopo. Verifique sua conexão e tente novamente.",
    emptyDetail: "Amplie os filtros e tente novamente.",
    routesFound: (count) => `${count} rotas encontradas.`,
    routeFound: "1 rota encontrada.",
    nextStepSaga: "Em seguida, a lenda correspondente seguirá.",
    sacLabel: "SAC",
  },
};

export const useKantonStrings = createUseStrings(KANTON_STRINGS);
