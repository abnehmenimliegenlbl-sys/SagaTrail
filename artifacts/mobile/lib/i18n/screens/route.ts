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
  matchingSaga: string;
  matchingSagaHintLoading: string;
  matchingSagaHintLoaded: string;
  sagaWriting: string;
  sagaLoadError: string;
  localisationNote: string;
  premiumButton: string;
  continueToSaga: string;
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
    matchingSaga: "匹配的传说",
    matchingSagaHintLoading: "正在寻找匹配的地区传说 …",
    matchingSagaHintLoaded: "这个古老的传说将伴随你的旅程。点击开始阅读。",
    sagaWriting: "传说正在编写中 …",
    sagaLoadError: "无法加载传说。请检查网络连接。",
    localisationNote: "此路线暂无精确匹配的传说记录。显示的是最近的地区传说。",
    premiumButton: "解锁 Premium",
    continueToSaga: "前往传说",
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
  },
};

export const useRouteStrings = createUseStrings(ROUTE_STRINGS);
