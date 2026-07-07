import { createUseStrings, StringsDict } from "../createStrings";

export interface CollectionStrings {
  eyebrow: string;
  title: string;
  sagasExperienced: string;
  total: string;
  cantons: string;
  emptyState: string;
  albumTitle: string;
  cantonProgress: (discovered: number, total: number, canton: string) => string;
  emptyCta: string;
}

const COLLECTION_STRINGS: StringsDict<CollectionStrings> = {
  de: {
    eyebrow: "Deine Reise",
    title: "Sammlung",
    sagasExperienced: "Sagen erlebt",
    total: "Insgesamt",
    cantons: "Kantone",
    emptyState: "Noch keine Sage erlebt. Starte deine erste Wanderung, um Funken zu sammeln.",
    albumTitle: "Sagen-Album",
    cantonProgress: (d, t, c) => `${d} von ${t} Sagen in ${c} entdeckt`,
    emptyCta: "Erste Wanderung starten",
  },
  gsw: {
    eyebrow: "Dini Reis",
    title: "Sammlig",
    sagasExperienced: "Sage erläbt",
    total: "Insgsamt",
    cantons: "Kantön",
    emptyState: "No kei Sag erläbt. Start dini erschti Wanderig, zum Funke sammle.",
    albumTitle: "Sage-Album",
    cantonProgress: (d, t, c) => `${d} vo ${t} Sage in ${c} entdeckt`,
    emptyCta: "Erschti Wanderig starte",
  },
  en: {
    eyebrow: "Your Journey",
    title: "Collection",
    sagasExperienced: "Sagas experienced",
    total: "Total",
    cantons: "Cantons",
    emptyState: "No sagas experienced yet. Start your first hike to collect sparks.",
    albumTitle: "Saga Album",
    cantonProgress: (d, t, c) => `${d} of ${t} sagas discovered in ${c}`,
    emptyCta: "Start your first hike",
  },
  fr: {
    eyebrow: "Ton voyage",
    title: "Collection",
    sagasExperienced: "Légendes vécues",
    total: "Total",
    cantons: "Cantons",
    emptyState: "Aucune légende vécue pour l'instant. Commence ta première randonnée pour collecter des étincelles.",
    albumTitle: "Album des légendes",
    cantonProgress: (d, t, c) => `${d} légende(s) sur ${t} découverte(s) en ${c}`,
    emptyCta: "Commencer ta première randonnée",
  },
  it: {
    eyebrow: "Il tuo viaggio",
    title: "Collezione",
    sagasExperienced: "Leggende vissute",
    total: "Totale",
    cantons: "Cantoni",
    emptyState: "Ancora nessuna leggenda vissuta. Inizia la tua prima escursione per raccogliere scintille.",
    albumTitle: "Album delle leggende",
    cantonProgress: (d, t, c) => `${d} leggende su ${t} scoperte in ${c}`,
    emptyCta: "Inizia la tua prima escursione",
  },
  es: {
    eyebrow: "Tu viaje",
    title: "Colección",
    sagasExperienced: "Leyendas vividas",
    total: "Total",
    cantons: "Cantones",
    emptyState: "Aún no has vivido ninguna leyenda. Comienza tu primera caminata para recolectar chispas.",
    albumTitle: "Álbum de leyendas",
    cantonProgress: (d, t, c) => `${d} de ${t} leyendas descubiertas en ${c}`,
    emptyCta: "Comienza tu primera caminata",
  },
  pt: {
    eyebrow: "Sua jornada",
    title: "Coleção",
    sagasExperienced: "Lendas vividas",
    total: "Total",
    cantons: "Cantões",
    emptyState: "Nenhuma lenda vivida ainda. Comece sua primeira caminhada para coletar faíscas.",
    albumTitle: "Álbum de lendas",
    cantonProgress: (d, t, c) => `${d} de ${t} lendas descobertas em ${c}`,
    emptyCta: "Comece sua primeira caminhada",
  },
  zh: {
    eyebrow: "你的旅程",
    title: "藏品",
    sagasExperienced: "经历过的传说",
    total: "总计",
    cantons: "联邦州",
    emptyState: "尚未经历任何传说。开始你的第一次徒步，收集火花吧。",
    albumTitle: "传说图鉴",
    cantonProgress: (d, t, c) => `${c}：已发现 ${d}/${t} 个传说`,
    emptyCta: "开始你的第一次徒步",
  },
};

export const useCollectionStrings = createUseStrings(COLLECTION_STRINGS);
