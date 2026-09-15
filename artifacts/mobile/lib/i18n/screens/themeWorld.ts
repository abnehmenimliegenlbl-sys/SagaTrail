import { createUseStrings, StringsDict } from "../createStrings";

export interface ThemeWorldStrings {
  eyebrow: string;
  catalogTitle: string;
  catalogIntro: string;
  intro: (theme: string) => string;
  loading: string;
  loadingProgress: (done: number, total: number) => string;
  routesFound: (count: number) => string;
  noRoutes: string;
  loadError: string;
  startCanton: string;
  routeMeta: (distance: string, ascent: string, difficulty: string) => string;
}

const THEME_WORLD_STRINGS: StringsDict<ThemeWorldStrings> = {
  de: {
    eyebrow: "Themenwelt",
    catalogTitle: "Themenwelten",
    catalogIntro: "Entdecke Wanderungen nach Thema – jede Welt öffnet ihre eigenen Routen.",
    intro: (theme) => `Routen aus der Themenwelt «${theme}», sortiert nach Startkanton.`,
    loading: "Passende Routen werden gesucht …",
    loadingProgress: (done, total) => `${done} von ${total} Routen geprüft`,
    routesFound: (count) => `${count} passende ${count === 1 ? "Route" : "Routen"}`,
    noRoutes: "Für diese Themenwelt wurden noch keine passenden Routen gefunden.",
    loadError: "Die Themenwelt konnte nicht vollständig geladen werden.",
    startCanton: "Startkanton",
    routeMeta: (distance, ascent, difficulty) => `${distance} km · ${ascent} hm · SAC ${difficulty}`,
  },
  gsw: {
    eyebrow: "Thema-Wält",
    catalogTitle: "Thema-Wälte",
    catalogIntro: "Entdeck Wanderige nach Thema – jedi Wält füehrt di zu ire eigene Route.",
    intro: (theme) => `Route us de Thema-Wält «${theme}», sortiert nach Startkanton.`,
    loading: "Passendi Route werde gsuecht …",
    loadingProgress: (done, total) => `${done} vo ${total} Route prüeft`,
    routesFound: (count) => `${count} passendi ${count === 1 ? "Route" : "Route"}`,
    noRoutes: "Für die Thema-Wält hämmer no kei passendi Route gfunde.",
    loadError: "D Thema-Wält het nöd vollständig chönne glade werde.",
    startCanton: "Startkanton",
    routeMeta: (distance, ascent, difficulty) => `${distance} km · ${ascent} hm · SAC ${difficulty}`,
  },
  en: {
    eyebrow: "Theme world",
    catalogTitle: "Theme worlds",
    catalogIntro: "Explore hikes by theme – each world opens its own collection of routes.",
    intro: (theme) => `Routes from the “${theme}” theme world, sorted by starting canton.`,
    loading: "Looking for matching routes …",
    loadingProgress: (done, total) => `${done} of ${total} routes checked`,
    routesFound: (count) => `${count} matching ${count === 1 ? "route" : "routes"}`,
    noRoutes: "No matching routes have been found for this theme world yet.",
    loadError: "The theme world could not be loaded completely.",
    startCanton: "Starting canton",
    routeMeta: (distance, ascent, difficulty) => `${distance} km · ${ascent} m ascent · SAC ${difficulty}`,
  },
  fr: {
    eyebrow: "Univers thématique",
    catalogTitle: "Univers thématiques",
    catalogIntro: "Découvrez des randonnées par thème – chaque univers ouvre ses propres itinéraires.",
    intro: (theme) => `Itinéraires de l’univers « ${theme} », classés par canton de départ.`,
    loading: "Recherche des itinéraires correspondants …",
    loadingProgress: (done, total) => `${done} itinéraires vérifiés sur ${total}`,
    routesFound: (count) => `${count} ${count === 1 ? "itinéraire correspondant" : "itinéraires correspondants"}`,
    noRoutes: "Aucun itinéraire correspondant n’a encore été trouvé.",
    loadError: "L’univers thématique n’a pas pu être entièrement chargé.",
    startCanton: "Canton de départ",
    routeMeta: (distance, ascent, difficulty) => `${distance} km · ${ascent} m de dénivelé · SAC ${difficulty}`,
  },
  it: {
    eyebrow: "Mondo tematico",
    catalogTitle: "Mondi tematici",
    catalogIntro: "Scopri escursioni per tema: ogni mondo apre la propria raccolta di itinerari.",
    intro: (theme) => `Itinerari del mondo «${theme}», ordinati per cantone di partenza.`,
    loading: "Ricerca degli itinerari corrispondenti …",
    loadingProgress: (done, total) => `${done} itinerari verificati su ${total}`,
    routesFound: (count) => `${count} ${count === 1 ? "itinerario corrispondente" : "itinerari corrispondenti"}`,
    noRoutes: "Non sono ancora stati trovati itinerari corrispondenti.",
    loadError: "Il mondo tematico non ha potuto essere caricato completamente.",
    startCanton: "Cantone di partenza",
    routeMeta: (distance, ascent, difficulty) => `${distance} km · ${ascent} m di dislivello · SAC ${difficulty}`,
  },
  es: {
    eyebrow: "Mundo temático",
    catalogTitle: "Mundos temáticos",
    catalogIntro: "Descubre rutas por tema; cada mundo abre su propia colección de recorridos.",
    intro: (theme) => `Rutas del mundo «${theme}», ordenadas por cantón de inicio.`,
    loading: "Buscando rutas adecuadas …",
    loadingProgress: (done, total) => `${done} de ${total} rutas comprobadas`,
    routesFound: (count) => `${count} ${count === 1 ? "ruta adecuada" : "rutas adecuadas"}`,
    noRoutes: "Todavía no se han encontrado rutas adecuadas para este mundo.",
    loadError: "No se ha podido cargar completamente el mundo temático.",
    startCanton: "Cantón de inicio",
    routeMeta: (distance, ascent, difficulty) => `${distance} km · ${ascent} m de desnivel · SAC ${difficulty}`,
  },
  pt: {
    eyebrow: "Mundo temático",
    catalogTitle: "Mundos temáticos",
    catalogIntro: "Descubra caminhadas por tema – cada mundo abre a sua própria coleção de rotas.",
    intro: (theme) => `Rotas do mundo «${theme}», ordenadas pelo cantão de início.`,
    loading: "A procurar rotas correspondentes …",
    loadingProgress: (done, total) => `${done} de ${total} rotas verificadas`,
    routesFound: (count) => `${count} ${count === 1 ? "rota correspondente" : "rotas correspondentes"}`,
    noRoutes: "Ainda não foram encontradas rotas correspondentes.",
    loadError: "Não foi possível carregar totalmente o mundo temático.",
    startCanton: "Cantão de início",
    routeMeta: (distance, ascent, difficulty) => `${distance} km · ${ascent} m de subida · SAC ${difficulty}`,
  },
  zh: {
    eyebrow: "主题世界",
    catalogTitle: "主题世界",
    catalogIntro: "按主题探索徒步路线，每个主题世界都有自己的路线集合。",
    intro: (theme) => `来自“${theme}”主题世界的路线，按起始州排序。`,
    loading: "正在查找匹配路线……",
    loadingProgress: (done, total) => `已检查 ${done}/${total} 条路线`,
    routesFound: (count) => `${count} 条匹配路线`,
    noRoutes: "尚未找到符合此主题的路线。",
    loadError: "无法完整加载主题世界。",
    startCanton: "起始州",
    routeMeta: (distance, ascent, difficulty) => `${distance} 公里 · 爬升 ${ascent} 米 · SAC ${difficulty}`,
  },
  ru: {
    eyebrow: "Тематический мир",
    catalogTitle: "Тематические миры",
    catalogIntro: "Выбирайте походы по теме — у каждого мира своя коллекция маршрутов.",
    intro: (theme) => `Маршруты из мира «${theme}», отсортированные по кантону старта.`,
    loading: "Ищем подходящие маршруты …",
    loadingProgress: (done, total) => `Проверено маршрутов: ${done} из ${total}`,
    routesFound: (count) => `Подходящих маршрутов: ${count}`,
    noRoutes: "Для этого тематического мира подходящие маршруты пока не найдены.",
    loadError: "Не удалось полностью загрузить тематический мир.",
    startCanton: "Кантон старта",
    routeMeta: (distance, ascent, difficulty) => `${distance} км · набор ${ascent} м · SAC ${difficulty}`,
  },
};

export const useThemeWorldStrings = createUseStrings(THEME_WORLD_STRINGS);