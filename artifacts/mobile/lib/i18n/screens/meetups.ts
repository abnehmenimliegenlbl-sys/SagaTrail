import { createUseStrings, StringsDict } from "../createStrings";

export interface MeetupStrings {
  eyebrow: string;
  title: string;
  intro: string;
  empty: string;
  loading: string;
  error: string;
  create: string;
  createTitle: string;
  createIntro: string;
  route: string;
  date: string;
  datePlaceholder: string;
  time: string;
  timePlaceholder: string;
  participants: string;
  participantsPlaceholder: string;
  pace: string;
  paceEasy: string;
  paceNormal: string;
  paceSporty: string;
  note: string;
  notePlaceholder: string;
  publish: string;
  published: string;
  join: string;
  leave: string;
  joined: string;
  organizer: string;
  routeOpen: string;
  invalid: string;
  loginRequired: string;
  full: string;
  noRoute: string;
  delete: string;
  retry: string;
  ok: string;
  calendar: string;
  share: string;
  report: string;
  block: string;
  participantsTitle: string;
  organizerBadge: string;
  rankLabel: string;
  groupAchievement: (threshold: number) => string;
  groupAchievementAccessibility: (threshold: number) => string;
  calendarDialogTitle: string;
  calendarDescription: string;
  calendarExportError: string;
  shareError: string;
  reportPrompt: string;
  reportSafety: string;
  reportHarassment: string;
  cancel: string;
  reportSuccess: string;
  reportFailure: string;
  deletePrompt: string;
  deleteFailure: string;
  blockPrompt: string;
  blockAction: string;
  blockFailure: string;
  removeParticipant: string;
  removePrompt: (name: string) => string;
  removeAction: string;
  removeFailure: string;
  unavailable: string;
  loadDetailError: string;
  backToMeetups: string;
  participationError: string;
  privacyNotice: string;
  ageLabel: (age: number) => string;
  sharedTitle: string;
  sharedExpired: string;
  openMeetups: string;
  sharedPrivacy: string;
  audience: string;
  audiencePublic: string;
  audienceCommunity: string;
  communityRequired: string;
}

const STRINGS: StringsDict<MeetupStrings> = {
  de: {
    eyebrow: "Gemeinsam wandern",
    title: "Treffpunkt",
    intro: "Finde Menschen, die dieselbe Route am gleichen Tag wandern möchten.",
    empty: "Noch keine kommenden Treffpunkte. Öffne eine Route und erstelle den ersten Termin.",
    loading: "Treffpunkte werden geladen …",
    error: "Treffpunkte konnten nicht geladen werden.",
    create: "Treffpunkt erstellen",
    createTitle: "Treffpunkt erstellen",
    createIntro: "Lege fest, wann du diese Route gemeinsam wandern möchtest.",
    route: "Route",
    date: "Datum",
    datePlaceholder: "JJJJ-MM-TT",
    time: "Startzeit",
    timePlaceholder: "09:00",
    participants: "Plätze",
    participantsPlaceholder: "8",
    pace: "Tempo",
    paceEasy: "Gemütlich",
    paceNormal: "Normal",
    paceSporty: "Sportlich",
    note: "Notiz",
    notePlaceholder: "Zum Beispiel Treffpunkt am Bahnhof …",
    publish: "Treffpunkt veröffentlichen",
    published: "Treffpunkt veröffentlicht",
    join: "Mitwandern",
    leave: "Nicht mehr dabei",
    joined: "Du bist dabei",
    organizer: "Organisiert von",
    routeOpen: "Route öffnen",
    invalid: "Bitte prüfe Datum, Startzeit und Plätze.",
    loginRequired: "Bitte melde dich an, um teilzunehmen.",
    full: "Voll",
    noRoute: "Erstelle einen Treffpunkt direkt von einer Routendetailseite.",
    delete: "Treffpunkt löschen",
    retry: "Erneut laden",
    ok: "OK",
    calendar: "Kalender",
    share: "Teilen",
    report: "Melden",
    block: "Blockieren",
    participantsTitle: "Teilnehmende",
    organizerBadge: "Organisator",
    rankLabel: "Gruppenrang",
    groupAchievement: (threshold) => `${threshold}. Gruppenwanderung`,
    groupAchievementAccessibility: (threshold) => `Errungener Meilenstein: ${threshold}. Gruppenwanderung`,
    calendarDialogTitle: "Treffpunkt in Kalender übernehmen",
    calendarDescription: "Gemeinsamer Treffpunkt über SagaTrail.",
    calendarExportError: "Der Kalendertermin konnte nicht exportiert werden.",
    shareError: "Der sichere Link konnte nicht erstellt werden.",
    reportPrompt: "Warum möchtest du diesen Treffpunkt melden?",
    reportSafety: "Sicherheitsbedenken",
    reportHarassment: "Spam oder Belästigung",
    cancel: "Abbrechen",
    reportSuccess: "Danke. Die Meldung wurde gespeichert.",
    reportFailure: "Die Meldung konnte nicht gespeichert werden.",
    deletePrompt: "Möchtest du diesen Treffpunkt wirklich löschen?",
    deleteFailure: "Der Treffpunkt konnte nicht gelöscht werden.",
    blockPrompt: "Treffpunkte dieses Organisators werden künftig ausgeblendet.",
    blockAction: "Blockieren",
    blockFailure: "Der Nutzer konnte nicht blockiert werden.",
    removeParticipant: "Teilnehmer entfernen",
    removePrompt: (name) => `${name} aus dem Treffpunkt entfernen?`,
    removeAction: "Entfernen",
    removeFailure: "Der Teilnehmer konnte nicht entfernt werden.",
    unavailable: "Dieser Treffpunkt ist nicht mehr verfügbar.",
    loadDetailError: "Treffpunkt konnte nicht geladen werden.",
    backToMeetups: "Zu den Treffpunkten",
    participationError: "Die Teilnahme konnte nicht geändert werden.",
    privacyNotice: "Der offizielle Routenstart ist der Treffpunkt. Private Adressen und Live-Standorte werden nicht geteilt.",
    ageLabel: (age) => `${age} ${age === 1 ? "Jahr" : "Jahre"}`,
    sharedTitle: "Geteilter Treffpunkt",
    sharedExpired: "Dieser Link ist abgelaufen oder wurde widerrufen.",
    openMeetups: "Treffpunkte öffnen",
    sharedPrivacy: "Dieser Link zeigt nur Route, Zeit und Gruppengrösse. Teilnehmernamen und private Daten bleiben geschützt.",
    audience: "Sichtbarkeit",
    audiencePublic: "Öffentlich in SagaTrail",
    audienceCommunity: "In einer Community",
    communityRequired: "Wähle eine Community aus.",
  },
  gsw: {
    eyebrow: "Zäme wandere",
    title: "Treffpunkt",
    intro: "Find Lüüt, wo am gliiche Tag di gliichi Route wandere wänd.",
    empty: "No kei Treffpünkt. Mach uf ere Route de erscht Termin.",
    loading: "Treffpünkt werde glade …",
    error: "Treffpünkt händ nöd chönne glade werde.",
    create: "Treffpunkt erstelle",
    createTitle: "Treffpunkt erstelle",
    createIntro: "Leg fest, wenn ihr die Route zäme wandere wänd.",
    route: "Route", date: "Datum", datePlaceholder: "JJJJ-MM-TT", time: "Startziit",
    timePlaceholder: "09:00", participants: "Plätz", participantsPlaceholder: "8",
    pace: "Tempo", paceEasy: "Gemüetlich", paceNormal: "Normal", paceSporty: "Sportlich",
    note: "Notiz", notePlaceholder: "Zum Bispiel Treffpunkt am Bahnhof …",
    publish: "Treffpunkt veröffentliche", published: "Treffpunkt veröffentlicht",
    join: "Mitwandere", leave: "Nüm debii", joined: "Du bisch debii",
    organizer: "Organisiert vo", routeOpen: "Route öffne", invalid: "Prüef Datum, Ziit und Plätz.",
    loginRequired: "Bitte meld di aa zum Mitmache.", full: "Voll", noRoute: "Mach de Treffpunkt direkt uf ere Route.", delete: "Treffpunkt lösche",
    retry: "Nomal lade", ok: "OK", calendar: "Kaländer", share: "Teile", report: "Melde", block: "Blockiere",
    participantsTitle: "Teilnehmendi", organizerBadge: "Organisator",
    rankLabel: "Gruppenrang",
    groupAchievement: (threshold) => `${threshold}. Gruppenwanderig`,
    groupAchievementAccessibility: (threshold) => `Erreichter Meilenstein: ${threshold}. Gruppenwanderig`,
    calendarDialogTitle: "Treffpunkt i Kaländer überneh",
    calendarDescription: "Zäme-Treffpunkt über SagaTrail.", calendarExportError: "De Kaländertermin het nöd chönne exportiert werde.",
    shareError: "De sicheri Link het nöd chönne erstellt werde.", reportPrompt: "Wieso wotsch du dä Treffpunkt melde?",
    reportSafety: "Sicherheitsbedänke", reportHarassment: "Spam oder Belästigung", cancel: "Abbreche",
    reportSuccess: "Danke. D Meldig isch gspeicheret.", reportFailure: "D Meldig het nöd chönne gspeicheret werde.",
    deletePrompt: "Wotsch dä Treffpunkt würklich lösche?", deleteFailure: "De Treffpunkt het nöd chönne glöscht werde.",
    blockPrompt: "Treffpünkt vo dem Organisator werde künftig usblendet.", blockAction: "Blockiere",
    blockFailure: "De Nutzer het nöd chönne blockiert werde.", removeParticipant: "Teilnehmer entferne",
    removePrompt: (name) => `${name} vom Treffpunkt entferne?`, removeAction: "Entferne",
    removeFailure: "De Teilnehmer het nöd chönne entfernt werde.", unavailable: "Dä Treffpunkt isch nüm verfügbar.",
    loadDetailError: "De Treffpunkt het nöd chönne glade werde.", backToMeetups: "Zu de Treffpünkt",
    participationError: "D Teilnahme het nöd chönne gänderet werde.",
    privacyNotice: "De offizielle Routenstart isch de Treffpunkt. Private Adrässä und Live-Standört werde nöd teilt.",
    ageLabel: (age) => `${age} ${age === 1 ? "Jahr" : "Jahr"}`, sharedTitle: "Geteilter Treffpunkt",
    sharedExpired: "De Link isch abglaufe oder widerruefe worde.", openMeetups: "Treffpünkt öffne",
    sharedPrivacy: "Dä Link zeigt nur Route, Ziit und Gruppengrössi. Teilnehmername und privati Date blibe gschützt.",
    audience: "Sichtbarkeit",
    audiencePublic: "Öffentlich i SagaTrail",
    audienceCommunity: "I ere Community",
    communityRequired: "Wähl e Community uus.",
  },
  fr: {
    eyebrow: "Randonnée ensemble", title: "Rendez-vous", intro: "Trouvez des personnes qui souhaitent parcourir le même itinéraire le même jour.",
    empty: "Aucun rendez-vous à venir. Ouvrez un itinéraire et créez le premier rendez-vous.",
    loading: "Chargement des rendez-vous …", error: "Les rendez-vous n’ont pas pu être chargés.",
    create: "Créer un rendez-vous", createTitle: "Créer un rendez-vous", createIntro: "Choisissez quand parcourir cet itinéraire ensemble.",
    route: "Itinéraire", date: "Date", datePlaceholder: "AAAA-MM-JJ", time: "Heure de départ", timePlaceholder: "09:00",
    participants: "Places", participantsPlaceholder: "8", pace: "Rythme", paceEasy: "Tranquille", paceNormal: "Normal", paceSporty: "Sportif",
    note: "Note", notePlaceholder: "Par exemple rendez-vous à la gare …", publish: "Publier le rendez-vous", published: "Rendez-vous publié",
    join: "Participer", leave: "Ne plus participer", joined: "Vous participez", organizer: "Organisé par", routeOpen: "Ouvrir l’itinéraire",
    invalid: "Vérifiez la date, l’heure et le nombre de places.", loginRequired: "Connectez-vous pour participer.", full: "Complet",
    noRoute: "Créez un rendez-vous depuis la page d’un itinéraire.", delete: "Supprimer le rendez-vous",
    retry: "Recharger", ok: "OK", calendar: "Calendrier", share: "Partager", report: "Signaler", block: "Bloquer",
    participantsTitle: "Participants", organizerBadge: "Organisateur",
    rankLabel: "Rang de groupe",
    groupAchievement: (threshold) => `${threshold} randonnée${threshold === 1 ? "" : "s"} en groupe`,
    groupAchievementAccessibility: (threshold) => `Jalon obtenu : ${threshold} randonnée${threshold === 1 ? "" : "s"} en groupe`,
    calendarDialogTitle: "Ajouter le rendez-vous au calendrier",
    calendarDescription: "Rendez-vous collectif via SagaTrail.", calendarExportError: "Impossible d’exporter l’événement.",
    shareError: "Impossible de créer le lien sécurisé.", reportPrompt: "Pourquoi souhaitez-vous signaler ce rendez-vous ?",
    reportSafety: "Problème de sécurité", reportHarassment: "Spam ou harcèlement", cancel: "Annuler",
    reportSuccess: "Merci. Le signalement a été enregistré.", reportFailure: "Impossible d’enregistrer le signalement.",
    deletePrompt: "Voulez-vous vraiment supprimer ce rendez-vous ?", deleteFailure: "Impossible de supprimer le rendez-vous.",
    blockPrompt: "Les rendez-vous de cet organisateur seront masqués.", blockAction: "Bloquer",
    blockFailure: "Impossible de bloquer l’utilisateur.", removeParticipant: "Retirer le participant",
    removePrompt: (name) => `Retirer ${name} du rendez-vous ?`, removeAction: "Retirer",
    removeFailure: "Impossible de retirer le participant.", unavailable: "Ce rendez-vous n’est plus disponible.",
    loadDetailError: "Impossible de charger le rendez-vous.", backToMeetups: "Retour aux rendez-vous",
    participationError: "Impossible de modifier la participation.",
    privacyNotice: "Le départ officiel de l’itinéraire est le rendez-vous. Les adresses privées et positions en direct ne sont pas partagées.",
    ageLabel: (age) => `${age} ${age === 1 ? "an" : "ans"}`, sharedTitle: "Rendez-vous partagé",
    sharedExpired: "Ce lien a expiré ou a été révoqué.", openMeetups: "Ouvrir les rendez-vous",
    sharedPrivacy: "Ce lien affiche uniquement l’itinéraire, l’heure et la taille du groupe. Les noms et données privées restent protégés.",
    audience: "Visibilité",
    audiencePublic: "Publiquement dans SagaTrail",
    audienceCommunity: "Dans une communauté",
    communityRequired: "Sélectionnez une communauté.",
  },
  it: {
    eyebrow: "Camminare insieme", title: "Ritrovo", intro: "Trova persone che vogliono percorrere lo stesso itinerario nello stesso giorno.",
    empty: "Nessun ritrovo in programma. Apri un itinerario e crea il primo appuntamento.", loading: "Caricamento dei ritrovi …",
    error: "Impossibile caricare i ritrovi.", create: "Crea ritrovo", createTitle: "Crea ritrovo", createIntro: "Scegli quando percorrere insieme questo itinerario.",
    route: "Itinerario", date: "Data", datePlaceholder: "AAAA-MM-GG", time: "Ora di partenza", timePlaceholder: "09:00",
    participants: "Posti", participantsPlaceholder: "8", pace: "Ritmo", paceEasy: "Tranquillo", paceNormal: "Normale", paceSporty: "Sportivo",
    note: "Nota", notePlaceholder: "Ad esempio ritrovo alla stazione …", publish: "Pubblica ritrovo", published: "Ritrovo pubblicato",
    join: "Partecipa", leave: "Non partecipo più", joined: "Partecipi", organizer: "Organizzato da", routeOpen: "Apri itinerario",
    invalid: "Controlla data, ora e posti.", loginRequired: "Accedi per partecipare.", full: "Completo", noRoute: "Crea un ritrovo dalla pagina di un itinerario.", delete: "Elimina ritrovo",
    retry: "Ricarica", ok: "OK", calendar: "Calendario", share: "Condividi", report: "Segnala", block: "Blocca",
    participantsTitle: "Partecipanti", organizerBadge: "Organizzatore",
    rankLabel: "Rango del gruppo",
    groupAchievement: (threshold) => `${threshold} escursion${threshold === 1 ? "e" : "i"} di gruppo`,
    groupAchievementAccessibility: (threshold) => `Traguardo ottenuto: ${threshold} escursion${threshold === 1 ? "e" : "i"} di gruppo`,
    calendarDialogTitle: "Aggiungi il ritrovo al calendario",
    calendarDescription: "Ritrovo condiviso tramite SagaTrail.", calendarExportError: "Impossibile esportare l’evento.",
    shareError: "Impossibile creare il link sicuro.", reportPrompt: "Perché vuoi segnalare questo ritrovo?",
    reportSafety: "Problema di sicurezza", reportHarassment: "Spam o molestie", cancel: "Annulla",
    reportSuccess: "Grazie. La segnalazione è stata salvata.", reportFailure: "Impossibile salvare la segnalazione.",
    deletePrompt: "Vuoi davvero eliminare questo ritrovo?", deleteFailure: "Impossibile eliminare il ritrovo.",
    blockPrompt: "I ritrovi di questo organizzatore verranno nascosti.", blockAction: "Blocca",
    blockFailure: "Impossibile bloccare l’utente.", removeParticipant: "Rimuovi partecipante",
    removePrompt: (name) => `Rimuovere ${name} dal ritrovo?`, removeAction: "Rimuovi",
    removeFailure: "Impossibile rimuovere il partecipante.", unavailable: "Questo ritrovo non è più disponibile.",
    loadDetailError: "Impossibile caricare il ritrovo.", backToMeetups: "Torna ai ritrovi",
    participationError: "Impossibile modificare la partecipazione.",
    privacyNotice: "Il punto di partenza ufficiale dell’itinerario è il ritrovo. Indirizzi privati e posizioni in tempo reale non vengono condivisi.",
    ageLabel: (age) => `${age} ${age === 1 ? "anno" : "anni"}`, sharedTitle: "Ritrovo condiviso",
    sharedExpired: "Questo link è scaduto o è stato revocato.", openMeetups: "Apri i ritrovi",
    sharedPrivacy: "Questo link mostra solo itinerario, ora e dimensione del gruppo. Nomi e dati privati restano protetti.",
    audience: "Visibilità",
    audiencePublic: "Pubblico in SagaTrail",
    audienceCommunity: "In una community",
    communityRequired: "Seleziona una community.",
  },
  en: {
    eyebrow: "Hike together", title: "Meetup", intro: "Find people who want to hike the same route on the same day.",
    empty: "No upcoming meetups yet. Open a route and create the first one.", loading: "Loading meetups …", error: "Meetups could not be loaded.",
    create: "Create meetup", createTitle: "Create a meetup", createIntro: "Choose when you would like to hike this route together.",
    route: "Route", date: "Date", datePlaceholder: "YYYY-MM-DD", time: "Start time", timePlaceholder: "09:00",
    participants: "Places", participantsPlaceholder: "8", pace: "Pace", paceEasy: "Relaxed", paceNormal: "Normal", paceSporty: "Sporty",
    note: "Note", notePlaceholder: "For example, meet at the station …", publish: "Publish meetup", published: "Meetup published",
    join: "Join hike", leave: "Leave", joined: "You are joining", organizer: "Organized by", routeOpen: "Open route",
    invalid: "Check the date, start time and places.", loginRequired: "Sign in to join.", full: "Full", noRoute: "Create a meetup from a route detail page.", delete: "Delete meetup",
    retry: "Reload", ok: "OK", calendar: "Calendar", share: "Share", report: "Report", block: "Block",
    participantsTitle: "Participants", organizerBadge: "Organizer",
    rankLabel: "Group rank",
    groupAchievement: (threshold) => `${threshold} group hike${threshold === 1 ? "" : "s"}`,
    groupAchievementAccessibility: (threshold) => `Earned milestone: ${threshold} group hike${threshold === 1 ? "" : "s"}`,
    calendarDialogTitle: "Add meetup to calendar",
    calendarDescription: "Group meetup via SagaTrail.", calendarExportError: "The calendar event could not be exported.",
    shareError: "The secure link could not be created.", reportPrompt: "Why do you want to report this meetup?",
    reportSafety: "Safety concern", reportHarassment: "Spam or harassment", cancel: "Cancel",
    reportSuccess: "Thank you. The report was saved.", reportFailure: "The report could not be saved.",
    deletePrompt: "Do you really want to delete this meetup?", deleteFailure: "The meetup could not be deleted.",
    blockPrompt: "Meetups from this organizer will be hidden.", blockAction: "Block",
    blockFailure: "The user could not be blocked.", removeParticipant: "Remove participant",
    removePrompt: (name) => `Remove ${name} from the meetup?`, removeAction: "Remove",
    removeFailure: "The participant could not be removed.", unavailable: "This meetup is no longer available.",
    loadDetailError: "The meetup could not be loaded.", backToMeetups: "Back to meetups",
    participationError: "Participation could not be changed.",
    privacyNotice: "The official route start is the meetup point. Private addresses and live locations are not shared.",
    ageLabel: (age) => `${age} ${age === 1 ? "year" : "years"}`, sharedTitle: "Shared meetup",
    sharedExpired: "This link has expired or been revoked.", openMeetups: "Open meetups",
    sharedPrivacy: "This link shows only the route, time and group size. Participant names and private data remain protected.",
    audience: "Visibility",
    audiencePublic: "Public in SagaTrail",
    audienceCommunity: "In a community",
    communityRequired: "Select a community.",
  },
  zh: {
    eyebrow: "一起徒步", title: "徒步集合", intro: "找到想在同一天走同一条路线的人。",
    empty: "暂无即将开始的集合。打开一条路线并创建第一个集合。", loading: "正在加载集合 …", error: "无法加载集合。",
    create: "创建集合", createTitle: "创建集合", createIntro: "选择一起徒步这条路线的时间。",
    route: "路线", date: "日期", datePlaceholder: "年-月-日", time: "出发时间", timePlaceholder: "09:00",
    participants: "名额", participantsPlaceholder: "8", pace: "节奏", paceEasy: "轻松", paceNormal: "正常", paceSporty: "快速",
    note: "备注", notePlaceholder: "例如在车站集合 …", publish: "发布集合", published: "集合已发布",
    join: "参加徒步", leave: "退出", joined: "你已参加", organizer: "组织者", routeOpen: "打开路线",
    invalid: "请检查日期、时间和名额。", loginRequired: "登录后才能参加。", full: "已满", noRoute: "请从路线详情页创建集合。", delete: "删除集合",
    retry: "重新加载", ok: "确定", calendar: "日历", share: "分享", report: "举报", block: "屏蔽",
    participantsTitle: "参与者", organizerBadge: "组织者",
    rankLabel: "团体等级",
    groupAchievement: (threshold) => `${threshold} 次团体徒步`,
    groupAchievementAccessibility: (threshold) => `已获得里程碑：${threshold} 次团体徒步`,
    calendarDialogTitle: "将集合添加到日历",
    calendarDescription: "通过 SagaTrail 的共同集合。", calendarExportError: "无法导出日历事件。",
    shareError: "无法创建安全链接。", reportPrompt: "为什么要举报这个集合？",
    reportSafety: "安全问题", reportHarassment: "垃圾信息或骚扰", cancel: "取消",
    reportSuccess: "谢谢，举报已保存。", reportFailure: "无法保存举报。",
    deletePrompt: "确定要删除这个集合吗？", deleteFailure: "无法删除集合。",
    blockPrompt: "该组织者的集合将被隐藏。", blockAction: "屏蔽",
    blockFailure: "无法屏蔽该用户。", removeParticipant: "移除参与者",
    removePrompt: (name) => `将 ${name} 从集合中移除？`, removeAction: "移除",
    removeFailure: "无法移除参与者。", unavailable: "该集合已不可用。",
    loadDetailError: "无法加载集合。", backToMeetups: "返回集合",
    participationError: "无法更改参加状态。",
    privacyNotice: "官方路线起点就是集合地点。不会分享私人地址和实时位置。",
    ageLabel: (age) => `${age}岁`, sharedTitle: "共享集合",
    sharedExpired: "链接已过期或已撤销。", openMeetups: "打开集合",
    sharedPrivacy: "此链接仅显示路线、时间和团队人数。参与者姓名和私人数据受到保护。",
    audience: "可见范围",
    audiencePublic: "在 SagaTrail 公开",
    audienceCommunity: "在社区中",
    communityRequired: "请选择一个社区。",
  },
  es: {
    eyebrow: "Caminar juntos", title: "Encuentro", intro: "Encuentra personas que quieran hacer la misma ruta el mismo día.",
    empty: "Todavía no hay encuentros. Abre una ruta y crea el primero.", loading: "Cargando encuentros …", error: "No se han podido cargar los encuentros.",
    create: "Crear encuentro", createTitle: "Crear encuentro", createIntro: "Elige cuándo quieres hacer esta ruta acompañado.",
    route: "Ruta", date: "Fecha", datePlaceholder: "AAAA-MM-DD", time: "Hora de salida", timePlaceholder: "09:00",
    participants: "Plazas", participantsPlaceholder: "8", pace: "Ritmo", paceEasy: "Tranquilo", paceNormal: "Normal", paceSporty: "Deportivo",
    note: "Nota", notePlaceholder: "Por ejemplo, quedar en la estación …", publish: "Publicar encuentro", published: "Encuentro publicado",
    join: "Unirme", leave: "Salir", joined: "Te has unido", organizer: "Organizado por", routeOpen: "Abrir ruta",
    invalid: "Comprueba la fecha, la hora y las plazas.", loginRequired: "Inicia sesión para unirte.", full: "Completo", noRoute: "Crea un encuentro desde el detalle de una ruta.", delete: "Eliminar encuentro",
    retry: "Cargar de nuevo", ok: "OK", calendar: "Calendario", share: "Compartir", report: "Denunciar", block: "Bloquear",
    participantsTitle: "Participantes", organizerBadge: "Organizador",
    rankLabel: "Rango de grupo",
    groupAchievement: (threshold) => `${threshold} caminata${threshold === 1 ? "" : "s"} en grupo`,
    groupAchievementAccessibility: (threshold) => `Hito conseguido: ${threshold} caminata${threshold === 1 ? "" : "s"} en grupo`,
    calendarDialogTitle: "Añadir encuentro al calendario",
    calendarDescription: "Encuentro grupal a través de SagaTrail.", calendarExportError: "No se ha podido exportar el evento.",
    shareError: "No se ha podido crear el enlace seguro.", reportPrompt: "¿Por qué quieres denunciar este encuentro?",
    reportSafety: "Problema de seguridad", reportHarassment: "Spam o acoso", cancel: "Cancelar",
    reportSuccess: "Gracias. La denuncia se ha guardado.", reportFailure: "No se ha podido guardar la denuncia.",
    deletePrompt: "¿Quieres eliminar este encuentro?", deleteFailure: "No se ha podido eliminar el encuentro.",
    blockPrompt: "Los encuentros de este organizador se ocultarán.", blockAction: "Bloquear",
    blockFailure: "No se ha podido bloquear al usuario.", removeParticipant: "Eliminar participante",
    removePrompt: (name) => `¿Eliminar a ${name} del encuentro?`, removeAction: "Eliminar",
    removeFailure: "No se ha podido eliminar al participante.", unavailable: "Este encuentro ya no está disponible.",
    loadDetailError: "No se ha podido cargar el encuentro.", backToMeetups: "Volver a los encuentros",
    participationError: "No se ha podido cambiar la participación.",
    privacyNotice: "El inicio oficial de la ruta es el punto de encuentro. No se comparten direcciones privadas ni ubicaciones en directo.",
    ageLabel: (age) => `${age} ${age === 1 ? "año" : "años"}`, sharedTitle: "Encuentro compartido",
    sharedExpired: "Este enlace ha caducado o se ha revocado.", openMeetups: "Abrir encuentros",
    sharedPrivacy: "Este enlace solo muestra la ruta, la hora y el tamaño del grupo. Los nombres y datos privados permanecen protegidos.",
    audience: "Visibilidad",
    audiencePublic: "Público en SagaTrail",
    audienceCommunity: "En una comunidad",
    communityRequired: "Selecciona una comunidad.",
  },
  pt: {
    eyebrow: "Caminhar juntos", title: "Encontro", intro: "Encontre pessoas que querem fazer a mesma rota no mesmo dia.",
    empty: "Ainda não há encontros. Abra uma rota e crie o primeiro.", loading: "A carregar encontros …", error: "Não foi possível carregar os encontros.",
    create: "Criar encontro", createTitle: "Criar encontro", createIntro: "Escolha quando quer fazer esta rota acompanhado.",
    route: "Rota", date: "Data", datePlaceholder: "AAAA-MM-DD", time: "Hora de partida", timePlaceholder: "09:00",
    participants: "Lugares", participantsPlaceholder: "8", pace: "Ritmo", paceEasy: "Tranquilo", paceNormal: "Normal", paceSporty: "Desportivo",
    note: "Nota", notePlaceholder: "Por exemplo, encontro na estação …", publish: "Publicar encontro", published: "Encontro publicado",
    join: "Participar", leave: "Sair", joined: "Está a participar", organizer: "Organizado por", routeOpen: "Abrir rota",
    invalid: "Verifique a data, hora e lugares.", loginRequired: "Inicie sessão para participar.", full: "Cheio", noRoute: "Crie um encontro a partir do detalhe de uma rota.", delete: "Eliminar encontro",
    retry: "Carregar novamente", ok: "OK", calendar: "Calendário", share: "Partilhar", report: "Denunciar", block: "Bloquear",
    participantsTitle: "Participantes", organizerBadge: "Organizador",
    rankLabel: "Ranque do grupo",
    groupAchievement: (threshold) => `${threshold} caminhada${threshold === 1 ? "" : "s"} em grupo`,
    groupAchievementAccessibility: (threshold) => `Marco alcançado: ${threshold} caminhada${threshold === 1 ? "" : "s"} em grupo`,
    calendarDialogTitle: "Adicionar encontro ao calendário",
    calendarDescription: "Encontro de grupo através do SagaTrail.", calendarExportError: "Não foi possível exportar o evento.",
    shareError: "Não foi possível criar o link seguro.", reportPrompt: "Porque quer denunciar este encontro?",
    reportSafety: "Problema de segurança", reportHarassment: "Spam ou assédio", cancel: "Cancelar",
    reportSuccess: "Obrigado. A denúncia foi guardada.", reportFailure: "Não foi possível guardar a denúncia.",
    deletePrompt: "Quer mesmo eliminar este encontro?", deleteFailure: "Não foi possível eliminar o encontro.",
    blockPrompt: "Os encontros deste organizador serão ocultados.", blockAction: "Bloquear",
    blockFailure: "Não foi possível bloquear o utilizador.", removeParticipant: "Remover participante",
    removePrompt: (name) => `Remover ${name} do encontro?`, removeAction: "Remover",
    removeFailure: "Não foi possível remover o participante.", unavailable: "Este encontro já não está disponível.",
    loadDetailError: "Não foi possível carregar o encontro.", backToMeetups: "Voltar aos encontros",
    participationError: "Não foi possível alterar a participação.",
    privacyNotice: "O início oficial da rota é o ponto de encontro. Não são partilhadas moradas privadas nem localizações em direto.",
    ageLabel: (age) => `${age} ${age === 1 ? "ano" : "anos"}`, sharedTitle: "Encontro partilhado",
    sharedExpired: "Este link expirou ou foi revogado.", openMeetups: "Abrir encontros",
    sharedPrivacy: "Este link mostra apenas a rota, a hora e o tamanho do grupo. Os nomes e dados privados permanecem protegidos.",
    audience: "Visibilidade",
    audiencePublic: "Público no SagaTrail",
    audienceCommunity: "Numa comunidade",
    communityRequired: "Selecione uma comunidade.",
  },
  ru: {
    eyebrow: "Вместе в поход", title: "Встреча", intro: "Найдите людей, которые хотят пройти тот же маршрут в тот же день.",
    empty: "Предстоящих встреч пока нет. Откройте маршрут и создайте первую.", loading: "Загрузка встреч …", error: "Не удалось загрузить встречи.",
    create: "Создать встречу", createTitle: "Создать встречу", createIntro: "Выберите время совместного похода по этому маршруту.",
    route: "Маршрут", date: "Дата", datePlaceholder: "ГГГГ-ММ-ДД", time: "Время старта", timePlaceholder: "09:00",
    participants: "Места", participantsPlaceholder: "8", pace: "Темп", paceEasy: "Спокойный", paceNormal: "Обычный", paceSporty: "Спортивный",
    note: "Заметка", notePlaceholder: "Например, встреча у вокзала …", publish: "Опубликовать встречу", published: "Встреча опубликована",
    join: "Присоединиться", leave: "Выйти", joined: "Вы участвуете", organizer: "Организатор", routeOpen: "Открыть маршрут",
    invalid: "Проверьте дату, время и количество мест.", loginRequired: "Войдите, чтобы присоединиться.", full: "Мест нет", noRoute: "Создайте встречу на странице маршрута.", delete: "Удалить встречу",
    retry: "Загрузить снова", ok: "ОК", calendar: "Календарь", share: "Поделиться", report: "Пожаловаться", block: "Заблокировать",
    participantsTitle: "Участники", organizerBadge: "Организатор",
    rankLabel: "Ранг группы",
    groupAchievement: (threshold) => `${threshold} поход${threshold === 1 ? "" : threshold < 5 ? "а" : "ов"} в группе`,
    groupAchievementAccessibility: (threshold) => `Полученная отметка: ${threshold} поход${threshold === 1 ? "" : threshold < 5 ? "а" : "ов"} в группе`,
    calendarDialogTitle: "Добавить встречу в календарь",
    calendarDescription: "Совместная встреча через SagaTrail.", calendarExportError: "Не удалось экспортировать событие.",
    shareError: "Не удалось создать защищённую ссылку.", reportPrompt: "Почему вы хотите пожаловаться на эту встречу?",
    reportSafety: "Проблема безопасности", reportHarassment: "Спам или преследование", cancel: "Отмена",
    reportSuccess: "Спасибо. Жалоба сохранена.", reportFailure: "Не удалось сохранить жалобу.",
    deletePrompt: "Удалить эту встречу?", deleteFailure: "Не удалось удалить встречу.",
    blockPrompt: "Встречи этого организатора будут скрыты.", blockAction: "Заблокировать",
    blockFailure: "Не удалось заблокировать пользователя.", removeParticipant: "Удалить участника",
    removePrompt: (name) => `Удалить ${name} из встречи?`, removeAction: "Удалить",
    removeFailure: "Не удалось удалить участника.", unavailable: "Эта встреча больше недоступна.",
    loadDetailError: "Не удалось загрузить встречу.", backToMeetups: "Назад к встречам",
    participationError: "Не удалось изменить участие.",
    privacyNotice: "Официальное начало маршрута — место встречи. Личные адреса и геопозиции в реальном времени не передаются.",
    ageLabel: (age) => `${age} ${age === 1 ? "год" : "лет"}`, sharedTitle: "Общая встреча",
    sharedExpired: "Ссылка истекла или была отозвана.", openMeetups: "Открыть встречи",
    sharedPrivacy: "По этой ссылке видны только маршрут, время и размер группы. Имена участников и личные данные защищены.",
    audience: "Видимость",
    audiencePublic: "Публично в SagaTrail",
    audienceCommunity: "В сообществе",
    communityRequired: "Выберите сообщество.",
  },
};

export const useMeetupStrings = createUseStrings(STRINGS);