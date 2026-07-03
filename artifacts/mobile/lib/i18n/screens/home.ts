import { createUseStrings, StringsDict } from "../createStrings";

export interface HomeStrings {
  welcomeBack: string;
  defaultName: string;
  step1Title: string;
  whereStart: string;
  heroBody: string;
  homeCantonTitle: string;
  homeCantonHint: string;
  otherCantonsTitle: string;
  cantonsTitle: string;
  routeCount: (count: number) => string;
  liveFromSwisstopo: string;
  allCantonsHint: (count: number) => string;
  customRouteTitle: string;
  customRouteHint: string;
}

const HOME_STRINGS: StringsDict<HomeStrings> = {
  de: {
    welcomeBack: "Willkommen zurück",
    defaultName: "Wanderer",
    step1Title: "SCHRITT 1 · KANTON WÄHLEN",
    whereStart: "Wo startest du?",
    heroBody: "Wähle den Kanton deiner Wanderung. Danach suchst du die Route und zuletzt die passende Sage.",
    homeCantonTitle: "Dein Heimatkanton",
    homeCantonHint: "Ohne Premium hier frei begehbar",
    otherCantonsTitle: "Weitere Kantone",
    cantonsTitle: "Kantone",
    routeCount: (n) => `${n} ${n === 1 ? "Wanderroute" : "Wanderrouten"}`,
    liveFromSwisstopo: "Routen live aus swisstopo",
    allCantonsHint: (n) => `Alle ${n} Kantone · Routen live aus swisstopo`,
    customRouteTitle: "Eigene Route",
    customRouteHint: "Start und Ziel selbst festlegen",
  },
  gsw: {
    welcomeBack: "Willkomme zrugg",
    defaultName: "Wanderer",
    step1Title: "SCHRITT 1 · KANTON WÄHLE",
    whereStart: "Wo startisch du?",
    heroBody: "Wähl de Kanton vo dinere Wanderig. Danach suechsch d Route und am Schluss die passendi Sag.",
    homeCantonTitle: "Din Heimatkanton",
    homeCantonHint: "Ohni Premium da frei begehbar",
    otherCantonsTitle: "Wiiteri Kantön",
    cantonsTitle: "Kantön",
    routeCount: (n) => `${n} ${n === 1 ? "Wanderroute" : "Wanderroute"}`,
    liveFromSwisstopo: "Route live us swisstopo",
    allCantonsHint: (n) => `Alli ${n} Kantön · Route live us swisstopo`,
    customRouteTitle: "Eigeni Route",
    customRouteHint: "Start und Ziel sälber aagäh",
  },
  en: {
    welcomeBack: "Welcome back",
    defaultName: "Hiker",
    step1Title: "STEP 1 · SELECT CANTON",
    whereStart: "Where do you start?",
    heroBody: "Choose the canton of your hike. Then search for the route and finally the right saga.",
    homeCantonTitle: "Your home canton",
    homeCantonHint: "Accessible here without premium",
    otherCantonsTitle: "Other cantons",
    cantonsTitle: "Cantons",
    routeCount: (n) => `${n} ${n === 1 ? "hiking route" : "hiking routes"}`,
    liveFromSwisstopo: "Routes live from swisstopo",
    allCantonsHint: (n) => `All ${n} cantons · Routes live from swisstopo`,
    customRouteTitle: "Custom route",
    customRouteHint: "Set your own start and destination",
  },
  fr: {
    welcomeBack: "Bon retour parmi nous",
    defaultName: "Randonneur·euse",
    step1Title: "ÉTAPE 1 · CHOISIR LE CANTON",
    whereStart: "Où commences-tu ?",
    heroBody: "Choisis le canton de ta randonnée. Ensuite, cherche l'itinéraire et enfin la légende correspondante.",
    homeCantonTitle: "Ton canton d'origine",
    homeCantonHint: "Accès libre ici sans premium",
    otherCantonsTitle: "Autres cantons",
    cantonsTitle: "Cantons",
    routeCount: (n) => `${n} ${n <= 1 ? "itinéraire" : "itinéraires"}`,
    liveFromSwisstopo: "Itinéraires en direct de swisstopo",
    allCantonsHint: (n) => `Les ${n} cantons · Itinéraires en direct de swisstopo`,
    customRouteTitle: "Itinéraire personnalisé",
    customRouteHint: "Définis toi-même départ et arrivée",
  },
  it: {
    welcomeBack: "Bentornato/a",
    defaultName: "Escursionista",
    step1Title: "PASSO 1 · SCEGLI IL CANTONE",
    whereStart: "Da dove inizi?",
    heroBody: "Scegli il cantone della tua escursione. Poi cerca l'itinerario e infine la leggenda corrispondente.",
    homeCantonTitle: "Il tuo cantone d'origine",
    homeCantonHint: "Accesso libero qui senza premium",
    otherCantonsTitle: "Altri cantoni",
    cantonsTitle: "Cantoni",
    routeCount: (n) => `${n} ${n === 1 ? "sentiero" : "sentieri"}`,
    liveFromSwisstopo: "Percorsi live da swisstopo",
    allCantonsHint: (n) => `Tutti i ${n} cantoni · Percorsi live da swisstopo`,
    customRouteTitle: "Itinerario personalizzato",
    customRouteHint: "Imposta tu partenza e arrivo",
  },
  es: {
    welcomeBack: "Bienvenido/a de nuevo",
    defaultName: "Senderista",
    step1Title: "PASO 1 · SELECCIONAR CANTÓN",
    whereStart: "¿Dónde empiezas?",
    heroBody: "Elige el cantón de tu caminata. Luego busca la ruta y finalmente la leyenda adecuada.",
    homeCantonTitle: "Tu cantón de origen",
    homeCantonHint: "Acceso libre aquí sin premium",
    otherCantonsTitle: "Otros cantones",
    cantonsTitle: "Cantones",
    routeCount: (n) => `${n} ${n === 1 ? "ruta de senderismo" : "rutas de senderismo"}`,
    liveFromSwisstopo: "Rutas en vivo desde swisstopo",
    allCantonsHint: (n) => `Los ${n} cantones · Rutas en vivo desde swisstopo`,
    customRouteTitle: "Ruta personalizada",
    customRouteHint: "Define tú mismo/a el inicio y el destino",
  },
  pt: {
    welcomeBack: "Bem-vindo/a de volta",
    defaultName: "Caminhante",
    step1Title: "ETAPA 1 · SELECIONAR CANTÃO",
    whereStart: "Onde você começa?",
    heroBody: "Escolha o cantão da sua caminhada. Depois procure a rota e, finalmente, a lenda adequada.",
    homeCantonTitle: "Seu cantão de origem",
    homeCantonHint: "Acesso livre aqui sem premium",
    otherCantonsTitle: "Outros cantões",
    cantonsTitle: "Cantões",
    routeCount: (n) => `${n} ${n === 1 ? "rota de caminhada" : "rotas de caminhada"}`,
    liveFromSwisstopo: "Rotas ao vivo do swisstopo",
    allCantonsHint: (n) => `Todos os ${n} cantões · Rotas ao vivo do swisstopo`,
    customRouteTitle: "Rota personalizada",
    customRouteHint: "Defina você mesmo/a a partida e o destino",
  },
  zh: {
    welcomeBack: "欢迎回来",
    defaultName: "徒步者",
    step1Title: "第一步 · 选择联邦州",
    whereStart: "你从哪里开始？",
    heroBody: "选择你徒步所在的联邦州。接着寻找路线，最后选择合适的传说。",
    homeCantonTitle: "你的家乡州",
    homeCantonHint: "无需高级版即可在此免费游览",
    otherCantonsTitle: "其他联邦州",
    cantonsTitle: "联邦州",
    routeCount: (n) => `${n} 条徒步路线`,
    liveFromSwisstopo: "来自 swisstopo 的实时路线",
    allCantonsHint: (n) => `全部 ${n} 个联邦州 · 来自 swisstopo 的实时路线`,
    customRouteTitle: "自定义路线",
    customRouteHint: "自行设定起点和终点",
  },
};

export const useHomeStrings = createUseStrings(HOME_STRINGS);
