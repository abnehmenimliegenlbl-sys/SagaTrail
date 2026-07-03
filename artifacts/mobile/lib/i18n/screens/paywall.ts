import { createUseStrings, StringsDict } from "../createStrings";

export interface PaywallStrings {
  features: string[];
  title: string;
  subtitle: string;
  activeBox: string;
  plans: {
    yearTitle: string;
    yearBadge: string;
    yearPer: string;
    monthTitle: string;
    monthPer: string;
  };
  buyYearBtn: string;
  buyMonthBtn: string;
  restoreBtn: string;
  restoreAlertTitle: string;
  restoreAlertMsg: string;
  legalText: string;
  successAlertTitle: string;
  successAlertMsg: string;
  successAlertBtn: string;
}

const PAYWALL_STRINGS: StringsDict<PaywallStrings> = {
  de: {
    features: [
      "Alle 26 Kantone und ihre Sagen",
      "Unbegrenzte Wanderungen",
      "Erweiterte Charakter-Anpassung",
      "Alle Archetypen und Erzählstimmen",
      "Gruppenmodus ohne Limit",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "Die ganze Schweiz und all ihre Legenden",
    activeBox: "Premium ist bereits aktiv. Viel Freude auf allen Wegen.",
    plans: {
      yearTitle: "Jahresabo",
      yearBadge: "2 Monate gratis",
      yearPer: "/ Jahr",
      monthTitle: "Monatsabo",
      monthPer: "/ Monat",
    },
    buyYearBtn: "Jahresabo starten",
    buyMonthBtn: "Monatsabo starten",
    restoreBtn: "Kauf wiederherstellen",
    restoreAlertTitle: "Kauf wiederherstellen",
    restoreAlertMsg: "In diesem Erststart-Build sind noch keine echten Käufe hinterlegt.",
    legalText:
      "Abonnement verlängert sich automatisch, bis es gekündigt wird. In diesem Build werden keine echten Zahlungen ausgelöst.",
    successAlertTitle: "Willkommen bei Premium",
    successAlertMsg: "Alle Kantone und Sagen sind jetzt freigeschaltet.",
    successAlertBtn: "Los geht's",
  },
  gsw: {
    features: [
      "Alli 26 Kantön und ihri Sage",
      "Unbegrenzti Wanderige",
      "Erwiitereti Charakter-Apassig",
      "Alli Archetype und Verzählerstimme",
      "Gruppemodus ohni Limit",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "Die ganzi Schwiiz und all ihri Legände",
    activeBox: "Premium isch bereits aktiv. Viel Freud uf allne Wäg.",
    plans: {
      yearTitle: "Jahresabo",
      yearBadge: "2 Mönet gratis",
      yearPer: "/ Jahr",
      monthTitle: "Monatsabo",
      monthPer: "/ Monet",
    },
    buyYearBtn: "Jahresabo starte",
    buyMonthBtn: "Monatsabo starte",
    restoreBtn: "Chauf wiederhärstelle",
    restoreAlertTitle: "Chauf wiederhärstelle",
    restoreAlertMsg: "In däm Erschtstart-Build sind no keini ächte Chäuf hinterleit.",
    legalText:
      "Abonnement verlängeret sich automatisch, bis es kündet wird. In däm Build wärdet keini ächte Zahlige usglöst.",
    successAlertTitle: "Willkomme bi Premium",
    successAlertMsg: "Alli Kantön und Sage sind jetzt freigschaltet.",
    successAlertBtn: "Los goht's",
  },
  en: {
    features: [
      "All 26 cantons and their legends",
      "Unlimited hikes",
      "Enhanced character customization",
      "All archetypes and narrative voices",
      "Unlimited group mode",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "All of Switzerland and all its legends",
    activeBox: "Premium is already active. Enjoy your journeys.",
    plans: {
      yearTitle: "Annual plan",
      yearBadge: "2 months free",
      yearPer: "/ year",
      monthTitle: "Monthly plan",
      monthPer: "/ month",
    },
    buyYearBtn: "Start annual plan",
    buyMonthBtn: "Start monthly plan",
    restoreBtn: "Restore purchase",
    restoreAlertTitle: "Restore purchase",
    restoreAlertMsg: "In this early build, no real purchases are available yet.",
    legalText:
      "Subscription renews automatically until cancelled. No real payments are processed in this build.",
    successAlertTitle: "Welcome to Premium",
    successAlertMsg: "All cantons and legends are now unlocked.",
    successAlertBtn: "Let's go",
  },
  fr: {
    features: [
      "Les 26 cantons et leurs légendes",
      "Randonnées illimitées",
      "Personnalisation avancée des personnages",
      "Tous les archétypes et voix de narration",
      "Mode groupe sans limite",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "Toute la Suisse et toutes ses légendes",
    activeBox: "Premium est déjà actif. Profitez bien de vos chemins.",
    plans: {
      yearTitle: "Abonnement annuel",
      yearBadge: "2 mois offerts",
      yearPer: "/ an",
      monthTitle: "Abonnement mensuel",
      monthPer: "/ mois",
    },
    buyYearBtn: "Commencer l'abonnement annuel",
    buyMonthBtn: "Commencer l'abonnement mensuel",
    restoreBtn: "Restaurer l'achat",
    restoreAlertTitle: "Restaurer l'achat",
    restoreAlertMsg: "Dans cette version préliminaire, aucun achat réel n'est encore disponible.",
    legalText:
      "L'abonnement se renouvelle automatiquement jusqu'à sa résiliation. Aucun paiement réel n'est déclenché dans cette version.",
    successAlertTitle: "Bienvenue sur Premium",
    successAlertMsg: "Tous les cantons et légendes sont maintenant débloqués.",
    successAlertBtn: "C'est parti",
  },
  it: {
    features: [
      "Tutti i 26 cantoni e le loro leggende",
      "Escursioni illimitate",
      "Personalizzazione avanzata del personaggio",
      "Tutti gli archetipi e le voci narranti",
      "Modalità di gruppo senza limiti",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "Tutta la Svizzera e tutte le sue leggende",
    activeBox: "Premium è già attivo. Buon divertimento su tutti i percorsi.",
    plans: {
      yearTitle: "Abbonamento annuale",
      yearBadge: "2 mesi gratuiti",
      yearPer: "/ anno",
      monthTitle: "Abbonamento mensile",
      monthPer: "/ mese",
    },
    buyYearBtn: "Avvia abbonamento annuale",
    buyMonthBtn: "Avvia abbonamento mensile",
    restoreBtn: "Ripristina acquisto",
    restoreAlertTitle: "Ripristina acquisto",
    restoreAlertMsg: "In questa versione iniziale non sono ancora previsti acquisti reali.",
    legalText:
      "L'abbonamento si rinnova automaticamente fino alla disdetta. In questa versione non vengono attivati pagamenti reali.",
    successAlertTitle: "Benvenuti in Premium",
    successAlertMsg: "Tutti i cantoni e le leggende sono ora sbloccati.",
    successAlertBtn: "Si parte",
  },
  es: {
    features: [
      "Los 26 cantones y sus leyendas",
      "Caminatas ilimitadas",
      "Personalización avanzada de personajes",
      "Todos los arquetipos y voces narrativas",
      "Modo grupal sin límites",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "Toda Suiza y todas sus leyendas",
    activeBox: "Premium ya está activo. Que disfrutes de todos los caminos.",
    plans: {
      yearTitle: "Suscripción anual",
      yearBadge: "2 meses gratis",
      yearPer: "/ año",
      monthTitle: "Suscripción mensual",
      monthPer: "/ mes",
    },
    buyYearBtn: "Iniciar suscripción anual",
    buyMonthBtn: "Iniciar suscripción mensual",
    restoreBtn: "Restaurar compra",
    restoreAlertTitle: "Restaurar compra",
    restoreAlertMsg: "En esta versión de lanzamiento inicial aún no se han incluido compras reales.",
    legalText:
      "La suscripción se renueva automáticamente hasta que se cancele. En esta versión no se procesan pagos reales.",
    successAlertTitle: "Bienvenido a Premium",
    successAlertMsg: "Todos los cantones y leyendas están ahora desbloqueados.",
    successAlertBtn: "¡Vamos!",
  },
  pt: {
    features: [
      "Todos os 26 cantões e suas lendas",
      "Caminhadas ilimitadas",
      "Customização avançada de personagem",
      "Todos os arquétipos e vozes narrativas",
      "Modo de grupo sem limite",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "Toda a Suíça e todas as suas lendas",
    activeBox: "O Premium já está ativo. Divirta-se em todos os caminhos.",
    plans: {
      yearTitle: "Plano anual",
      yearBadge: "2 meses grátis",
      yearPer: "/ ano",
      monthTitle: "Plano mensal",
      monthPer: "/ mês",
    },
    buyYearBtn: "Iniciar plano anual",
    buyMonthBtn: "Iniciar plano mensal",
    restoreBtn: "Restaurar compra",
    restoreAlertTitle: "Restaurar compra",
    restoreAlertMsg: "Nesta versão inicial, ainda não há compras reais disponíveis.",
    legalText:
      "A assinatura é renovada automaticamente até ser cancelada. Nenhum pagamento real é processado nesta versão.",
    successAlertTitle: "Bem-vindo ao Premium",
    successAlertMsg: "Todos os cantões e lendas estão agora desbloqueados.",
    successAlertBtn: "Vamos lá",
  },
  zh: {
    features: [
      "全部 26 个州及其传说",
      "无限次徒步体验",
      "高级角色定制",
      "所有原型和叙事声音",
      "无限制的群组模式",
    ],
    title: "SAGATRAIL PREMIUM",
    subtitle: "整个瑞士及其所有传说",
    activeBox: "Premium 已激活。祝您旅途愉快。",
    plans: {
      yearTitle: "年度订阅",
      yearBadge: "赠送 2 个月",
      yearPer: "/ 年",
      monthTitle: "月度订阅",
      monthPer: "/ 月",
    },
    buyYearBtn: "开始年度订阅",
    buyMonthBtn: "开始月度订阅",
    restoreBtn: "恢复购买",
    restoreAlertTitle: "恢复购买",
    restoreAlertMsg: "在此内测版本中，尚未集成真实的购买功能。",
    legalText: "订阅会自动续订，直至取消。此版本中不会产生真实费用。",
    successAlertTitle: "欢迎使用 Premium",
    successAlertMsg: "所有州和传说现已解锁。",
    successAlertBtn: "开始体验",
  },
};

export const usePaywallStrings = createUseStrings(PAYWALL_STRINGS);
