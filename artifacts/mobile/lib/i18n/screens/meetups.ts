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
}

const STRINGS: StringsDict<MeetupStrings> = {
  de: {
    eyebrow: "Gemeinsam wandern",
    title: "Treffpunkte",
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
  },
  gsw: {
    eyebrow: "Zäme wandere",
    title: "Treffpünkt",
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
  },
  it: {
    eyebrow: "Camminare insieme", title: "Ritrovi", intro: "Trova persone che vogliono percorrere lo stesso itinerario nello stesso giorno.",
    empty: "Nessun ritrovo in programma. Apri un itinerario e crea il primo appuntamento.", loading: "Caricamento dei ritrovi …",
    error: "Impossibile caricare i ritrovi.", create: "Crea ritrovo", createTitle: "Crea ritrovo", createIntro: "Scegli quando percorrere insieme questo itinerario.",
    route: "Itinerario", date: "Data", datePlaceholder: "AAAA-MM-GG", time: "Ora di partenza", timePlaceholder: "09:00",
    participants: "Posti", participantsPlaceholder: "8", pace: "Ritmo", paceEasy: "Tranquillo", paceNormal: "Normale", paceSporty: "Sportivo",
    note: "Nota", notePlaceholder: "Ad esempio ritrovo alla stazione …", publish: "Pubblica ritrovo", published: "Ritrovo pubblicato",
    join: "Partecipa", leave: "Non partecipo più", joined: "Partecipi", organizer: "Organizzato da", routeOpen: "Apri itinerario",
    invalid: "Controlla data, ora e posti.", loginRequired: "Accedi per partecipare.", full: "Completo", noRoute: "Crea un ritrovo dalla pagina di un itinerario.", delete: "Elimina ritrovo",
  },
  en: {
    eyebrow: "Hike together", title: "Meetups", intro: "Find people who want to hike the same route on the same day.",
    empty: "No upcoming meetups yet. Open a route and create the first one.", loading: "Loading meetups …", error: "Meetups could not be loaded.",
    create: "Create meetup", createTitle: "Create a meetup", createIntro: "Choose when you would like to hike this route together.",
    route: "Route", date: "Date", datePlaceholder: "YYYY-MM-DD", time: "Start time", timePlaceholder: "09:00",
    participants: "Places", participantsPlaceholder: "8", pace: "Pace", paceEasy: "Relaxed", paceNormal: "Normal", paceSporty: "Sporty",
    note: "Note", notePlaceholder: "For example, meet at the station …", publish: "Publish meetup", published: "Meetup published",
    join: "Join hike", leave: "Leave", joined: "You are joining", organizer: "Organized by", routeOpen: "Open route",
    invalid: "Check the date, start time and places.", loginRequired: "Sign in to join.", full: "Full", noRoute: "Create a meetup from a route detail page.", delete: "Delete meetup",
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
  },
  es: {
    eyebrow: "Caminar juntos", title: "Encuentros", intro: "Encuentra personas que quieran hacer la misma ruta el mismo día.",
    empty: "Todavía no hay encuentros. Abre una ruta y crea el primero.", loading: "Cargando encuentros …", error: "No se han podido cargar los encuentros.",
    create: "Crear encuentro", createTitle: "Crear encuentro", createIntro: "Elige cuándo quieres hacer esta ruta acompañado.",
    route: "Ruta", date: "Fecha", datePlaceholder: "AAAA-MM-DD", time: "Hora de salida", timePlaceholder: "09:00",
    participants: "Plazas", participantsPlaceholder: "8", pace: "Ritmo", paceEasy: "Tranquilo", paceNormal: "Normal", paceSporty: "Deportivo",
    note: "Nota", notePlaceholder: "Por ejemplo, quedar en la estación …", publish: "Publicar encuentro", published: "Encuentro publicado",
    join: "Unirme", leave: "Salir", joined: "Te has unido", organizer: "Organizado por", routeOpen: "Abrir ruta",
    invalid: "Comprueba la fecha, la hora y las plazas.", loginRequired: "Inicia sesión para unirte.", full: "Completo", noRoute: "Crea un encuentro desde el detalle de una ruta.", delete: "Eliminar encuentro",
  },
  pt: {
    eyebrow: "Caminhar juntos", title: "Encontros", intro: "Encontre pessoas que querem fazer a mesma rota no mesmo dia.",
    empty: "Ainda não há encontros. Abra uma rota e crie o primeiro.", loading: "A carregar encontros …", error: "Não foi possível carregar os encontros.",
    create: "Criar encontro", createTitle: "Criar encontro", createIntro: "Escolha quando quer fazer esta rota acompanhado.",
    route: "Rota", date: "Data", datePlaceholder: "AAAA-MM-DD", time: "Hora de partida", timePlaceholder: "09:00",
    participants: "Lugares", participantsPlaceholder: "8", pace: "Ritmo", paceEasy: "Tranquilo", paceNormal: "Normal", paceSporty: "Desportivo",
    note: "Nota", notePlaceholder: "Por exemplo, encontro na estação …", publish: "Publicar encontro", published: "Encontro publicado",
    join: "Participar", leave: "Sair", joined: "Está a participar", organizer: "Organizado por", routeOpen: "Abrir rota",
    invalid: "Verifique a data, hora e lugares.", loginRequired: "Inicie sessão para participar.", full: "Cheio", noRoute: "Crie um encontro a partir do detalhe de uma rota.", delete: "Eliminar encontro",
  },
  ru: {
    eyebrow: "Вместе в поход", title: "Встречи", intro: "Найдите людей, которые хотят пройти тот же маршрут в тот же день.",
    empty: "Предстоящих встреч пока нет. Откройте маршрут и создайте первую.", loading: "Загрузка встреч …", error: "Не удалось загрузить встречи.",
    create: "Создать встречу", createTitle: "Создать встречу", createIntro: "Выберите время совместного похода по этому маршруту.",
    route: "Маршрут", date: "Дата", datePlaceholder: "ГГГГ-ММ-ДД", time: "Время старта", timePlaceholder: "09:00",
    participants: "Места", participantsPlaceholder: "8", pace: "Темп", paceEasy: "Спокойный", paceNormal: "Обычный", paceSporty: "Спортивный",
    note: "Заметка", notePlaceholder: "Например, встреча у вокзала …", publish: "Опубликовать встречу", published: "Встреча опубликована",
    join: "Присоединиться", leave: "Выйти", joined: "Вы участвуете", organizer: "Организатор", routeOpen: "Открыть маршрут",
    invalid: "Проверьте дату, время и количество мест.", loginRequired: "Войдите, чтобы присоединиться.", full: "Мест нет", noRoute: "Создайте встречу на странице маршрута.", delete: "Удалить встречу",
  },
};

export const useMeetupStrings = createUseStrings(STRINGS);