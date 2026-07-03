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
    lockedText: "Diese Region ist Teil von SagaTrail Premium. Schalte alle Kantone frei, um diese Wanderung zu starten.",
    premiumButton: "Premium freischalten",
    startHike: "Wanderung starten",
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
    lockedText: "Die Region isch Teil vo SagaTrail Premium. Schalt alli Kantön frei, zum die Wanderig z'starte.",
    premiumButton: "Premium freischalte",
    startHike: "Wanderig starte",
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
    lockedText: "This region is part of SagaTrail Premium. Unlock all cantons to start this hike.",
    premiumButton: "Unlock Premium",
    startHike: "Start hike",
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
    lockedText: "Cette région fait partie de SagaTrail Premium. Débloquez tous les cantons pour commencer cette randonnée.",
    premiumButton: "Débloquer Premium",
    startHike: "Commencer la randonnée",
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
    lockedText: "Questa regione fa parte di SagaTrail Premium. Sblocca tutti i cantoni per iniziare questa escursione.",
    premiumButton: "Sblocca Premium",
    startHike: "Inizia l'escursione",
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
    lockedText: "Esta región es parte de SagaTrail Premium. Desbloquea todos los cantones para comenzar esta caminata.",
    premiumButton: "Desbloquear Premium",
    startHike: "Iniciar caminata",
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
    lockedText: "Esta região faz parte do SagaTrail Premium. Desbloqueie todos os cantões para começar esta caminhada.",
    premiumButton: "Desbloquear Premium",
    startHike: "Iniciar caminhada",
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
    lockedText: "此区域属于 SagaTrail Premium。解锁所有州以开始此次徒步。",
    premiumButton: "解锁 Premium",
    startHike: "开始徒步",
    accuracy: {
      exakt: "确切记录的地点",
      ungefaehr: "有记录的区域，非精确地点",
      nicht_lokalisierbar: "无法精确定位",
    },
  },
};

export const useSagaStrings = createUseStrings(SAGA_STRINGS);
