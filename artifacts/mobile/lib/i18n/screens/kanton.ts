import { createUseStrings, StringsDict } from "../createStrings";

export interface KantonStrings {
  eyebrow: string;
  intro: (cantonName: string) => string;
  filterTitle: string;
  distanceLabel: string;
  elevationLabel: string;
  difficultyLabel: string;
  yearRoundLabel: string;
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
  season: {
    ganzjaehrig: string;
    eherSommer: string;
    nurSommer: string;
  };
  buyPackButton: string;
  packBuyErrorTitle: string;
  packUnavailable: string;
  resetFilters: string;
  unlockedBadge: string;
  nearbyLabel: string;
  nearbyLocating: string;
  nearbyDenied: string;
  nearbyDistBadge: (distText: string) => string;
  sunsetFilterLabel: string;
  sunsetStartLabel: string;
  sunsetInfo: (time: string) => string;
  sunsetNoneInTime: string;
  eigeneRouteTitle: string;
  eigeneRouteButton: string;
  importGpx: string;
  importGpxImporting: string;
  importGpxTitle: string;
  importGpxText: string;
  importGpxReadError: string;
  premiumCta: string;
  premiumCtaBody: string;
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
    yearRoundLabel: "Nur ganzjährige Routen",
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
    season: {
      ganzjaehrig: "Ganzjährig",
      eherSommer: "Eher Sommer/Herbst",
      nurSommer: "Nur Sommer",
    },
    buyPackButton: "Sagenpaket für diesen Kanton kaufen",
    packBuyErrorTitle: "Kauf fehlgeschlagen",
    packUnavailable: "Sagen-Pack aktuell nicht verfügbar.",
    resetFilters: "Filter zurücksetzen",
    unlockedBadge: "Freigeschaltet",
    nearbyLabel: "Ab meinem Standort",
    nearbyLocating: "Standort wird ermittelt …",
    nearbyDenied: "Standort nicht verfügbar",
    nearbyDistBadge: (d) => `≈ ${d} vom Start`,
    sunsetFilterLabel: "Schaffbar bis Sonnenuntergang",
    sunsetStartLabel: "Startzeit der Wanderung",
    sunsetInfo: (t) => `Sonnenuntergang heute ca. ${t} Uhr`,
    sunsetNoneInTime: "Keine Route bis Sonnenuntergang schaffbar",
    eigeneRouteTitle: "Eigene Route",
    eigeneRouteButton: "Eigene Route planen",
    importGpx: "GPX importieren",
    importGpxImporting: "GPX wird importiert …",
    importGpxTitle: "GPX-Import",
    importGpxText: "Die GPX-Datei konnte nicht verarbeitet werden.",
    importGpxReadError: "Die Datei konnte nicht gelesen werden.",
    premiumCta: "Alle Routen freischalten",
    premiumCtaBody: "Eine Route war gratis — Premium hebt die Sperre.",
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
    yearRoundLabel: "Nur ganzjährigi Route",
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
    season: {
      ganzjaehrig: "S'ganz Jahr",
      eherSommer: "Eher Summer/Herbscht",
      nurSommer: "Nume Summer",
    },
    buyPackButton: "Sage-Pack für dä Kanton chaufe",
    packBuyErrorTitle: "Chauf fehlgschlage",
    packUnavailable: "Sage-Pack grad nid verfüegbar.",
    resetFilters: "Filter zruggsetze",
    unlockedBadge: "Freigsclte",
    nearbyLabel: "Ab mim Standort",
    nearbyLocating: "Standort wird ermittlet …",
    nearbyDenied: "Standort nid verfüegbar",
    nearbyDistBadge: (d) => `≈ ${d} vom Start`,
    sunsetFilterLabel: "Bis Sunneundergang schaffbar",
    sunsetStartLabel: "Startziit vo de Wanderig",
    sunsetInfo: (t) => `Sunneundergang hüt cha. ${t} Uhr`,
    sunsetNoneInTime: "Kei Route bis Sunneundergang schaffbar",
    eigeneRouteTitle: "Eigeni Route",
    eigeneRouteButton: "Eigeni Route plane",
    importGpx: "GPX importiere",
    importGpxImporting: "GPX wird importiert …",
    importGpxTitle: "GPX-Import",
    importGpxText: "D'GPX-Datei het nid chöne verarbeitet wärde.",
    importGpxReadError: "D'Datei het nöd chöne gläse wärde.",
    premiumCta: "Alli Route frischalte",
    premiumCtaBody: "Ei Route isch umsunst gsi — Premium hebt d'Sperri.",
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
    yearRoundLabel: "Uniquement les itinéraires toute l'année",
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
    season: {
      ganzjaehrig: "Toute l'année",
      eherSommer: "Plutôt été/automne",
      nurSommer: "Été uniquement",
    },
    buyPackButton: "Acheter le pack de légendes pour ce canton",
    packBuyErrorTitle: "Échec de l'achat",
    packUnavailable: "Pack de légendes actuellement indisponible.",
    resetFilters: "Réinitialiser les filtres",
    unlockedBadge: "Débloqué",
    nearbyLabel: "Depuis ma position",
    nearbyLocating: "Localisation en cours …",
    nearbyDenied: "Position non disponible",
    nearbyDistBadge: (d) => `≈ ${d} du départ`,
    sunsetFilterLabel: "Réalisable avant le coucher du soleil",
    sunsetStartLabel: "Heure de départ",
    sunsetInfo: (t) => `Coucher du soleil aujourd'hui vers ${t}`,
    sunsetNoneInTime: "Aucun itinéraire réalisable avant le coucher du soleil",
    eigeneRouteTitle: "Itinéraire personnalisé",
    eigeneRouteButton: "Planifier un itinéraire",
    importGpx: "Importer GPX",
    importGpxImporting: "Importation du GPX …",
    importGpxTitle: "Import GPX",
    importGpxText: "Le fichier GPX n'a pas pu être traité.",
    importGpxReadError: "Le fichier n'a pas pu être lu.",
    premiumCta: "Débloquer tous les itinéraires",
    premiumCtaBody: "Un itinéraire était gratuit — Premium lève la restriction.",
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
    yearRoundLabel: "Solo percorsi tutto l'anno",
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
    season: {
      ganzjaehrig: "Tutto l'anno",
      eherSommer: "Preferibilmente estate/autunno",
      nurSommer: "Solo estate",
    },
    buyPackButton: "Acquista il pacchetto di leggende per questo cantone",
    packBuyErrorTitle: "Acquisto non riuscito",
    packUnavailable: "Pacchetto di leggende attualmente non disponibile.",
    resetFilters: "Reimposta filtri",
    unlockedBadge: "Sbloccato",
    nearbyLabel: "Dalla mia posizione",
    nearbyLocating: "Localizzazione in corso …",
    nearbyDenied: "Posizione non disponibile",
    nearbyDistBadge: (d) => `≈ ${d} dall'inizio`,
    sunsetFilterLabel: "Fattibile prima del tramonto",
    sunsetStartLabel: "Orario di partenza",
    sunsetInfo: (t) => `Tramonto oggi circa ${t}`,
    sunsetNoneInTime: "Nessun percorso fattibile prima del tramonto",
    eigeneRouteTitle: "Percorso personalizzato",
    eigeneRouteButton: "Pianifica percorso",
    importGpx: "Importa GPX",
    importGpxImporting: "Importazione GPX …",
    importGpxTitle: "Importazione GPX",
    importGpxText: "Il file GPX non ha potuto essere elaborato.",
    importGpxReadError: "Il file non ha potuto essere letto.",
    premiumCta: "Sblocca tutti i percorsi",
    premiumCtaBody: "Un percorso era gratuito — Premium rimuove il blocco.",
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
    yearRoundLabel: "Year-round routes only",
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
    season: {
      ganzjaehrig: "Year-round",
      eherSommer: "Best in summer/autumn",
      nurSommer: "Summer only",
    },
    buyPackButton: "Buy the legend pack for this canton",
    packBuyErrorTitle: "Purchase failed",
    packUnavailable: "Legend pack currently unavailable.",
    resetFilters: "Reset filters",
    unlockedBadge: "Unlocked",
    nearbyLabel: "From my location",
    nearbyLocating: "Getting location …",
    nearbyDenied: "Location unavailable",
    nearbyDistBadge: (d) => `≈ ${d} from start`,
    sunsetFilterLabel: "Doable before sunset",
    sunsetStartLabel: "Hike start time",
    sunsetInfo: (t) => `Sunset today approx. ${t}`,
    sunsetNoneInTime: "No route doable before sunset",
    eigeneRouteTitle: "Custom route",
    eigeneRouteButton: "Plan custom route",
    importGpx: "Import GPX",
    importGpxImporting: "Importing GPX …",
    importGpxTitle: "GPX Import",
    importGpxText: "The GPX file could not be processed.",
    importGpxReadError: "The file could not be read.",
    premiumCta: "Unlock all routes",
    premiumCtaBody: "One route was free — Premium removes the lock.",
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
    yearRoundLabel: "仅显示全年可行路线",
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
    season: {
      ganzjaehrig: "全年可行",
      eherSommer: "建议夏秋季",
      nurSommer: "仅限夏季",
    },
    buyPackButton: "购买该州的传说包",
    packBuyErrorTitle: "购买失败",
    packUnavailable: "传说包当前不可用。",
    resetFilters: "重置过滤器",
    unlockedBadge: "已解锁",
    nearbyLabel: "从我的位置出发",
    nearbyLocating: "正在获取位置 …",
    nearbyDenied: "位置不可用",
    nearbyDistBadge: (d) => `≈ 距起点 ${d}`,
    sunsetFilterLabel: "日落前可完成",
    sunsetStartLabel: "出发时间",
    sunsetInfo: (t) => `今日日落约 ${t}`,
    sunsetNoneInTime: "没有可在日落前完成的路线",
    eigeneRouteTitle: "自定义路线",
    eigeneRouteButton: "规划自定义路线",
    importGpx: "导入 GPX",
    importGpxImporting: "正在导入 GPX …",
    importGpxTitle: "GPX 导入",
    importGpxText: "GPX 文件无法处理。",
    importGpxReadError: "文件无法读取。",
    premiumCta: "解锁所有路线",
    premiumCtaBody: "一条路线是免费的——高级版解除限制。",
  },
  ru: {
    eyebrow: "Шаг 2 · Фильтр и поиск",
    intro: (cantonName) =>
      `Задай дистанцию, набор высоты и сложность. Приложение выполнит поиск подходящих маршрутов во внешней базе данных походов (OpenStreetMap, дополненной данными высот swisstopo) в ${
        cantonName || "этом кантоне"
      }.`,
    filterTitle: "Фильтры",
    distanceLabel: "Дистанция",
    elevationLabel: "Набор высоты",
    difficultyLabel: "Сложность",
    yearRoundLabel: "Только круглогодичные маршруты",
    distanceUnit: (v, isMax) => `${v}${isMax ? "+" : ""} км`,
    elevationUnit: (v, isMax) => `${v}${isMax ? "+" : ""} м`,
    difficultyUnit: (v) => `T${v}`,
    searchButton: "Найти подходящие маршруты",
    searchingButton: "Идёт поиск…",
    searchHint: "Настрой фильтры и запусти поиск, чтобы найти подходящие маршруты.",
    serverError: "Сервер недоступен.",
    noRoutesFound: "Подходящих маршрутов не найдено.",
    errorDetail:
      "Маршруты берутся в реальном времени из OpenStreetMap и swisstopo. Проверь соединение и попробуй снова.",
    emptyDetail: "Расширь фильтры и попробуй снова.",
    routesFound: (count) => `Найдено маршрутов: ${count}.`,
    routeFound: "Найден 1 маршрут.",
    nextStepSaga: "Далее последует подходящая легенда.",
    sacLabel: "SAC",
    season: {
      ganzjaehrig: "Круглый год",
      eherSommer: "Лучше летом/осенью",
      nurSommer: "Только летом",
    },
    buyPackButton: "Купить пакет легенд для этого кантона",
    packBuyErrorTitle: "Покупка не удалась",
    packUnavailable: "Пакет легенд сейчас недоступен.",
    resetFilters: "Сбросить фильтры",
    unlockedBadge: "Доступно",
    nearbyLabel: "От моего местоположения",
    nearbyLocating: "Определение местоположения …",
    nearbyDenied: "Местоположение недоступно",
    nearbyDistBadge: (d) => `≈ ${d} от старта`,
    sunsetFilterLabel: "Успеть до заката",
    sunsetStartLabel: "Время начала похода",
    sunsetInfo: (t) => `Закат сегодня примерно в ${t}`,
    sunsetNoneInTime: "До заката ни один маршрут не успеть пройти",
    eigeneRouteTitle: "Свой маршрут",
    eigeneRouteButton: "Спланировать маршрут",
    importGpx: "Импортировать GPX",
    importGpxImporting: "Импорт GPX …",
    importGpxTitle: "Импорт GPX",
    importGpxText: "Файл GPX не удалось обработать.",
    importGpxReadError: "Файл не удалось прочитать.",
    premiumCta: "Разблокировать все маршруты",
    premiumCtaBody: "Один маршрут был бесплатным — Premium снимает ограничение.",
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
    yearRoundLabel: "Solo rutas todo el año",
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
    season: {
      ganzjaehrig: "Todo el año",
      eherSommer: "Mejor en verano/otoño",
      nurSommer: "Solo verano",
    },
    buyPackButton: "Comprar el pack de leyendas de este cantón",
    packBuyErrorTitle: "Compra fallida",
    packUnavailable: "Pack de leyendas no disponible en este momento.",
    resetFilters: "Restablecer filtros",
    unlockedBadge: "Desbloqueado",
    nearbyLabel: "Desde mi ubicación",
    nearbyLocating: "Obteniendo ubicación …",
    nearbyDenied: "Ubicación no disponible",
    nearbyDistBadge: (d) => `≈ ${d} desde el inicio`,
    sunsetFilterLabel: "Realizable antes del atardecer",
    sunsetStartLabel: "Hora de inicio de la caminata",
    sunsetInfo: (t) => `Atardecer hoy aprox. ${t}`,
    sunsetNoneInTime: "Ninguna ruta realizable antes del atardecer",
    eigeneRouteTitle: "Ruta personalizada",
    eigeneRouteButton: "Planificar ruta propia",
    importGpx: "Importar GPX",
    importGpxImporting: "Importando GPX …",
    importGpxTitle: "Importación GPX",
    importGpxText: "El archivo GPX no pudo ser procesado.",
    importGpxReadError: "El archivo no pudo ser leído.",
    premiumCta: "Desbloquear todas las rutas",
    premiumCtaBody: "Una ruta era gratuita — Premium elimina la restricción.",
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
    yearRoundLabel: "Somente rotas o ano todo",
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
    season: {
      ganzjaehrig: "Ano todo",
      eherSommer: "Melhor no verão/outono",
      nurSommer: "Somente verão",
    },
    buyPackButton: "Comprar o pacote de lendas para este cantão",
    packBuyErrorTitle: "Falha na compra",
    packUnavailable: "Pacote de lendas indisponível no momento.",
    resetFilters: "Redefinir filtros",
    unlockedBadge: "Desbloqueado",
    nearbyLabel: "Da minha localização",
    nearbyLocating: "Obtendo localização …",
    nearbyDenied: "Localização indisponível",
    nearbyDistBadge: (d) => `≈ ${d} do início`,
    sunsetFilterLabel: "Realizável antes do pôr do sol",
    sunsetStartLabel: "Horário de início da caminhada",
    sunsetInfo: (t) => `Pôr do sol hoje por volta das ${t}`,
    sunsetNoneInTime: "Nenhuma rota realizável antes do pôr do sol",
    eigeneRouteTitle: "Rota personalizada",
    eigeneRouteButton: "Planear rota própria",
    importGpx: "Importar GPX",
    importGpxImporting: "Importando GPX …",
    importGpxTitle: "Importação GPX",
    importGpxText: "O arquivo GPX não pôde ser processado.",
    importGpxReadError: "O arquivo não pôde ser lido.",
    premiumCta: "Desbloquear todas as rotas",
    premiumCtaBody: "Uma rota era gratuita — Premium remove o bloqueio.",
  },
};

export const useKantonStrings = createUseStrings(KANTON_STRINGS);
