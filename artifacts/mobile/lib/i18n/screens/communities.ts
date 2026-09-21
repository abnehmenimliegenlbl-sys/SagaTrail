import { createUseStrings, StringsDict } from "../createStrings";

export interface CommunityScreenStrings {
  eyebrow: string;
  title: string;
  intro: string;
  empty: string;
  loading: string;
  error: string;
  retry: string;
  futureHikes: (count: number) => string;
  openCommunity: string;
  members: (count: number) => string;
  administrator: string;
  announcement: string;
  shareCommunity: string;
  shareInviteMessage: (name: string, link: string, code: string) => string;
  openFacebookGroup: string;
  planCommunityHike: string;
  inviteCode: string;
}

const COMMUNITY_STRINGS: StringsDict<CommunityScreenStrings> = {
  de: {
    eyebrow: "Deine Gruppen",
    title: "Meine Communities",
    intro: "Alle Communities, denen du angehörst.",
    empty: "Du bist noch keiner Community beigetreten.",
    loading: "Communities werden geladen …",
    error: "Die Communities konnten gerade nicht geladen werden.",
    retry: "Erneut versuchen",
    futureHikes: (count) => `${count} geplante Wanderung${count === 1 ? "" : "en"}`,
    openCommunity: "Community öffnen",
    members: (count) => `${count} Mitglied${count === 1 ? "" : "er"}`,
    administrator: "Community-Admin",
    announcement: "Aktuelles",
    shareCommunity: "Community einladen",
    shareInviteMessage: (name, link, code) =>
      `Komm zur Community «${name}» auf SagaTrail.\n\nEinladung: ${link}\nCode: ${code}`,
    openFacebookGroup: "Facebook-Gruppe öffnen",
    planCommunityHike: "Wanderung für die Community planen",
    inviteCode: "Einladungscode",
  },
  gsw: {
    eyebrow: "Dini Gruppe",
    title: "Mini Communitiys",
    intro: "Alli Communitiys, zu dene du ghörsch.",
    empty: "Du bisch no kei Community biitrete.",
    loading: "Communitiys werde glade …",
    error: "Dini Communitiys chönne grad nöd glade werde.",
    retry: "Nomol probiere",
    futureHikes: (count) => `${count} geplanti Wanderig${count === 1 ? "" : "e"}`,
    openCommunity: "Community öffne",
    members: (count) => `${count} Mitglied${count === 1 ? "" : "er"}`,
    administrator: "Community-Admin",
    announcement: "Aktuell",
    shareCommunity: "Community iilade",
    shareInviteMessage: (name, link, code) =>
      `Chum i d Community «${name}» uf SagaTrail.\n\nIiladig: ${link}\nCode: ${code}`,
    openFacebookGroup: "Facebook-Gruppe öffne",
    planCommunityHike: "Wanderig für d Community plane",
    inviteCode: "Iiladigs-Code",
  },
  en: {
    eyebrow: "Your groups",
    title: "My communities",
    intro: "All communities you belong to.",
    empty: "You have not joined a community yet.",
    loading: "Loading communities …",
    error: "The communities could not be loaded right now.",
    retry: "Try again",
    futureHikes: (count) => `${count} planned hike${count === 1 ? "" : "s"}`,
    openCommunity: "Open community",
    members: (count) => `${count} member${count === 1 ? "" : "s"}`,
    administrator: "Community admin",
    announcement: "Latest update",
    shareCommunity: "Invite to community",
    shareInviteMessage: (name, link, code) =>
      `Join the “${name}” community on SagaTrail.\n\nInvite: ${link}\nCode: ${code}`,
    openFacebookGroup: "Open Facebook group",
    planCommunityHike: "Plan a hike for the community",
    inviteCode: "Invitation code",
  },
  fr: {
    eyebrow: "Tes groupes",
    title: "Mes communautés",
    intro: "Toutes les communautés auxquelles tu appartiens.",
    empty: "Tu n'as encore rejoint aucune communauté.",
    loading: "Chargement des communautés …",
    error: "Les communautés ne peuvent pas être chargées pour le moment.",
    retry: "Réessayer",
    futureHikes: (count) => `${count} randonnée${count === 1 ? "" : "s"} prévue${count === 1 ? "" : "s"}`,
    openCommunity: "Ouvrir la communauté",
    members: (count) => `${count} membre${count === 1 ? "" : "s"}`,
    administrator: "Admin de la communauté",
    announcement: "Actualité",
    shareCommunity: "Inviter dans la communauté",
    shareInviteMessage: (name, link, code) =>
      `Rejoins la communauté « ${name} » sur SagaTrail.\n\nInvitation : ${link}\nCode : ${code}`,
    openFacebookGroup: "Ouvrir le groupe Facebook",
    planCommunityHike: "Planifier une randonnée pour la communauté",
    inviteCode: "Code d'invitation",
  },
  it: {
    eyebrow: "I tuoi gruppi",
    title: "Le mie community",
    intro: "Tutte le community di cui fai parte.",
    empty: "Non hai ancora aderito a una community.",
    loading: "Caricamento delle community …",
    error: "Le community non possono essere caricate al momento.",
    retry: "Riprova",
    futureHikes: (count) => `${count} escursion${count === 1 ? "e programmata" : "i programmate"}`,
    openCommunity: "Apri community",
    members: (count) => `${count} membr${count === 1 ? "o" : "i"}`,
    administrator: "Admin della community",
    announcement: "Aggiornamento",
    shareCommunity: "Invita nella community",
    shareInviteMessage: (name, link, code) =>
      `Unisciti alla community «${name}» su SagaTrail.\n\nInvito: ${link}\nCodice: ${code}`,
    openFacebookGroup: "Apri il gruppo Facebook",
    planCommunityHike: "Organizza un'escursione per la community",
    inviteCode: "Codice d'invito",
  },
  es: {
    eyebrow: "Tus grupos",
    title: "Mis comunidades",
    intro: "Todas las comunidades a las que perteneces.",
    empty: "Todavía no te has unido a ninguna comunidad.",
    loading: "Cargando comunidades …",
    error: "No se han podido cargar las comunidades.",
    retry: "Reintentar",
    futureHikes: (count) => `${count} caminata${count === 1 ? " prevista" : "s previstas"}`,
    openCommunity: "Abrir comunidad",
    members: (count) => `${count} miembro${count === 1 ? "" : "s"}`,
    administrator: "Administrador de la comunidad",
    announcement: "Actualidad",
    shareCommunity: "Invitar a la comunidad",
    shareInviteMessage: (name, link, code) =>
      `Únete a la comunidad «${name}» en SagaTrail.\n\nInvitación: ${link}\nCódigo: ${code}`,
    openFacebookGroup: "Abrir grupo de Facebook",
    planCommunityHike: "Planificar una caminata para la comunidad",
    inviteCode: "Código de invitación",
  },
  pt: {
    eyebrow: "Os seus grupos",
    title: "As minhas comunidades",
    intro: "Todas as comunidades a que pertence.",
    empty: "Ainda não entrou em nenhuma comunidade.",
    loading: "A carregar comunidades …",
    error: "Não foi possível carregar as comunidades.",
    retry: "Tentar novamente",
    futureHikes: (count) => `${count} caminhada${count === 1 ? " planeada" : "s planeadas"}`,
    openCommunity: "Abrir comunidade",
    members: (count) => `${count} membro${count === 1 ? "" : "s"}`,
    administrator: "Administrador da comunidade",
    announcement: "Atualidade",
    shareCommunity: "Convidar para a comunidade",
    shareInviteMessage: (name, link, code) =>
      `Junte-se à comunidade «${name}» no SagaTrail.\n\nConvite: ${link}\nCódigo: ${code}`,
    openFacebookGroup: "Abrir grupo do Facebook",
    planCommunityHike: "Planear caminhada para a comunidade",
    inviteCode: "Código de convite",
  },
  zh: {
    eyebrow: "你的群组",
    title: "我的社区",
    intro: "你加入的所有社区。",
    empty: "你还没有加入任何社区。",
    loading: "正在加载社区 …",
    error: "暂时无法加载社区。",
    retry: "重试",
    futureHikes: (count) => `${count} 个计划中的徒步`,
    openCommunity: "打开社区",
    members: (count) => `${count} 位成员`,
    administrator: "社区管理员",
    announcement: "最新消息",
    shareCommunity: "邀请加入社区",
    shareInviteMessage: (name, link, code) =>
      `加入 SagaTrail 上的“${name}”社区。\n\n邀请：${link}\n代码：${code}`,
    openFacebookGroup: "打开 Facebook 群组",
    planCommunityHike: "为社区计划徒步",
    inviteCode: "邀请码",
  },
  ru: {
    eyebrow: "Твои группы",
    title: "Мои сообщества",
    intro: "Все сообщества, в которых ты состоишь.",
    empty: "Ты ещё не вступил ни в одно сообщество.",
    loading: "Загрузка сообществ …",
    error: "Не удалось загрузить сообщества.",
    retry: "Повторить",
    futureHikes: (count) => `Запланированных походов: ${count}`,
    openCommunity: "Открыть сообщество",
    members: (count) => `Участников: ${count}`,
    administrator: "Администратор сообщества",
    announcement: "Новости",
    shareCommunity: "Пригласить в сообщество",
    shareInviteMessage: (name, link, code) =>
      `Присоединяйся к сообществу «${name}» в SagaTrail.\n\nПриглашение: ${link}\nКод: ${code}`,
    openFacebookGroup: "Открыть группу Facebook",
    planCommunityHike: "Запланировать поход для сообщества",
    inviteCode: "Код приглашения",
  },
};

export const useCommunityScreenStrings = createUseStrings(COMMUNITY_STRINGS);