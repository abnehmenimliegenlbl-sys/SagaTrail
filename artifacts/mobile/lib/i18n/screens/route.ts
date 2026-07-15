import { createUseStrings, StringsDict } from "../createStrings";

export interface RouteStrings {
  notFound: string;
  title: string;
  distance: string;
  ascent: string;
  duration: string;
  sacScale: string;
  offlineAvailable: string;
  saveForOffline: string;
  offlineStatusActive: (size: string) => string;
  offlineStatusInactive: string;
  loadingMap: (done: number, total: number) => string;
  loadingSaga: string;
  removeDownload: string;
  download: string;
  downloadFailed: string;
  downloadFailedText: string;
  checkBeforeTour: string;
  weatherLoading: string;
  weather: string;
  weatherNotAvailable: string;
  wind: string;
  trailCondition: string;
  weatherNote: string;
  energySavingTitle: string;
  energySavingHint: string;
  importGpx: string;
  importGpxImporting: string;
  importGpxTitle: string;
  importGpxText: string;
  importGpxReadError: string;
  exportGpx: string;
  exportGpxError: string;
  matchingSaga: string;
  matchingSagaHintLoading: string;
  matchingSagaHintLoaded: string;
  sagaWriting: string;
  sagaLoadError: string;
  localisationNote: string;
  premiumButton: string;
  continueToSaga: string;
  sagaPickerHint: string;
  unlockMoreSagas: string;
  progressNew: string;
  progressStarted: string;
  progressDone: string;
  windValues: (speed: number, gusts: number) => string;
  weatherValues: (label: string, temp: number) => string;
  trailConditions: {
    gut: string;
    vorsicht: string;
    kritisch: string;
  };
  seasonLabel: string;
  season: {
    ganzjaehrig: string;
    eherSommer: string;
    nurSommer: string;
  };
  seasonNote: string;
  routeTypeLabel: string;
  routeTypeRundweg: string;
  routeTypeStrecke: string;
  streckeHint: string;
  planReturn: string;
  planOutward: string;
  similarRoutes: string;
  communityConditions: string;
  reportCondition: string;
  conditionReportedAgo: (relTime: string) => string;
  conditionNoteLabel: string;
  conditionNotePlaceholder: string;
  conditionSubmit: string;
  conditionSubmitting: string;
  conditionSubmitted: string;
  conditionRateLimit: string;
  conditionError: string;
  conditionNoReports: string;
  conditions: {
    excellent: string;
    clear: string;
    muddy: string;
    snow: string;
    icy: string;
    blocked: string;
  };
  conditionEmoji: {
    excellent: string;
    clear: string;
    muddy: string;
    snow: string;
    icy: string;
    blocked: string;
  };
}

const ROUTE_STRINGS: StringsDict<RouteStrings> = {
  de: {
    notFound: "Route nicht gefunden.",
    title: "Routenplanung",
    distance: "Distanz",
    ascent: "Aufstieg",
    duration: "Dauer",
    sacScale: "SAC-Skala",
    offlineAvailable: "Offline verfügbar",
    saveForOffline: "Für offline sichern",
    offlineStatusActive: (size) =>
      `Sage und Karte liegen auf dem Gerät${size ? ` · ${size}` : ""}. Die Wanderung startet ohne Empfang.`,
    offlineStatusInactive:
      "Lädt die Sage und den Kartenausschnitt herunter, damit die Tour auch ohne Empfang funktioniert.",
    loadingMap: (done, total) => `Karte wird gesichert … ${done}/${total}`,
    loadingSaga: "Sage wird geladen …",
    removeDownload: "Download entfernen",
    download: "Herunterladen",
    downloadFailed: "Download fehlgeschlagen",
    downloadFailedText:
      "Die Wanderung konnte nicht vollstaendig geladen werden. Bitte pruefe deine Verbindung und versuche es erneut.",
    checkBeforeTour: "Vor der Tour prüfen",
    weatherLoading: "Wetter wird geladen …",
    weather: "Wetter",
    weatherNotAvailable: "Nicht verfügbar",
    wind: "Wind",
    trailCondition: "Wegzustand",
    weatherNote:
      "Live-Wetter via Open-Meteo, kein offizieller Sperr- oder Lawinenstatus — Richtwerte zur eigenen Prüfung.",
    energySavingTitle: "Energiesparmodus",
    energySavingHint:
      "Diese Tour verbraucht durch GPS und Audio spürbar Akku. Der Sparmodus schont die Batterie.",
    importGpx: "GPX importieren",
    importGpxImporting: "GPX wird importiert …",
    importGpxTitle: "GPX-Import",
    importGpxText: "Die GPX-Datei konnte nicht verarbeitet werden.",
    importGpxReadError: "Die Datei konnte nicht gelesen werden.",
    exportGpx: "GPX exportieren",
    exportGpxError: "GPX-Export fehlgeschlagen.",
    matchingSaga: "Passende Sage",
    matchingSagaHintLoading: "Die passende Regionalsage wird gesucht …",
    matchingSagaHintLoaded:
      "Diese überlieferte Legende begleitet dich auf der Route. Tippe an, um sie zu lesen.",
    sagaWriting: "Sage wird geschrieben …",
    sagaLoadError: "Die Sage konnte nicht geladen werden. Bitte prüfe deine Verbindung.",
    localisationNote:
      "Für diese Route ist keine punktgenau belegte Sage überliefert. Gezeigt wird die nächstgelegene dokumentierte Regionalsage.",
    premiumButton: "Premium freischalten",
    continueToSaga: "Zur Sage weiter",
    sagaPickerHint: "Mehrere Sagen in der Nähe – wähle deine für diese Wanderung",
    unlockMoreSagas: "Weitere Sagen freischalten",
    progressNew: "Neu",
    progressStarted: "Angefangen",
    progressDone: "Gehört",
    windValues: (speed, gusts) => `${speed} km/h, Böen ${gusts} km/h`,
    weatherValues: (label, temp) => `${label}, ${temp}°C`,
    trailConditions: {
      gut: "Gute Bedingungen",
      vorsicht: "Mit Vorsicht begehbar",
      kritisch: "Erschwerte Bedingungen",
    },
    seasonLabel: "Saison",
    season: {
      ganzjaehrig: "Ganzjährig",
      eherSommer: "Eher Sommer/Herbst",
      nurSommer: "Nur Sommer",
    },
    seasonNote:
      "Einschätzung aus Höhe und Schwierigkeit — keine amtliche Aussage zum aktuellen Zustand.",
    routeTypeLabel: "Routentyp",
    routeTypeRundweg: "Rundweg",
    routeTypeStrecke: "Streckenwanderung",
    streckeHint:
      "Start und Ziel liegen auseinander — in der Schweiz üblich: Die Rückreise erfolgt meist mit Bahn oder Postauto.",
    planReturn: "Rückreise mit ÖV planen",
    planOutward: "Mit SBB anreisen",
    similarRoutes: "Weitere Routen im Kanton",
    communityConditions: "Wegbedingungen der Community",
    reportCondition: "Zustand melden",
    conditionReportedAgo: (t) => `vor ${t}`,
    conditionNoteLabel: "Anmerkung (optional)",
    conditionNotePlaceholder: "z. B. Schnee ab 1500 m, Holzfällerbetrieb …",
    conditionSubmit: "Melden",
    conditionSubmitting: "Wird gespeichert …",
    conditionSubmitted: "Danke für deinen Bericht!",
    conditionRateLimit: "Du hast diese Route kürzlich bereits gemeldet. Bitte warte 2 Stunden.",
    conditionError: "Meldung konnte nicht gespeichert werden.",
    conditionNoReports: "Noch keine Meldungen in den letzten 7 Tagen.",
    conditions: {
      excellent: "Top-Zustand",
      clear: "Problemlos",
      muddy: "Nass / Matschig",
      snow: "Schnee",
      icy: "Vereist",
      blocked: "Gesperrt",
    },
    conditionEmoji: { excellent: "🌟", clear: "✅", muddy: "🟤", snow: "❄️", icy: "🧊", blocked: "🚫" },
  },
  gsw: {
    notFound: "Route nid gfunde.",
    title: "Roteplanig",
    distance: "Distanz",
    ascent: "Ufstieg",
    duration: "Duur",
    sacScale: "SAC-Skala",
    offlineAvailable: "Offline verfügbär",
    saveForOffline: "Für offline sichere",
    offlineStatusActive: (size) =>
      `Sag und Karte ligged ufem Grät${size ? ` · ${size}` : ""}. D'Wanderig startet ohni Empfang.`,
    offlineStatusInactive:
      "Ladet d'Sag und de Kartenuusschnitt abe, damit d'Tour au ohni Empfang funktioniert.",
    loadingMap: (done, total) => `Karte wird gsicheret … ${done}/${total}`,
    loadingSaga: "Sag wird glade …",
    removeDownload: "Download entferne",
    download: "Abelade",
    downloadFailed: "Download fählgschlage",
    downloadFailedText:
      "D'Wanderig hät nid ganz chönne glade wärde. Bitte prüef dini Verbindig und probiers nomal.",
    checkBeforeTour: "Vor de Tour prüefe",
    weatherLoading: "Wätter wird glade …",
    weather: "Wätter",
    weatherNotAvailable: "Nid verfügbär",
    wind: "Wind",
    trailCondition: "Wegzuestand",
    weatherNote:
      "Live-Wätter via Open-Meteo, kei offizielle Sperr- oder Lawinestatus — Richtwärt zur eigene Prüfig.",
    energySavingTitle: "Energiesparmodus",
    energySavingHint:
      "Die Tour verbruucht dur GPS und Audio spürbar Akku. De Sparmodus schont d'Batterie.",
    importGpx: "GPX importiere",
    importGpxImporting: "GPX wird importiert …",
    importGpxTitle: "GPX-Import",
    importGpxText: "D'GPX-Datei het nid chöne verarbeitet wärde.",
    importGpxReadError: "D'Datei het nöd chöne gläse wärde.",
    exportGpx: "GPX exportiere",
    exportGpxError: "GPX-Export isch fehlgschlage.",
    matchingSaga: "Passendi Sag",
    matchingSagaHintLoading: "Die passendi Regionalsag wird gsuecht …",
    matchingSagaHintLoaded:
      "Die überliifereti Legände begleitet dich uf de Rote. Tipp a, zum si läse.",
    sagaWriting: "Sag wird gschribe …",
    sagaLoadError: "D'Sag hät nid chönne glade wärde. Bitte prüef dini Verbindig.",
    localisationNote:
      "Für die Rote isch kei punktgnaui Sag überliiferet. Zeigt wird die nächschti dokumentierti Regionalsag.",
    premiumButton: "Premium freischalte",
    continueToSaga: "Wiiter zur Sag",
    sagaPickerHint: "Meri Sage i dr Nächi – wähl dyni für die Wanderig",
    unlockMoreSagas: "Wiiteri Sage freischalte",
    progressNew: "Neu",
    progressStarted: "Agriffe",
    progressDone: "Ghört",
    windValues: (speed, gusts) => `${speed} km/h, Böe ${gusts} km/h`,
    weatherValues: (label, temp) => `${label}, ${temp}°C`,
    trailConditions: {
      gut: "Gueti Bedingige",
      vorsicht: "Mit Vorsicht begehbar",
      kritisch: "Erschwirti Bedingige",
    },
    seasonLabel: "Saison",
    season: {
      ganzjaehrig: "S'ganz Jahr",
      eherSommer: "Eher Summer/Herbscht",
      nurSommer: "Nume Summer",
    },
    seasonNote:
      "Yschätzig us Höchi und Schwierigkeit — kei amtlichi Uussag zum aktuelle Zuestand.",
    routeTypeLabel: "Routetyp",
    routeTypeRundweg: "Rundwäg",
    routeTypeStrecke: "Streckewanderig",
    streckeHint:
      "Start und Ziil liged usenand — i de Schwiiz üeblich: Zrugg gahts meischtens mit Bahn oder Poschtauto.",
    planReturn: "Rückreis mit ÖV plane",
    planOutward: "Mit de SBB aareise",
    similarRoutes: "Wiiteri Route im Kanton",
    communityConditions: "Wegbedingige vo de Community",
    reportCondition: "Zuestand mälde",
    conditionReportedAgo: (t) => `vor ${t}`,
    conditionNoteLabel: "Aammerkig (optional)",
    conditionNotePlaceholder: "z. B. Schnee ab 1500 m …",
    conditionSubmit: "Mälde",
    conditionSubmitting: "Wird gspicheret …",
    conditionSubmitted: "Danke für dini Mäldig!",
    conditionRateLimit: "Du häsch die Route kürzlich scho gmäldet. Bitte wart 2 Stund.",
    conditionError: "Mäldig het nid chöne gspicheret wärde.",
    conditionNoReports: "No kei Mäldigge in de letzte 7 Tag.",
    conditions: {
      excellent: "Top-Zuestand",
      clear: "Problemlos",
      muddy: "Nass / Matschig",
      snow: "Schnee",
      icy: "Veriiset",
      blocked: "Gsperrt",
    },
    conditionEmoji: { excellent: "🌟", clear: "✅", muddy: "🟤", snow: "❄️", icy: "🧊", blocked: "🚫" },
  },
  en: {
    notFound: "Route not found.",
    title: "Route Planning",
    distance: "Distance",
    ascent: "Ascent",
    duration: "Duration",
    sacScale: "SAC Scale",
    offlineAvailable: "Available offline",
    saveForOffline: "Save for offline",
    offlineStatusActive: (size) =>
      `Legend and map are on the device${size ? ` · ${size}` : ""}. The hike starts without reception.`,
    offlineStatusInactive:
      "Downloads the legend and map section so the tour works even without reception.",
    loadingMap: (done, total) => `Saving map … ${done}/${total}`,
    loadingSaga: "Loading legend …",
    removeDownload: "Remove download",
    download: "Download",
    downloadFailed: "Download failed",
    downloadFailedText:
      "The hike could not be fully loaded. Please check your connection and try again.",
    checkBeforeTour: "Check before tour",
    weatherLoading: "Loading weather …",
    weather: "Weather",
    weatherNotAvailable: "Not available",
    wind: "Wind",
    trailCondition: "Trail condition",
    weatherNote:
      "Live weather via Open-Meteo, no official closure or avalanche status — guide values for your own check.",
    energySavingTitle: "Energy Saving Mode",
    energySavingHint:
      "This tour consumes noticeable battery due to GPS and audio. Energy saving mode conserves the battery.",
    importGpx: "Import GPX",
    importGpxImporting: "Importing GPX …",
    importGpxTitle: "GPX Import",
    importGpxText: "The GPX file could not be processed.",
    importGpxReadError: "The file could not be read.",
    exportGpx: "Export GPX",
    exportGpxError: "GPX export failed.",
    matchingSaga: "Matching Legend",
    matchingSagaHintLoading: "Searching for matching regional legend …",
    matchingSagaHintLoaded:
      "This traditional legend accompanies you on the route. Tap to read it.",
    sagaWriting: "Legend is being written …",
    sagaLoadError: "The legend could not be loaded. Please check your connection.",
    localisationNote:
      "No pinpointed legend is documented for this route. The nearest documented regional legend is shown.",
    premiumButton: "Unlock Premium",
    continueToSaga: "Continue to legend",
    sagaPickerHint: "Multiple legends nearby – choose one for your hike",
    unlockMoreSagas: "Unlock more legends",
    progressNew: "New",
    progressStarted: "Started",
    progressDone: "Heard",
    windValues: (speed, gusts) => `${speed} km/h, gusts ${gusts} km/h`,
    weatherValues: (label, temp) => `${label}, ${temp}°C`,
    trailConditions: {
      gut: "Good conditions",
      vorsicht: "Walk with caution",
      kritisch: "Difficult conditions",
    },
    seasonLabel: "Season",
    season: {
      ganzjaehrig: "Year-round",
      eherSommer: "Best in summer/autumn",
      nurSommer: "Summer only",
    },
    seasonNote:
      "Estimate based on elevation and difficulty — not an official statement about current conditions.",
    routeTypeLabel: "Route type",
    routeTypeRundweg: "Loop trail",
    routeTypeStrecke: "Point-to-point hike",
    streckeHint:
      "Start and finish are in different places — common in Switzerland: the return trip is usually by train or PostBus.",
    planReturn: "Plan return by public transport",
    planOutward: "Travel by SBB train",
    similarRoutes: "More routes in the canton",
    communityConditions: "Community Trail Reports",
    reportCondition: "Report conditions",
    conditionReportedAgo: (t) => `${t} ago`,
    conditionNoteLabel: "Note (optional)",
    conditionNotePlaceholder: "e.g. snow above 1500 m, logging in progress …",
    conditionSubmit: "Submit",
    conditionSubmitting: "Saving …",
    conditionSubmitted: "Thanks for your report!",
    conditionRateLimit: "You already reported conditions for this route recently. Please wait 2 hours.",
    conditionError: "Could not save your report.",
    conditionNoReports: "No reports in the last 7 days.",
    conditions: {
      excellent: "Excellent",
      clear: "All clear",
      muddy: "Wet / Muddy",
      snow: "Snow",
      icy: "Icy",
      blocked: "Blocked",
    },
    conditionEmoji: { excellent: "🌟", clear: "✅", muddy: "🟤", snow: "❄️", icy: "🧊", blocked: "🚫" },
  },
  fr: {
    notFound: "Itinéraire non trouvé.",
    title: "Planification",
    distance: "Distance",
    ascent: "Montée",
    duration: "Durée",
    sacScale: "Échelle SAC",
    offlineAvailable: "Disponible hors ligne",
    saveForOffline: "Enregistrer hors ligne",
    offlineStatusActive: (size) =>
      `La légende et la carte sont sur l'appareil${size ? ` · ${size}` : ""}. La randonnée commence sans réseau.`,
    offlineStatusInactive:
      "Télécharge la légende et la section de carte pour que le tour fonctionne même sans réseau.",
    loadingMap: (done, total) => `Enregistrement de la carte … ${done}/${total}`,
    loadingSaga: "Chargement de la légende …",
    removeDownload: "Supprimer le téléchargement",
    download: "Télécharger",
    downloadFailed: "Échec du téléchargement",
    downloadFailedText:
      "La randonnée n'a pas pu être entièrement chargée. Veuillez vérifier votre connexion et réessayer.",
    checkBeforeTour: "À vérifier avant le tour",
    weatherLoading: "Chargement de la météo …",
    weather: "Météo",
    weatherNotAvailable: "Non disponible",
    wind: "Vent",
    trailCondition: "État du sentier",
    weatherNote:
      "Météo en direct via Open-Meteo, pas de statut officiel de fermeture ou d'avalanche — valeurs indicatives pour votre propre vérification.",
    energySavingTitle: "Mode économie d'énergie",
    energySavingHint:
      "Ce tour consomme beaucoup de batterie à cause du GPS et de l'audio. Le mode économie préserve la batterie.",
    importGpx: "Importer GPX",
    importGpxImporting: "Importation du GPX …",
    importGpxTitle: "Import GPX",
    importGpxText: "Le fichier GPX n'a pas pu être traité.",
    importGpxReadError: "Le fichier n'a pas pu être lu.",
    exportGpx: "Exporter GPX",
    exportGpxError: "L'export GPX a échoué.",
    matchingSaga: "Légende correspondante",
    matchingSagaHintLoading: "Recherche de la légende régionale correspondante …",
    matchingSagaHintLoaded:
      "Cette légende traditionnelle vous accompagne sur l'itinéraire. Appuyez pour la lire.",
    sagaWriting: "La légende s'écrit …",
    sagaLoadError: "La légende n'a pas pu être chargée. Veuillez vérifier votre connexion.",
    localisationNote:
      "Aucune légende précise n'est documentée pour cet itinéraire. La légende régionale documentée la plus proche est affichée.",
    premiumButton: "Débloquer Premium",
    continueToSaga: "Continuer vers la légende",
    sagaPickerHint: "Plusieurs légendes à proximité – choisissez celle de votre randonnée",
    unlockMoreSagas: "Débloquer plus de légendes",
    progressNew: "Nouveau",
    progressStarted: "Commencé",
    progressDone: "Écouté",
    windValues: (speed, gusts) => `${speed} km/h, rafales ${gusts} km/h`,
    weatherValues: (label, temp) => `${label}, ${temp}°C`,
    trailConditions: {
      gut: "Bonnes conditions",
      vorsicht: "Marcher avec prudence",
      kritisch: "Conditions difficiles",
    },
    seasonLabel: "Saison",
    season: {
      ganzjaehrig: "Toute l'année",
      eherSommer: "Plutôt été/automne",
      nurSommer: "Été uniquement",
    },
    seasonNote:
      "Estimation basée sur l'altitude et la difficulté — pas une déclaration officielle sur l'état actuel.",
    routeTypeLabel: "Type d'itinéraire",
    routeTypeRundweg: "Boucle",
    routeTypeStrecke: "Randonnée en ligne",
    streckeHint:
      "Le départ et l'arrivée sont éloignés — courant en Suisse : le retour se fait généralement en train ou en car postal.",
    planReturn: "Planifier le retour en transports publics",
    planOutward: "Voyager en train SBB",
    similarRoutes: "Autres itinéraires dans le canton",
    communityConditions: "Conditions signalées par la communauté",
    reportCondition: "Signaler l'état",
    conditionReportedAgo: (t) => `il y a ${t}`,
    conditionNoteLabel: "Note (optionnel)",
    conditionNotePlaceholder: "ex. neige dès 1500 m, exploitation forestière …",
    conditionSubmit: "Signaler",
    conditionSubmitting: "Enregistrement …",
    conditionSubmitted: "Merci pour votre signalement !",
    conditionRateLimit: "Vous avez déjà signalé cet itinéraire récemment. Veuillez attendre 2 heures.",
    conditionError: "Le signalement n'a pas pu être enregistré.",
    conditionNoReports: "Aucun signalement dans les 7 derniers jours.",
    conditions: {
      excellent: "Excellent",
      clear: "Sans problème",
      muddy: "Humide / Boueux",
      snow: "Neige",
      icy: "Verglacé",
      blocked: "Bloqué",
    },
    conditionEmoji: { excellent: "🌟", clear: "✅", muddy: "🟤", snow: "❄️", icy: "🧊", blocked: "🚫" },
  },
  it: {
    notFound: "Percorso non trovato.",
    title: "Pianificazione",
    distance: "Distanza",
    ascent: "Salita",
    duration: "Durata",
    sacScale: "Scala SAC",
    offlineAvailable: "Disponibile offline",
    saveForOffline: "Salva per offline",
    offlineStatusActive: (size) =>
      `Leggenda e mappa sono sul dispositivo${size ? ` · ${size}` : ""}. L'escursione inizia senza ricezione.`,
    offlineStatusInactive:
      "Scarica la leggenda e la sezione della mappa in modo che il tour funzioni anche senza ricezione.",
    loadingMap: (done, total) => `Salvataggio mappa … ${done}/${total}`,
    loadingSaga: "Caricamento leggenda …",
    removeDownload: "Rimuovi download",
    download: "Scarica",
    downloadFailed: "Download fallito",
    downloadFailedText:
      "L'escursione non può essere caricata completamente. Controlla la tua connessione e riprova.",
    checkBeforeTour: "Controllare prima del tour",
    weatherLoading: "Caricamento meteo …",
    weather: "Meteo",
    weatherNotAvailable: "Non disponibile",
    wind: "Vento",
    trailCondition: "Condizioni del sentiero",
    weatherNote:
      "Meteo in diretta via Open-Meteo, nessun stato ufficiale di chiusura o valanghe — valori indicativi per il proprio controllo.",
    energySavingTitle: "Modalità risparmio energetico",
    energySavingHint:
      "Questo tour consuma molta batteria a causa del GPS e dell'audio. La modalità risparmio preserva la batteria.",
    importGpx: "Importa GPX",
    importGpxImporting: "Importazione GPX …",
    importGpxTitle: "Importazione GPX",
    importGpxText: "Il file GPX non ha potuto essere elaborato.",
    importGpxReadError: "Il file non ha potuto essere letto.",
    exportGpx: "Esporta GPX",
    exportGpxError: "Esportazione GPX fallita.",
    matchingSaga: "Leggenda corrispondente",
    matchingSagaHintLoading: "Ricerca della leggenda regionale corrispondente …",
    matchingSagaHintLoaded:
      "Questa leggenda tradizionale ti accompagna lungo il percorso. Tocca per leggerla.",
    sagaWriting: "La leggenda viene scritta …",
    sagaLoadError: "Impossibile caricare la leggenda. Controlla la tua connessione.",
    localisationNote:
      "Non è documentata alcuna leggenda precisa per questo percorso. Viene mostrata la leggenda regionale documentata più vicina.",
    premiumButton: "Sblocca Premium",
    continueToSaga: "Continua alla leggenda",
    sagaPickerHint: "Più leggende nelle vicinanze – scegli quella per la tua escursione",
    unlockMoreSagas: "Sblocca altre leggende",
    progressNew: "Nuovo",
    progressStarted: "Iniziato",
    progressDone: "Ascoltato",
    windValues: (speed, gusts) => `${speed} km/h, raffiche ${gusts} km/h`,
    weatherValues: (label, temp) => `${label}, ${temp}°C`,
    trailConditions: {
      gut: "Buone condizioni",
      vorsicht: "Camminare con cautela",
      kritisch: "Condizioni difficili",
    },
    seasonLabel: "Stagione",
    season: {
      ganzjaehrig: "Tutto l'anno",
      eherSommer: "Preferibilmente estate/autunno",
      nurSommer: "Solo estate",
    },
    seasonNote:
      "Stima basata su altitudine e difficoltà — non è una dichiarazione ufficiale sullo stato attuale.",
    routeTypeLabel: "Tipo di percorso",
    routeTypeRundweg: "Percorso circolare",
    routeTypeStrecke: "Escursione lineare",
    streckeHint:
      "Partenza e arrivo sono distanti — comune in Svizzera: il ritorno avviene di solito in treno o autopostale.",
    planReturn: "Pianifica il ritorno con i mezzi pubblici",
    planOutward: "Viaggiare in treno SBB",
    similarRoutes: "Altri percorsi nel cantone",
    communityConditions: "Condizioni segnalate dalla community",
    reportCondition: "Segnala condizioni",
    conditionReportedAgo: (t) => `${t} fa`,
    conditionNoteLabel: "Nota (opzionale)",
    conditionNotePlaceholder: "es. neve oltre 1500 m, lavori forestali …",
    conditionSubmit: "Segnala",
    conditionSubmitting: "Salvataggio …",
    conditionSubmitted: "Grazie per la tua segnalazione!",
    conditionRateLimit: "Hai già segnalato questo percorso di recente. Attendi 2 ore.",
    conditionError: "La segnalazione non ha potuto essere salvata.",
    conditionNoReports: "Nessuna segnalazione negli ultimi 7 giorni.",
    conditions: {
      excellent: "Ottime condizioni",
      clear: "Senza problemi",
      muddy: "Bagnato / Fangoso",
      snow: "Neve",
      icy: "Ghiacciato",
      blocked: "Bloccato",
    },
    conditionEmoji: { excellent: "🌟", clear: "✅", muddy: "🟤", snow: "❄️", icy: "🧊", blocked: "🚫" },
  },
  es: {
    notFound: "Ruta no encontrada.",
    title: "Planificación",
    distance: "Distancia",
    ascent: "Ascenso",
    duration: "Duración",
    sacScale: "Escala SAC",
    offlineAvailable: "Disponible sin conexión",
    saveForOffline: "Guardar sin conexión",
    offlineStatusActive: (size) =>
      `La leyenda y el mapa están en el dispositivo${size ? ` · ${size}` : ""}. La caminata comienza sin recepción.`,
    offlineStatusInactive:
      "Descarga la leyenda y la sección del mapa para que el recorrido funcione incluso sin recepción.",
    loadingMap: (done, total) => `Guardando mapa … ${done}/${total}`,
    loadingSaga: "Cargando leyenda …",
    removeDownload: "Eliminar descarga",
    download: "Descargar",
    downloadFailed: "Descarga fallida",
    downloadFailedText:
      "La caminata no se pudo cargar completamente. Por favor, comprueba tu conexión e inténtalo de nuevo.",
    checkBeforeTour: "Comprobar antes del recorrido",
    weatherLoading: "Cargando clima …",
    weather: "Clima",
    weatherNotAvailable: "No disponible",
    wind: "Viento",
    trailCondition: "Estado del sendero",
    weatherNote:
      "Clima en vivo a través de Open-Meteo, sin estado oficial de cierre o avalanchas — valores orientativos para su propia comprobación.",
    energySavingTitle: "Modo ahorro de energía",
    energySavingHint:
      "Este recorrido consume mucha batería debido al GPS y al audio. El modo de ahorro conserva la batería.",
    importGpx: "Importar GPX",
    importGpxImporting: "Importando GPX …",
    importGpxTitle: "Importación GPX",
    importGpxText: "El archivo GPX no pudo ser procesado.",
    importGpxReadError: "El archivo no pudo ser leído.",
    exportGpx: "Exportar GPX",
    exportGpxError: "Error al exportar GPX.",
    matchingSaga: "Leyenda correspondiente",
    matchingSagaHintLoading: "Buscando leyenda regional correspondiente …",
    matchingSagaHintLoaded:
      "Esta leyenda tradicional te acompaña en la ruta. Toca para leerla.",
    sagaWriting: "Se está escribiendo la leyenda …",
    sagaLoadError: "No se pudo cargar la leyenda. Por favor, comprueba tu conexión.",
    localisationNote:
      "No hay ninguna leyenda documentada con precisión para esta ruta. Se muestra la leyenda regional documentada más cercana.",
    premiumButton: "Desbloquear Premium",
    continueToSaga: "Continuar a la leyenda",
    sagaPickerHint: "Varias leyendas cerca – elige la de tu caminata",
    unlockMoreSagas: "Desbloquear más leyendas",
    progressNew: "Nuevo",
    progressStarted: "Iniciado",
    progressDone: "Escuchado",
    windValues: (speed, gusts) => `${speed} km/h, ráfagas ${gusts} km/h`,
    weatherValues: (label, temp) => `${label}, ${temp}°C`,
    trailConditions: {
      gut: "Buenas condiciones",
      vorsicht: "Caminar con precaución",
      kritisch: "Condiciones difíciles",
    },
    seasonLabel: "Temporada",
    season: {
      ganzjaehrig: "Todo el año",
      eherSommer: "Mejor en verano/otoño",
      nurSommer: "Solo verano",
    },
    seasonNote:
      "Estimación basada en la altitud y la dificultad — no es una declaración oficial sobre el estado actual.",
    routeTypeLabel: "Tipo de ruta",
    routeTypeRundweg: "Ruta circular",
    routeTypeStrecke: "Ruta lineal",
    streckeHint:
      "El inicio y el final están separados — habitual en Suiza: el regreso suele hacerse en tren o autobús postal.",
    planReturn: "Planificar el regreso en transporte público",
    planOutward: "Viajar en tren SBB",
    similarRoutes: "Más rutas en el cantón",
    communityConditions: "Condiciones reportadas por la comunidad",
    reportCondition: "Reportar estado",
    conditionReportedAgo: (t) => `hace ${t}`,
    conditionNoteLabel: "Nota (opcional)",
    conditionNotePlaceholder: "ej. nieve sobre 1500 m, trabajo forestal …",
    conditionSubmit: "Reportar",
    conditionSubmitting: "Guardando …",
    conditionSubmitted: "¡Gracias por tu reporte!",
    conditionRateLimit: "Ya has reportado esta ruta recientemente. Por favor espera 2 horas.",
    conditionError: "No se pudo guardar el reporte.",
    conditionNoReports: "Sin reportes en los últimos 7 días.",
    conditions: {
      excellent: "Excelente",
      clear: "Sin problemas",
      muddy: "Húmedo / Embarrado",
      snow: "Nieve",
      icy: "Helado",
      blocked: "Bloqueado",
    },
    conditionEmoji: { excellent: "🌟", clear: "✅", muddy: "🟤", snow: "❄️", icy: "🧊", blocked: "🚫" },
  },
  pt: {
    notFound: "Rota não encontrada.",
    title: "Planejamento",
    distance: "Distância",
    ascent: "Subida",
    duration: "Duração",
    sacScale: "Escala SAC",
    offlineAvailable: "Disponível offline",
    saveForOffline: "Salvar offline",
    offlineStatusActive: (size) =>
      `A lenda e o mapa estão no dispositivo${size ? ` · ${size}` : ""}. A caminhada começa sem recepção.`,
    offlineStatusInactive:
      "Baixa a lenda e a seção do mapa para que o passeio funcione mesmo sem recepção.",
    loadingMap: (done, total) => `Salvando mapa … ${done}/${total}`,
    loadingSaga: "Carregando lenda …",
    removeDownload: "Remover download",
    download: "Baixar",
    downloadFailed: "Download falhou",
    downloadFailedText:
      "A caminhada não pôde ser totalmente carregada. Verifique sua conexão e tente novamente.",
    checkBeforeTour: "Verificar antes do passeio",
    weatherLoading: "Carregando clima …",
    weather: "Clima",
    weatherNotAvailable: "Não disponível",
    wind: "Vento",
    trailCondition: "Condição da trilha",
    weatherNote:
      "Clima ao vivo via Open-Meteo, sem status oficial de fechamento ou avalanche — valores orientativos para sua própria verificação.",
    energySavingTitle: "Modo economia de energia",
    energySavingHint:
      "Este passeio consome muita bateria devido ao GPS e áudio. O modo de economia preserva a bateria.",
    importGpx: "Importar GPX",
    importGpxImporting: "Importando GPX …",
    importGpxTitle: "Importação GPX",
    importGpxText: "O arquivo GPX não pôde ser processado.",
    importGpxReadError: "O arquivo não pôde ser lido.",
    exportGpx: "Exportar GPX",
    exportGpxError: "Falha ao exportar GPX.",
    matchingSaga: "Lenda Correspondente",
    matchingSagaHintLoading: "Procurando por lenda regional correspondente …",
    matchingSagaHintLoaded:
      "Esta lenda tradicional acompanha você na rota. Toque para ler.",
    sagaWriting: "A lenda está sendo escrita …",
    sagaLoadError: "A lenda não pôde ser carregada. Verifique sua conexão.",
    localisationNote:
      "Nenhuma lenda precisa está documentada para esta rota. A lenda regional documentada mais próxima é mostrada.",
    premiumButton: "Desbloquear Premium",
    continueToSaga: "Continuar para a lenda",
    sagaPickerHint: "Várias lendas nas redondezas – escolha a da sua caminhada",
    unlockMoreSagas: "Desbloquear mais lendas",
    progressNew: "Novo",
    progressStarted: "Iniciado",
    progressDone: "Ouvido",
    windValues: (speed, gusts) => `${speed} km/h, rajadas ${gusts} km/h`,
    weatherValues: (label, temp) => `${label}, ${temp}°C`,
    trailConditions: {
      gut: "Boas condições",
      vorsicht: "Caminhar com cautela",
      kritisch: "Condições difíceis",
    },
    seasonLabel: "Estação",
    season: {
      ganzjaehrig: "Ano todo",
      eherSommer: "Melhor no verão/outono",
      nurSommer: "Somente verão",
    },
    seasonNote:
      "Estimativa baseada na altitude e dificuldade — não é uma declaração oficial sobre o estado atual.",
    routeTypeLabel: "Tipo de rota",
    routeTypeRundweg: "Rota circular",
    routeTypeStrecke: "Rota linear",
    streckeHint:
      "Início e fim ficam distantes — comum na Suíça: o retorno geralmente é de trem ou ônibus postal.",
    planReturn: "Planejar o retorno de transporte público",
    planOutward: "Viajar de trem SBB",
    similarRoutes: "Mais rotas no cantão",
    communityConditions: "Condições relatadas pela comunidade",
    reportCondition: "Reportar condições",
    conditionReportedAgo: (t) => `há ${t}`,
    conditionNoteLabel: "Nota (opcional)",
    conditionNotePlaceholder: "ex. neve acima de 1500 m, trabalho florestal …",
    conditionSubmit: "Reportar",
    conditionSubmitting: "Salvando …",
    conditionSubmitted: "Obrigado pelo seu relatório!",
    conditionRateLimit: "Você já reportou esta rota recentemente. Aguarde 2 horas.",
    conditionError: "O relatório não pôde ser salvo.",
    conditionNoReports: "Sem relatórios nos últimos 7 dias.",
    conditions: {
      excellent: "Excelente",
      clear: "Sem problemas",
      muddy: "Molhado / Lamacento",
      snow: "Neve",
      icy: "Gelado",
      blocked: "Bloqueado",
    },
    conditionEmoji: { excellent: "🌟", clear: "✅", muddy: "🟤", snow: "❄️", icy: "🧊", blocked: "🚫" },
  },
  zh: {
    notFound: "未找到路线。",
    title: "路线规划",
    distance: "距离",
    ascent: "爬升",
    duration: "时长",
    sacScale: "SAC 分级",
    offlineAvailable: "可离线使用",
    saveForOffline: "保存至离线",
    offlineStatusActive: (size) =>
      `传说和地图已保存在设备上${size ? ` · ${size}` : ""}。徒步可在无信号时开始。`,
    offlineStatusInactive: "下载传说和地图区域，以便在无信号时也能正常游览。",
    loadingMap: (done, total) => `正在保存地图 … ${done}/${total}`,
    loadingSaga: "正在加载传说 …",
    removeDownload: "移除下载",
    download: "下载",
    downloadFailed: "下载失败",
    downloadFailedText: "徒步行程未能完整加载。请检查网络连接并重试。",
    checkBeforeTour: "行程前检查",
    weatherLoading: "正在加载天气 …",
    weather: "天气",
    weatherNotAvailable: "不可用",
    wind: "风力",
    trailCondition: "路况",
    weatherNote:
      "天气数据来自 Open-Meteo，非官方封路或雪崩状态——仅供参考，请自行核实。",
    energySavingTitle: "省电模式",
    energySavingHint: "由于使用 GPS 和音频，此次行程较耗电。省电模式可延长续航。",
    importGpx: "导入 GPX",
    importGpxImporting: "正在导入 GPX …",
    importGpxTitle: "GPX 导入",
    importGpxText: "GPX 文件无法处理。",
    importGpxReadError: "文件无法读取。",
    exportGpx: "导出 GPX",
    exportGpxError: "GPX 导出失败。",
    matchingSaga: "匹配的传说",
    matchingSagaHintLoading: "正在寻找匹配的地区传说 …",
    matchingSagaHintLoaded: "这个古老的传说将伴随你的旅程。点击开始阅读。",
    sagaWriting: "传说正在编写中 …",
    sagaLoadError: "无法加载传说。请检查网络连接。",
    localisationNote: "此路线暂无精确匹配的传说记录。显示的是最近的地区传说。",
    premiumButton: "解锁 Premium",
    continueToSaga: "前往传说",
    sagaPickerHint: "附近有多个传说 — 选择本次徒步的传说",
    unlockMoreSagas: "解锁更多传说",
    progressNew: "新",
    progressStarted: "已开始",
    progressDone: "已听",
    windValues: (speed, gusts) => `${speed} km/h，阵风 ${gusts} km/h`,
    weatherValues: (label, temp) => `${label}，${temp}°C`,
    trailConditions: {
      gut: "路况良好",
      vorsicht: "谨慎通行",
      kritisch: "路况复杂",
    },
    seasonLabel: "季节",
    season: {
      ganzjaehrig: "全年可行",
      eherSommer: "建议夏秋季",
      nurSommer: "仅限夏季",
    },
    seasonNote: "基于海拔和难度的估算——并非官方的当前路况声明。",
    routeTypeLabel: "路线类型",
    routeTypeRundweg: "环线",
    routeTypeStrecke: "单程徒步",
    streckeHint: "起点和终点不在同一处——这在瑞士很常见：通常乘火车或邮政巴士返回。",
    planReturn: "规划公共交通返程",
    planOutward: "乘SBB火车出发",
    similarRoutes: "该州的更多路线",
    communityConditions: "社区路况报告",
    reportCondition: "报告路况",
    conditionReportedAgo: (t) => `${t}前`,
    conditionNoteLabel: "备注（可选）",
    conditionNotePlaceholder: "例：1500 m以上有积雪，林业作业中…",
    conditionSubmit: "提交",
    conditionSubmitting: "保存中…",
    conditionSubmitted: "感谢您的报告！",
    conditionRateLimit: "您最近已报告过此路线，请等待2小时。",
    conditionError: "报告保存失败。",
    conditionNoReports: "最近7天内暂无报告。",
    conditions: {
      excellent: "状况极佳",
      clear: "畅通无阻",
      muddy: "潮湿/泥泞",
      snow: "有积雪",
      icy: "结冰",
      blocked: "封路",
    },
    conditionEmoji: { excellent: "🌟", clear: "✅", muddy: "🟤", snow: "❄️", icy: "🧊", blocked: "🚫" },
  },
  ru: {
    notFound: "Маршрут не найден.",
    title: "Планирование маршрута",
    distance: "Дистанция",
    ascent: "Подъём",
    duration: "Длительность",
    sacScale: "Шкала SAC",
    offlineAvailable: "Доступно офлайн",
    saveForOffline: "Сохранить для офлайн",
    offlineStatusActive: (size) =>
      `Легенда и карта сохранены на устройстве${size ? ` · ${size}` : ""}. Поход начнётся без сети.`,
    offlineStatusInactive:
      "Загружает легенду и участок карты, чтобы поход работал даже без сети.",
    loadingMap: (done, total) => `Сохранение карты … ${done}/${total}`,
    loadingSaga: "Загрузка легенды …",
    removeDownload: "Удалить загрузку",
    download: "Скачать",
    downloadFailed: "Загрузка не удалась",
    downloadFailedText:
      "Поход не удалось загрузить полностью. Проверьте соединение и попробуйте снова.",
    checkBeforeTour: "Проверить перед походом",
    weatherLoading: "Загрузка погоды …",
    weather: "Погода",
    weatherNotAvailable: "Недоступно",
    wind: "Ветер",
    trailCondition: "Состояние тропы",
    weatherNote:
      "Погода в реальном времени через Open-Meteo, без официального статуса закрытия или лавинной опасности — ориентировочные значения для собственной проверки.",
    energySavingTitle: "Режим энергосбережения",
    energySavingHint:
      "Этот поход заметно расходует заряд из-за GPS и звука. Режим энергосбережения бережёт батарею.",
    importGpx: "Импортировать GPX",
    importGpxImporting: "Импорт GPX …",
    importGpxTitle: "Импорт GPX",
    importGpxText: "Файл GPX не удалось обработать.",
    importGpxReadError: "Файл не удалось прочитать.",
    exportGpx: "Экспортировать GPX",
    exportGpxError: "Экспорт GPX не удался.",
    matchingSaga: "Подходящая легенда",
    matchingSagaHintLoading: "Поиск подходящей региональной легенды …",
    matchingSagaHintLoaded:
      "Эта традиционная легенда сопровождает тебя на маршруте. Нажми, чтобы прочитать.",
    sagaWriting: "Легенда пишется …",
    sagaLoadError: "Легенду не удалось загрузить. Проверьте соединение.",
    localisationNote:
      "Для этого маршрута точная привязанная легенда не задокументирована. Показана ближайшая задокументированная региональная легенда.",
    premiumButton: "Разблокировать Premium",
    continueToSaga: "Перейти к легенде",
    sagaPickerHint: "Несколько легенд рядом – выберите для похода",
    unlockMoreSagas: "Разблокировать больше легенд",
    progressNew: "Новая",
    progressStarted: "Начата",
    progressDone: "Прослушана",
    windValues: (speed, gusts) => `${speed} км/ч, порывы ${gusts} км/ч`,
    weatherValues: (label, temp) => `${label}, ${temp}°C`,
    trailConditions: {
      gut: "Хорошие условия",
      vorsicht: "Проходимо с осторожностью",
      kritisch: "Сложные условия",
    },
    seasonLabel: "Сезон",
    season: {
      ganzjaehrig: "Круглый год",
      eherSommer: "Лучше летом/осенью",
      nurSommer: "Только летом",
    },
    seasonNote:
      "Оценка на основе высоты и сложности — не официальное заявление о текущем состоянии.",
    routeTypeLabel: "Тип маршрута",
    routeTypeRundweg: "Кольцевой маршрут",
    routeTypeStrecke: "Линейный маршрут",
    streckeHint:
      "Начало и конец находятся в разных местах — обычное дело в Швейцарии: обратный путь чаще всего на поезде или почтовом автобусе.",
    planReturn: "Спланировать обратный путь на общественном транспорте",
    planOutward: "Ехать на поезде SBB",
    similarRoutes: "Ещё маршруты в кантоне",
    communityConditions: "Состояние троп от сообщества",
    reportCondition: "Сообщить о состоянии",
    conditionReportedAgo: (t) => `${t} назад`,
    conditionNoteLabel: "Комментарий (необязательно)",
    conditionNotePlaceholder: "напр. снег выше 1500 м, лесозаготовительные работы …",
    conditionSubmit: "Сообщить",
    conditionSubmitting: "Сохранение …",
    conditionSubmitted: "Спасибо за ваш отчёт!",
    conditionRateLimit: "Вы уже недавно сообщали о состоянии этого маршрута. Подождите 2 часа.",
    conditionError: "Не удалось сохранить отчёт.",
    conditionNoReports: "За последние 7 дней отчётов нет.",
    conditions: {
      excellent: "Отличное состояние",
      clear: "Без проблем",
      muddy: "Влажно / Грязно",
      snow: "Снег",
      icy: "Обледенение",
      blocked: "Заблокировано",
    },
    conditionEmoji: { excellent: "🌟", clear: "✅", muddy: "🟤", snow: "❄️", icy: "🧊", blocked: "🚫" },
  },
};

export const useRouteStrings = createUseStrings(ROUTE_STRINGS);
