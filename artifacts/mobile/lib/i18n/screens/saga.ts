import { createUseStrings, StringsDict } from "../createStrings";

export interface SagaStrings {
  generating: string;
  notFound: string;
  back: string;
  reviewPending: string;
  coordinates: string;
  locationUnbound: string;
  sourceLabel: string;
  lockedText: string;
  premiumButton: string;
  startHike: string;
  packLockedText: string;
  packBuyBtn: string;
  packUnavailable: string;
  packErrorTitle: string;
  eliteUpsell: string;
  eliteBtn: string;
  accuracy: {
    exakt: string;
    ungefaehr: string;
    nicht_lokalisierbar: string;
  };
}

const SAGA_STRINGS: StringsDict<SagaStrings> = {
  de: {
    generating: "Die Sage wird erzeugt …",
    notFound: "Diese Sage wurde nicht gefunden.",
    back: "Zurück",
    reviewPending: "Diese Übersetzung wird noch redaktionell geprüft.",
    coordinates: "Koordinaten",
    locationUnbound: "Ortsungebunden",
    sourceLabel: "QUELLE (GEMEINFREI)",
    lockedText: "Deine Gratis-Wanderung hast du bereits erlebt. Mit Premium wanderst du unbegrenzt durch alle 26 Kantone – jede Sage, jede Route, jederzeit.",
    premiumButton: "Premium freischalten",
    startHike: "Wanderung starten",
    packLockedText: "Deine erste entdeckte Sage in diesem Kanton war inklusive. Alle weiteren Sagen dieses Kantons schaltest du mit dem Sagen-Pack frei.",
    packBuyBtn: "Sagen-Pack kaufen",
    packUnavailable: "Das Sagen-Pack ist derzeit nicht verfügbar.",
    packErrorTitle: "Kauf fehlgeschlagen",
    eliteUpsell: "Mit Elite sind alle Sagen-Packs aller Kantone inklusive.",
    eliteBtn: "Elite entdecken",
    accuracy: {
      exakt: "Exakt belegter Ort",
      ungefaehr: "Region belegt, nicht punktgenau",
      nicht_lokalisierbar: "Nicht exakt lokalisierbar",
    },
  },
  gsw: {
    generating: "D Sag wird erzügt …",
    notFound: "Die Sag isch nid gfunde worde.",
    back: "Zrugg",
    reviewPending: "Die Übersetzig wird no redaktionell prüeft.",
    coordinates: "Koordinate",
    locationUnbound: "Ortsungebunde",
    sourceLabel: "QUÄLLE (GMEINFREI)",
    lockedText: "Dini Gratis-Wanderig hesch scho erläbt. Mit Premium wandersch unbegränzt dur alli 26 Kantön – jedi Sag, jedi Route, jederzit.",
    premiumButton: "Premium freischalte",
    startHike: "Wanderig starte",
    packLockedText: "Dini ersti entdeckti Sag i dem Kanton isch inklusive gsi. Alli wiitere Sage vo dem Kanton schaltisch mit em Sage-Pack frei.",
    packBuyBtn: "Sage-Pack chaufe",
    packUnavailable: "S Sage-Pack isch zurzit nid verfüegbar.",
    packErrorTitle: "Chauf fehlgschlage",
    eliteUpsell: "Mit Elite sind alli Sage-Packs vo allne Kantön inklusive.",
    eliteBtn: "Elite entdecke",
    accuracy: {
      exakt: "Exakt beleite Ort",
      ungefaehr: "Region beleit, nid punktgnau",
      nicht_lokalisierbar: "Nid exakt lokalisierbar",
    },
  },
  en: {
    generating: "Generating legend …",
    notFound: "This legend was not found.",
    back: "Back",
    reviewPending: "This translation is still being reviewed.",
    coordinates: "Coordinates",
    locationUnbound: "Location unbound",
    sourceLabel: "SOURCE (PUBLIC DOMAIN)",
    lockedText: "You've already enjoyed your free hike. With Premium you hike without limits across all 26 cantons – every legend, every route, anytime.",
    premiumButton: "Unlock Premium",
    startHike: "Start hike",
    packLockedText: "Your first discovered legend in this canton was included. Unlock all further legends of this canton with the legend pack.",
    packBuyBtn: "Buy legend pack",
    packUnavailable: "The legend pack is currently unavailable.",
    packErrorTitle: "Purchase failed",
    eliteUpsell: "With Elite, all legend packs of all cantons are included.",
    eliteBtn: "Discover Elite",
    accuracy: {
      exakt: "Exactly documented location",
      ungefaehr: "Region documented, not pinpointed",
      nicht_lokalisierbar: "Not exactly localizable",
    },
  },
  fr: {
    generating: "Génération de la légende …",
    notFound: "Cette légende n'a pas été trouvée.",
    back: "Retour",
    reviewPending: "Cette traduction est encore en cours de révision.",
    coordinates: "Coordonnées",
    locationUnbound: "Lieu non défini",
    sourceLabel: "SOURCE (DOMAINE PUBLIC)",
    lockedText: "Vous avez déjà profité de votre randonnée gratuite. Avec Premium, randonnez sans limites dans les 26 cantons – chaque légende, chaque itinéraire, à tout moment.",
    premiumButton: "Débloquer Premium",
    startHike: "Commencer la randonnée",
    packLockedText: "Votre première légende découverte dans ce canton était incluse. Débloquez toutes les autres légendes de ce canton avec le pack de légendes.",
    packBuyBtn: "Acheter le pack de légendes",
    packUnavailable: "Le pack de légendes n'est pas disponible actuellement.",
    packErrorTitle: "Échec de l'achat",
    eliteUpsell: "Avec Elite, tous les packs de légendes de tous les cantons sont inclus.",
    eliteBtn: "Découvrir Elite",
    accuracy: {
      exakt: "Lieu exactement documenté",
      ungefaehr: "Région documentée, pas de point précis",
      nicht_lokalisierbar: "Non localisable précisément",
    },
  },
  it: {
    generating: "Generazione della leggenda …",
    notFound: "Questa leggenda non è stata trovata.",
    back: "Indietro",
    reviewPending: "Questa traduzione è ancora in fase di revisione.",
    coordinates: "Coordinate",
    locationUnbound: "Luogo non vincolato",
    sourceLabel: "FONTE (DOMINIO PUBBLICO)",
    lockedText: "Hai già vissuto la tua escursione gratuita. Con Premium esplori senza limiti tutti i 26 cantoni – ogni leggenda, ogni percorso, in qualsiasi momento.",
    premiumButton: "Sblocca Premium",
    startHike: "Inizia l'escursione",
    packLockedText: "La tua prima leggenda scoperta in questo cantone era inclusa. Sblocca tutte le altre leggende di questo cantone con il pacchetto di leggende.",
    packBuyBtn: "Acquista il pacchetto di leggende",
    packUnavailable: "Il pacchetto di leggende non è attualmente disponibile.",
    packErrorTitle: "Acquisto non riuscito",
    eliteUpsell: "Con Elite, tutti i pacchetti di leggende di tutti i cantoni sono inclusi.",
    eliteBtn: "Scopri Elite",
    accuracy: {
      exakt: "Luogo esattamente documentato",
      ungefaehr: "Regione documentata, non precisa",
      nicht_lokalisierbar: "Non localizzabile esattamente",
    },
  },
  es: {
    generating: "Generando leyenda …",
    notFound: "Esta leyenda no fue encontrada.",
    back: "Atrás",
    reviewPending: "Esta traducción aún está siendo revisada.",
    coordinates: "Coordenadas",
    locationUnbound: "Ubicación no vinculada",
    sourceLabel: "FUENTE (DOMINIO PÚBLICO)",
    lockedText: "Ya has disfrutado de tu caminata gratuita. Con Premium caminas sin límites por los 26 cantones – cada leyenda, cada ruta, en cualquier momento.",
    premiumButton: "Desbloquear Premium",
    startHike: "Iniciar caminata",
    packLockedText: "Tu primera leyenda descubierta en este cantón estaba incluida. Desbloquea todas las demás leyendas de este cantón con el pack de leyendas.",
    packBuyBtn: "Comprar pack de leyendas",
    packUnavailable: "El pack de leyendas no está disponible actualmente.",
    packErrorTitle: "Compra fallida",
    eliteUpsell: "Con Elite, todos los packs de leyendas de todos los cantones están incluidos.",
    eliteBtn: "Descubrir Elite",
    accuracy: {
      exakt: "Ubicación documentada exactamente",
      ungefaehr: "Región documentada, no puntual",
      nicht_lokalisierbar: "No localizable exactamente",
    },
  },
  pt: {
    generating: "Gerando lenda …",
    notFound: "Esta lenda não foi encontrada.",
    back: "Voltar",
    reviewPending: "Esta tradução ainda está sendo revisada.",
    coordinates: "Coordenadas",
    locationUnbound: "Localização não vinculada",
    sourceLabel: "FONTE (DOMÍNIO PÚBLICO)",
    lockedText: "Você já aproveitou a sua caminhada gratuita. Com o Premium, você caminha sem limites pelos 26 cantões – cada lenda, cada rota, a qualquer momento.",
    premiumButton: "Desbloquear Premium",
    startHike: "Iniciar caminhada",
    packLockedText: "A sua primeira lenda descoberta neste cantão estava incluída. Desbloqueie todas as outras lendas deste cantão com o pacote de lendas.",
    packBuyBtn: "Comprar pacote de lendas",
    packUnavailable: "O pacote de lendas não está disponível no momento.",
    packErrorTitle: "Falha na compra",
    eliteUpsell: "Com o Elite, todos os pacotes de lendas de todos os cantões estão incluídos.",
    eliteBtn: "Descobrir Elite",
    accuracy: {
      exakt: "Localização documentada exatamente",
      ungefaehr: "Região documentada, não pontual",
      nicht_lokalisierbar: "Não localizável exatamente",
    },
  },
  zh: {
    generating: "正在生成传说 …",
    notFound: "未找到该传说。",
    back: "返回",
    reviewPending: "此翻译仍在审核中。",
    coordinates: "坐标",
    locationUnbound: "地点未固定",
    sourceLabel: "来源（公有领域）",
    lockedText: "您已体验过免费徒步。开通 Premium 即可无限畅游全部 26 个州 – 每个传说、每条路线，随时出发。",
    premiumButton: "解锁 Premium",
    startHike: "开始徒步",
    packLockedText: "你在该州发现的第一个传说已包含在内。购买传说包即可解锁该州的所有其他传说。",
    packBuyBtn: "购买传说包",
    packUnavailable: "传说包目前不可用。",
    packErrorTitle: "购买失败",
    eliteUpsell: "订阅 Elite 即可包含所有州的全部传说包。",
    eliteBtn: "了解 Elite",
    accuracy: {
      exakt: "确切记录的地点",
      ungefaehr: "有记录的区域，非精确地点",
      nicht_lokalisierbar: "无法精确定位",
    },
  },
  ru: {
    generating: "Легенда создаётся …",
    notFound: "Эта легенда не найдена.",
    back: "Назад",
    reviewPending: "Этот перевод пока проходит редакторскую проверку.",
    coordinates: "Координаты",
    locationUnbound: "Место не привязано",
    sourceLabel: "ИСТОЧНИК (ОБЩЕСТВЕННОЕ ДОСТОЯНИЕ)",
    lockedText: "Свой бесплатный поход ты уже прошёл. С Premium ты гуляешь без ограничений по всем 26 кантонам – каждая легенда, каждый маршрут, в любое время.",
    premiumButton: "Разблокировать Premium",
    startHike: "Начать поход",
    packLockedText: "Твоя первая обнаруженная легенда в этом кантоне была включена бесплатно. Разблокируй все остальные легенды этого кантона с помощью пакета легенд.",
    packBuyBtn: "Купить пакет легенд",
    packUnavailable: "Пакет легенд сейчас недоступен.",
    packErrorTitle: "Покупка не удалась",
    eliteUpsell: "С Elite все пакеты легенд всех кантонов включены.",
    eliteBtn: "Узнать про Elite",
    accuracy: {
      exakt: "Точно задокументированное место",
      ungefaehr: "Регион задокументирован, без точной привязки",
      nicht_lokalisierbar: "Невозможно точно локализовать",
    },
  },
};

export const useSagaStrings = createUseStrings(SAGA_STRINGS);
