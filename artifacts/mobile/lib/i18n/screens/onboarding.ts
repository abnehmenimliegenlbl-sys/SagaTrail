import { AgeTier, Archetype } from "@/types";

import { createUseStrings, LanguageCode, StringsDict } from "../createStrings";

export interface OnboardingStrings {
  brandTagline: string;
  intro: string;
  nameLabel: string;
  namePlaceholder: string;
  stepOf: (step: number, total: number) => string;
  archetypeTitle: string;
  archetypeHint: string;
  archetypes: Record<Archetype, { title: string; tagline: string; description: string }>;
  cantonTitle: string;
  cantonHint: string;
  languageStepTitle: string;
  languageHint: string;
  languageNames: Record<LanguageCode, string>;
  ageTierTitle: string;
  ageTierHint: string;
  ageTiers: Record<AgeTier, { title: string; range: string; description: string }>;
  consentText: string;
  back: string;
  start: string;
  next: string;
  saveError: string;
  permissionsTitle: string;
  permissionsHint: string;
  permissions: {
    location: { title: string; message: string; allow: string };
    microphone: { title: string; message: string; allow: string };
    motion: { title: string; message: string; allow: string };
    notifications: { title: string; message: string; allow: string };
  };
  permissionSkip: string;
  permissionStatusGranted: string;
  permissionStatusDenied: string;
  permissionStatusPending: string;
}

const ONBOARDING_STRINGS: StringsDict<OnboardingStrings> = {
  de: {
    brandTagline: "Die Sagen der Alpen, lebendig auf deinem Weg",
    intro:
      "Du wanderst als Zeuge durch uralte Schweizer Legenden. Sie werden dir erzählt, während du gehst — Schritt für Schritt, Ort für Ort.",
    nameLabel: "Wie dürfen wir dich nennen?",
    namePlaceholder: "Dein Name",
    stepOf: (step, total) => `Schritt ${step} von ${total}`,
    archetypeTitle: "Dein Archetyp",
    archetypeHint:
      "Dein Archetyp verändert den Ton der Erzählung und wie du dargestellt wirst — nie den Ausgang der Sage.",
    archetypes: {
      reisende: {
        title: "Reisende",
        tagline: "Von aussen ins Tal",
        description:
          "Du kommst von weit her und hilfst mit Wissen und Mut. Dein Blick ist der einer neugierigen Beobachtung.",
      },
      hueterin: {
        title: "Hüter",
        tagline: "Der Natur verbunden",
        description:
          "Du vermittelst zwischen Menschen und Geisterwelt. Du hörst, was zwischen den Steinen flüstert.",
      },
      gewitzte: {
        title: "Gewitzte",
        tagline: "Klugheit statt Kampf",
        description:
          "Du löst mit List, was andere mit Gewalt versuchen. Wo Gefahr droht, suchst du die Lücke.",
      },
      senn: {
        title: "Senn",
        tagline: "Am Berg verwurzelt",
        description:
          "Du kennst die Alp seit jeher. Ruhig und erfahren liest du die Zeichen des Gebirges.",
      },
    },
    cantonTitle: "Deine Heimatregion",
    cantonHint:
      "Wähle deinen Heimatkanton. Von hier aus beginnt deine Reise durch die Sagenwelt.",
    languageStepTitle: "Deine Sprache",
    languageHint: "In welcher Sprache sollen dir die Sagen erzählt werden?",
    languageNames: {
      gsw: "Schweizerdeutsch",
      de: "Deutsch",
      fr: "Französisch",
      it: "Italienisch",
      en: "Englisch",
      zh: "Mandarin",
      es: "Spanisch",
      pt: "Portugiesisch",
      ru: "Russisch",
    },
    ageTierTitle: "Alterstufe",
    ageTierHint: "Sie bestimmt, wie intensiv die Sagen erzählt werden.",
    ageTiers: {
      kinder: {
        title: "Kinder",
        range: "ca. 6 – 11 Jahre",
        description: "Sanfte Erzählungen, unheimliche Motive entschärft.",
      },
      jugendliche: {
        title: "Jugendliche",
        range: "ca. 12 – 15 Jahre",
        description: "Spannungsvoll, aber ohne drastische Gewalt.",
      },
      erwachsene: {
        title: "Erwachsene",
        range: "ab 16 Jahren",
        description: "Die Sagen in ihrer ganzen düsteren Tiefe.",
      },
    },
    consentText:
      "Ich bin ein Elternteil oder erziehungsberechtigt und stimme der Nutzung durch ein Kind zu.",
    back: "Zurück",
    start: "Reise beginnen",
    next: "Weiter",
    saveError: "Profil konnte nicht gespeichert werden. Bitte erneut versuchen.",
    permissionsTitle: "Berechtigungen",
    permissionsHint:
      "Damit SagaTrail dich unterwegs begleiten kann, braucht die App ein paar Freigaben. Du kannst sie jederzeit in den Einstellungen ändern.",
    permissions: {
      location: {
        title: "Standort",
        message:
          "Wir zeigen dir deine Position auf der Wanderkarte und erzählen die Sage passend zu deinem Standort.",
        allow: "Standort erlauben",
      },
      microphone: {
        title: "Mikrofon",
        message:
          "Freihändig antworten: Sprich deine Entscheidung an Wegpunkten einfach aus, statt zu tippen.",
        allow: "Mikrofon erlauben",
      },
      motion: {
        title: "Bewegung & Fitness",
        message: "Wir zählen deine Schritte während der Wanderung mit.",
        allow: "Bewegung erlauben",
      },
      notifications: {
        title: "Benachrichtigungen",
        message:
          "Wir erinnern dich an Abzweigungen unterwegs, auch wenn die App im Hintergrund läuft.",
        allow: "Benachrichtigungen erlauben",
      },
    },
    permissionSkip: "Überspringen",
    permissionStatusGranted: "Erlaubt",
    permissionStatusDenied: "Abgelehnt",
    permissionStatusPending: "Ausstehend",
  },
  gsw: {
    brandTagline: "D Sage vo de Alpe, läbändig uf dim Wäg",
    intro:
      "Du wanderisch als Züüge dur uralti Schwiizer Sage. Si wärdet dir verzelt, während du gasch — Schritt für Schritt, Ort für Ort.",
    nameLabel: "Wie dörfemer dich nenne?",
    namePlaceholder: "Dis Name",
    stepOf: (step, total) => `Schritt ${step} vo ${total}`,
    archetypeTitle: "Dis Archetyp",
    archetypeHint:
      "Dis Archetyp veränderet de Ton vo de Erzählig und wie du dargstellt wirsch — nie s Änd vode Sag.",
    archetypes: {
      reisende: {
        title: "Reisendi",
        tagline: "Vo usse is Tal",
        description:
          "Du chunnsch vo wiit här und hilfsch mit Wüsse und Muet. Din Blick isch de vonere nüügierige Beobachtig.",
      },
      hueterin: {
        title: "Hüeter",
        tagline: "De Natur verbunde",
        description:
          "Du vermittlisch zwüsche Mensch und Geischterwält. Du hörsch, was zwüsche de Stei flüschteret.",
      },
      gewitzte: {
        title: "Gwitzti",
        tagline: "Gschiidheit statt Kampf",
        description:
          "Du lösisch mit Lischt, was anderi mit Gwalt probiered. Wo Gfahr droht, suechsch du d Lugg.",
      },
      senn: {
        title: "Senn",
        tagline: "Am Bärg verwurzlet",
        description:
          "Du kennsch d Alp scho lang. Ruehig und erfahre liesisch du d Zeiche vom Gebirg.",
      },
    },
    cantonTitle: "Dini Heimatregion",
    cantonHint:
      "Wähl din Heimatkanton us. Vo da fangt dini Reis dur d Sagewält aa.",
    languageStepTitle: "Dini Sprach",
    languageHint: "In weler Sprach söll dir d Sage verzelt wärde?",
    languageNames: {
      gsw: "Schwiizerdütsch",
      de: "Hochdütsch",
      fr: "Französisch",
      it: "Italienisch",
      en: "Änglisch",
      zh: "Mandarin",
      es: "Spanisch",
      pt: "Portugiesisch",
      ru: "Russisch",
    },
    ageTierTitle: "Alterstufe",
    ageTierHint: "Si bestimmt, wie fescht d Sage verzelt wärde.",
    ageTiers: {
      kinder: {
        title: "Chind",
        range: "ca. 6 – 11 Jahr",
        description: "Sanfti Erzählige, unheimlichi Motiv entschärft.",
      },
      jugendliche: {
        title: "Jugendlichi",
        range: "ca. 12 – 15 Jahr",
        description: "Spannend, aber ohni drastischi Gwalt.",
      },
      erwachsene: {
        title: "Erwachseni",
        range: "ab 16 Jahr",
        description: "D Sage i ihrer ganze düschtere Tüefi.",
      },
    },
    consentText:
      "Ich bi es Elterteil oder erziehigsberächtigt und bin iverstande mit dr Nutzig dur es Chind.",
    back: "Zrugg",
    start: "Reis starte",
    next: "Wiiter",
    saveError: "Profil hat nid chönne gspeicheret wärde. Bitte nomal probiere.",
    permissionsTitle: "Berächtigige",
    permissionsHint:
      "Dass SagaTrail dich unterwägs cha begleite, bruucht d App es paar Freigabe. Du chasch si jederziit i de Iistellige ändere.",
    permissions: {
      location: {
        title: "Standort",
        message:
          "Mir zeiged dir dini Position uf der Wanderkarte und verzelled d Sag passend zu dim Standort.",
        allow: "Standort erlaube",
      },
      microphone: {
        title: "Mikrofon",
        message:
          "Freihändig antworte: Sag eifach dini Entscheidig a Wägpünkt, statt z tippe.",
        allow: "Mikrofon erlaube",
      },
      motion: {
        title: "Bewegig & Fitness",
        message: "Mir zellet dini Schritt während dr Wanderig mit.",
        allow: "Bewegig erlaube",
      },
      notifications: {
        title: "Benachrichtigunge",
        message:
          "Mir erinnered dich a Abzwiigunge unterwägs, au wenn d App im Hindergrund lauft.",
        allow: "Benachrichtigunge erlaube",
      },
    },
    permissionSkip: "Überspringe",
    permissionStatusGranted: "Erlaubt",
    permissionStatusDenied: "Abgleent",
    permissionStatusPending: "Usstehend",
  },
  fr: {
    brandTagline: "Les légendes des Alpes, vivantes sur ton chemin",
    intro:
      "Tu marches en témoin à travers d'anciennes légendes suisses. Elles te sont racontées pendant que tu avances — pas à pas, lieu par lieu.",
    nameLabel: "Comment devons-nous t'appeler ?",
    namePlaceholder: "Ton prénom",
    stepOf: (step, total) => `Étape ${step} sur ${total}`,
    archetypeTitle: "Ton archétype",
    archetypeHint:
      "Ton archétype change le ton du récit et la façon dont tu es représenté·e — jamais l'issue de la légende.",
    archetypes: {
      reisende: {
        title: "Le/la Voyageur·euse",
        tagline: "Venu·e de loin vers la vallée",
        description:
          "Tu viens de loin et tu aides avec savoir et courage. Ton regard est celui d'un·e observateur·rice curieux·se.",
      },
      hueterin: {
        title: "Le/la Gardien·ne",
        tagline: "Lié·e à la nature",
        description:
          "Tu fais le lien entre les humains et le monde des esprits. Tu entends ce qui murmure entre les pierres.",
      },
      gewitzte: {
        title: "Le/la Rusé·e",
        tagline: "L'esprit plutôt que la force",
        description:
          "Tu résous par la ruse ce que d'autres tentent par la force. Là où le danger menace, tu cherches la faille.",
      },
      senn: {
        title: "Le/la Berger·ère d'alpage",
        tagline: "Enraciné·e à la montagne",
        description:
          "Tu connais l'alpage depuis toujours. Calme et expérimenté·e, tu lis les signes de la montagne.",
      },
    },
    cantonTitle: "Ta région d'origine",
    cantonHint:
      "Choisis ton canton d'origine. C'est d'ici que commence ton voyage à travers le monde des légendes.",
    languageStepTitle: "Ta langue",
    languageHint: "Dans quelle langue veux-tu que les légendes te soient racontées ?",
    languageNames: {
      gsw: "Suisse allemand",
      de: "Allemand",
      fr: "Français",
      it: "Italien",
      en: "Anglais",
      zh: "Mandarin",
      es: "Espagnol",
      pt: "Portugais",
      ru: "Russe",
    },
    ageTierTitle: "Tranche d'âge",
    ageTierHint: "Elle détermine l'intensité avec laquelle les légendes sont racontées.",
    ageTiers: {
      kinder: {
        title: "Enfants",
        range: "env. 6 – 11 ans",
        description: "Récits doux, motifs inquiétants atténués.",
      },
      jugendliche: {
        title: "Adolescent·e·s",
        range: "env. 12 – 15 ans",
        description: "Palpitant, mais sans violence explicite.",
      },
      erwachsene: {
        title: "Adultes",
        range: "dès 16 ans",
        description: "Les légendes dans toute leur profondeur sombre.",
      },
    },
    consentText:
      "Je suis un parent ou un·e représentant·e légal·e et j'autorise l'utilisation par un enfant.",
    back: "Retour",
    start: "Commencer le voyage",
    next: "Suivant",
    saveError: "Le profil n'a pas pu être enregistré. Merci de réessayer.",
    permissionsTitle: "Autorisations",
    permissionsHint:
      "Pour t'accompagner sur le chemin, SagaTrail a besoin de quelques autorisations. Tu peux les modifier à tout moment dans les réglages.",
    permissions: {
      location: {
        title: "Position",
        message:
          "Nous affichons ta position sur la carte de randonnée et racontons la légende selon l'endroit où tu te trouves.",
        allow: "Autoriser la position",
      },
      microphone: {
        title: "Microphone",
        message:
          "Réponds à voix haute aux points de décision, sans avoir à toucher l'écran.",
        allow: "Autoriser le microphone",
      },
      motion: {
        title: "Mouvement et forme",
        message: "Nous comptons tes pas pendant la randonnée.",
        allow: "Autoriser le mouvement",
      },
      notifications: {
        title: "Notifications",
        message:
          "Nous te rappelons les bifurcations en cours de route, même si l'app est en arrière-plan.",
        allow: "Autoriser les notifications",
      },
    },
    permissionSkip: "Ignorer",
    permissionStatusGranted: "Autorisé",
    permissionStatusDenied: "Refusé",
    permissionStatusPending: "En attente",
  },
  it: {
    brandTagline: "Le leggende delle Alpi, vive lungo il tuo cammino",
    intro:
      "Cammini come testimone attraverso antiche leggende svizzere. Ti vengono raccontate mentre procedi — passo dopo passo, luogo dopo luogo.",
    nameLabel: "Come possiamo chiamarti?",
    namePlaceholder: "Il tuo nome",
    stepOf: (step, total) => `Passo ${step} di ${total}`,
    archetypeTitle: "Il tuo archetipo",
    archetypeHint:
      "Il tuo archetipo cambia il tono del racconto e come vieni rappresentato/a — mai l'esito della leggenda.",
    archetypes: {
      reisende: {
        title: "Il/la Viaggiatore/rice",
        tagline: "Da fuori verso la valle",
        description:
          "Vieni da lontano e aiuti con sapienza e coraggio. Il tuo sguardo è quello di un/a osservatore/rice curioso/a.",
      },
      hueterin: {
        title: "Il/la Custode",
        tagline: "Legato/a alla natura",
        description:
          "Fai da tramite tra gli uomini e il mondo degli spiriti. Senti ciò che sussurra tra le pietre.",
      },
      gewitzte: {
        title: "L'Astuto/a",
        tagline: "Astuzia invece di lotta",
        description:
          "Risolvi con l'astuzia ciò che altri tentano con la forza. Dove incombe il pericolo, cerchi la falla.",
      },
      senn: {
        title: "Il/la Casaro/a alpino/a",
        tagline: "Radicato/a in montagna",
        description:
          "Conosci l'alpe da sempre. Calmo/a ed esperto/a, leggi i segni della montagna.",
      },
    },
    cantonTitle: "La tua regione d'origine",
    cantonHint:
      "Scegli il tuo cantone d'origine. Da qui inizia il tuo viaggio nel mondo delle leggende.",
    languageStepTitle: "La tua lingua",
    languageHint: "In quale lingua vuoi che ti vengano raccontate le leggende?",
    languageNames: {
      gsw: "Svizzero tedesco",
      de: "Tedesco",
      fr: "Francese",
      it: "Italiano",
      en: "Inglese",
      zh: "Mandarino",
      es: "Spagnolo",
      pt: "Portoghese",
      ru: "Russo",
    },
    ageTierTitle: "Fascia d'età",
    ageTierHint: "Determina quanto intensamente vengono raccontate le leggende.",
    ageTiers: {
      kinder: {
        title: "Bambini",
        range: "ca. 6 – 11 anni",
        description: "Racconti delicati, motivi inquietanti attenuati.",
      },
      jugendliche: {
        title: "Adolescenti",
        range: "ca. 12 – 15 anni",
        description: "Avvincente, ma senza violenza esplicita.",
      },
      erwachsene: {
        title: "Adulti",
        range: "dai 16 anni",
        description: "Le leggende in tutta la loro cupa profondità.",
      },
    },
    consentText:
      "Sono un genitore o tutore legale e acconsento all'uso da parte di un bambino.",
    back: "Indietro",
    start: "Inizia il viaggio",
    next: "Avanti",
    saveError: "Impossibile salvare il profilo. Riprova.",
    permissionsTitle: "Autorizzazioni",
    permissionsHint:
      "Per accompagnarti lungo il cammino, SagaTrail ha bisogno di alcune autorizzazioni. Puoi modificarle in qualsiasi momento nelle impostazioni.",
    permissions: {
      location: {
        title: "Posizione",
        message:
          "Mostriamo la tua posizione sulla mappa escursionistica e raccontiamo la leggenda in base al luogo in cui ti trovi.",
        allow: "Consenti posizione",
      },
      microphone: {
        title: "Microfono",
        message:
          "Rispondi a voce ai punti di decisione, senza dover toccare lo schermo.",
        allow: "Consenti microfono",
      },
      motion: {
        title: "Movimento e fitness",
        message: "Contiamo i tuoi passi durante l'escursione.",
        allow: "Consenti movimento",
      },
      notifications: {
        title: "Notifiche",
        message:
          "Ti ricordiamo le deviazioni lungo il percorso, anche se l'app è in background.",
        allow: "Consenti notifiche",
      },
    },
    permissionSkip: "Salta",
    permissionStatusGranted: "Consentito",
    permissionStatusDenied: "Rifiutato",
    permissionStatusPending: "In sospeso",
  },
  en: {
    brandTagline: "The legends of the Alps, alive along your way",
    intro:
      "You walk as a witness through ancient Swiss legends. They are told to you as you go — step by step, place by place.",
    nameLabel: "What should we call you?",
    namePlaceholder: "Your name",
    stepOf: (step, total) => `Step ${step} of ${total}`,
    archetypeTitle: "Your archetype",
    archetypeHint:
      "Your archetype changes the tone of the story and how you are portrayed — never the outcome of the legend.",
    archetypes: {
      reisende: {
        title: "The Traveller",
        tagline: "From afar, into the valley",
        description:
          "You come from far away and help with knowledge and courage. You see with the eyes of a curious observer.",
      },
      hueterin: {
        title: "The Guardian",
        tagline: "Bound to nature",
        description:
          "You mediate between people and the spirit world. You hear what whispers between the stones.",
      },
      gewitzte: {
        title: "The Trickster",
        tagline: "Wit over combat",
        description:
          "You solve with cunning what others try with force. Where danger looms, you look for the gap.",
      },
      senn: {
        title: "The Alpine Herder",
        tagline: "Rooted in the mountains",
        description:
          "You have known the alp forever. Calm and experienced, you read the signs of the mountains.",
      },
    },
    cantonTitle: "Your home region",
    cantonHint:
      "Choose your home canton. Your journey through the world of legends begins here.",
    languageStepTitle: "Your language",
    languageHint: "In which language should the legends be told to you?",
    languageNames: {
      gsw: "Swiss German",
      de: "German",
      fr: "French",
      it: "Italian",
      en: "English",
      zh: "Mandarin",
      es: "Spanish",
      pt: "Portuguese",
      ru: "Russian",
    },
    ageTierTitle: "Age tier",
    ageTierHint: "It determines how intensely the legends are told.",
    ageTiers: {
      kinder: {
        title: "Children",
        range: "approx. 6 – 11 years",
        description: "Gentle storytelling, unsettling motifs softened.",
      },
      jugendliche: {
        title: "Teenagers",
        range: "approx. 12 – 15 years",
        description: "Suspenseful, but without graphic violence.",
      },
      erwachsene: {
        title: "Adults",
        range: "16 years and up",
        description: "The legends in their full dark depth.",
      },
    },
    consentText:
      "I am a parent or legal guardian and I consent to use by a child.",
    back: "Back",
    start: "Begin the journey",
    next: "Next",
    saveError: "Profile could not be saved. Please try again.",
    permissionsTitle: "Permissions",
    permissionsHint:
      "To walk alongside you, SagaTrail needs a few permissions. You can change them anytime in settings.",
    permissions: {
      location: {
        title: "Location",
        message:
          "We show your position on the hiking map and narrate the legend based on where you are.",
        allow: "Allow location",
      },
      microphone: {
        title: "Microphone",
        message: "Answer decision points hands-free by speaking, instead of tapping.",
        allow: "Allow microphone",
      },
      motion: {
        title: "Motion & Fitness",
        message: "We count your steps during the hike.",
        allow: "Allow motion",
      },
      notifications: {
        title: "Notifications",
        message:
          "We remind you of turns along the way, even while the app runs in the background.",
        allow: "Allow notifications",
      },
    },
    permissionSkip: "Skip",
    permissionStatusGranted: "Granted",
    permissionStatusDenied: "Denied",
    permissionStatusPending: "Pending",
  },
  zh: {
    brandTagline: "阿尔卑斯山的传说，随你的脚步苏醒",
    intro:
      "你将作为见证者穿行于古老的瑞士传说之中。故事会随着你的前行被娓娓道来——一步一步，一处一处。",
    nameLabel: "我们该怎么称呼你？",
    namePlaceholder: "你的名字",
    stepOf: (step, total) => `第 ${step} 步，共 ${total} 步`,
    archetypeTitle: "你的原型",
    archetypeHint: "你的原型会改变叙事的基调以及你的形象——但绝不会改变传说的结局。",
    archetypes: {
      reisende: {
        title: "旅人",
        tagline: "从远方来到山谷",
        description: "你远道而来，以知识与勇气相助。你的目光如同一位好奇的观察者。",
      },
      hueterin: {
        title: "守护者",
        tagline: "与自然相连",
        description: "你在人类与灵界之间传递讯息。你能听见石头之间的低语。",
      },
      gewitzte: {
        title: "机智者",
        tagline: "智慧胜过蛮力",
        description: "别人用武力解决的事，你用智谋化解。危险将至时，你总能找到破绽。",
      },
      senn: {
        title: "牧人",
        tagline: "扎根于高山",
        description: "你自古便熟知这片高山牧场。沉稳而老练，你能读懂山峦的征兆。",
      },
    },
    cantonTitle: "你的家乡地区",
    cantonHint: "选择你的家乡州。你的传说之旅将从这里开始。",
    languageStepTitle: "你的语言",
    languageHint: "你希望用哪种语言聆听这些传说？",
    languageNames: {
      gsw: "瑞士德语",
      de: "德语",
      fr: "法语",
      it: "意大利语",
      en: "英语",
      zh: "中文",
      es: "西班牙语",
      pt: "葡萄牙语",
      ru: "俄语",
    },
    ageTierTitle: "年龄段",
    ageTierHint: "它决定了传说讲述的强度。",
    ageTiers: {
      kinder: {
        title: "儿童",
        range: "约 6 – 11 岁",
        description: "温和的叙事，弱化了令人不安的元素。",
      },
      jugendliche: {
        title: "青少年",
        range: "约 12 – 15 岁",
        description: "扣人心弦，但没有过度暴力。",
      },
      erwachsene: {
        title: "成人",
        range: "16 岁以上",
        description: "传说以其最深沉、最黑暗的一面呈现。",
      },
    },
    consentText: "我是家长或法定监护人，同意由儿童使用本应用。",
    back: "返回",
    start: "开始旅程",
    next: "下一步",
    saveError: "个人资料保存失败，请重试。",
    permissionsTitle: "权限",
    permissionsHint: "为了在路上陪伴你，SagaTrail 需要一些权限。你可以随时在设置中更改。",
    permissions: {
      location: {
        title: "位置",
        message: "我们会在徒步地图上显示你的位置，并根据你所在的位置讲述传说。",
        allow: "允许位置",
      },
      microphone: {
        title: "麦克风",
        message: "在决策点直接说出答案即可，无需点击屏幕。",
        allow: "允许麦克风",
      },
      motion: {
        title: "运动与健身",
        message: "我们会在徒步过程中统计你的步数。",
        allow: "允许运动",
      },
      notifications: {
        title: "通知",
        message: "即使应用在后台运行，我们也会提醒你路上的转弯。",
        allow: "允许通知",
      },
    },
    permissionSkip: "跳过",
    permissionStatusGranted: "已允许",
    permissionStatusDenied: "已拒绝",
    permissionStatusPending: "待处理",
  },
  es: {
    brandTagline: "Las leyendas de los Alpes, vivas en tu camino",
    intro:
      "Caminas como testigo a través de antiguas leyendas suizas. Se te van contando mientras avanzas — paso a paso, lugar a lugar.",
    nameLabel: "¿Cómo debemos llamarte?",
    namePlaceholder: "Tu nombre",
    stepOf: (step, total) => `Paso ${step} de ${total}`,
    archetypeTitle: "Tu arquetipo",
    archetypeHint:
      "Tu arquetipo cambia el tono del relato y cómo se te representa — nunca el desenlace de la leyenda.",
    archetypes: {
      reisende: {
        title: "El/la Viajero/a",
        tagline: "Desde lejos, hacia el valle",
        description:
          "Vienes de muy lejos y ayudas con sabiduría y valentía. Tu mirada es la de un/a observador/a curioso/a.",
      },
      hueterin: {
        title: "El/la Guardián/a",
        tagline: "Vinculado/a a la naturaleza",
        description:
          "Median entre las personas y el mundo espiritual. Oyes lo que susurra entre las piedras.",
      },
      gewitzte: {
        title: "El/la Astuto/a",
        tagline: "Ingenio antes que lucha",
        description:
          "Resuelves con astucia lo que otros intentan con la fuerza. Donde acecha el peligro, buscas la grieta.",
      },
      senn: {
        title: "El/la Pastor/a alpino/a",
        tagline: "Arraigado/a en la montaña",
        description:
          "Conoces el alpe desde siempre. Tranquilo/a y experimentado/a, lees las señales de la montaña.",
      },
    },
    cantonTitle: "Tu región de origen",
    cantonHint:
      "Elige tu cantón de origen. Tu viaje por el mundo de las leyendas comienza aquí.",
    languageStepTitle: "Tu idioma",
    languageHint: "¿En qué idioma quieres que se te cuenten las leyendas?",
    languageNames: {
      gsw: "Suizo alemán",
      de: "Alemán",
      fr: "Francés",
      it: "Italiano",
      en: "Inglés",
      zh: "Mandarín",
      es: "Español",
      pt: "Portugués",
      ru: "Ruso",
    },
    ageTierTitle: "Grupo de edad",
    ageTierHint: "Determina la intensidad con la que se narran las leyendas.",
    ageTiers: {
      kinder: {
        title: "Niños",
        range: "aprox. 6 – 11 años",
        description: "Narración suave, motivos inquietantes atenuados.",
      },
      jugendliche: {
        title: "Adolescentes",
        range: "aprox. 12 – 15 años",
        description: "Emocionante, pero sin violencia explícita.",
      },
      erwachsene: {
        title: "Adultos",
        range: "a partir de 16 años",
        description: "Las leyendas en toda su oscura profundidad.",
      },
    },
    consentText:
      "Soy madre, padre o tutor/a legal y doy mi consentimiento para el uso por parte de un/a menor.",
    back: "Atrás",
    start: "Comenzar el viaje",
    next: "Siguiente",
    saveError: "No se pudo guardar el perfil. Inténtalo de nuevo.",
    permissionsTitle: "Permisos",
    permissionsHint:
      "Para acompañarte en el camino, SagaTrail necesita algunos permisos. Puedes cambiarlos en cualquier momento en los ajustes.",
    permissions: {
      location: {
        title: "Ubicación",
        message:
          "Mostramos tu posición en el mapa de senderismo y narramos la leyenda según dónde te encuentres.",
        allow: "Permitir ubicación",
      },
      microphone: {
        title: "Micrófono",
        message: "Responde a los puntos de decisión hablando, sin tocar la pantalla.",
        allow: "Permitir micrófono",
      },
      motion: {
        title: "Movimiento y forma física",
        message: "Contamos tus pasos durante la caminata.",
        allow: "Permitir movimiento",
      },
      notifications: {
        title: "Notificaciones",
        message:
          "Te recordamos los desvíos en el camino, incluso si la app está en segundo plano.",
        allow: "Permitir notificaciones",
      },
    },
    permissionSkip: "Omitir",
    permissionStatusGranted: "Concedido",
    permissionStatusDenied: "Denegado",
    permissionStatusPending: "Pendiente",
  },
  pt: {
    brandTagline: "As lendas dos Alpes, vivas ao longo do seu caminho",
    intro:
      "Você caminha como testemunha por antigas lendas suíças. Elas são contadas enquanto você avança — passo a passo, lugar a lugar.",
    nameLabel: "Como devemos te chamar?",
    namePlaceholder: "Seu nome",
    stepOf: (step, total) => `Etapa ${step} de ${total}`,
    archetypeTitle: "Seu arquétipo",
    archetypeHint:
      "Seu arquétipo muda o tom da narrativa e como você é retratado — nunca o desfecho da lenda.",
    archetypes: {
      reisende: {
        title: "O/a Viajante",
        tagline: "De longe até o vale",
        description:
          "Você vem de longe e ajuda com conhecimento e coragem. Seu olhar é o de um/a observador/a curioso/a.",
      },
      hueterin: {
        title: "O/a Guardião/ã",
        tagline: "Ligado/a à natureza",
        description:
          "Você faz a ponte entre as pessoas e o mundo espiritual. Você ouve o que sussurra entre as pedras.",
      },
      gewitzte: {
        title: "O/a Astuto/a",
        tagline: "Esperteza em vez de luta",
        description:
          "Você resolve com astúcia o que outros tentam com força. Onde o perigo espreita, você procura a brecha.",
      },
      senn: {
        title: "O/a Pastor/a alpino/a",
        tagline: "Enraizado/a na montanha",
        description:
          "Você conhece o alpe desde sempre. Calmo/a e experiente, você lê os sinais da montanha.",
      },
    },
    cantonTitle: "Sua região de origem",
    cantonHint:
      "Escolha seu cantão de origem. Sua jornada pelo mundo das lendas começa aqui.",
    languageStepTitle: "Seu idioma",
    languageHint: "Em qual idioma as lendas devem ser contadas para você?",
    languageNames: {
      gsw: "Suíço-alemão",
      de: "Alemão",
      fr: "Francês",
      it: "Italiano",
      en: "Inglês",
      zh: "Mandarim",
      es: "Espanhol",
      pt: "Português",
      ru: "Russo",
    },
    ageTierTitle: "Faixa etária",
    ageTierHint: "Ela determina a intensidade com que as lendas são contadas.",
    ageTiers: {
      kinder: {
        title: "Crianças",
        range: "aprox. 6 – 11 anos",
        description: "Narrativa suave, motivos perturbadores suavizados.",
      },
      jugendliche: {
        title: "Adolescentes",
        range: "aprox. 12 – 15 anos",
        description: "Emocionante, mas sem violência explícita.",
      },
      erwachsene: {
        title: "Adultos",
        range: "a partir de 16 anos",
        description: "As lendas em toda a sua profundidade sombria.",
      },
    },
    consentText:
      "Sou pai, mãe ou responsável legal e autorizo o uso por uma criança.",
    back: "Voltar",
    start: "Começar a jornada",
    next: "Avançar",
    saveError: "Não foi possível salvar o perfil. Tente novamente.",
    permissionsTitle: "Permissões",
    permissionsHint:
      "Para te acompanhar pelo caminho, o SagaTrail precisa de algumas permissões. Você pode alterá-las a qualquer momento nas configurações.",
    permissions: {
      location: {
        title: "Localização",
        message:
          "Mostramos sua posição no mapa da trilha e narramos a lenda de acordo com onde você está.",
        allow: "Permitir localização",
      },
      microphone: {
        title: "Microfone",
        message: "Responda aos pontos de decisão falando, sem precisar tocar na tela.",
        allow: "Permitir microfone",
      },
      motion: {
        title: "Movimento e fitness",
        message: "Contamos seus passos durante a caminhada.",
        allow: "Permitir movimento",
      },
      notifications: {
        title: "Notificações",
        message:
          "Lembramos você das bifurcações pelo caminho, mesmo com o app em segundo plano.",
        allow: "Permitir notificações",
      },
    },
    permissionSkip: "Pular",
    permissionStatusGranted: "Concedido",
    permissionStatusDenied: "Negado",
    permissionStatusPending: "Pendente",
  },
  ru: {
    brandTagline: "Легенды Альп, оживающие на твоём пути",
    intro:
      "Ты идёшь свидетелем сквозь древние швейцарские легенды. Они рассказываются по мере твоего продвижения — шаг за шагом, место за местом.",
    nameLabel: "Как нам к тебе обращаться?",
    namePlaceholder: "Твоё имя",
    stepOf: (step, total) => `Шаг ${step} из ${total}`,
    archetypeTitle: "Твой архетип",
    archetypeHint:
      "Архетип меняет тон повествования и то, как тебя изображают — но никогда не меняет исход легенды.",
    archetypes: {
      reisende: {
        title: "Путешественник(-ца)",
        tagline: "Издалека в долину",
        description:
          "Ты приходишь издалека и помогаешь знаниями и смелостью. Твой взгляд — взгляд любопытного наблюдателя.",
      },
      hueterin: {
        title: "Хранитель(-ница)",
        tagline: "Связан(а) с природой",
        description:
          "Ты соединяешь людей и духовный мир. Ты слышишь то, что шепчут камни.",
      },
      gewitzte: {
        title: "Хитрец(-ица)",
        tagline: "Смекалка вместо борьбы",
        description:
          "Ты решаешь хитростью то, с чем другие пытаются справиться силой. Там, где таится опасность, ты ищешь лазейку.",
      },
      senn: {
        title: "Альпийский(-ая) пастух(-шка)",
        tagline: "Укоренён(а) в горах",
        description:
          "Ты знаешь альпийские пастбища с давних пор. Спокойный(ая) и опытный(ая), ты читаешь знаки горы.",
      },
    },
    cantonTitle: "Твой родной регион",
    cantonHint:
      "Выбери свой родной кантон. Здесь начинается твоё путешествие по миру легенд.",
    languageStepTitle: "Твой язык",
    languageHint: "На каком языке рассказывать тебе легенды?",
    languageNames: {
      gsw: "Швейцарский немецкий",
      de: "Немецкий",
      fr: "Французский",
      it: "Итальянский",
      en: "Английский",
      zh: "Китайский",
      es: "Испанский",
      pt: "Португальский",
      ru: "Русский",
    },
    ageTierTitle: "Возрастная группа",
    ageTierHint: "Она определяет, насколько интенсивно рассказываются легенды.",
    ageTiers: {
      kinder: {
        title: "Дети",
        range: "примерно 6–11 лет",
        description: "Мягкое повествование, тревожные мотивы смягчены.",
      },
      jugendliche: {
        title: "Подростки",
        range: "примерно 12–15 лет",
        description: "Захватывающе, но без явного насилия.",
      },
      erwachsene: {
        title: "Взрослые",
        range: "от 16 лет",
        description: "Легенды во всей их мрачной глубине.",
      },
    },
    consentText:
      "Я являюсь родителем или законным опекуном и разрешаю использование ребёнком.",
    back: "Назад",
    start: "Начать путешествие",
    next: "Далее",
    saveError: "Не удалось сохранить профиль. Попробуйте снова.",
    permissionsTitle: "Разрешения",
    permissionsHint:
      "Чтобы сопровождать тебя в пути, SagaTrail нужно несколько разрешений. Их можно изменить в любой момент в настройках.",
    permissions: {
      location: {
        title: "Геолокация",
        message:
          "Мы показываем твоё местоположение на карте маршрута и рассказываем легенду в зависимости от того, где ты находишься.",
        allow: "Разрешить геолокацию",
      },
      microphone: {
        title: "Микрофон",
        message: "Отвечай на моменты выбора голосом, не касаясь экрана.",
        allow: "Разрешить микрофон",
      },
      motion: {
        title: "Движение и фитнес",
        message: "Мы считаем твои шаги во время похода.",
        allow: "Разрешить движение",
      },
      notifications: {
        title: "Уведомления",
        message:
          "Мы напоминаем о поворотах в пути, даже если приложение работает в фоновом режиме.",
        allow: "Разрешить уведомления",
      },
    },
    permissionSkip: "Пропустить",
    permissionStatusGranted: "Разрешено",
    permissionStatusDenied: "Отклонено",
    permissionStatusPending: "Ожидание",
  },
};

export const useOnboardingStrings = createUseStrings(ONBOARDING_STRINGS);
