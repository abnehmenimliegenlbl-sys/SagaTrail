import { Archetype } from "../types";

/**
 * Mehrsprachige Erzaehl-Inhalte fuer die Story-Engine.
 *
 * In diesem Build ist die Erzaehlung fest hinterlegt (keine KI-Uebersetzung).
 * Jede unterstuetzte Sprache hat ein eigenes StoryPack sowie uebersetzte
 * Sagen-Zusammenfassungen. Der App-Rahmen (Buttons, Labels) bleibt deutsch;
 * nur die live erzaehlte Sage folgt der gewaehlten Sprache.
 */

export type Lang = "de" | "gsw" | "fr" | "it" | "en" | "zh" | "es" | "pt";

const KNOWN_LANGS: Lang[] = ["de", "gsw", "fr", "it", "en", "zh", "es", "pt"];

/** Ordnet den Sprachcode einer BCP-47-Stimme fuer expo-speech zu. */
export const SPEECH_LOCALE: Record<Lang, string> = {
  de: "de-DE",
  gsw: "de-CH", // Kein echtes Schweizerdeutsch-TTS — de-CH ist die naechste Stimme
  fr: "fr-FR",
  it: "it-IT",
  en: "en-US",
  zh: "zh-CN",
  es: "es-ES",
  pt: "pt-BR",
};

/** Faellt bei unbekannten Codes sauber auf Deutsch zurueck. */
export function resolveLang(code: string | undefined): Lang {
  return KNOWN_LANGS.includes(code as Lang) ? (code as Lang) : "de";
}

/**
 * Sprache, in der Story-Text tatsaechlich angefordert/angezeigt werden soll.
 *
 * Fuer Premium-Nutzer:innen (KI-Erzaehlstimme via ElevenLabs) wird
 * Schweizerdeutsch (gsw) NIE als Dialekt-Text verwendet: die Schweizer
 * Faerbung kommt dort ausschliesslich ueber die Stimmwahl, der Text bleibt
 * Hochdeutsch (siehe api-server/src/lib/elevenlabs.ts). Fuer die kostenlose
 * erste Wanderung (on-device expo-speech, kein ElevenLabs) bleibt die
 * bisherige Dialekt-Text-Darstellung mit de-CH-Annaeherung unveraendert.
 */
export function effectiveStoryLanguage(language: string, premium: boolean): string {
  return premium && language === "gsw" ? "de" : language;
}

export interface DecisionOptionText {
  label: string;
  archetypeHint: string;
  tone: string;
}

export interface StoryPack {
  archetypeLens: Record<Archetype, string>;
  ch1: (canton: string, title: string, lens: string) => string;
  ch2: (summary: string) => string;
  ch3Adult: string;
  ch3Kinder: string;
  ch3Question: string;
  ch3Options: DecisionOptionText[];
  ch4: string;
  ch5Text: string;
  ch5Question: string;
  ch5Options: DecisionOptionText[];
  chFinal: string;
  // Naht­loser Navigationshinweis, aus echter Routen-Geometrie abgeleitet
  // (siehe navigationCues.ts) und in den laufenden Erzaehltext eingeflochten.
  navCue: (direction: "links" | "rechts", landmark: string) => string;
}

// Die tone-Werte bleiben ueber alle Sprachen als stabile Kennungen deutsch.
export const STORY_PACKS: Record<Lang, StoryPack> = {
  de: {
    archetypeLens: {
      reisende:
        "Als Reisende kommst du von aussen. Dein wacher Blick misst jede Bewegung im Nebel.",
      hueterin:
        "Als Hüter bist du dem Land verbunden. Du vernimmst das Flüstern zwischen den Steinen.",
      gewitzte:
        "Als Gewitzte suchst du die Lücke in jeder Drohung. Wo andere Angst spüren, suchst du den Ausweg.",
      senn: "Als Senn kennst du den Berg. Du liest die Zeichen ruhig, so wie du es seit jeher tust.",
    },
    ch1: (canton, title, lens) =>
      `Der Pfad windet sich ins Herz von ${canton}. Kalte Luft streicht dir über das Gesicht, und du spürst, wie alt dieser Ort ist. ${lens} Die Sage von ${title} liegt greifbar in der Luft.`,
    ch2: (summary) =>
      `Vor dir öffnet sich die Szenerie. ${summary} Du bist nur Zeuge dieses uralten Geschehens — und doch zieht es dich hinein.`,
    ch3Adult:
      "Ein tiefer Schatten fällt über den Weg, und ein dumpfes Grollen steigt aus dem Fels. Etwas bewegt sich am Rand deines Blicks.",
    ch3Kinder:
      "Ein Schatten gleitet über den Weg. Er wirkt fremd, aber nicht böse. Etwas bewegt sich am Rand deines Blicks.",
    ch3Question: "Wie begegnest du dem, was sich nähert?",
    ch3Options: [
      { label: "Ich trete einen Schritt vor und halte stand.", archetypeHint: "Mut der Reisenden", tone: "mutig" },
      { label: "Ich bleibe still und beobachte.", archetypeHint: "Ruhe des Sennen", tone: "bedacht" },
      { label: "Ich suche im Schatten nach einem Zeichen.", archetypeHint: "List der Gewitzten", tone: "wachsam" },
    ],
    ch4: "Das Grollen verstummt. Was hier einst geschah, entfaltet sich vor deinen Augen, unabänderlich wie der Lauf des Wassers. Du erkennst: Die Legende ist mehr als ein Märchen — sie atmet noch immer in diesem Tal.",
    ch5Text:
      "Ein letztes Mal wendet sich das Geschehen dir zu, als wolle es dich fragen, was du mitnimmst von diesem Ort.",
    ch5Question: "Was trägst du aus dieser Begegnung fort?",
    ch5Options: [
      { label: "Ehrfurcht vor dem, was größer ist als ich.", archetypeHint: "Demut", tone: "ehrfuerchtig" },
      { label: "Die Gewissheit, dass Geschichten wahr sein können.", archetypeHint: "Erkenntnis", tone: "nachdenklich" },
    ],
    chFinal:
      "Der Moment vergeht. Die Natur nimmt ihren gewohnten Lauf wieder auf, der Wind legt sich. Du ziehst weiter, gezeichnet von dieser Begegnung, und das Tal behält sein Geheimnis — bis zur nächsten, die vorbeikommt.",
    navCue: (direction, landmark) =>
      `Auf dem Weg zur Sage von ${landmark} hältst du dich an der nächsten Weggabelung ${direction}.`,
  },

  gsw: {
    archetypeLens: {
      reisende:
        "Als Reisende chunnsch vo usse. Din wach Blick misst jedi Bewegig im Näbel.",
      hueterin:
        "Als Hüter bisch em Land verbunde. Du ghörsch s Flüschtere zwüschet de Stei.",
      gewitzte:
        "Als Gwitzte suechsch d Lugge i jedere Drohig. Wo anderi Angst händ, suechsch du de Uswäg.",
      senn: "Als Senn kennsch de Bärg. Du liesisch d Zeiche rueig, so wie du s scho immer machsch.",
    },
    ch1: (canton, title, lens) =>
      `De Pfad windet sich is Härz vo ${canton}. Chalti Luft striicht dir übers Gsicht, und du gspürsch, wie alt dä Ort isch. ${lens} D Sage vo ${title} liit greifbar i de Luft.`,
    ch2: (summary) =>
      `Vor dir gaht d Szenerie uf. ${summary} Du bisch nur Züüge vo dem uralte Gscheh — und trotzdem ziehts di ine.`,
    ch3Adult:
      "En tüüfe Schatte fallt über de Wäg, und es dumpfs Grolle stiigt us em Fels. Öppis bewegt sich am Rand vo dim Blick.",
    ch3Kinder:
      "En Schatte gliitet über de Wäg. Er wirkt fremd, aber nöd bös. Öppis bewegt sich am Rand vo dim Blick.",
    ch3Question: "Wie begegnisch dem, wo sich nöcheret?",
    ch3Options: [
      { label: "Ich tritte en Schritt vor und halt stand.", archetypeHint: "Muet vo de Reisende", tone: "mutig" },
      { label: "Ich bliib still und lueg zue.", archetypeHint: "Rueh vom Senn", tone: "bedacht" },
      { label: "Ich sueche im Schatte nach eme Zeiche.", archetypeHint: "List vo de Gwitzte", tone: "wachsam" },
    ],
    ch4: "S Grolle verstummt. Was da einisch passiert isch, entfaltet sich vor dine Auge, unabänderlich wie de Lauf vom Wasser. Du merksch: D Legände isch meh als es Märli — si atmet immer no i dem Tal.",
    ch5Text:
      "Es letschts Mal wendet sich s Gscheh dir zue, als wett's di frage, was du mitnimmsch vo dem Ort.",
    ch5Question: "Was nimmsch us dere Begägnig mit?",
    ch5Options: [
      { label: "Ehrfurcht vor dem, wo grösser isch als ich.", archetypeHint: "Demuet", tone: "ehrfuerchtig" },
      { label: "D Gwüssheit, dass Gschichte wahr chönd sii.", archetypeHint: "Erkenntnis", tone: "nachdenklich" },
    ],
    chFinal:
      "De Momänt vergaht. D Natur nimmt ihre gwöhnti Lauf wieder uf, de Wind leit sich. Du ziehsch witer, zeichnet vo dere Begägnig, und s Tal behaltet sis Gheimnis — bis zur nächschte, wo verbicho chunnt.",
    navCue: (direction, landmark) =>
      `Uf em Wäg zur Sage vo ${landmark} haltsch di a de nächschte Wäggable ${direction === "links" ? "links" : "rächts"}.`,
  },

  fr: {
    archetypeLens: {
      reisende:
        "En tant que Voyageur·se, tu viens de l'extérieur. Ton regard vif mesure chaque mouvement dans la brume.",
      hueterin:
        "En tant que Gardien·ne, tu es lié·e à cette terre. Tu perçois le murmure entre les pierres.",
      gewitzte:
        "En tant que Rusé·e, tu cherches la faille dans chaque menace. Là où d'autres ont peur, tu cherches l'issue.",
      senn: "En tant qu'Armailli, tu connais la montagne. Tu lis les signes avec calme, comme tu l'as toujours fait.",
    },
    ch1: (canton, title, lens) =>
      `Le sentier s'enfonce au cœur de ${canton}. Un air froid te caresse le visage, et tu sens combien ce lieu est ancien. ${lens} La légende de ${title} flotte, palpable, dans l'air.`,
    ch2: (summary) =>
      `Devant toi, la scène se dévoile. ${summary} Tu n'es que témoin de cet événement immémorial — et pourtant il t'attire.`,
    ch3Adult:
      "Une ombre profonde tombe sur le chemin, et un grondement sourd monte de la roche. Quelque chose bouge au bord de ton regard.",
    ch3Kinder:
      "Une ombre glisse sur le chemin. Elle semble étrange, mais pas méchante. Quelque chose bouge au bord de ton regard.",
    ch3Question: "Comment fais-tu face à ce qui approche ?",
    ch3Options: [
      { label: "Je fais un pas en avant et je tiens bon.", archetypeHint: "Courage du Voyageur", tone: "mutig" },
      { label: "Je reste immobile et j'observe.", archetypeHint: "Calme de l'Armailli", tone: "bedacht" },
      { label: "Je cherche un signe dans l'ombre.", archetypeHint: "Ruse du Rusé", tone: "wachsam" },
    ],
    ch4: "Le grondement se tait. Ce qui advint jadis ici se déploie sous tes yeux, immuable comme le cours de l'eau. Tu le comprends : la légende est plus qu'un conte — elle respire encore dans cette vallée.",
    ch5Text:
      "Une dernière fois, l'événement se tourne vers toi, comme pour te demander ce que tu emportes de ce lieu.",
    ch5Question: "Que retiens-tu de cette rencontre ?",
    ch5Options: [
      { label: "Le respect pour ce qui est plus grand que moi.", archetypeHint: "Humilité", tone: "ehrfuerchtig" },
      { label: "La certitude que les histoires peuvent être vraies.", archetypeHint: "Révélation", tone: "nachdenklich" },
    ],
    chFinal:
      "L'instant passe. La nature reprend son cours habituel, le vent retombe. Tu poursuis ta route, marqué·e par cette rencontre, et la vallée garde son secret — jusqu'à la prochaine personne qui passera.",
    navCue: (direction, landmark) =>
      `Pour atteindre la légende de ${landmark}, garde ta ${direction === "links" ? "gauche" : "droite"} à la prochaine bifurcation.`,
  },

  it: {
    archetypeLens: {
      reisende:
        "Come Viaggiatore·trice vieni da fuori. Il tuo sguardo attento misura ogni movimento nella nebbia.",
      hueterin:
        "Come Custode sei legato·a a questa terra. Percepisci il sussurro tra le pietre.",
      gewitzte:
        "Come Astuto·a cerchi la falla in ogni minaccia. Dove altri provano paura, tu cerchi la via d'uscita.",
      senn: "Come Malgaro·a conosci la montagna. Leggi i segni con calma, come hai sempre fatto.",
    },
    ch1: (canton, title, lens) =>
      `Il sentiero si inoltra nel cuore di ${canton}. Un'aria fredda ti sfiora il viso e senti quanto sia antico questo luogo. ${lens} La leggenda di ${title} aleggia palpabile nell'aria.`,
    ch2: (summary) =>
      `Davanti a te la scena si apre. ${summary} Sei soltanto testimone di questo evento antichissimo — eppure ti attira dentro.`,
    ch3Adult:
      "Un'ombra profonda cala sul cammino e un cupo brontolio sale dalla roccia. Qualcosa si muove al margine del tuo sguardo.",
    ch3Kinder:
      "Un'ombra scivola sul cammino. Sembra estranea, ma non malvagia. Qualcosa si muove al margine del tuo sguardo.",
    ch3Question: "Come affronti ciò che si avvicina?",
    ch3Options: [
      { label: "Faccio un passo avanti e tengo duro.", archetypeHint: "Coraggio del Viaggiatore", tone: "mutig" },
      { label: "Resto immobile e osservo.", archetypeHint: "Calma del Malgaro", tone: "bedacht" },
      { label: "Cerco un segno nell'ombra.", archetypeHint: "Astuzia dell'Astuto", tone: "wachsam" },
    ],
    ch4: "Il brontolio tace. Ciò che un tempo accadde qui si dispiega davanti ai tuoi occhi, immutabile come il corso dell'acqua. Lo capisci: la leggenda è più di una fiaba — respira ancora in questa valle.",
    ch5Text:
      "Un'ultima volta l'evento si volge verso di te, come a chiederti cosa porti via da questo luogo.",
    ch5Question: "Cosa porti via da questo incontro?",
    ch5Options: [
      { label: "Il rispetto per ciò che è più grande di me.", archetypeHint: "Umiltà", tone: "ehrfuerchtig" },
      { label: "La certezza che le storie possano essere vere.", archetypeHint: "Rivelazione", tone: "nachdenklich" },
    ],
    chFinal:
      "L'attimo passa. La natura riprende il suo corso consueto, il vento si placa. Prosegui il cammino, segnato·a da questo incontro, e la valle custodisce il suo segreto — fino alla prossima persona che passerà.",
    navCue: (direction, landmark) =>
      `Per raggiungere la leggenda di ${landmark}, tieni la ${direction === "links" ? "sinistra" : "destra"} al prossimo bivio.`,
  },

  en: {
    archetypeLens: {
      reisende:
        "As a Traveller you come from outside. Your keen eye measures every movement in the mist.",
      hueterin:
        "As a Keeper you are bound to this land. You hear the whisper between the stones.",
      gewitzte:
        "As a Cunning one you seek the gap in every threat. Where others feel fear, you look for the way out.",
      senn: "As an Alpine Herder you know the mountain. You read the signs calmly, as you always have.",
    },
    ch1: (canton, title, lens) =>
      `The path winds into the heart of ${canton}. Cold air brushes your face, and you sense how old this place is. ${lens} The legend of ${title} hangs tangible in the air.`,
    ch2: (summary) =>
      `The scene opens before you. ${summary} You are only a witness to this ancient event — and yet it draws you in.`,
    ch3Adult:
      "A deep shadow falls across the path, and a dull rumble rises from the rock. Something moves at the edge of your sight.",
    ch3Kinder:
      "A shadow glides across the path. It seems strange, but not evil. Something moves at the edge of your sight.",
    ch3Question: "How do you face what approaches?",
    ch3Options: [
      { label: "I step forward and hold my ground.", archetypeHint: "Courage of the Traveller", tone: "mutig" },
      { label: "I stay still and watch.", archetypeHint: "Calm of the Herder", tone: "bedacht" },
      { label: "I search the shadow for a sign.", archetypeHint: "Cunning of the Sly", tone: "wachsam" },
    ],
    ch4: "The rumble falls silent. What once happened here unfolds before your eyes, unchangeable as the flow of water. You realise: the legend is more than a fairy tale — it still breathes in this valley.",
    ch5Text:
      "One last time the event turns towards you, as if to ask what you take away from this place.",
    ch5Question: "What do you carry away from this encounter?",
    ch5Options: [
      { label: "Awe for what is greater than I am.", archetypeHint: "Humility", tone: "ehrfuerchtig" },
      { label: "The certainty that stories can be true.", archetypeHint: "Insight", tone: "nachdenklich" },
    ],
    chFinal:
      "The moment passes. Nature resumes its usual course, the wind settles. You move on, marked by this encounter, and the valley keeps its secret — until the next person who passes by.",
    navCue: (direction, landmark) =>
      `To reach the legend of ${landmark}, keep ${direction === "links" ? "left" : "right"} at the next fork.`,
  },

  zh: {
    archetypeLens: {
      reisende: "作为旅人，你来自远方。你警觉的目光丈量着雾中的每一次动静。",
      hueterin: "作为守护者，你与这片土地相连。你听得见石缝间的低语。",
      gewitzte: "作为机敏者，你在每一次威胁中寻找缝隙。别人感到恐惧的地方，你寻找出路。",
      senn: "作为山间牧人，你熟悉这座山。你像一直以来那样，平静地读懂种种征兆。",
    },
    ch1: (canton, title, lens) =>
      `小径蜿蜒，通向${canton}的深处。冷风拂过你的脸庞，你感到这个地方何其古老。${lens}关于${title}的传说，仿佛触手可及地悬浮在空气中。`,
    ch2: (summary) =>
      `眼前的景象徐徐展开。${summary}你只是这桩远古之事的见证者——然而它却将你牵引其中。`,
    ch3Adult:
      "一道浓重的阴影落在路上，低沉的轰鸣从岩石中升起。有什么东西在你视线的边缘移动。",
    ch3Kinder:
      "一道阴影滑过小路。它看上去陌生，却并不邪恶。有什么东西在你视线的边缘移动。",
    ch3Question: "你如何面对正在靠近的东西？",
    ch3Options: [
      { label: "我向前一步，稳稳站定。", archetypeHint: "旅人的勇气", tone: "mutig" },
      { label: "我静止不动，默默观察。", archetypeHint: "牧人的沉静", tone: "bedacht" },
      { label: "我在阴影中寻找一个征兆。", archetypeHint: "机敏者的机智", tone: "wachsam" },
    ],
    ch4: "轰鸣归于寂静。曾在此发生的一切在你眼前展开，像流水的去向一样不可更改。你明白了：这传说不只是童话——它至今仍在这山谷中呼吸。",
    ch5Text: "这桩往事最后一次转向你，仿佛要问你从这个地方带走了什么。",
    ch5Question: "你从这次相遇中带走了什么？",
    ch5Options: [
      { label: "对比我更宏大之物的敬畏。", archetypeHint: "谦卑", tone: "ehrfuerchtig" },
      { label: "故事也可能是真的这份笃定。", archetypeHint: "领悟", tone: "nachdenklich" },
    ],
    chFinal:
      "这一刻过去了。自然重新回到它惯常的轨迹，风也平息下来。你继续前行，被这次相遇留下印记，而山谷守着它的秘密——直到下一个路过的人到来。",
    navCue: (direction, landmark) =>
      `为了到达${landmark}的传说，在下一个岔路口靠${direction === "links" ? "左" : "右"}。`,
  },

  es: {
    archetypeLens: {
      reisende:
        "Como Viajero·a vienes de fuera. Tu mirada atenta mide cada movimiento en la niebla.",
      hueterin:
        "Como Guardián·a estás ligado·a a esta tierra. Percibes el susurro entre las piedras.",
      gewitzte:
        "Como Astuto·a buscas la grieta en cada amenaza. Donde otros sienten miedo, tú buscas la salida.",
      senn: "Como Pastor·a de los Alpes conoces la montaña. Lees las señales con calma, como siempre lo has hecho.",
    },
    ch1: (canton, title, lens) =>
      `El sendero se adentra en el corazón de ${canton}. Un aire frío te roza el rostro y sientes lo antiguo que es este lugar. ${lens} La leyenda de ${title} flota palpable en el aire.`,
    ch2: (summary) =>
      `Ante ti se abre la escena. ${summary} Solo eres testigo de este suceso ancestral — y aun así te atrae hacia dentro.`,
    ch3Adult:
      "Una sombra profunda cae sobre el camino, y un sordo retumbar sube de la roca. Algo se mueve al borde de tu mirada.",
    ch3Kinder:
      "Una sombra se desliza por el camino. Parece extraña, pero no malvada. Algo se mueve al borde de tu mirada.",
    ch3Question: "¿Cómo enfrentas lo que se acerca?",
    ch3Options: [
      { label: "Doy un paso al frente y me mantengo firme.", archetypeHint: "Valor del Viajero", tone: "mutig" },
      { label: "Me quedo quieto·a y observo.", archetypeHint: "Calma del Pastor", tone: "bedacht" },
      { label: "Busco una señal en la sombra.", archetypeHint: "Astucia del Astuto", tone: "wachsam" },
    ],
    ch4: "El retumbar enmudece. Lo que una vez ocurrió aquí se despliega ante tus ojos, inmutable como el curso del agua. Lo comprendes: la leyenda es más que un cuento — todavía respira en este valle.",
    ch5Text:
      "Una última vez el suceso se vuelve hacia ti, como si quisiera preguntarte qué te llevas de este lugar.",
    ch5Question: "¿Qué te llevas de este encuentro?",
    ch5Options: [
      { label: "Reverencia por lo que es más grande que yo.", archetypeHint: "Humildad", tone: "ehrfuerchtig" },
      { label: "La certeza de que las historias pueden ser ciertas.", archetypeHint: "Revelación", tone: "nachdenklich" },
    ],
    chFinal:
      "El instante pasa. La naturaleza retoma su curso habitual, el viento amaina. Sigues tu camino, marcado·a por este encuentro, y el valle guarda su secreto — hasta la próxima persona que pase.",
    navCue: (direction, landmark) =>
      `Para llegar a la leyenda de ${landmark}, mantente a la ${direction === "links" ? "izquierda" : "derecha"} en la próxima bifurcación.`,
  },

  pt: {
    archetypeLens: {
      reisende:
        "Como Viajante, você vem de fora. Seu olhar atento mede cada movimento na névoa.",
      hueterin:
        "Como Guardião·ã, você está ligado·a a esta terra. Percebe o sussurro entre as pedras.",
      gewitzte:
        "Como Astuto·a, você procura a brecha em cada ameaça. Onde outros sentem medo, você busca a saída.",
      senn: "Como Pastor·a dos Alpes, você conhece a montanha. Lê os sinais com calma, como sempre fez.",
    },
    ch1: (canton, title, lens) =>
      `A trilha serpenteia até o coração de ${canton}. Um ar frio roça o seu rosto, e você sente o quanto este lugar é antigo. ${lens} A lenda de ${title} paira palpável no ar.`,
    ch2: (summary) =>
      `Diante de você a cena se abre. ${summary} Você é apenas testemunha deste acontecimento ancestral — e ainda assim ele o atrai para dentro.`,
    ch3Adult:
      "Uma sombra profunda cai sobre o caminho, e um ronco surdo sobe da rocha. Algo se move na borda do seu olhar.",
    ch3Kinder:
      "Uma sombra desliza pelo caminho. Parece estranha, mas não malévola. Algo se move na borda do seu olhar.",
    ch3Question: "Como você enfrenta o que se aproxima?",
    ch3Options: [
      { label: "Dou um passo à frente e me mantenho firme.", archetypeHint: "Coragem do Viajante", tone: "mutig" },
      { label: "Fico imóvel e observo.", archetypeHint: "Calma do Pastor", tone: "bedacht" },
      { label: "Procuro um sinal na sombra.", archetypeHint: "Astúcia do Astuto", tone: "wachsam" },
    ],
    ch4: "O ronco silencia. O que um dia aconteceu aqui se desenrola diante dos seus olhos, imutável como o curso da água. Você percebe: a lenda é mais do que um conto — ela ainda respira neste vale.",
    ch5Text:
      "Uma última vez o acontecimento se volta para você, como se quisesse perguntar o que você leva deste lugar.",
    ch5Question: "O que você leva deste encontro?",
    ch5Options: [
      { label: "Reverência pelo que é maior do que eu.", archetypeHint: "Humildade", tone: "ehrfuerchtig" },
      { label: "A certeza de que histórias podem ser verdadeiras.", archetypeHint: "Revelação", tone: "nachdenklich" },
    ],
    chFinal:
      "O instante passa. A natureza retoma seu curso habitual, o vento se acalma. Você segue em frente, marcado·a por este encontro, e o vale guarda seu segredo — até a próxima pessoa que passar.",
    navCue: (direction, landmark) =>
      `Para chegar à lenda de ${landmark}, mantenha-se à ${direction === "links" ? "esquerda" : "direita"} na próxima bifurcação.`,
  },
};

/**
 * Uebersetzte Sagen-Zusammenfassungen je Sprache und Saga-ID.
 * Deutsch faellt direkt auf das saga.summary-Feld zurueck.
 */
export const SAGA_SUMMARIES: Partial<Record<Lang, Record<string, string>>> = {
  gsw: {
    teufelsbrucke:
      "D Schöllenenschlucht isch unpassierbar gsii, bis d Urner en Pakt gschlosse händ: De Tüüfel baut d Brugg, verlangt aber di erst Seel, wo drüberlauft. En gwitzte Buur hät en Geissbock füregschickt.",
    rossberg:
      "Bevor de Bärg z Goldau abegange isch, händ d Senne Omen am Himmel gseh. De Bärg hät grollt, aber d Warnige vo de alte Hirte sind i de Täler ignoriert worde.",
    tschaggatta:
      "Im Lötschental händ einisch Dieb gläbt, wo sich i Fäll ghüllt und Holzmaske treit händ, zum d Talgmeinde verschrecke und Vorröt stähle. Ihri wilde Schrei halled hüt no dur d Nächt.",
    blausee:
      "Es junges Meitli hät ihre Liebschte i de Bärge verlore. Si hät so vili Träne gweint, dass drus en See vo tüüfblauer Farb entstande isch, wo bis hüt ihri Truur widerspieglet.",
    viamala:
      "I de tüüfschte Schluchte vom Hinterrhii, wo chum Sunnelicht anecho, sölled einisch Häxe de Reisende ufgluuret ha. Nu wär es reins Gwüsse gha hät, isch unbschadet dur d Viamala cho.",
    "monte-san-salvatore":
      "Uf em Gipfel hoch überem See hät en Einsiedler gläbt, wo Störm hät chöne besänftige, indem er es eifachs Lied gsunge hät. Sin Geist wachet hüt no überem See.",
    pilatus:
      "Im Pilatussee obe am Bärg söll en gwaltige Drach ruehe. Wirft mer en Stei is dunkle Wasser, erwachet de Drach und schickt schüüchi Unwätter überes Land.",
    martinsloch:
      "Wo de heilig Martin vo eme riese Schafhirt aagriffe worde isch, hät er sin Wanderstab dur de Bärg gschmisse, was es riesigs Loch hinderlah hät. Zweimal im Jahr schiint d Sunne genau dedure.",
    tell:
      "De Landvogt Gessler hät de Wilhelm Tell zwunge, en Öpfel vom Chopf vo sim Sohn abezschüsse. Als Gfangene uf em stürmische Urnersee isch de Tell mit eme Sprung uf en Felse entcho und hät de Ufstand agfange.",
    matterhorn:
      "Wo hüt s Matterhorn kahl in Himmel raagt, sölled einisch fruchtbari Weide und e riichi Stadt gsii sii. Wo d Lüt hochmüetig und giizig worde sind, hät de Himmel s Land zu Fels und Iis erstarre lah.",
    flims:
      "Über em groosse Bärgsturz vo Flims zieht i dunkle Nächt s Nachtvolk sini Bahn: e stummi Schar Verstorbeni, wo kei Rueh gfunde hät. Wär ne begegnet, sött de Wäg freigäh und schwiige, susch wird er sälber Teil vom Zug.",
    rigi:
      "Uf de Rigi hät e wiissi Gäms gläbt, wo kei Jäger je hät chöne erlege. Wän d Gier packt hät und trotzdem aagleit hät, dä hät de Näbel verschluckt, denn si isch d Hüterin vom Bärg gsii, nöd sini Büüti.",
  },
  fr: {
    teufelsbrucke:
      "Les gorges de Schöllenen étaient infranchissables, jusqu'à ce que les Uranais concluent un pacte : le diable bâtit le pont, mais réclame la première âme qui le traverse. Un paysan rusé y fit passer un bouc.",
    rossberg:
      "Avant que la montagne ne s'effondre sur Goldau, les armaillis virent des présages dans le ciel. La montagne gronda, mais les avertissements des vieux bergers furent ignorés dans les vallées.",
    tschaggatta:
      "Dans le Lötschental vivaient jadis des voleurs qui se couvraient de peaux et portaient des masques de bois pour effrayer les communautés de la vallée et voler leurs provisions. Leurs cris sauvages résonnent encore dans les nuits.",
    blausee:
      "Une jeune fille perdit son bien-aimé dans les montagnes. Elle versa tant de larmes qu'en naquit un lac d'un bleu profond, qui reflète encore aujourd'hui son chagrin.",
    viamala:
      "Dans les gorges les plus profondes du Rhin postérieur, où la lumière du soleil pénètre à peine, des sorcières auraient jadis guetté les voyageurs. Seul celui qui avait la conscience pure traversait la Viamala sain et sauf.",
    "monte-san-salvatore":
      "Au sommet, haut au-dessus du lac, vivait un ermite qui pouvait apaiser les tempêtes en chantant un chant tout simple. Son esprit veille encore aujourd'hui sur le lac.",
    pilatus:
      "Dans le lac du Pilate, sur la montagne, reposerait un dragon gigantesque. Si l'on jette une pierre dans l'eau sombre, le dragon s'éveille et envoie de terribles orages sur le pays.",
    martinsloch:
      "Lorsque saint Martin fut attaqué par un berger géant, il lança son bâton de marche à travers la montagne, y laissant un trou immense. Deux fois par an, le soleil brille exactement au travers.",
    tell:
      "Le bailli Gessler força Guillaume Tell à tirer une pomme posée sur la tête de son fils. Prisonnier sur le lac d'Uri déchaîné par la tempête, Tell s'échappa d'un bond sur un rocher et déclencha la révolte.",
    matterhorn:
      "Là où le Cervin dresse aujourd'hui sa cime nue, s'étendaient jadis, dit-on, de riches pâturages et une ville prospère. Quand ses habitants sombrèrent dans l'orgueil et l'avarice, le ciel figea le pays en roc et en glace.",
    flims:
      "Au-dessus de l'immense éboulement de Flims, par les nuits sombres, le peuple de la nuit suit sa route : une cohorte muette de défunts sans repos. Qui les croise doit céder le passage et se taire, sinon il rejoint lui-même le cortège.",
    rigi:
      "Sur le Rigi vivait un chamois blanc qu'aucun chasseur ne put jamais abattre. Celui que la cupidité saisissait et qui le mettait tout de même en joue, la brume l'engloutissait, car il était le gardien de la montagne, non sa proie.",
  },
  it: {
    teufelsbrucke:
      "Le gole della Schöllenen erano impraticabili, finché gli urani non strinsero un patto: il diavolo costruisce il ponte, ma pretende la prima anima che lo attraversa. Un contadino astuto vi fece passare un caprone.",
    rossberg:
      "Prima che la montagna franasse su Goldau, i malgari videro presagi nel cielo. La montagna brontolò, ma gli avvertimenti dei vecchi pastori furono ignorati nelle valli.",
    tschaggatta:
      "Nella Lötschental vivevano un tempo ladri che si avvolgevano in pelli e indossavano maschere di legno per spaventare le comunità della valle e rubare le provviste. Le loro grida selvagge risuonano ancora oggi nelle notti.",
    blausee:
      "Una giovane fanciulla perse il suo amato tra i monti. Pianse così tante lacrime che ne nacque un lago di un blu profondo, che ancora oggi riflette il suo dolore.",
    viamala:
      "Nelle gole più profonde del Reno posteriore, dove la luce del sole penetra a stento, un tempo si dice che le streghe tendessero agguati ai viaggiatori. Solo chi aveva la coscienza pulita attraversava la Viamala illeso.",
    "monte-san-salvatore":
      "Sulla vetta, alta sopra il lago, viveva un eremita che sapeva placare le tempeste cantando una semplice melodia. Il suo spirito veglia ancora oggi sul lago.",
    pilatus:
      "Nel lago del Pilatus, sul monte, riposerebbe un drago immane. Se si getta una pietra nell'acqua scura, il drago si sveglia e scatena terribili tempeste sulla regione.",
    martinsloch:
      "Quando san Martino fu attaccato da un pastore gigante, scagliò il suo bastone da viandante attraverso la montagna, lasciandovi un foro enorme. Due volte l'anno il sole splende esattamente attraverso di esso.",
    tell:
      "Il balivo Gessler costrinse Guglielmo Tell a colpire una mela posata sul capo del figlio. Prigioniero sul lago di Uri sferzato dalla tempesta, Tell fuggì con un balzo su una roccia e diede inizio alla rivolta.",
    matterhorn:
      "Dove oggi il Cervino si erge spoglio verso il cielo, si dice sorgessero un tempo pascoli fertili e una città ricca. Quando i suoi abitanti caddero nella superbia e nell'avarizia, il cielo tramutò la terra in roccia e ghiaccio.",
    flims:
      "Sopra l'immensa frana di Flims, nelle notti buie, il popolo della notte segue il suo cammino: una schiera muta di defunti senza pace. Chi li incontra deve cedere il passo e tacere, altrimenti diventa lui stesso parte del corteo.",
    rigi:
      "Sul Rigi viveva un camoscio bianco che nessun cacciatore riuscì mai ad abbattere. Chi era preso dall'avidità e nondimeno prendeva la mira, veniva inghiottito dalla nebbia, perché esso era il custode del monte, non la sua preda.",
  },
  en: {
    teufelsbrucke:
      "The Schöllenen Gorge was impassable until the people of Uri struck a pact: the devil would build the bridge but claim the first soul to cross it. A cunning farmer sent a billy goat across instead.",
    rossberg:
      "Before the mountain came down on Goldau, the herders saw omens in the sky. The mountain rumbled, yet the warnings of the old shepherds were ignored in the valleys.",
    tschaggatta:
      "In the Lötschental valley there once lived thieves who wrapped themselves in furs and wore wooden masks to frighten the valley communities and steal their stores. Their wild cries still echo through the nights.",
    blausee:
      "A young girl lost her beloved in the mountains. She wept so many tears that a lake of deep blue arose from them, still reflecting her grief today.",
    viamala:
      "In the deepest gorges of the Hinterrhein, where sunlight barely reaches, witches are said to have once lain in wait for travellers. Only those with a clear conscience passed through the Viamala unharmed.",
    "monte-san-salvatore":
      "On the summit high above the lake lived a hermit who could calm storms by singing a simple song. His spirit still watches over the lake today.",
    pilatus:
      "In the lake atop Mount Pilatus a mighty dragon is said to rest. Throw a stone into the dark water and the dragon awakens, sending terrible storms across the land.",
    martinsloch:
      "When Saint Martin was attacked by a giant shepherd, he hurled his walking staff through the mountain, leaving an enormous hole. Twice a year the sun shines exactly through it.",
    tell:
      "Bailiff Gessler forced William Tell to shoot an apple from his own son's head. A prisoner on the storm-lashed Lake Uri, Tell escaped with a leap onto a rock and set the uprising in motion.",
    matterhorn:
      "Where the Matterhorn now rises bare into the sky, fertile pastures and a wealthy town are said to have once lain. When its people fell into arrogance and greed, heaven froze the land into rock and ice.",
    flims:
      "Above the vast Flims rockslide, on dark nights, the night folk make their way: a silent host of the dead who found no rest. Whoever meets them must give way and stay silent, or become part of the procession themselves.",
    rigi:
      "On the Rigi lived a white chamois that no hunter could ever bring down. Whoever was seized by greed and took aim all the same was swallowed by the mist, for it was the guardian of the mountain, not its quarry.",
  },
  zh: {
    teufelsbrucke:
      "舍勒能峡谷曾无法通行，直到乌里人立下契约：魔鬼建桥，但要索取第一个过桥者的灵魂。一位机敏的农夫却先赶了一只公山羊过去。",
    rossberg:
      "在山体崩落、掩埋戈尔道之前，牧人们在天空看到了预兆。大山发出轰鸣，可老牧人的警告却在山谷中被人忽视。",
    tschaggatta:
      "从前在勒奇山谷住着一群盗贼，他们裹着兽皮、戴着木制面具，去恐吓谷中的村落、偷走存粮。他们狂野的喊叫至今仍在夜里回荡。",
    blausee:
      "一位年轻姑娘在山中失去了心爱的人。她流下的泪水如此之多，竟汇成一泓深蓝色的湖，至今仍映照着她的哀伤。",
    viamala:
      "在后莱茵河最深的峡谷里，那里几乎照不进阳光，据说女巫曾经埋伏，伺机劫掠旅人。唯有问心无愧的人，才能平安穿过维亚马拉。",
    "monte-san-salvatore":
      "在高高俯瞰湖面的山巅，住着一位隐士，他只需唱起一支质朴的歌，便能平息风暴。他的魂灵至今仍守望着这片湖。",
    pilatus:
      "据说在皮拉图斯山顶的湖中，沉睡着一条巨龙。若把石头投入那幽暗的湖水，巨龙便会苏醒，向大地降下可怖的风暴。",
    martinsloch:
      "圣马丁遭一名巨人牧羊人袭击时，将手中的行杖掷穿了山峰，留下一个巨大的洞。每年有两次，太阳恰好从洞中穿照而过。",
    tell:
      "总督盖斯勒逼迫威廉·退尔射落放在他亲生儿子头上的一个苹果。作为俘虏被押过风暴肆虐的乌里湖时，退尔纵身跳上一块岩石逃脱，就此点燃了起义。",
    matterhorn:
      "如今马特洪峰光秃地耸入云天，据说那里曾是丰美的牧场和一座富庶的城镇。当居民陷入傲慢与贪婪，上天便让这片土地凝固成岩石与坚冰。",
    flims:
      "在弗利姆斯那片巨大的山崩之上，每逢黑夜，夜之队伍便循路而行：那是一群沉默的亡者，始终不得安息。遇见他们的人须让路并保持缄默，否则自己也会成为队伍的一员。",
    rigi:
      "里吉山上住着一只白色羚羊，没有猎人能够猎获它。凡是被贪念攫住、仍向它举枪的人，都被浓雾吞没，因为它是这座山的守护者，而非猎物。",
  },
  es: {
    teufelsbrucke:
      "El desfiladero de Schöllenen era intransitable, hasta que los de Uri sellaron un pacto: el diablo construye el puente, pero reclama la primera alma que lo cruce. Un campesino astuto hizo pasar antes a un macho cabrío.",
    rossberg:
      "Antes de que la montaña se desplomara sobre Goldau, los pastores vieron presagios en el cielo. La montaña retumbó, pero las advertencias de los viejos pastores fueron ignoradas en los valles.",
    tschaggatta:
      "En el valle de Lötschental vivían antaño ladrones que se cubrían con pieles y llevaban máscaras de madera para asustar a las comunidades del valle y robar sus provisiones. Sus gritos salvajes aún resuenan en las noches.",
    blausee:
      "Una joven perdió a su amado en las montañas. Lloró tantas lágrimas que de ellas nació un lago de un azul profundo, que aún hoy refleja su tristeza.",
    viamala:
      "En los desfiladeros más profundos del Rin Posterior, donde apenas llega la luz del sol, se dice que antaño las brujas acechaban a los viajeros. Solo quien tenía la conciencia limpia cruzaba la Viamala sin daño.",
    "monte-san-salvatore":
      "En la cima, muy por encima del lago, vivía un ermitaño que podía apaciguar las tormentas cantando una canción sencilla. Su espíritu aún vela hoy sobre el lago.",
    pilatus:
      "En el lago del Pilatus, en la montaña, reposaría un dragón colosal. Si se arroja una piedra al agua oscura, el dragón despierta y envía terribles tormentas sobre la tierra.",
    martinsloch:
      "Cuando san Martín fue atacado por un pastor gigante, arrojó su bastón de caminante a través de la montaña, dejando un enorme agujero. Dos veces al año el sol brilla justo a través de él.",
    tell:
      "El baile Gessler obligó a Guillermo Tell a disparar a una manzana colocada sobre la cabeza de su propio hijo. Prisionero en el lago de Uri azotado por la tormenta, Tell escapó de un salto sobre una roca y dio comienzo a la rebelión.",
    matterhorn:
      "Donde hoy el Cervino se alza desnudo hacia el cielo, se dice que antaño había pastos fértiles y una ciudad próspera. Cuando sus habitantes cayeron en la soberbia y la avaricia, el cielo congeló la tierra en roca y hielo.",
    flims:
      "Sobre el inmenso desprendimiento de Flims, en las noches oscuras, el pueblo de la noche sigue su marcha: una hueste muda de difuntos que no hallaron descanso. Quien los encuentra debe ceder el paso y callar, o se vuelve él mismo parte del cortejo.",
    rigi:
      "En el Rigi vivía un rebeco blanco que ningún cazador logró jamás abatir. A quien lo dominaba la codicia y aun así le apuntaba, la niebla lo engullía, pues era el guardián de la montaña, no su presa.",
  },
  pt: {
    teufelsbrucke:
      "O desfiladeiro de Schöllenen era intransponível, até que o povo de Uri fez um pacto: o diabo construiria a ponte, mas reclamaria a primeira alma a atravessá-la. Um camponês astuto mandou um bode passar primeiro.",
    rossberg:
      "Antes de a montanha desabar sobre Goldau, os pastores viram presságios no céu. A montanha rugiu, mas os avisos dos velhos pastores foram ignorados nos vales.",
    tschaggatta:
      "No vale de Lötschental viviam outrora ladrões que se cobriam com peles e usavam máscaras de madeira para assustar as comunidades do vale e roubar suas provisões. Seus gritos selvagens ainda ecoam pelas noites.",
    blausee:
      "Uma jovem perdeu seu amado nas montanhas. Ela chorou tantas lágrimas que delas nasceu um lago de azul profundo, que até hoje reflete a sua tristeza.",
    viamala:
      "Nos desfiladeiros mais profundos do Reno Posterior, onde a luz do sol quase não chega, dizem que outrora as bruxas espreitavam os viajantes. Só quem tinha a consciência limpa atravessava a Viamala ileso.",
    "monte-san-salvatore":
      "No cume, bem acima do lago, vivia um eremita que podia acalmar tempestades cantando uma canção simples. Seu espírito ainda vela pelo lago até hoje.",
    pilatus:
      "No lago do Pilatus, na montanha, repousaria um dragão descomunal. Se atirarem uma pedra na água escura, o dragão desperta e envia tempestades terríveis sobre a terra.",
    martinsloch:
      "Quando são Martinho foi atacado por um pastor gigante, arremessou seu cajado através da montanha, deixando um enorme buraco. Duas vezes por ano o sol brilha exatamente através dele.",
    tell:
      "O bailio Gessler obrigou Guilherme Tell a acertar uma maçã sobre a cabeça do próprio filho. Prisioneiro no lago de Uri açoitado pela tempestade, Tell escapou com um salto sobre um rochedo e deu início à revolta.",
    matterhorn:
      "Onde hoje o Matterhorn se ergue nu contra o céu, dizem que outrora havia pastos férteis e uma cidade próspera. Quando seus habitantes caíram na soberba e na ganância, o céu congelou a terra em rocha e gelo.",
    flims:
      "Sobre o imenso desmoronamento de Flims, nas noites escuras, o povo da noite segue seu caminho: uma hoste muda de mortos que não encontraram descanso. Quem os encontra deve ceder passagem e calar-se, ou torna-se ele próprio parte do cortejo.",
    rigi:
      "No Rigi vivia um camurça branca que nenhum caçador jamais conseguiu abater. Quem era tomado pela ganância e ainda assim mirava, a névoa o engolia, pois ela era a guardiã da montanha, não a sua presa.",
  },
};

/** Liefert die Zusammenfassung in der Zielsprache, sonst das deutsche Original. */
export function localizedSummary(lang: Lang, sagaId: string, fallback: string): string {
  return SAGA_SUMMARIES[lang]?.[sagaId] ?? fallback;
}
