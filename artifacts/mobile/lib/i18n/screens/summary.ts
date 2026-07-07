import { createUseStrings, StringsDict } from "../createStrings";

export interface SummaryStrings {
  noHikeFound: string;
  backToOverview: string;
  shareTextTemplate: (routeName: string, distanceKm: number) => string;
  achievementUnlocked: string;
  archetypeSub: (archetype: string) => string;
  stats: {
    distance: string;
    ascent: string;
    sac: string;
    chapters: string;
  };
  blockTitle: string;
  noChoiceMade: string;
  shareBtn: string;
  backButton: string;
  photoTitle: string;
  addPhoto: string;
  changePhoto: string;
}

const SUMMARY_STRINGS: StringsDict<SummaryStrings> = {
  de: {
    noHikeFound: "Keine Wanderung gefunden.",
    backToOverview: "Zur Übersicht",
    shareTextTemplate: (routeName, distanceKm) =>
      `Ich habe auf SagaTrail die Sage "${routeName}" erwandert — ${distanceKm} km durch die Berge, begleitet von einer alten Legende.`,
    achievementUnlocked: "ACHIEVEMENT FREIGESCHALTET",
    archetypeSub: (archetype) => `Als ${archetype} durch die Sage gewandert`,
    stats: {
      distance: "Distanz",
      ascent: "Aufstieg",
      sac: "SAC",
      chapters: "Kapitel",
    },
    blockTitle: "Deine Wahrnehmungen",
    noChoiceMade: "Keine Wahl getroffen",
    shareBtn: "Wanderung teilen",
    backButton: "Zurück zur Übersicht",
    photoTitle: "Erinnerungsfoto",
    addPhoto: "Foto hinzufügen",
    changePhoto: "Foto ändern",
  },
  gsw: {
    noHikeFound: "Kei Wanderig gfunde.",
    backToOverview: "Zrugg zur Übersicht",
    shareTextTemplate: (routeName, distanceKm) =>
      `Ich ha uf SagaTrail d Sag "${routeName}" erwanderet — ${distanceKm} km dur d Bärge, begleitet vonere alte Legände.`,
    achievementUnlocked: "ACHIEVEMENT FREIGSCHALTET",
    archetypeSub: (archetype) => `Als ${archetype} dur d Sag gwanderet`,
    stats: {
      distance: "Distanz",
      ascent: "Ufstieg",
      sac: "SAC",
      chapters: "Kapitel",
    },
    blockTitle: "Dini Wahrnehmige",
    noChoiceMade: "Kei Wahl troffe",
    shareBtn: "Wanderig teile",
    backButton: "Zrugg zur Übersicht",
    photoTitle: "Erinnerigsfoto",
    addPhoto: "Foto dezuefüege",
    changePhoto: "Foto ändere",
  },
  en: {
    noHikeFound: "No hike found.",
    backToOverview: "Back to overview",
    shareTextTemplate: (routeName, distanceKm) =>
      `I hiked the legend "${routeName}" on SagaTrail — ${distanceKm} km through the mountains, accompanied by an ancient legend.`,
    achievementUnlocked: "ACHIEVEMENT UNLOCKED",
    archetypeSub: (archetype) => `Hiked through the legend as ${archetype}`,
    stats: {
      distance: "Distance",
      ascent: "Ascent",
      sac: "SAC",
      chapters: "Chapters",
    },
    blockTitle: "Your perceptions",
    noChoiceMade: "No choice made",
    shareBtn: "Share hike",
    backButton: "Back to overview",
    photoTitle: "Memory photo",
    addPhoto: "Add photo",
    changePhoto: "Change photo",
  },
  fr: {
    noHikeFound: "Aucune randonnée trouvée.",
    backToOverview: "Retour à l'aperçu",
    shareTextTemplate: (routeName, distanceKm) =>
      `J'ai parcouru la légende "${routeName}" sur SagaTrail — ${distanceKm} km à travers les montagnes, accompagné d'une légende ancienne.`,
    achievementUnlocked: "SUCCÈS DÉVERROUILLÉ",
    archetypeSub: (archetype) => `A parcouru la légende en tant que ${archetype}`,
    stats: {
      distance: "Distance",
      ascent: "Montée",
      sac: "SAC",
      chapters: "Chapitres",
    },
    blockTitle: "Tes perceptions",
    noChoiceMade: "Aucun choix fait",
    shareBtn: "Partager la randonnée",
    backButton: "Retour à l'aperçu",
    photoTitle: "Photo souvenir",
    addPhoto: "Ajouter une photo",
    changePhoto: "Changer la photo",
  },
  it: {
    noHikeFound: "Nessuna escursione trovata.",
    backToOverview: "Torna alla panoramica",
    shareTextTemplate: (routeName, distanceKm) =>
      `Ho percorso la leggenda "${routeName}" su SagaTrail — ${distanceKm} km tra le montagne, accompagnato da un'antica leggenda.`,
    achievementUnlocked: "OBIETTIVO SBLOCCATO",
    archetypeSub: (archetype) => `Attraverso la leggenda come ${archetype}`,
    stats: {
      distance: "Distanza",
      ascent: "Salita",
      sac: "SAC",
      chapters: "Capitoli",
    },
    blockTitle: "Le tue percezioni",
    noChoiceMade: "Nessuna scelta effettuata",
    shareBtn: "Condividi escursione",
    backButton: "Torna alla panoramica",
    photoTitle: "Foto ricordo",
    addPhoto: "Aggiungi foto",
    changePhoto: "Cambia foto",
  },
  es: {
    noHikeFound: "No se encontró ninguna caminata.",
    backToOverview: "Volver a la vista general",
    shareTextTemplate: (routeName, distanceKm) =>
      `Recorrí la leyenda "${routeName}" en SagaTrail: ${distanceKm} km por las montañas, acompañado de una antigua leyenda.`,
    achievementUnlocked: "LOGRO DESBLOQUEADO",
    archetypeSub: (archetype) => `Recorrió la leyenda como ${archetype}`,
    stats: {
      distance: "Distancia",
      ascent: "Ascenso",
      sac: "SAC",
      chapters: "Capítulos",
    },
    blockTitle: "Tus percepciones",
    noChoiceMade: "No se tomó ninguna decisión",
    shareBtn: "Compartir caminata",
    backButton: "Volver a la vista general",
    photoTitle: "Foto de recuerdo",
    addPhoto: "Añadir foto",
    changePhoto: "Cambiar foto",
  },
  pt: {
    noHikeFound: "Nenhuma caminhada encontrada.",
    backToOverview: "Voltar à visão geral",
    shareTextTemplate: (routeName, distanceKm) =>
      `Caminhei pela lenda "${routeName}" no SagaTrail — ${distanceKm} km pelas montanhas, acompanhado por uma lenda antiga.`,
    achievementUnlocked: "CONQUISTA DESBLOQUEADA",
    archetypeSub: (archetype) => `Caminhou pela lenda como ${archetype}`,
    stats: {
      distance: "Distância",
      ascent: "Subida",
      sac: "SAC",
      chapters: "Capítulos",
    },
    blockTitle: "Suas percepções",
    noChoiceMade: "Nenhuma escolha feita",
    shareBtn: "Compartilhar caminhada",
    backButton: "Voltar à visão geral",
    photoTitle: "Foto de lembrança",
    addPhoto: "Adicionar foto",
    changePhoto: "Trocar foto",
  },
  zh: {
    noHikeFound: "未找到徒步记录。",
    backToOverview: "返回概览",
    shareTextTemplate: (routeName, distanceKm) =>
      `我在 SagaTrail 上体验了 "${routeName}" 传说——在古老传说的陪伴下，徒步穿行山间 ${distanceKm} 公里。`,
    achievementUnlocked: "成就已解锁",
    archetypeSub: (archetype) => `以${archetype}的身份体验传说`,
    stats: {
      distance: "距离",
      ascent: "爬升",
      sac: "难度",
      chapters: "章节",
    },
    blockTitle: "你的感悟",
    noChoiceMade: "未做出选择",
    shareBtn: "分享徒步",
    backButton: "返回概览",
    photoTitle: "纪念照片",
    addPhoto: "添加照片",
    changePhoto: "更换照片",
  },
};

export const useSummaryStrings = createUseStrings(SUMMARY_STRINGS);
