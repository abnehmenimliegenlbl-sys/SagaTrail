import { Archetype } from "../types";

/**
 * Mehrsprachige Erzaehl-Inhalte fuer die Story-Engine.
 *
 * In diesem Build ist die Erzaehlung fest hinterlegt (keine KI-Uebersetzung).
 * Jede unterstuetzte Sprache hat ein eigenes StoryPack sowie uebersetzte
 * Sagen-Zusammenfassungen. Der App-Rahmen (Buttons, Labels) bleibt deutsch;
 * nur die live erzaehlte Sage folgt der gewaehlten Sprache.
 */

export type Lang = "de" | "gsw" | "fr" | "it" | "en" | "zh" | "es" | "pt" | "ru";

const KNOWN_LANGS: Lang[] = ["de", "gsw", "fr", "it", "en", "zh", "es", "pt", "ru"];

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
  ru: "ru-RU",
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
  // Kurze GPS-artige Sprachansage ("Links abbiegen!"), die bei Annaeherung
  // an eine Abbiegung live eingeschoben wird — unabhaengig vom Kapitel.
  turnVoice: (direction: "links" | "rechts") => string;
  // Gesprochene Aufforderung, die nach dem Kapitel-Ende an einem
  // Entscheidungspunkt vorgelesen wird — spricht zuerst die Entscheidungs-
  // frage (question, aus dem Kapitel) und listet danach die Optionen mit
  // natuerlichen Konjunktionen auf, damit Wandernde ohne Blick aufs Display
  // verstehen, was zur Wahl steht.
  buildDecisionPrompt: (options: string[], question?: string) => string;
  // Wohlwollendes Persoenlichkeits-Feedback, das unmittelbar nach der
  // Entscheidung gesprochen wird ("Das spricht fuer eine Persoenlichkeit mit…").
  decisionFeedback: (archetypeHint: string) => string;
  // Kurzer, gesprochener Einschub, wenn unterwegs ein realer Ort (OSM/Wikipedia)
  // in der Naehe entdeckt wird — nutzt den bereits geladenen Wikipedia-Auszug,
  // keine KI-Generierung. extract ist null, wenn kein Wikipedia-Artikel vorliegt.
  poiAside: (name: string, extract: string | null) => string;
  /** Persoenliche Begruessing beim Einzelstart — wird dem ersten Kapitel vorangestellt */
  soloGreeting: (name: string) => string;
  /** Kurzer Tageszeit-Einstieg (morgen/mittag/abend/nacht) vor Kapitel 1 */
  timeOfDayGreeting: (tod: "morgen" | "mittag" | "abend" | "nacht") => string;
  /** Gesprochene GPS-Foto-Challenge am Herzort der Sage */
  photoChallengePrompt: string;
  /** Atmosphärische Wettereinleitung, die dem Greeting vorangestellt wird */
  weatherPhrase: (klasse: WetterKlasse) => string;
  /** Atmosphärische Ansage beim Wechsel der Wegoberfläche */
  surfaceTransitionPhrase: (surface: "asphalt" | "kies" | "naturweg" | "fels" | "holz" | string) => string;
  /** Motivierendes Meilenstein-Zitat (25/50/75 %), mit optionalem Namen */
  milestonePhrase: (pct: 25 | 50 | 75, name: string | null) => string;
  /** Routen-Einleitung vor Kapitel 1: Distanz, Dauer, Schwierigkeit, Oberfläche, POIs, Ausrüstung */
  routeBriefing: (p: RouteBriefingParams) => string;
}

/**
 * Grobe Wetter-Kategorien, die aus dem WeatherReport abgeleitet werden
 * und als stimmungsvoller atmosphärischer Einstieg in die Sage dienen.
 */
export type WetterKlasse = "heiss" | "sonnig" | "bewoelkt" | "nebel" | "regen" | "schnee" | "kalt" | "gewitter";

export type RouteDifficulty = "leicht" | "mittel" | "anspruchsvoll";

export type RouteBriefingParams = {
  name: string | null;
  distanceKm: number;
  minutes: number;
  difficulty: RouteDifficulty;
  hasSteepSections: boolean;
  surfaces: string[];
  poiNames: string[];
  wetterKlasse: WetterKlasse | null;
};

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
    turnVoice: (direction) => direction === "links" ? "Jetzt links abbiegen!" : "Jetzt rechts abbiegen!",
    buildDecisionPrompt: (options, question) => {
      const q = question ?? "Triff jetzt deine Wahl.";
      const list = options.join(". Oder: ");
      return `${q} ${list}.`;
    },
    decisionFeedback: (hint) => {
      const v = [
        `Das spricht für eine Persönlichkeit mit ${hint}. Eine tiefe Wahrheit über dich, hier draußen in der Stille.`,
        `${hint} — das ist es, was dich auf diesem Weg ausmacht.`,
        `Diese Wahl trägt die Handschrift von ${hint}. Nichts hier ist zufällig.`,
        `Du hast gewählt. Und diese Wahl verrät ${hint} — tief in dir, schon immer.`,
      ];
      return v[Math.floor(Math.random() * v.length)];
    },
    poiAside: (name, extract) =>
      extract
        ? `Kleine Unterbrechung der Sage, ein echter Ort ganz in deiner Nähe: ${name}. ${extract}`
        : `Kleine Unterbrechung der Sage, ein echter Ort ganz in deiner Nähe: ${name} — ein stiller Zeuge vergangener Zeiten.`,
    soloGreeting: (name) => `Willkommen auf dem Weg, ${name}. Lass die Sage dich begleiten.`,
    timeOfDayGreeting: (tod) => ({ morgen: "Die Berge erwachen noch — ein guter Morgen für alte Geschichten.", mittag: "Die Mittagssonne wirft klare Schatten, doch dieser Weg birgt noch Geheimnisse.", abend: "Das Abendlicht taucht alles in warmes Gold — die richtige Stunde für Sagen.", nacht: "Dunkelheit liegt über dem Pfad. Genau jetzt erwachen die alten Geschichten." } as const)[tod],
    photoChallengePrompt: "Du bist am Herzort dieser Sage. Halte diesen besonderen Ort in einem Foto fest.",
    weatherPhrase: (k) => ({
      heiss:    "Die Hitze liegt schwer über dem Tal — als hätte die Sonne heute ein altes Urteil zu sprechen.",
      sonnig:   "Die Sonne steht klar am Himmel. Ein solcher Tag hat schon immer die richtigen Geschichten angelockt.",
      bewoelkt: "Graue Wolken ziehen tief über den Weg. Kein Licht ohne Schatten — kein Schatten ohne Geheimnis.",
      nebel:    "Nebel liegt über dem Pfad. Die Grenze zwischen damals und heute verschwimmt.",
      regen:    "Der Regen fällt gleichmäßig auf alten Boden. Solche Tage haben schon immer zu alten Geschichten eingeladen.",
      schnee:   "Schnee liegt still auf dem Weg. Die Stille kennt diese Sage seit Langem.",
      kalt:     "Die Kälte beißt in die Wangen — genau so muss es sich damals angefühlt haben.",
      gewitter: "Ein Gewitter liegt in der Luft. Alte Geschichten brauchen keinen besseren Rahmen.",
    } as const)[k],
    surfaceTransitionPhrase: (surface) =>
      (({ asphalt: "Der Weg wechselt auf Asphalt. Einst trugen diese Pfade ganz andere Schritte.", kies: "Kies knirscht unter den Sohlen. Der Weg wird rauer — und echter.", naturweg: "Blanke Erde liegt unter den Füssen. Hier bewegten sich Menschen, lange bevor man Wege befestigte.", fels: "Nackter Fels trägt dich jetzt. Uraltes Gestein, das die Sage schon immer kannte.", holz: "Holzplanken führen dich weiter — jeder Schritt hallt, als würde der Weg zurückflüstern." } as Record<string, string>)[surface]) ?? "Die Beschaffenheit des Weges wandelt sich. Die Sage begleitet dich weiter.",
    milestonePhrase: (pct, name) =>
      (name
        ? ({ 25: `Ein Viertel geschafft, ${name}. Die Sage trägt dich weiter.`, 50: `Halbzeit, ${name}. Was hinter dir liegt, ist genauso weit wie das, was noch kommt.`, 75: `Noch ein letztes Stück, ${name}. Drei Viertel hast du bereits hinter dir gelassen.` } as Record<number, string>)
        : ({ 25: "Ein Viertel liegt hinter dir. Die Sage hat dich schon ein Stück in ihr Reich gezogen.", 50: "Die Hälfte. Der Weg hinter dir ist so lang wie der, der noch vor dir liegt.", 75: "Drei Viertel. Dieser Weg wird sich für immer in dein Gedächtnis eingraben." } as Record<number, string>)
      )[pct] ?? "",
    routeBriefing: (p) => {
      const diff = ({ leicht: "eine leichte", mittel: "eine mittelschwere", anspruchsvoll: "eine anspruchsvolle" } as const)[p.difficulty];
      const dur = p.minutes < 70 ? `etwa ${Math.round(p.minutes / 5) * 5} Minuten` : p.minutes < 90 ? "etwa eine Stunde" : `etwa ${Math.round(p.minutes / 30) / 2} Stunden`;
      const n = p.name ? `${p.name}, du hast dir ` : "Du hast dir ";
      const wk = p.wetterKlasse;
      const wetterHart = wk === "regen" || wk === "schnee" || wk === "gewitter";
      const wetterHeiss = wk === "heiss";
      const long = p.minutes >= 90;
      const steep = p.hasSteepSections
        ? wetterHeiss
          ? " Ein steiler Anstieg wartet — bei dieser Hitze besonders zehrend. Leg Pausen ein."
          : wetterHart
            ? " Steile Abschnitte warten auf dich — bei diesem Wetter anspruchsvoll, tritt sicher auf."
            : " Ein paar steile Stellen warten auf dich — das Herz wird pumpen."
        : "";
      const surfMap: Record<string, string> = { asphalt: "Asphalt", kies: "Schotterwegen", naturweg: "Naturwegen", fels: "Fels", holz: "Holzstegen" };
      const surfParts = p.surfaces.map((s) => surfMap[s] ?? s);
      const rutschig = wetterHart && p.surfaces.some((s) => ["kies", "naturweg", "fels"].includes(s));
      const surf = surfParts.length
        ? rutschig
          ? ` Der Weg führt über ${surfParts.join(" und ")} — bei diesem Wetter rutschig, festes Schuhwerk ist entscheidend.`
          : ` Der Weg führt über ${surfParts.join(" und ")}.`
        : "";
      const poi = p.poiNames.length ? ` Unterwegs könntest du ${p.poiNames.slice(0, 3).join(", ")} begegnen — Orte, die schon die Sage kennt.` : "";
      const gearMap: Record<string, string> = {
        heiss: ` Trink reichlich Wasser, schütz Kopf und Haut vor der Sonne${long ? " und pack genug Proviant ein" : ""}.`,
        sonnig: ` Feste Schuhe mit gutem Profil empfehlen sich${long ? " — und genug Wasser sowie Proviant für unterwegs" : " und etwas Sonnenschutz"}.`,
        bewoelkt: ` Eine leichte Jacke und festes Schuhwerk genügen${long ? " — pack Getränke und einen kleinen Proviant ein" : ""}.`,
        nebel: ` Im Nebel: schichtweise anziehen, sicherer Halt unter den Füssen${long ? " und Proviant griffbereit" : ""}.`,
        regen: ` Wasserdichte Schuhe und eine Regenjacke sind Pflicht${long ? " — pack genug Getränke und Proviant ein" : ""}.`,
        schnee: ` Griffige Sohlen, Handschuhe und warme Schichten${long ? " sowie kalorienreicher Proviant für den Energiebedarf" : ""}.`,
        kalt: ` Warme Kleidung in Lagen und etwas Heisses im Thermobecher${long ? " — ausreichend Proviant nicht vergessen" : ""}.`,
        gewitter: ` Gewitter im Anzug — bleib unter der Baumgrenze, Jacke griffbereit${long ? " und Proviant im Rucksack verstaut" : ""}.`,
      };
      const gear = wk ? (gearMap[wk] ?? "") : long ? " Vergiss genug Wasser und Proviant für die Strecke nicht." : "";
      return `${n}${diff} Route: ${p.distanceKm.toFixed(1)} km, ${dur}.${steep}${surf}${poi}${gear}`.trim();
    },
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
    turnVoice: (direction) => direction === "links" ? "Jetzt links abbiege!" : "Jetzt rechts abbiege!",
    buildDecisionPrompt: (options, question) => {
      const q = question ?? "Triff jetzt dini Wahl.";
      const list = options.join(". Oder: ");
      return `${q} ${list}.`;
    },
    decisionFeedback: (hint) => {
      const v = [
        `Das spricht für e Persönlichkeit mit ${hint}. En tiefe Wahrhäit über dich, do draußen in de Stilli.`,
        `${hint} — das isch es, was dich uf däm Wäg usmacht.`,
        `Dä Wahl steckt d Handschrift vo ${hint} drin. Nüüt isch do Zufall.`,
        `Du häsch gwählt. Und dä Wahl verraat ${hint} — tüüf in dir, immer scho.`,
      ];
      return v[Math.floor(Math.random() * v.length)];
    },
    poiAside: (name, extract) =>
      extract
        ? `Chlini Underbrächig vo de Sage, en echte Ort ganz i dinere Nöchi: ${name}. ${extract}`
        : `Chlini Underbrächig vo de Sage, en echte Ort ganz i dinere Nöchi: ${name} — en stille Züügä vo vergangene Zyte.`,
    soloGreeting: (name) => `Willkomme uf em Wäg, ${name}. Lo d Sage dich bgleite.`,
    timeOfDayGreeting: (tod) => ({ morgen: "D Bärg erwache no — en guete Morge für alti Gschichte.", mittag: "D Miittagssunne wirft klari Schatte, aber dä Wäg verbirgt no Gheimnis.", abend: "S Abelicht taucht alles i warmes Gold — geni Stund für Sage.", nacht: "Dunkelheit liit über em Pfad. Genau jetzt erwache d alte Gschichte." } as const)[tod],
    photoChallengePrompt: "Du bisch am Härzort vo dere Sage. Halte dä bsundere Ort i eme Foto fescht.",
    weatherPhrase: (k) => ({
      heiss:    "D Hitzi liit schwer über em Tal — as ob d Sunne hüt es alts Urteil z spreche hätt.",
      sonnig:   "D Sunne staht klar am Himmel. Sotti Täg händ scho immer d richtigi Gschichte ahzoge.",
      bewoelkt: "Grauji Wolke zieht tief über de Wäg. Kei Liecht ohni Schatte — kei Schatte ohni Gheimnis.",
      nebel:    "Näbel liit über em Pfad. D Gränze zwüschet damals und hüt verblurrt.",
      regen:    "De Räge fallt gmächlich uf alte Bode. Sotti Täg händ scho immer zu alte Gschichte yyglade.",
      schnee:   "Schnee liit still uf em Wäg. D Stilli kennt dä Sage scho lang.",
      kalt:     "D Chälti biisst i d Bache — genau so muss sich's damals aaghört ha.",
      gewitter: "Es Gwitter liit i de Luft. Alti Gschichte bruched kei bessere Rahme.",
    } as const)[k],
    surfaceTransitionPhrase: (surface) =>
      (({ asphalt: "Dr Wäg wechslet uf Asphalt. Amol händ ganz anderi Schritt dä Pfad treit.", kies: "Kies chnürpst under de Sohle. De Wäg wird rouher — und echter.", naturweg: "Blosi Ärd liit under de Fies. Do händ sich Mänsche bewegt, lang bevor mer Wäg bfestigt het.", fels: "Nackter Fels treit di jetzt. Uralts Gstei, das d Sage scho immer kennt het.", holz: "Holzbrätt führed di witer — jede Schritt hallt, as ob dr Wäg zrugg flüschteret." } as Record<string, string>)[surface]) ?? "D Beschaffenheit vom Wäg wandlet sich. D Sage begleitet di witer.",
    milestonePhrase: (pct, name) =>
      (name
        ? ({ 25: `Es Viertel gschafft, ${name}. D Sage treit di witer.`, 50: `Halbzyt, ${name}. Was hinder dir liit, isch genau so wit wie das, was no chunt.`, 75: `No es letschts Stück, ${name}. Drü Viertel hesch du scho hinder dir glah.` } as Record<number, string>)
        : ({ 25: "Es Viertel liit hinder dir. D Sage het di scho es Stück in ir Reich gzoge.", 50: "D Helfti. De Wäg hinder dir isch so lang wie de, wo no vor dir liit.", 75: "Drü Viertel. Dä Wäg wird sich für immer in d Erinneriig iifrässe." } as Record<number, string>)
      )[pct] ?? "",
    routeBriefing: (p) => {
      const diff = ({ leicht: "es liechte", mittel: "es mittelschwäre", anspruchsvoll: "es aspruchsvolls" } as const)[p.difficulty];
      const dur = p.minutes < 70 ? `öppä ${Math.round(p.minutes / 5) * 5} Minute` : p.minutes < 90 ? "öppä e Stund" : `öppä ${Math.round(p.minutes / 30) / 2} Stunde`;
      const n = p.name ? `${p.name}, du hesch dir ` : "Du hesch dir ";
      const wk = p.wetterKlasse;
      const wetterHart = wk === "regen" || wk === "schnee" || wk === "gewitter";
      const wetterHeiss = wk === "heiss";
      const long = p.minutes >= 90;
      const steep = p.hasSteepSections
        ? wetterHeiss
          ? " En steili Uffahrt wartet — bi dere Hitz bsunders strapazios. Mach Puse."
          : wetterHart
            ? " Steili Abschnitt warte uf dich — bi däm Wätter aspruchsvoll, tritt sicher uf."
            : " Es git es paar steili Stelle — dä Atem wird schnäller werde."
        : "";
      const surfMap: Record<string, string> = { asphalt: "Asphalt", kies: "Schotterwäge", naturweg: "Naturwäge", fels: "Fels", holz: "Holzstäg" };
      const surfParts = p.surfaces.map((s) => surfMap[s] ?? s);
      const rutschig = wetterHart && p.surfaces.some((s) => ["kies", "naturweg", "fels"].includes(s));
      const surf = surfParts.length
        ? rutschig
          ? ` Dr Wäg füehrt über ${surfParts.join(" und ")} — bi däm Wätter rutschig, feschti Schue sind wichtig.`
          : ` Dr Wäg füehrt über ${surfParts.join(" und ")}.`
        : "";
      const poi = p.poiNames.length ? ` Underwegs chöntisch ${p.poiNames.slice(0, 3).join(", ")} begägne — Ort, wo d Sage scho kennt.` : "";
      const gearMap: Record<string, string> = {
        heiss: ` Trink gnueg Wasser, schütz Chopf und Hut vor dr Sunne${long ? " und pack gnueg Proviant ii" : ""}.`,
        sonnig: ` Feschti Schue mit guete Profil empfehle sich${long ? " — und gnueg Wasser sowie Proviant für underwegs" : " und öppis Sonneschutz"}.`,
        bewoelkt: ` E liechti Juppä und feschts Schuhwärk reiche${long ? " — pack Getränk und en chlyne Proviant ii" : ""}.`,
        nebel: ` Im Nebel: schichtwise aalegge, sicher ufträtte${long ? " und Proviant griffparat hebe" : ""}.`,
        regen: ` Wasserdichti Schue und en Rägemanntel sind Pflicht${long ? " — pack gnueg Getränk und Proviant" : ""}.`,
        schnee: ` Griffigi Sole, Handschu und warmi Schichte${long ? " sowie kaloriirychi Proviant für d Energie" : ""}.`,
        kalt: ` Warmi Chleider in Schichte und öppis Heisses im Thermobecher${long ? " — gnueg Proviant nid vergässe" : ""}.`,
        gewitter: ` Gwitter im Azug — bliib unterm Baumgrenz, Juppä parat${long ? " und Proviant im Rucksack verstaut" : ""}.`,
      };
      const gear = wk ? (gearMap[wk] ?? "") : long ? " Vergiss gnueg Wasser und Proviant für d Sträck nid." : "";
      return `${n}${diff} Wäg: ${p.distanceKm.toFixed(1)} km, ${dur}.${steep}${surf}${poi}${gear}`.trim();
    },
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
    turnVoice: (direction) => direction === "links" ? "Tournez à gauche !" : "Tournez à droite !",
    buildDecisionPrompt: (options, question) => {
      const q = question ?? "Fais ton choix maintenant.";
      const list = options.join(". Ou bien : ");
      return `${q} ${list}.`;
    },
    decisionFeedback: (hint) => {
      const v = [
        `Cela révèle une personnalité avec ${hint}. Une vérité profonde sur toi, ici dans le silence de la nature.`,
        `${hint} — c'est ce qui te définit sur ce chemin.`,
        `Ce choix porte la marque de ${hint}. Rien ici n'est anodin.`,
        `Tu as choisi. Et ce choix trahit ${hint} — au plus profond de toi.`,
      ];
      return v[Math.floor(Math.random() * v.length)];
    },
    poiAside: (name, extract) =>
      extract
        ? `Petite interruption de la légende, un lieu bien réel tout près de toi : ${name}. ${extract}`
        : `Petite interruption de la légende, un lieu bien réel tout près de toi : ${name} — un témoin silencieux du passé.`,
    soloGreeting: (name) => `Bienvenue sur ce chemin, ${name}. Laisse la légende te guider.`,
    timeOfDayGreeting: (tod) => ({ morgen: "La montagne s'éveille encore — un bon matin pour de vieilles histoires.", mittag: "Le soleil de midi projette des ombres nettes, et pourtant ce chemin cache encore des secrets.", abend: "La lumière du soir teinte tout d'un or chaud — l'heure idéale pour les légendes.", nacht: "L'obscurité recouvre le sentier. C'est maintenant que les vieilles histoires s'éveillent." } as const)[tod],
    photoChallengePrompt: "Tu es au cœur de cette légende. Garde ce lieu particulier en photo.",
    weatherPhrase: (k) => ({
      heiss:    "La chaleur pèse lourd sur la vallée — comme si le soleil avait aujourd'hui un vieux verdict à rendre.",
      sonnig:   "Le soleil se dresse clair dans le ciel. De tels jours ont toujours attiré les bonnes histoires.",
      bewoelkt: "Des nuages gris glissent bas sur le chemin. Pas de lumière sans ombre — pas d'ombre sans mystère.",
      nebel:    "Le brouillard recouvre le sentier. La frontière entre autrefois et aujourd'hui s'efface.",
      regen:    "La pluie tombe régulièrement sur une vieille terre. De tels jours ont toujours invité les vieilles histoires.",
      schnee:   "La neige repose silencieuse sur le chemin. Le silence connaît cette légende depuis longtemps.",
      kalt:     "Le froid mord les joues — exactement comme cela a dû se passer jadis.",
      gewitter: "Un orage se prépare. Les vieilles histoires n'ont pas besoin d'un meilleur décor.",
    } as const)[k],
    surfaceTransitionPhrase: (surface) =>
      (({ asphalt: "Le sentier passe sur l'asphalte. Autrefois, d'autres pas foulaient ces chemins.", kies: "Le gravier crisse sous les semelles. Le chemin devient plus rude — et plus vrai.", naturweg: "La terre nue est sous les pieds. Ici les hommes marchaient bien avant que l'on construise des routes.", fels: "La roche nue te porte à présent. Pierre millénaire que la légende a toujours connue.", holz: "Des planches de bois te guident — chaque pas résonne un peu, comme si le chemin murmurait en retour." } as Record<string, string>)[surface]) ?? "La nature du chemin change. La légende t'accompagne toujours.",
    milestonePhrase: (pct, name) =>
      (name
        ? ({ 25: `Un quart accompli, ${name}. La légende te porte plus loin.`, 50: `Mi-chemin, ${name}. Ce qui est derrière toi est aussi loin que ce qui t'attend encore.`, 75: `Un dernier bout, ${name}. Trois quarts sont déjà derrière toi.` } as Record<number, string>)
        : ({ 25: "Un quart du chemin est derrière toi. La légende t'a déjà tiré un peu dans son domaine.", 50: "La moitié. Le chemin derrière toi est aussi long que celui qui reste à parcourir.", 75: "Trois quarts. Ce chemin va bientôt s'imprimer pour toujours dans ta mémoire." } as Record<number, string>)
      )[pct] ?? "",
    routeBriefing: (p) => {
      const diff = ({ leicht: "un itinéraire facile", mittel: "un itinéraire moyen", anspruchsvoll: "un itinéraire exigeant" } as const)[p.difficulty];
      const dur = p.minutes < 70 ? `environ ${Math.round(p.minutes / 5) * 5} minutes` : p.minutes < 90 ? "environ une heure" : `environ ${Math.round(p.minutes / 30) / 2} heures`;
      const n = p.name ? `${p.name}, tu as choisi ` : "Tu as choisi ";
      const wk = p.wetterKlasse;
      const wetterHart = wk === "regen" || wk === "schnee" || wk === "gewitter";
      const wetterHeiss = wk === "heiss";
      const long = p.minutes >= 90;
      const steep = p.hasSteepSections
        ? wetterHeiss
          ? " Une montée raide t'attend — épuisante par cette chaleur. Fais des pauses."
          : wetterHart
            ? " Des passages raides t'attendent — exigeants par ce temps, pose chaque pas avec soin."
            : " Quelques passages raides t'attendent — le souffle sera sollicité."
        : "";
      const surfMap: Record<string, string> = { asphalt: "asphalte", kies: "graviers", naturweg: "sentiers naturels", fels: "rochers", holz: "passerelles en bois" };
      const surfParts = p.surfaces.map((s) => surfMap[s] ?? s);
      const rutschig = wetterHart && p.surfaces.some((s) => ["kies", "naturweg", "fels"].includes(s));
      const surf = surfParts.length
        ? rutschig
          ? ` Le chemin passe par ${surfParts.join(" et ")} — glissant par ce temps, des chaussures solides sont indispensables.`
          : ` Le chemin passe par ${surfParts.join(" et ")}.`
        : "";
      const poi = p.poiNames.length ? ` En chemin, tu pourrais croiser ${p.poiNames.slice(0, 3).join(", ")} — des lieux que la légende connaît bien.` : "";
      const gearMap: Record<string, string> = {
        heiss: ` Bois beaucoup d'eau, protège ta tête et ta peau du soleil${long ? " et emporte suffisamment de provisions" : ""}.`,
        sonnig: ` De bonnes chaussures à semelles adhérentes sont conseillées${long ? " — ainsi que suffisamment d'eau et de provisions" : " avec un peu de protection solaire"}.`,
        bewoelkt: ` Une veste légère et de bonnes chaussures suffiront${long ? " — pense aux boissons et à un en-cas" : ""}.`,
        nebel: ` Dans le brouillard : habillez-vous en couches, avancez prudemment${long ? " et gardez provisions et boissons à portée" : ""}.`,
        regen: ` Chaussures imperméables et veste de pluie sont indispensables${long ? " — emporte aussi suffisamment de boissons et provisions" : ""}.`,
        schnee: ` Semelles crantées, gants et couches chaudes${long ? " ainsi que des provisions caloriques pour tenir chaud" : ""}.`,
        kalt: ` Vêtements chauds en couches et quelque chose de chaud dans le thermos${long ? " — des provisions suffisantes sont essentielles" : ""}.`,
        gewitter: ` Orage en vue — reste sous la limite des arbres, garde la veste à portée${long ? " et les provisions dans le sac" : ""}.`,
      };
      const gear = wk ? (gearMap[wk] ?? "") : long ? " N'oublie pas suffisamment d'eau et de provisions pour le parcours." : "";
      return `${n}${diff} : ${p.distanceKm.toFixed(1)} km, ${dur}.${steep}${surf}${poi}${gear}`.trim();
    },
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
    turnVoice: (direction) => direction === "links" ? "Svoltate a sinistra!" : "Svoltate a destra!",
    buildDecisionPrompt: (options, question) => {
      const q = question ?? "Fai ora la tua scelta.";
      const list = options.join(". Oppure: ");
      return `${q} ${list}.`;
    },
    decisionFeedback: (hint) => {
      const v = [
        `Questo rivela una personalità con ${hint}. Una verità profonda su di te, qui nel silenzio della natura.`,
        `${hint} — è questo che ti distingue su questo cammino.`,
        `Questa scelta porta la firma di ${hint}. Niente qui è casuale.`,
        `Hai scelto. E questa scelta rivela ${hint} — nel profondo di te.`,
      ];
      return v[Math.floor(Math.random() * v.length)];
    },
    poiAside: (name, extract) =>
      extract
        ? `Piccola interruzione della leggenda, un luogo reale proprio vicino a te: ${name}. ${extract}`
        : `Piccola interruzione della leggenda, un luogo reale proprio vicino a te: ${name} — un testimone silenzioso del passato.`,
    soloGreeting: (name) => `Benvenuto·a su questo cammino, ${name}. Lascia che la leggenda ti guidi.`,
    timeOfDayGreeting: (tod) => ({ morgen: "Le montagne si stanno ancora svegliando — un buon mattino per le storie antiche.", mittag: "Il sole a picco proietta ombre nette, eppure questo sentiero cela ancora segreti.", abend: "La luce della sera tinge tutto di un oro caldo — l'ora giusta per le leggende.", nacht: "L'oscurità avvolge il sentiero. È proprio ora che le storie antiche si risvegliano." } as const)[tod],
    photoChallengePrompt: "Sei nel cuore di questa leggenda. Ferma questo luogo speciale in una foto.",
    weatherPhrase: (k) => ({
      heiss:    "Il calore pesa sulla valle — come se il sole avesse oggi un antico verdetto da pronunciare.",
      sonnig:   "Il sole splende chiaro nel cielo. Giornate simili hanno sempre attirato le storie giuste.",
      bewoelkt: "Nuvole grigie scivolano basse sul sentiero. Nessuna luce senza ombra — nessuna ombra senza mistero.",
      nebel:    "La nebbia avvolge il sentiero. Il confine tra un tempo e oggi si sfuma.",
      regen:    "La pioggia cade uniforme su terra antica. Giornate simili hanno sempre invitato le vecchie storie.",
      schnee:   "La neve giace silenziosa sul sentiero. Il silenzio conosce questa leggenda da tempo.",
      kalt:     "Il freddo morde le guance — esattamente come doveva sembrare allora.",
      gewitter: "C'è un temporale nell'aria. Le vecchie storie non hanno bisogno di una cornice migliore.",
    } as const)[k],
    surfaceTransitionPhrase: (surface) =>
      (({ asphalt: "Il sentiero passa sull'asfalto. Un tempo altri passi battevano questi percorsi.", kies: "La ghiaia scricchiola sotto le suole. Il cammino diventa più aspro — e più vero.", naturweg: "Terra nuda sotto i piedi. Qui la gente camminava ben prima che si costruissero strade.", fels: "Roccia nuda ti sostiene ora. Pietra antichissima che la leggenda ha sempre conosciuto.", holz: "Assi di legno ti guidano — ogni passo risuona un po', come se il sentiero sussurrasse di rimando." } as Record<string, string>)[surface]) ?? "La natura del sentiero cambia. La leggenda ti accompagna ancora.",
    milestonePhrase: (pct, name) =>
      (name
        ? ({ 25: `Un quarto completato, ${name}. La leggenda ti porta avanti.`, 50: `Metà strada, ${name}. Ciò che hai percorso è lungo quanto ciò che ti aspetta ancora.`, 75: `Un ultimo tratto, ${name}. Tre quarti sono già alle tue spalle.` } as Record<number, string>)
        : ({ 25: "Un quarto del cammino è alle tue spalle. La leggenda ti ha già trascinato un po' nel suo regno.", 50: "La metà. Il cammino dietro di te è lungo quanto quello davanti.", 75: "Tre quarti. Questo cammino si imprimerà presto per sempre nella tua memoria." } as Record<number, string>)
      )[pct] ?? "",
    routeBriefing: (p) => {
      const diff = ({ leicht: "un percorso facile", mittel: "un percorso medio", anspruchsvoll: "un percorso impegnativo" } as const)[p.difficulty];
      const dur = p.minutes < 70 ? `circa ${Math.round(p.minutes / 5) * 5} minuti` : p.minutes < 90 ? "circa un'ora" : `circa ${Math.round(p.minutes / 30) / 2} ore`;
      const n = p.name ? `${p.name}, hai scelto ` : "Hai scelto ";
      const wk = p.wetterKlasse;
      const wetterHart = wk === "regen" || wk === "schnee" || wk === "gewitter";
      const wetterHeiss = wk === "heiss";
      const long = p.minutes >= 90;
      const steep = p.hasSteepSections
        ? wetterHeiss
          ? " Ti aspetta una salita ripida — con questo caldo è particolarmente faticosa. Fai delle pause."
          : wetterHart
            ? " Ti aspettano tratti ripidi — impegnativi con questo tempo, cammina con passo sicuro."
            : " Ti aspettano alcuni tratti ripidi — il fiato si farà sentire."
        : "";
      const surfMap: Record<string, string> = { asphalt: "asfalto", kies: "ghiaia", naturweg: "sentieri naturali", fels: "roccia", holz: "passerelle in legno" };
      const surfParts = p.surfaces.map((s) => surfMap[s] ?? s);
      const rutschig = wetterHart && p.surfaces.some((s) => ["kies", "naturweg", "fels"].includes(s));
      const surf = surfParts.length
        ? rutschig
          ? ` Il percorso attraversa ${surfParts.join(" e ")} — scivoloso con questo tempo, scarpe solide sono fondamentali.`
          : ` Il percorso attraversa ${surfParts.join(" e ")}.`
        : "";
      const poi = p.poiNames.length ? ` Lungo il cammino potresti incontrare ${p.poiNames.slice(0, 3).join(", ")} — luoghi già presenti nella leggenda.` : "";
      const gearMap: Record<string, string> = {
        heiss: ` Bevi molta acqua, proteggi testa e pelle dal sole${long ? " e porta con te abbastanza provviste" : ""}.`,
        sonnig: ` Scarpe robuste con buona suola sono consigliate${long ? " — e abbastanza acqua e provviste per il percorso" : " con un po' di protezione solare"}.`,
        bewoelkt: ` Una giacca leggera e buone scarpe sono sufficienti${long ? " — ricorda bevande e uno spuntino" : ""}.`,
        nebel: ` Nella nebbia: vestirsi a strati, procedere con cura${long ? " e tenere provviste e bevande a portata" : ""}.`,
        regen: ` Scarpe impermeabili e giacca antipioggia sono indispensabili${long ? " — porta anche abbastanza bevande e provviste" : ""}.`,
        schnee: ` Suole con grip, guanti e strati caldi${long ? " oltre a provviste caloriche per mantenere l'energia" : ""}.`,
        kalt: ` Abbigliamento caldo a strati e qualcosa di caldo nel thermos${long ? " — le provviste non vanno dimenticate" : ""}.`,
        gewitter: ` Temporale in arrivo — resta sotto la linea degli alberi, giacca a portata${long ? " e provviste nello zaino" : ""}.`,
      };
      const gear = wk ? (gearMap[wk] ?? "") : long ? " Non dimenticare acqua e provviste sufficienti per il percorso." : "";
      return `${n}${diff}: ${p.distanceKm.toFixed(1)} km, ${dur}.${steep}${surf}${poi}${gear}`.trim();
    },
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
    turnVoice: (direction) => direction === "links" ? "Turn left!" : "Turn right!",
    buildDecisionPrompt: (options, question) => {
      const q = question ?? "Make your choice now.";
      const list = options.join(". Or: ");
      return `${q} ${list}.`;
    },
    decisionFeedback: (hint) => {
      const v = [
        `This speaks to a personality shaped by ${hint}. A deep truth about you, out here in the stillness.`,
        `${hint} — that is what defines you on this path.`,
        `This choice carries the mark of ${hint}. Nothing here is coincidence.`,
        `You have chosen. And that choice reveals ${hint} — deep inside you, always.`,
      ];
      return v[Math.floor(Math.random() * v.length)];
    },
    poiAside: (name, extract) =>
      extract
        ? `A brief break from the saga — a real place right near you: ${name}. ${extract}`
        : `A brief break from the saga — a real place right near you: ${name} — a quiet witness to times past.`,
    soloGreeting: (name) => `Welcome to the trail, ${name}. Let the saga guide you.`,
    timeOfDayGreeting: (tod) => ({ morgen: "The mountains are still waking — a good morning for old tales.", mittag: "The midday sun casts sharp shadows, yet this path still hides its secrets.", abend: "Evening light bathes everything in warm gold — the right hour for legends.", nacht: "Darkness lies over the path. This is when old stories stir." } as const)[tod],
    photoChallengePrompt: "You are at the heart of this saga. Capture this special place in a photo.",
    weatherPhrase: (k) => ({
      heiss:    "The heat bears down on the valley — as if the sun had an old verdict to deliver today.",
      sonnig:   "The sun stands clear in the sky. Days like this have always drawn the right stories out.",
      bewoelkt: "Grey clouds drift low over the path. No light without shadow — no shadow without secret.",
      nebel:    "Mist lies over the trail. The line between long ago and today grows thin.",
      regen:    "Rain falls steadily on old ground. Days like this have always kept good company with old tales.",
      schnee:   "Snow rests still on the path. The silence has known this saga for a long time.",
      kalt:     "The cold bites at your cheeks — exactly as it must have felt back then.",
      gewitter: "A storm is gathering. Old stories have never needed a better setting.",
    } as const)[k],
    surfaceTransitionPhrase: (surface) =>
      (({ asphalt: "The path meets asphalt. Once, very different feet walked here.", kies: "Gravel crunches underfoot. The trail grows rougher — and more honest.", naturweg: "Bare earth lies under your feet. People have moved here long before any road was built.", fels: "Bare rock carries you now. Ancient stone the saga has always known.", holz: "Wooden boards guide you forward — each step echoes a little, as if the path whispers back." } as Record<string, string>)[surface]) ?? "The character of the trail changes. The saga walks with you still.",
    milestonePhrase: (pct, name) =>
      (name
        ? ({ 25: `A quarter done, ${name}. The saga carries you onward.`, 50: `Halfway, ${name}. What lies behind is as far as what still waits for you.`, 75: `One last stretch, ${name}. Three quarters already lie behind you.` } as Record<number, string>)
        : ({ 25: "A quarter of the way behind you. The saga has drawn you a little deeper into its world.", 50: "Halfway. The path behind you is as long as the path ahead.", 75: "Three quarters. This trail will soon be written permanently into your memory." } as Record<number, string>)
      )[pct] ?? "",
    routeBriefing: (p) => {
      const diff = ({ leicht: "an easy", mittel: "a moderate", anspruchsvoll: "a challenging" } as const)[p.difficulty];
      const dur = p.minutes < 70 ? `about ${Math.round(p.minutes / 5) * 5} minutes` : p.minutes < 90 ? "about an hour" : `about ${Math.round(p.minutes / 30) / 2} hours`;
      const n = p.name ? `${p.name}, you've chosen ` : "You've chosen ";
      const wk = p.wetterKlasse;
      const wetterHart = wk === "regen" || wk === "schnee" || wk === "gewitter";
      const wetterHeiss = wk === "heiss";
      const long = p.minutes >= 90;
      const steep = p.hasSteepSections
        ? wetterHeiss
          ? " A steep climb lies ahead — draining in this heat. Take your time and rest when needed."
          : wetterHart
            ? " Steep sections are ahead — demanding in these conditions, place every step with care."
            : " There are a few steep stretches ahead — your heart will feel it."
        : "";
      const surfMap: Record<string, string> = { asphalt: "asphalt", kies: "gravel", naturweg: "natural trail", fels: "rock", holz: "wooden boardwalks" };
      const surfParts = p.surfaces.map((s) => surfMap[s] ?? s);
      const rutschig = wetterHart && p.surfaces.some((s) => ["kies", "naturweg", "fels"].includes(s));
      const surf = surfParts.length
        ? rutschig
          ? ` The path crosses ${surfParts.join(" and ")} — slippery in this weather, sturdy footwear is essential.`
          : ` The path crosses ${surfParts.join(" and ")}.`
        : "";
      const poi = p.poiNames.length ? ` Along the way you might encounter ${p.poiNames.slice(0, 3).join(", ")} — places the legend already knows.` : "";
      const gearMap: Record<string, string> = {
        heiss: ` Drink plenty of water, protect your head and skin from the sun${long ? " and pack enough food and snacks" : ""}.`,
        sonnig: ` Good shoes with solid grip are recommended${long ? " — and enough water and food for the trail" : " and some sun protection"}.`,
        bewoelkt: ` A light jacket and solid footwear will do${long ? " — don't forget drinks and a snack" : ""}.`,
        nebel: ` In the fog: layer up, tread carefully${long ? " and keep food and drinks within easy reach" : ""}.`,
        regen: ` Waterproof shoes and a rain jacket are a must${long ? " — pack enough drinks and food too" : ""}.`,
        schnee: ` Grip soles, gloves, and warm layers${long ? " plus high-calorie snacks to keep your energy up" : ""}.`,
        kalt: ` Warm clothing in layers and something hot in a flask${long ? " — enough food is just as important" : ""}.`,
        gewitter: ` Storm approaching — stay below the treeline, keep your jacket handy${long ? " and food stowed in your pack" : ""}.`,
      };
      const gear = wk ? (gearMap[wk] ?? "") : long ? " Don't forget enough water and food for the trail." : "";
      return `${n}${diff} route: ${p.distanceKm.toFixed(1)} km, ${dur}.${steep}${surf}${poi}${gear}`.trim();
    },
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
    turnVoice: (direction) => direction === "links" ? "向左转。" : "向右转。",
    buildDecisionPrompt: (options, question) => {
      const q = question ?? "请做出你的选择。";
      const list = options.join("。或者：");
      return `${q} ${list}。`;
    },
    decisionFeedback: (hint) => {
      const v = [
        `这体现了一种具有${hint}的性格。在这片寂静中，这是关于你自己的深刻真相。`,
        `${hint}——这就是你在这条路上的本质。`,
        `这个选择带有${hint}的印记。这里的一切都非偶然。`,
        `你已做出选择。而这个选择揭示了${hint}——深藏在你内心，始终如此。`,
      ];
      return v[Math.floor(Math.random() * v.length)];
    },
    poiAside: (name, extract) =>
      extract
        ? `传说暂停一下，你身边有一个真实的地方：${name}。${extract}`
        : `传说暂停一下，你身边有一个真实的地方：${name}——一段往昔岁月的沉默见证。`,
    soloGreeting: (name) => `欢迎踏上这条小路，${name}。让传说引领你前行。`,
    timeOfDayGreeting: (tod) => ({ morgen: "山峦尚在沉睡中苏醒——这是聆听古老故事的好早晨。", mittag: "正午的阳光投下清晰的阴影，然而这条路仍藏着秘密。", abend: "傍晚的光将一切染成温暖的金色——这正是传说最宜讲述的时刻。", nacht: "黑暗笼罩着山径。正是在这样的时刻，古老的故事悄然苏醒。" } as const)[tod],
    photoChallengePrompt: "你正身处这段传说的核心之地。用一张照片记录下这个特别的地方。",
    weatherPhrase: (k) => ({
      heiss:    "酷热笼罩山谷，仿佛太阳今日要宣布一个古老的裁决。",
      sonnig:   "阳光清澈地立于天穹。这样的日子，向来最适合古老的故事。",
      bewoelkt: "灰色云层低低地掠过山径。有光必有影，有影必有秘密。",
      nebel:    "雾气笼罩着小径。昨日与今日的界限，悄然模糊。",
      regen:    "雨水均匀地落在古老的土地上。这样的日子，向来是古老故事的良伴。",
      schnee:   "积雪静静覆盖着山径。这片寂静，早已认识这段传说。",
      kalt:     "寒意咬上脸颊——想必当年，也是如此。",
      gewitter: "雷雨蓄势待发。古老的故事，从不需要更好的舞台。",
    } as const)[k],
    surfaceTransitionPhrase: (surface) =>
      (({ asphalt: "山径换上了沥青路面。曾经，全然不同的脚步踏过这里。", kies: "砾石在脚底咯吱作响。路变得更粗粝——也更真实。", naturweg: "赤裸的土地在脚下。早在修路之前，人们便已在这里行走。", fels: "裸露的岩石托起你的脚步。这块古老的石头，传说从来都认识它。", holz: "木板引路，每一步都微微回响——仿佛山路在轻声回应。" } as Record<string, string>)[surface]) ?? "路的质地悄然变换。传说依然与你同行。",
    milestonePhrase: (pct, name) =>
      (name
        ? ({ 25: `完成了四分之一，${name}。传说继续带你前行。`, 50: `到了中点，${name}。走过的路，和前方等待的路一样远。`, 75: `最后一段路了，${name}。四分之三已经在你身后。` } as Record<number, string>)
        : ({ 25: "四分之一的路已在身后。传说已将你引入它的领地一隅。", 50: "走完一半。身后的路，与前方的路一样长。", 75: "四分之三。这段路即将永远刻入你的记忆。" } as Record<number, string>)
      )[pct] ?? "",
    routeBriefing: (p) => {
      const diff = ({ leicht: "一条轻松的", mittel: "一条中等难度的", anspruchsvoll: "一条富有挑战的" } as const)[p.difficulty];
      const dur = p.minutes < 70 ? `约${Math.round(p.minutes / 5) * 5}分钟` : p.minutes < 90 ? "约一小时" : `约${Math.round(p.minutes / 30) / 2}小时`;
      const n = p.name ? `${p.name}，你选择了` : "你选择了";
      const wk = p.wetterKlasse;
      const wetterHart = wk === "regen" || wk === "schnee" || wk === "gewitter";
      const wetterHeiss = wk === "heiss";
      const long = p.minutes >= 90;
      const steep = p.hasSteepSections
        ? wetterHeiss
          ? "前方有陡坡 — 在这种高温下格外消耗体力，注意休息。"
          : wetterHart
            ? "前方有陡坡 — 在这种天气下尤为艰难，请稳步前行。"
            : "路上有几段陡坡，需要一定体力。"
        : "";
      const surfMap: Record<string, string> = { asphalt: "沥青路", kies: "碎石路", naturweg: "自然小道", fels: "岩石地带", holz: "木栈道" };
      const surfParts = p.surfaces.map((s) => surfMap[s] ?? s);
      const rutschig = wetterHart && p.surfaces.some((s) => ["kies", "naturweg", "fels"].includes(s));
      const surf = surfParts.length
        ? rutschig
          ? `道路经过${surfParts.join("和")} — 这种天气下容易湿滑，务必穿结实的鞋。`
          : `道路经过${surfParts.join("和")}。`
        : "";
      const poi = p.poiNames.length ? `途中可能经过${p.poiNames.slice(0, 3).join("、")} — 传说中早已铭刻的地方。` : "";
      const gearMap: Record<string, string> = {
        heiss: `多喝水，做好防晒${long ? "，并备足食物和补给" : ""}。`,
        sonnig: `建议穿防滑性好的鞋子${long ? "，并携带足够的水和食物" : "，做好防晒"} 。`,
        bewoelkt: `一件轻薄外套加上结实的鞋子就够了${long ? " — 别忘了带饮品和干粮" : ""}。`,
        nebel: `雾中行走：分层穿衣，谨慎迈步${long ? "，食物和饮品随手可取" : ""}。`,
        regen: `防水鞋和雨衣必不可少${long ? " — 同时备足饮品和干粮" : ""}。`,
        schnee: `防滑鞋底、手套和保暖层${long ? "，以及高热量食物补充能量" : ""}。`,
        kalt: `穿暖和的分层衣物，备好热饮${long ? " — 充足的干粮同样重要" : ""}。`,
        gewitter: `雷暴将至 — 保持在林线以下，备好外套${long ? "，食物放入背包" : ""}。`,
      };
      const gear = wk ? (gearMap[wk] ?? "") : long ? "别忘了携带足够的水和食物。" : "";
      return `${n}${diff}路线：${p.distanceKm.toFixed(1)}公里，${dur}。${steep}${surf}${poi}${gear}`.trim();
    },
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
    turnVoice: (direction) => direction === "links" ? "¡Gire a la izquierda!" : "¡Gire a la derecha!",
    buildDecisionPrompt: (options, question) => {
      const q = question ?? "Toma tu decisión ahora.";
      const list = options.join(". O bien: ");
      return `${q} ${list}.`;
    },
    decisionFeedback: (hint) => {
      const v = [
        `Esto habla de una personalidad definida por ${hint}. Una verdad profunda sobre ti, aquí en el silencio de la naturaleza.`,
        `${hint} — eso es lo que te define en este camino.`,
        `Esta elección lleva la marca de ${hint}. Nada aquí es casualidad.`,
        `Has elegido. Y esa elección revela ${hint} — en lo más profundo de ti.`,
      ];
      return v[Math.floor(Math.random() * v.length)];
    },
    poiAside: (name, extract) =>
      extract
        ? `Breve pausa de la leyenda, un lugar real muy cerca de ti: ${name}. ${extract}`
        : `Breve pausa de la leyenda, un lugar real muy cerca de ti: ${name} — un testigo silencioso de tiempos pasados.`,
    soloGreeting: (name) => `Bienvenido·a al sendero, ${name}. Deja que la leyenda te guíe.`,
    timeOfDayGreeting: (tod) => ({ morgen: "Las montañas aún se despiertan — una buena mañana para historias antiguas.", mittag: "El sol del mediodía proyecta sombras nítidas, y aun así este camino guarda secretos.", abend: "La luz del atardecer lo baña todo en oro cálido — la hora justa para las leyendas.", nacht: "La oscuridad cubre el sendero. Es ahora cuando las viejas historias despiertan." } as const)[tod],
    photoChallengePrompt: "Estás en el corazón de esta leyenda. Inmortaliza este lugar especial en una foto.",
    weatherPhrase: (k) => ({
      heiss:    "El calor pesa sobre el valle — como si el sol tuviera hoy un viejo veredicto que dictar.",
      sonnig:   "El sol luce claro en el cielo. Días así siempre han atraído las historias adecuadas.",
      bewoelkt: "Nubes grises se deslizan bajas sobre el sendero. No hay luz sin sombra — no hay sombra sin misterio.",
      nebel:    "La niebla cubre el camino. La línea entre el pasado y el hoy se difumina.",
      regen:    "La lluvia cae uniforme sobre tierra antigua. Días así siempre han invitado a los viejos relatos.",
      schnee:   "La nieve descansa silenciosa en el sendero. El silencio conoce esta leyenda desde hace mucho.",
      kalt:     "El frío muerde las mejillas — exactamente así debió de sentirse entonces.",
      gewitter: "Se avecina una tormenta. Las viejas historias nunca han necesitado mejor escenario.",
    } as const)[k],
    surfaceTransitionPhrase: (surface) =>
      (({ asphalt: "El sendero llega al asfalto. Antes, pasos muy distintos recorrían estos caminos.", kies: "La grava cruje bajo las suelas. El camino se vuelve más áspero — y más genuino.", naturweg: "Tierra desnuda bajo los pies. Aquí caminaba la gente mucho antes de que se construyeran caminos.", fels: "Roca desnuda te sostiene ahora. Piedra milenaria que la leyenda siempre ha conocido.", holz: "Tablones de madera te guían — cada paso resuena un poco, como si el sendero susurrara de vuelta." } as Record<string, string>)[surface]) ?? "La naturaleza del camino cambia. La leyenda te acompaña todavía.",
    milestonePhrase: (pct, name) =>
      (name
        ? ({ 25: `Un cuarto completado, ${name}. La leyenda te lleva más lejos.`, 50: `A mitad de camino, ${name}. Lo que tienes detrás es tan largo como lo que aún te espera.`, 75: `Un último trecho, ${name}. Ya llevas tres cuartos a tus espaldas.` } as Record<number, string>)
        : ({ 25: "Un cuarto del camino queda atrás. La leyenda ya te ha arrastrado un poco hacia su reino.", 50: "La mitad. El camino detrás de ti es tan largo como el que queda por delante.", 75: "Tres cuartos. Este camino pronto quedará grabado para siempre en tu memoria." } as Record<number, string>)
      )[pct] ?? "",
    routeBriefing: (p) => {
      const diff = ({ leicht: "una ruta fácil", mittel: "una ruta moderada", anspruchsvoll: "una ruta exigente" } as const)[p.difficulty];
      const dur = p.minutes < 70 ? `unos ${Math.round(p.minutes / 5) * 5} minutos` : p.minutes < 90 ? "aproximadamente una hora" : `unas ${Math.round(p.minutes / 30) / 2} horas`;
      const n = p.name ? `${p.name}, has elegido ` : "Has elegido ";
      const wk = p.wetterKlasse;
      const wetterHart = wk === "regen" || wk === "schnee" || wk === "gewitter";
      const wetterHeiss = wk === "heiss";
      const long = p.minutes >= 90;
      const steep = p.hasSteepSections
        ? wetterHeiss
          ? " Te espera una subida empinada — especialmente agotadora con este calor. Haz pausas."
          : wetterHart
            ? " Hay tramos empinados por delante — exigentes con este tiempo, pisa con cuidado."
            : " Hay algunos tramos empinados por delante — el corazón lo notará."
        : "";
      const surfMap: Record<string, string> = { asphalt: "asfalto", kies: "grava", naturweg: "sendero natural", fels: "roca", holz: "pasarelas de madera" };
      const surfParts = p.surfaces.map((s) => surfMap[s] ?? s);
      const rutschig = wetterHart && p.surfaces.some((s) => ["kies", "naturweg", "fels"].includes(s));
      const surf = surfParts.length
        ? rutschig
          ? ` El camino discurre por ${surfParts.join(" y ")} — resbaladizo con este tiempo, el calzado resistente es clave.`
          : ` El camino discurre por ${surfParts.join(" y ")}.`
        : "";
      const poi = p.poiNames.length ? ` Por el camino podrías encontrarte con ${p.poiNames.slice(0, 3).join(", ")} — lugares que la leyenda ya conoce.` : "";
      const gearMap: Record<string, string> = {
        heiss: ` Bebe mucha agua, protege cabeza y piel del sol${long ? " y lleva suficientes provisiones" : ""}.`,
        sonnig: ` Se recomiendan botas con buena suela${long ? " — y suficiente agua y provisiones para el camino" : " y algo de protección solar"}.`,
        bewoelkt: ` Una chaqueta ligera y buenas botas serán suficientes${long ? " — recuerda llevar bebidas y algo de comida" : ""}.`,
        nebel: ` En la niebla: vístete por capas, avanza con cuidado${long ? " y ten provisiones y bebidas a mano" : ""}.`,
        regen: ` Botas imperméables y chubasquero son imprescindibles${long ? " — lleva también suficientes bebidas y provisiones" : ""}.`,
        schnee: ` Suela con agarre, guantes y capas cálidas${long ? " junto con provisiones calóricas para mantener la energía" : ""}.`,
        kalt: ` Ropa abrigada en capas y algo caliente en el termo${long ? " — las provisiones son igual de importantes" : ""}.`,
        gewitter: ` Tormenta en camino — mantente bajo la línea de árboles, chaqueta a mano${long ? " y provisiones en la mochila" : ""}.`,
      };
      const gear = wk ? (gearMap[wk] ?? "") : long ? " No olvides suficiente agua y provisiones para el recorrido." : "";
      return `${n}${diff}: ${p.distanceKm.toFixed(1)} km, ${dur}.${steep}${surf}${poi}${gear}`.trim();
    },
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
    turnVoice: (direction) => direction === "links" ? "Vire à esquerda!" : "Vire à direita!",
    buildDecisionPrompt: (options, question) => {
      const q = question ?? "Faça sua escolha agora.";
      const list = options.join(". Ou então: ");
      return `${q} ${list}.`;
    },
    decisionFeedback: (hint) => {
      const v = [
        `Isso revela uma personalidade moldada por ${hint}. Uma verdade profunda sobre você, aqui no silêncio da natureza.`,
        `${hint} — é isso que te define neste caminho.`,
        `Esta escolha carrega a marca de ${hint}. Nada aqui é coincidência.`,
        `Você escolheu. E essa escolha revela ${hint} — no fundo de você, sempre.`,
      ];
      return v[Math.floor(Math.random() * v.length)];
    },
    poiAside: (name, extract) =>
      extract
        ? `Pequena pausa na lenda, um lugar real bem perto de você: ${name}. ${extract}`
        : `Pequena pausa na lenda, um lugar real bem perto de você: ${name} — uma testemunha silenciosa de tempos passados.`,
    soloGreeting: (name) => `Bem-vindo·a à trilha, ${name}. Deixa a lenda te guiar.`,
    timeOfDayGreeting: (tod) => ({ morgen: "As montanhas ainda estão a despertar — uma boa manhã para histórias antigas.", mittag: "O sol do meio-dia projeta sombras nítidas, mas este caminho ainda guarda segredos.", abend: "A luz da tarde banha tudo em ouro quente — a hora certa para as lendas.", nacht: "A escuridão cobre o caminho. É agora que as velhas histórias despertam." } as const)[tod],
    photoChallengePrompt: "Estás no coração desta lenda. Guarda este lugar especial numa foto.",
    weatherPhrase: (k) => ({
      heiss:    "O calor pesa sobre o vale — como se o sol tivesse hoje um antigo veredicto a pronunciar.",
      sonnig:   "O sol brilha claro no céu. Dias assim sempre atraíram as histórias certas.",
      bewoelkt: "Nuvens cinzentas deslizam baixas sobre o trilho. Não há luz sem sombra — não há sombra sem segredo.",
      nebel:    "O nevoeiro cobre o caminho. A fronteira entre o ontem e o hoje esfuma-se.",
      regen:    "A chuva cai uniformemente sobre terra antiga. Dias assim sempre convidaram às histórias de outros tempos.",
      schnee:   "A neve repousa silenciosa no trilho. O silêncio conhece esta lenda há muito tempo.",
      kalt:     "O frio morde as bochechas — exatamente como devia ter parecido naquele tempo.",
      gewitter: "Uma tempestade se aproxima. As velhas histórias nunca precisaram de um cenário melhor.",
    } as const)[k],
    surfaceTransitionPhrase: (surface) =>
      (({ asphalt: "O trilho encontra o asfalto. Noutros tempos, outros passos percorreram estes caminhos.", kies: "O cascalho range sob as solas. O caminho torna-se mais áspero — e mais genuíno.", naturweg: "Terra nua sob os pés. Aqui as pessoas caminhavam muito antes de se construírem estradas.", fels: "Rocha nua te sustenta agora. Pedra milenar que a lenda sempre conheceu.", holz: "Tábuas de madeira guiam-te — cada passo ressoa um pouco, como se o caminho sussurrasse de volta." } as Record<string, string>)[surface]) ?? "A natureza do trilho muda. A lenda continua a acompanhar-te.",
    milestonePhrase: (pct, name) =>
      (name
        ? ({ 25: `Um quarto concluído, ${name}. A lenda leva-te mais longe.`, 50: `A meio caminho, ${name}. O que ficou para trás é tão longo quanto o que ainda te aguarda.`, 75: `Um último trecho, ${name}. Três quartos já ficaram para trás.` } as Record<number, string>)
        : ({ 25: "Um quarto do caminho fica para trás. A lenda já te puxou um pouco para o seu reino.", 50: "A metade. O caminho atrás de ti é tão longo quanto o que está à tua frente.", 75: "Três quartos. Este trilho vai gravar-se em breve para sempre na tua memória." } as Record<number, string>)
      )[pct] ?? "",
    routeBriefing: (p) => {
      const diff = ({ leicht: "uma rota fácil", mittel: "uma rota moderada", anspruchsvoll: "uma rota exigente" } as const)[p.difficulty];
      const dur = p.minutes < 70 ? `cerca de ${Math.round(p.minutes / 5) * 5} minutos` : p.minutes < 90 ? "cerca de uma hora" : `cerca de ${Math.round(p.minutes / 30) / 2} horas`;
      const n = p.name ? `${p.name}, escolheste ` : "Escolheste ";
      const wk = p.wetterKlasse;
      const wetterHart = wk === "regen" || wk === "schnee" || wk === "gewitter";
      const wetterHeiss = wk === "heiss";
      const long = p.minutes >= 90;
      const steep = p.hasSteepSections
        ? wetterHeiss
          ? " Uma subida íngreme espera-te — especialmente esgotante com este calor. Faz pausas."
          : wetterHart
            ? " Há trechos íngremes à frente — exigentes com este tempo, pisa com firmeza."
            : " Há alguns trechos íngremes à frente — o coração vai sentir."
        : "";
      const surfMap: Record<string, string> = { asphalt: "asfalto", kies: "cascalho", naturweg: "trilhos naturais", fels: "rocha", holz: "passadeiras de madeira" };
      const surfParts = p.surfaces.map((s) => surfMap[s] ?? s);
      const rutschig = wetterHart && p.surfaces.some((s) => ["kies", "naturweg", "fels"].includes(s));
      const surf = surfParts.length
        ? rutschig
          ? ` O caminho passa por ${surfParts.join(" e ")} — escorregadio com este tempo, calçado resistente é fundamental.`
          : ` O caminho passa por ${surfParts.join(" e ")}.`
        : "";
      const poi = p.poiNames.length ? ` Ao longo do caminho podes encontrar ${p.poiNames.slice(0, 3).join(", ")} — lugares que a lenda já conhece.` : "";
      const gearMap: Record<string, string> = {
        heiss: ` Bebe muita água, protege cabeça e pele do sol${long ? " e leva provisões suficientes" : ""}.`,
        sonnig: ` Boas botas com boa aderência são recomendadas${long ? " — e água e comida suficientes para o percurso" : " com alguma proteção solar"}.`,
        bewoelkt: ` Uma jaqueta leve e bom calçado chegam${long ? " — não te esqueças de bebidas e um lanche" : ""}.`,
        nebel: ` No nevoeiro: veste em camadas, avança com cuidado${long ? " e mantém provisões e bebidas à mão" : ""}.`,
        regen: ` Botas impermeáveis e capa de chuva são indispensáveis${long ? " — leva também bebidas e provisões suficientes" : ""}.`,
        schnee: ` Sola antiderrapante, luvas e camadas quentes${long ? " mais provisões calóricas para manter a energia" : ""}.`,
        kalt: ` Roupas quentes em camadas e algo quente no termo${long ? " — as provisões são igualmente importantes" : ""}.`,
        gewitter: ` Trovoada a caminho — fica abaixo da linha das árvores, jaqueta à mão${long ? " e provisões na mochila" : ""}.`,
      };
      const gear = wk ? (gearMap[wk] ?? "") : long ? " Não te esqueças de água e provisões suficientes para o percurso." : "";
      return `${n}${diff}: ${p.distanceKm.toFixed(1)} km, ${dur}.${steep}${surf}${poi}${gear}`.trim();
    },
  },

  ru: {
    archetypeLens: {
      reisende:
        "Как Путешественник ты приходишь издалека. Твой зоркий взгляд улавливает каждое движение в тумане.",
      hueterin:
        "Как Хранитель ты связан с этой землёй. Ты слышишь шёпот между камнями.",
      gewitzte:
        "Как Хитрец ты ищешь брешь в любой угрозе. Там, где другие чувствуют страх, ты ищешь выход.",
      senn: "Как Пастух ты знаешь эту гору. Ты спокойно читаешь знаки, как делал это всегда.",
    },
    ch1: (canton, title, lens) =>
      `Тропа ведёт в самое сердце ${canton}. Холодный воздух касается твоего лица, и ты чувствуешь, насколько древне это место. ${lens} Легенда о ${title} словно витает в воздухе.`,
    ch2: (summary) =>
      `Перед тобой открывается картина. ${summary} Ты всего лишь свидетель этого древнего события — и всё же оно затягивает тебя.`,
    ch3Adult:
      "Глубокая тень падает на тропу, и глухой гул поднимается из скалы. Что-то движется на краю твоего зрения.",
    ch3Kinder:
      "Тень скользит по тропе. Она кажется странной, но не злой. Что-то движется на краю твоего зрения.",
    ch3Question: "Как ты встречаешь то, что приближается?",
    ch3Options: [
      { label: "Я делаю шаг вперёд и стою на месте.", archetypeHint: "Смелость Путешественника", tone: "mutig" },
      { label: "Я остаюсь неподвижным и наблюдаю.", archetypeHint: "Спокойствие Пастуха", tone: "bedacht" },
      { label: "Я ищу в тени какой-нибудь знак.", archetypeHint: "Хитрость Хитреца", tone: "wachsam" },
    ],
    ch4: "Гул стихает. То, что когда-то здесь произошло, разворачивается перед твоими глазами, неотвратимо, как течение воды. Ты понимаешь: легенда — это больше, чем сказка, она всё ещё живёт в этой долине.",
    ch5Text:
      "В последний раз событие обращается к тебе, будто спрашивая, что ты уносишь с собой из этого места.",
    ch5Question: "Что ты уносишь из этой встречи?",
    ch5Options: [
      { label: "Благоговение перед тем, что больше меня.", archetypeHint: "Смирение", tone: "ehrfuerchtig" },
      { label: "Уверенность в том, что истории могут быть правдой.", archetypeHint: "Прозрение", tone: "nachdenklich" },
    ],
    chFinal:
      "Момент проходит. Природа возвращается к своему привычному ходу, ветер стихает. Ты идёшь дальше, отмеченный этой встречей, а долина хранит свою тайну — до следующего путника.",
    navCue: (direction, landmark) =>
      `Чтобы добраться до легенды о ${landmark}, держись ${direction === "links" ? "левой" : "правой"} стороны на следующей развилке.`,
    turnVoice: (direction) => direction === "links" ? "Поверните налево!" : "Поверните направо!",
    buildDecisionPrompt: (options, question) => {
      const q = question ?? "Сделай свой выбор сейчас.";
      const list = options.join(". Или: ");
      return `${q} ${list}.`;
    },
    decisionFeedback: (hint) => {
      const v = [
        `Это говорит о личности, наделённой ${hint}. Глубокая правда о тебе — здесь, в тишине природы.`,
        `${hint} — вот что определяет тебя на этом пути.`,
        `Этот выбор несёт в себе отпечаток ${hint}. Здесь нет ничего случайного.`,
        `Ты выбрал. И этот выбор открывает ${hint} — глубоко внутри тебя, всегда.`,
      ];
      return v[Math.floor(Math.random() * v.length)];
    },
    poiAside: (name, extract) =>
      extract
        ? `Небольшое отступление от легенды — реальное место совсем рядом с тобой: ${name}. ${extract}`
        : `Небольшое отступление от легенды — реальное место совсем рядом с тобой: ${name} — тихий свидетель ушедших времён.`,
    soloGreeting: (name) => `Добро пожаловать на тропу, ${name}. Пусть легенда ведёт тебя.`,
    timeOfDayGreeting: (tod) => ({ morgen: "Горы ещё просыпаются — хорошее утро для старых историй.", mittag: "Полуденное солнце отбрасывает чёткие тени, и всё же этот путь хранит свои тайны.", abend: "Вечерний свет окрашивает всё в тёплое золото — самое время для легенд.", nacht: "Тьма лежит над тропой. Именно сейчас пробуждаются старые истории." } as const)[tod],
    photoChallengePrompt: "Ты в самом сердце этой легенды. Запечатли это особое место на фото.",
    weatherPhrase: (k) => ({
      heiss:    "Зной давит на долину — словно солнце сегодня выносит давний приговор.",
      sonnig:   "Солнце стоит ясно в небе. Такие дни всегда притягивали нужные истории.",
      bewoelkt: "Серые тучи ползут низко над тропой. Нет света без тени — нет тени без тайны.",
      nebel:    "Туман лежит над тропой. Граница между прошлым и сегодняшним днём стирается.",
      regen:    "Дождь ровно падает на древнюю землю. Такие дни всегда были добрыми попутчиками старых преданий.",
      schnee:   "Снег лежит тихо на тропе. Эта тишина знает предание уже очень давно.",
      kalt:     "Холод кусает щёки — наверное, именно так всё и ощущалось тогда.",
      gewitter: "В воздухе висит гроза. Старые истории никогда не нуждались в лучших декорациях.",
    } as const)[k],
    surfaceTransitionPhrase: (surface) =>
      (({ asphalt: "Тропа переходит на асфальт. Некогда по этим путям ступали совсем другие ноги.", kies: "Гравий хрустит под подошвами. Дорожка становится грубее — и честнее.", naturweg: "Голая земля под ногами. Люди ходили здесь задолго до того, как были проложены дороги.", fels: "Голый камень несёт тебя теперь. Древняя порода, которую предание знало всегда.", holz: "Деревянные доски ведут тебя дальше — каждый шаг чуть гулкий, словно тропа шепчет в ответ." } as Record<string, string>)[surface]) ?? "Характер дороги меняется. Предание идёт рядом.",
    milestonePhrase: (pct, name) =>
      (name
        ? ({ 25: `Четверть пройдена, ${name}. Предание несёт тебя дальше.`, 50: `Полпути, ${name}. То, что позади, так же далеко, как и то, что ещё ждёт.`, 75: `Последний отрезок, ${name}. Три четверти уже остались позади.` } as Record<number, string>)
        : ({ 25: "Четверть пути позади. Предание уже немного втянуло тебя в своё царство.", 50: "Половина. Путь за тобой так же долог, как и путь впереди.", 75: "Три четверти. Этот путь скоро навсегда врежется в твою память." } as Record<number, string>)
      )[pct] ?? "",
    routeBriefing: (p) => {
      const diff = ({ leicht: "лёгкий маршрут", mittel: "маршрут средней сложности", anspruchsvoll: "сложный маршрут" } as const)[p.difficulty];
      const dur = p.minutes < 70 ? `около ${Math.round(p.minutes / 5) * 5} минут` : p.minutes < 90 ? "около часа" : `около ${Math.round(p.minutes / 30) / 2} часов`;
      const n = p.name ? `${p.name}, ты выбрал ` : "Ты выбрал ";
      const wk = p.wetterKlasse;
      const wetterHart = wk === "regen" || wk === "schnee" || wk === "gewitter";
      const wetterHeiss = wk === "heiss";
      const long = p.minutes >= 90;
      const steep = p.hasSteepSections
        ? wetterHeiss
          ? " Впереди крутой подъём — в такую жару особенно изнурительный. Делай паузы."
          : wetterHart
            ? " Впереди крутые участки — при такой погоде непросто, ступай осторожно."
            : " Впереди несколько крутых подъёмов — сердце почувствует."
        : "";
      const surfMap: Record<string, string> = { asphalt: "асфальт", kies: "гравий", naturweg: "грунтовые тропы", fels: "скалы", holz: "деревянные мостки" };
      const surfParts = p.surfaces.map((s) => surfMap[s] ?? s);
      const rutschig = wetterHart && p.surfaces.some((s) => ["kies", "naturweg", "fels"].includes(s));
      const surf = surfParts.length
        ? rutschig
          ? ` Путь проходит по ${surfParts.join(" и ")} — в такую погоду скользко, надёжная обувь обязательна.`
          : ` Путь проходит по ${surfParts.join(" и ")}.`
        : "";
      const poi = p.poiNames.length ? ` По дороге ты можешь встретить ${p.poiNames.slice(0, 3).join(", ")} — места, которые предание уже знает.` : "";
      const gearMap: Record<string, string> = {
        heiss: ` Пей побольше воды, защити голову и кожу от солнца${long ? " и возьми достаточно еды" : ""}.`,
        sonnig: ` Рекомендуются крепкие ботинки с хорошей подошвой${long ? " — и достаточно воды и еды в дороге" : " и немного солнцезащиты"}.`,
        bewoelkt: ` Лёгкая куртка и хорошая обувь — вполне достаточно${long ? " — не забудь напитки и перекус" : ""}.`,
        nebel: ` В тумане: одеться слоями, ступать осторожно${long ? " и держать еду и напитки под рукой" : ""}.`,
        regen: ` Непромокаемые ботинки и дождевик обязательны${long ? " — возьми также достаточно напитков и еды" : ""}.`,
        schnee: ` Ботинки с протектором, перчатки и тёплые слои${long ? " плюс калорийная еда для поддержания сил" : ""}.`,
        kalt: ` Тёплая одежда в несколько слоёв и что-то горячее в термосе${long ? " — достаточно еды не менее важно" : ""}.`,
        gewitter: ` Гроза приближается — держись ниже линии деревьев, куртка под рукой${long ? " и еда в рюкзаке" : ""}.`,
      };
      const gear = wk ? (gearMap[wk] ?? "") : long ? " Не забудь взять достаточно воды и еды на маршрут." : "";
      return `${n}${diff}: ${p.distanceKm.toFixed(1)} км, ${dur}.${steep}${surf}${poi}${gear}`.trim();
    },
  },
};

/**
 * Kuerzt einen (potenziell langen) Wikipedia-Auszug fuer die gesprochene
 * Erzaehlung auf eine sprechbare Laenge, moeglichst an einer Satzgrenze.
 */
export function trimForNarration(text: string, maxLen = 240): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  const cut = trimmed.slice(0, maxLen);
  const lastSentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(".\n"));
  if (lastSentenceEnd > maxLen * 0.4) return cut.slice(0, lastSentenceEnd + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : cut.length)}…`;
}

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
