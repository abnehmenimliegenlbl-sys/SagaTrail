import { createUseStrings, StringsDict } from "../createStrings";

export interface CollectionStrings {
  eyebrow: string;
  title: string;
  sagasExperienced: string;
  total: string;
  cantons: string;
  emptyState: string;
}

const COLLECTION_STRINGS: StringsDict<CollectionStrings> = {
  de: {
    eyebrow: "Deine Reise",
    title: "Sammlung",
    sagasExperienced: "Sagen erlebt",
    total: "Insgesamt",
    cantons: "Kantone",
    emptyState: "Noch keine Sage erlebt. Starte deine erste Wanderung, um Funken zu sammeln.",
  },
  gsw: {
    eyebrow: "Dini Reis",
    title: "Sammlig",
    sagasExperienced: "Sage erläbt",
    total: "Insgsamt",
    cantons: "Kantön",
    emptyState: "No kei Sag erläbt. Start dini erschti Wanderig, zum Funke sammle.",
  },
  en: {
    eyebrow: "Your Journey",
    title: "Collection",
    sagasExperienced: "Sagas experienced",
    total: "Total",
    cantons: "Cantons",
    emptyState: "No sagas experienced yet. Start your first hike to collect sparks.",
  },
  fr: {
    eyebrow: "Ton voyage",
    title: "Collection",
    sagasExperienced: "Légendes vécues",
    total: "Total",
    cantons: "Cantons",
    emptyState: "Aucune légende vécue pour l'instant. Commence ta première randonnée pour collecter des étincelles.",
  },
  it: {
    eyebrow: "Il tuo viaggio",
    title: "Collezione",
    sagasExperienced: "Leggende vissute",
    total: "Totale",
    cantons: "Cantoni",
    emptyState: "Ancora nessuna leggenda vissuta. Inizia la tua prima escursione per raccogliere scintille.",
  },
  es: {
    eyebrow: "Tu viaje",
    title: "Colección",
    sagasExperienced: "Leyendas vividas",
    total: "Total",
    cantons: "Cantones",
    emptyState: "Aún no has vivido ninguna leyenda. Comienza tu primera caminata para recolectar chispas.",
  },
  pt: {
    eyebrow: "Sua jornada",
    title: "Coleção",
    sagasExperienced: "Lendas vividas",
    total: "Total",
    cantons: "Cantões",
    emptyState: "Nenhuma lenda vivida ainda. Comece sua primeira caminhada para coletar faíscas.",
  },
  zh: {
    eyebrow: "你的旅程",
    title: "藏品",
    sagasExperienced: "经历过的传说",
    total: "总计",
    cantons: "联邦州",
    emptyState: "尚未经历任何传说。开始你的第一次徒步，收集火花吧。",
  },
};

export const useCollectionStrings = createUseStrings(COLLECTION_STRINGS);
