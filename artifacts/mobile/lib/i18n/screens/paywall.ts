import { createUseStrings, StringsDict } from "../createStrings";

export interface PaywallStrings {
  features: string[];
  title: string;
  subtitle: string;
  activeBox: string;
  planPer: string;
  perYear: string;
  planNames: {
    monthly: string;
    yearly: string;
    family: string;
    elite: string;
    eliteFamily: string;
  };
  planTaglines: {
    monthly: string;
    yearly: string;
    family: string;
    elite: string;
    eliteFamily: string;
  };
  buyBtn: string;
  restoreBtn: string;
  restoreSuccessTitle: string;
  restoreSuccessMsg: string;
  restoreNoneTitle: string;
  restoreNoneMsg: string;
  restoreErrorTitle: string;
  restoreErrorMsg: string;
  purchaseErrorTitle: string;
  legalText: string;
  successAlertTitle: string;
  successAlertMsg: string;
  successAlertBtn: string;
  loadingOffering: string;
  unavailableTitle: string;
  unavailableMsg: string;
}

const PAYWALL_STRINGS: StringsDict<PaywallStrings> = {
  de: {
    features: [
      "Alle 26 Kantone und ihre Sagen",
      "Unbegrenzte Wanderungen",
      "Erweiterte Charakter-Anpassung",
      "Erzählstimme mit natürlicher KI-Aussprache",
      "Gruppenmodus ohne Limit",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "Die ganze Schweiz und all ihre Legenden",
    activeBox: "Premium ist bereits aktiv. Viel Freude auf allen Wegen.",
    planPer: "/ Monat",
    perYear: "/ Jahr",
    planNames: {
      monthly: "Premium Monat",
      yearly: "Premium Jahr",
      family: "Familie",
      elite: "Elite",
      eliteFamily: "Elite Familie",
    },
    planTaglines: {
      monthly: "Alle Kantone, monatlich kündbar",
      yearly: "Alle Kantone, bester Einstieg",
      family: "Premium für die ganze Familie",
      elite: "Alle Sagen-Packs inklusive",
      eliteFamily: "Elite für die ganze Familie",
    },
    buyBtn: "Abo starten",
    restoreBtn: "Kauf wiederherstellen",
    restoreSuccessTitle: "Wiederhergestellt",
    restoreSuccessMsg: "Dein Premium-Abo wurde erfolgreich wiederhergestellt.",
    restoreNoneTitle: "Kein Abo gefunden",
    restoreNoneMsg: "Für dieses Konto wurde kein aktives Abo gefunden.",
    restoreErrorTitle: "Wiederherstellung fehlgeschlagen",
    restoreErrorMsg: "Bitte versuche es später erneut.",
    purchaseErrorTitle: "Kauf fehlgeschlagen",
    legalText:
      "Abonnement verlängert sich automatisch, bis es gekündigt wird. Abrechnung über dein App-Store- bzw. Google-Play-Konto.",
    successAlertTitle: "Willkommen bei Premium",
    successAlertMsg: "Alle Kantone und Sagen sind jetzt freigeschaltet.",
    successAlertBtn: "Los geht's",
    loadingOffering: "Angebot wird geladen …",
    unavailableTitle: "Zurzeit nicht verfügbar",
    unavailableMsg: "Das Abo konnte nicht geladen werden. Bitte später erneut versuchen.",
  },
  gsw: {
    features: [
      "Alli 26 Kantön und ihri Sage",
      "Unbegrenzti Wanderige",
      "Erwiitereti Charakter-Apassig",
      "Verzählerstimm mit natürlicher KI-Uusspraach",
      "Gruppemodus ohni Limit",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "Die ganzi Schwiiz und all ihri Legände",
    activeBox: "Premium isch bereits aktiv. Viel Freud uf allne Wäg.",
    planPer: "/ Monet",
    perYear: "/ Johr",
    planNames: {
      monthly: "Premium Monet",
      yearly: "Premium Johr",
      family: "Familie",
      elite: "Elite",
      eliteFamily: "Elite Familie",
    },
    planTaglines: {
      monthly: "Alli Kantön, monetlich kündbar",
      yearly: "Alli Kantön, bester Iistiig",
      family: "Premium für die ganzi Familie",
      elite: "Alli Sage-Packs inklusive",
      eliteFamily: "Elite für die ganzi Familie",
    },
    buyBtn: "Abo starte",
    restoreBtn: "Chauf wiederhärstelle",
    restoreSuccessTitle: "Wiederhärgstellt",
    restoreSuccessMsg: "Dis Premium-Abo isch erfolgriich wiederhärgstellt worde.",
    restoreNoneTitle: "Kes Abo gfunde",
    restoreNoneMsg: "Für das Konto isch kes aktivs Abo gfunde worde.",
    restoreErrorTitle: "Wiederhärstellig fählgschlage",
    restoreErrorMsg: "Bitte versuech's spöter nomol.",
    purchaseErrorTitle: "Chauf fählgschlage",
    legalText:
      "Abonnement verlängeret sich automatisch, bis es kündet wird. Abrächnig über dis App-Store- oder Google-Play-Konto.",
    successAlertTitle: "Willkomme bi Premium",
    successAlertMsg: "Alli Kantön und Sage sind jetzt freigschaltet.",
    successAlertBtn: "Los goht's",
    loadingOffering: "Aagebot wird glade …",
    unavailableTitle: "Momentan nöd verfüegbar",
    unavailableMsg: "S'Abo het nöd chöne glade werde. Bitte spöter nomol versueche.",
  },
  en: {
    features: [
      "All 26 cantons and their legends",
      "Unlimited hikes",
      "Enhanced character customization",
      "Narration voice with natural AI speech",
      "Unlimited group mode",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "All of Switzerland and all its legends",
    activeBox: "Premium is already active. Enjoy your journeys.",
    planPer: "/ month",
    perYear: "/ year",
    planNames: {
      monthly: "Premium Monthly",
      yearly: "Premium Yearly",
      family: "Family",
      elite: "Elite",
      eliteFamily: "Elite Family",
    },
    planTaglines: {
      monthly: "All cantons, cancel monthly",
      yearly: "All cantons, best way to start",
      family: "Premium for the whole family",
      elite: "All legend packs included",
      eliteFamily: "Elite for the whole family",
    },
    buyBtn: "Start subscription",
    restoreBtn: "Restore purchase",
    restoreSuccessTitle: "Restored",
    restoreSuccessMsg: "Your Premium subscription has been restored.",
    restoreNoneTitle: "No subscription found",
    restoreNoneMsg: "No active subscription was found for this account.",
    restoreErrorTitle: "Restore failed",
    restoreErrorMsg: "Please try again later.",
    purchaseErrorTitle: "Purchase failed",
    legalText:
      "Subscription renews automatically until cancelled. Billed through your App Store or Google Play account.",
    successAlertTitle: "Welcome to Premium",
    successAlertMsg: "All cantons and legends are now unlocked.",
    successAlertBtn: "Let's go",
    loadingOffering: "Loading offer …",
    unavailableTitle: "Currently unavailable",
    unavailableMsg: "The subscription could not be loaded. Please try again later.",
  },
  fr: {
    features: [
      "Les 26 cantons et leurs légendes",
      "Randonnées illimitées",
      "Personnalisation avancée des personnages",
      "Voix de narration avec parole IA naturelle",
      "Mode groupe sans limite",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "Toute la Suisse et toutes ses légendes",
    activeBox: "Premium est déjà actif. Profitez bien de vos chemins.",
    planPer: "/ mois",
    perYear: "/ an",
    planNames: {
      monthly: "Premium Mensuel",
      yearly: "Premium Annuel",
      family: "Famille",
      elite: "Elite",
      eliteFamily: "Elite Famille",
    },
    planTaglines: {
      monthly: "Tous les cantons, résiliable chaque mois",
      yearly: "Tous les cantons, le meilleur départ",
      family: "Premium pour toute la famille",
      elite: "Tous les packs de légendes inclus",
      eliteFamily: "Elite pour toute la famille",
    },
    buyBtn: "Démarrer l'abonnement",
    restoreBtn: "Restaurer l'achat",
    restoreSuccessTitle: "Restauré",
    restoreSuccessMsg: "Votre abonnement Premium a été restauré.",
    restoreNoneTitle: "Aucun abonnement trouvé",
    restoreNoneMsg: "Aucun abonnement actif n'a été trouvé pour ce compte.",
    restoreErrorTitle: "Échec de la restauration",
    restoreErrorMsg: "Veuillez réessayer plus tard.",
    purchaseErrorTitle: "Échec de l'achat",
    legalText:
      "L'abonnement se renouvelle automatiquement jusqu'à sa résiliation. Facturé via votre compte App Store ou Google Play.",
    successAlertTitle: "Bienvenue sur Premium",
    successAlertMsg: "Tous les cantons et légendes sont maintenant débloqués.",
    successAlertBtn: "C'est parti",
    loadingOffering: "Chargement de l'offre …",
    unavailableTitle: "Actuellement indisponible",
    unavailableMsg: "L'abonnement n'a pas pu être chargé. Veuillez réessayer plus tard.",
  },
  it: {
    features: [
      "Tutti i 26 cantoni e le loro leggende",
      "Escursioni illimitate",
      "Personalizzazione avanzata del personaggio",
      "Voce narrante con parlato IA naturale",
      "Modalità di gruppo senza limiti",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "Tutta la Svizzera e tutte le sue leggende",
    activeBox: "Premium è già attivo. Buon divertimento su tutti i percorsi.",
    planPer: "/ mese",
    perYear: "/ anno",
    planNames: {
      monthly: "Premium Mensile",
      yearly: "Premium Annuale",
      family: "Famiglia",
      elite: "Elite",
      eliteFamily: "Elite Famiglia",
    },
    planTaglines: {
      monthly: "Tutti i cantoni, disdetta mensile",
      yearly: "Tutti i cantoni, il modo migliore per iniziare",
      family: "Premium per tutta la famiglia",
      elite: "Tutti i pacchetti di leggende inclusi",
      eliteFamily: "Elite per tutta la famiglia",
    },
    buyBtn: "Avvia abbonamento",
    restoreBtn: "Ripristina acquisto",
    restoreSuccessTitle: "Ripristinato",
    restoreSuccessMsg: "Il tuo abbonamento Premium è stato ripristinato.",
    restoreNoneTitle: "Nessun abbonamento trovato",
    restoreNoneMsg: "Non è stato trovato nessun abbonamento attivo per questo account.",
    restoreErrorTitle: "Ripristino non riuscito",
    restoreErrorMsg: "Riprova più tardi.",
    purchaseErrorTitle: "Acquisto non riuscito",
    legalText:
      "L'abbonamento si rinnova automaticamente fino alla disdetta. Addebitato tramite il tuo account App Store o Google Play.",
    successAlertTitle: "Benvenuti in Premium",
    successAlertMsg: "Tutti i cantoni e le leggende sono ora sbloccati.",
    successAlertBtn: "Si parte",
    loadingOffering: "Caricamento offerta …",
    unavailableTitle: "Al momento non disponibile",
    unavailableMsg: "Non è stato possibile caricare l'abbonamento. Riprova più tardi.",
  },
  es: {
    features: [
      "Los 26 cantones y sus leyendas",
      "Caminatas ilimitadas",
      "Personalización avanzada de personajes",
      "Voz narrativa con habla de IA natural",
      "Modo grupal sin límites",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "Toda Suiza y todas sus leyendas",
    activeBox: "Premium ya está activo. Que disfrutes de todos los caminos.",
    planPer: "/ mes",
    perYear: "/ año",
    planNames: {
      monthly: "Premium Mensual",
      yearly: "Premium Anual",
      family: "Familia",
      elite: "Elite",
      eliteFamily: "Elite Familia",
    },
    planTaglines: {
      monthly: "Todos los cantones, cancelable cada mes",
      yearly: "Todos los cantones, la mejor forma de empezar",
      family: "Premium para toda la familia",
      elite: "Todos los packs de leyendas incluidos",
      eliteFamily: "Elite para toda la familia",
    },
    buyBtn: "Iniciar suscripción",
    restoreBtn: "Restaurar compra",
    restoreSuccessTitle: "Restaurado",
    restoreSuccessMsg: "Tu suscripción Premium ha sido restaurada.",
    restoreNoneTitle: "No se encontró suscripción",
    restoreNoneMsg: "No se encontró ninguna suscripción activa para esta cuenta.",
    restoreErrorTitle: "Error al restaurar",
    restoreErrorMsg: "Inténtalo de nuevo más tarde.",
    purchaseErrorTitle: "Error en la compra",
    legalText:
      "La suscripción se renueva automáticamente hasta que se cancele. Facturado a través de tu cuenta de App Store o Google Play.",
    successAlertTitle: "Bienvenido a Premium",
    successAlertMsg: "Todos los cantones y leyendas están ahora desbloqueados.",
    successAlertBtn: "¡Vamos!",
    loadingOffering: "Cargando oferta …",
    unavailableTitle: "No disponible por el momento",
    unavailableMsg: "No se pudo cargar la suscripción. Inténtalo de nuevo más tarde.",
  },
  pt: {
    features: [
      "Todos os 26 cantões e suas lendas",
      "Caminhadas ilimitadas",
      "Customização avançada de personagem",
      "Voz narrativa com fala de IA natural",
      "Modo de grupo sem limite",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "Toda a Suíça e todas as suas lendas",
    activeBox: "O Premium já está ativo. Divirta-se em todos os caminhos.",
    planPer: "/ mês",
    perYear: "/ ano",
    planNames: {
      monthly: "Premium Mensal",
      yearly: "Premium Anual",
      family: "Família",
      elite: "Elite",
      eliteFamily: "Elite Família",
    },
    planTaglines: {
      monthly: "Todos os cantões, cancelável mensalmente",
      yearly: "Todos os cantões, a melhor forma de começar",
      family: "Premium para toda a família",
      elite: "Todos os pacotes de lendas incluídos",
      eliteFamily: "Elite para toda a família",
    },
    buyBtn: "Iniciar assinatura",
    restoreBtn: "Restaurar compra",
    restoreSuccessTitle: "Restaurado",
    restoreSuccessMsg: "Sua assinatura Premium foi restaurada.",
    restoreNoneTitle: "Nenhuma assinatura encontrada",
    restoreNoneMsg: "Nenhuma assinatura ativa foi encontrada para esta conta.",
    restoreErrorTitle: "Falha ao restaurar",
    restoreErrorMsg: "Tente novamente mais tarde.",
    purchaseErrorTitle: "Falha na compra",
    legalText:
      "A assinatura é renovada automaticamente até ser cancelada. Cobrado através da sua conta App Store ou Google Play.",
    successAlertTitle: "Bem-vindo ao Premium",
    successAlertMsg: "Todos os cantões e lendas estão agora desbloqueados.",
    successAlertBtn: "Vamos lá",
    loadingOffering: "Carregando oferta …",
    unavailableTitle: "Indisponível no momento",
    unavailableMsg: "Não foi possível carregar a assinatura. Tente novamente mais tarde.",
  },
  zh: {
    features: [
      "全部 26 个州及其传说",
      "无限次徒步体验",
      "高级角色定制",
      "自然的 AI 语音叙事",
      "无限制的群组模式",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "整个瑞士及其所有传说",
    activeBox: "Premium 已激活。祝您旅途愉快。",
    planPer: "/ 月",
    perYear: "/ 年",
    planNames: {
      monthly: "Premium 月度",
      yearly: "Premium 年度",
      family: "家庭版",
      elite: "Elite",
      eliteFamily: "Elite 家庭版",
    },
    planTaglines: {
      monthly: "全部州，按月可取消",
      yearly: "全部州，最佳入门选择",
      family: "全家共享 Premium",
      elite: "包含所有传说包",
      eliteFamily: "全家共享 Elite",
    },
    buyBtn: "开始订阅",
    restoreBtn: "恢复购买",
    restoreSuccessTitle: "已恢复",
    restoreSuccessMsg: "您的 Premium 订阅已恢复。",
    restoreNoneTitle: "未找到订阅",
    restoreNoneMsg: "未找到此账户的有效订阅。",
    restoreErrorTitle: "恢复失败",
    restoreErrorMsg: "请稍后重试。",
    purchaseErrorTitle: "购买失败",
    legalText: "订阅会自动续订，直至取消。费用通过您的 App Store 或 Google Play 账户结算。",
    successAlertTitle: "欢迎使用 Premium",
    successAlertMsg: "所有州和传说现已解锁。",
    successAlertBtn: "开始体验",
    loadingOffering: "正在加载订阅方案 …",
    unavailableTitle: "暂时不可用",
    unavailableMsg: "无法加载订阅方案，请稍后重试。",
  },
  ru: {
    features: [
      "Все 26 кантонов и их легенды",
      "Неограниченные походы",
      "Расширенная настройка персонажа",
      "Голос повествования с естественной ИИ-речью",
      "Групповой режим без ограничений",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "Вся Швейцария и все её легенды",
    activeBox: "Premium уже активен. Приятных походов.",
    planPer: "/ месяц",
    perYear: "/ год",
    planNames: {
      monthly: "Premium Месяц",
      yearly: "Premium Год",
      family: "Семья",
      elite: "Elite",
      eliteFamily: "Elite Семья",
    },
    planTaglines: {
      monthly: "Все кантоны, отмена в любой месяц",
      yearly: "Все кантоны, лучший старт",
      family: "Premium для всей семьи",
      elite: "Все пакеты легенд включены",
      eliteFamily: "Elite для всей семьи",
    },
    buyBtn: "Оформить подписку",
    restoreBtn: "Восстановить покупку",
    restoreSuccessTitle: "Восстановлено",
    restoreSuccessMsg: "Ваша подписка Premium была восстановлена.",
    restoreNoneTitle: "Подписка не найдена",
    restoreNoneMsg: "Для этого аккаунта не найдено активной подписки.",
    restoreErrorTitle: "Восстановление не удалось",
    restoreErrorMsg: "Пожалуйста, попробуйте позже.",
    purchaseErrorTitle: "Покупка не удалась",
    legalText:
      "Подписка продлевается автоматически до отмены. Оплата через ваш аккаунт App Store или Google Play.",
    successAlertTitle: "Добро пожаловать в Premium",
    successAlertMsg: "Все кантоны и легенды теперь разблокированы.",
    successAlertBtn: "Начать",
    loadingOffering: "Загрузка предложения …",
    unavailableTitle: "Сейчас недоступно",
    unavailableMsg: "Не удалось загрузить подписку. Пожалуйста, попробуйте позже.",
  },
};

export const usePaywallStrings = createUseStrings(PAYWALL_STRINGS);
