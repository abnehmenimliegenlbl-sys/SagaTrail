import { createUseStrings, StringsDict } from "../createStrings";

export interface WelcomeSagenpaketStrings {
  title: string;
  subtitle: string;
  chooseLabel: string;
  confirmBtn: string;
  loadingBtn: string;
  successTitle: string;
  successMsg: string;
  successBtn: string;
  alreadyClaimedTitle: string;
  alreadyClaimedMsg: string;
  alreadyClaimedBtn: string;
  errorTitle: string;
  errorMsg: string;
}

const STRINGS: StringsDict<WelcomeSagenpaketStrings> = {
  de: {
    title: "Dein erstes Sagen Paket",
    subtitle: "Als Willkommensgeschenk darfst du dir ein Sagen Paket aussuchen – kostenlos, einmalig.",
    chooseLabel: "Wähle einen Kanton:",
    confirmBtn: "Sagen Paket erhalten",
    loadingBtn: "Wird aktiviert …",
    successTitle: "Sagen Paket aktiviert!",
    successMsg: "Das Sagen Paket für {{canton}} ist jetzt freigeschaltet. Viel Freude beim Wandern!",
    successBtn: "Los wandern",
    alreadyClaimedTitle: "Bereits eingelöst",
    alreadyClaimedMsg: "Du hast dein Willkommens-Sagen Paket bereits eingelöst.",
    alreadyClaimedBtn: "OK",
    errorTitle: "Fehler",
    errorMsg: "Das Sagen Paket konnte nicht aktiviert werden. Bitte versuche es erneut.",
  },
  gsw: {
    title: "Dis erscht Sage Paket",
    subtitle: "Als Willkommensgeschänk darfsch dir es Sage Paket uussueche – kostenlos, einmalig.",
    chooseLabel: "Wähl ene Kanton:",
    confirmBtn: "Sage Paket übercho",
    loadingBtn: "Wird aktiviert …",
    successTitle: "Sage Paket aktiviert!",
    successMsg: "S'Sage Paket für {{canton}} isch jetzt fräigschtellt. Viel Freud bim Wandere!",
    successBtn: "Los wandere",
    alreadyClaimedTitle: "Scho iigloest",
    alreadyClaimedMsg: "Du häsch dis Willkommens-Sage Paket scho iigloest.",
    alreadyClaimedBtn: "OK",
    errorTitle: "Fehler",
    errorMsg: "S'Sage Paket het nöd chöne aktiviert werde. Bitte versueche es nomol.",
  },
  en: {
    title: "Your First Legend Pack",
    subtitle: "As a welcome gift, you can choose one Legend Pack – free, one time only.",
    chooseLabel: "Choose a canton:",
    confirmBtn: "Claim Legend Pack",
    loadingBtn: "Activating …",
    successTitle: "Legend Pack activated!",
    successMsg: "The Legend Pack for {{canton}} is now unlocked. Happy hiking!",
    successBtn: "Start hiking",
    alreadyClaimedTitle: "Already claimed",
    alreadyClaimedMsg: "You have already redeemed your welcome Legend Pack.",
    alreadyClaimedBtn: "OK",
    errorTitle: "Error",
    errorMsg: "The Legend Pack could not be activated. Please try again.",
  },
  fr: {
    title: "Votre premier Pack de Légendes",
    subtitle: "En cadeau de bienvenue, choisissez un Pack de Légendes – gratuit, une seule fois.",
    chooseLabel: "Choisissez un canton :",
    confirmBtn: "Obtenir le Pack de Légendes",
    loadingBtn: "Activation …",
    successTitle: "Pack de Légendes activé !",
    successMsg: "Le Pack de Légendes pour {{canton}} est maintenant déverrouillé. Bonne randonnée !",
    successBtn: "Partir en randonnée",
    alreadyClaimedTitle: "Déjà utilisé",
    alreadyClaimedMsg: "Vous avez déjà utilisé votre Pack de Légendes de bienvenue.",
    alreadyClaimedBtn: "OK",
    errorTitle: "Erreur",
    errorMsg: "Le Pack de Légendes n'a pas pu être activé. Veuillez réessayer.",
  },
  it: {
    title: "Il tuo primo Pacchetto di Leggende",
    subtitle: "Come regalo di benvenuto, scegli un Pacchetto di Leggende – gratuito, una sola volta.",
    chooseLabel: "Scegli un cantone:",
    confirmBtn: "Ottieni il Pacchetto",
    loadingBtn: "Attivazione …",
    successTitle: "Pacchetto attivato!",
    successMsg: "Il Pacchetto di Leggende per {{canton}} è ora sbloccato. Buona escursione!",
    successBtn: "Inizia l'escursione",
    alreadyClaimedTitle: "Già riscattato",
    alreadyClaimedMsg: "Hai già riscattato il tuo Pacchetto di Leggende di benvenuto.",
    alreadyClaimedBtn: "OK",
    errorTitle: "Errore",
    errorMsg: "Il Pacchetto di Leggende non ha potuto essere attivato. Riprova.",
  },
  es: {
    title: "Tu primer Pack de Leyendas",
    subtitle: "Como regalo de bienvenida, elige un Pack de Leyendas – gratis, solo una vez.",
    chooseLabel: "Elige un cantón:",
    confirmBtn: "Obtener el Pack de Leyendas",
    loadingBtn: "Activando …",
    successTitle: "¡Pack de Leyendas activado!",
    successMsg: "El Pack de Leyendas de {{canton}} ya está desbloqueado. ¡Buen senderismo!",
    successBtn: "Empezar a caminar",
    alreadyClaimedTitle: "Ya canjeado",
    alreadyClaimedMsg: "Ya has canjeado tu Pack de Leyendas de bienvenida.",
    alreadyClaimedBtn: "OK",
    errorTitle: "Error",
    errorMsg: "El Pack de Leyendas no pudo activarse. Por favor, inténtalo de nuevo.",
  },
  pt: {
    title: "Seu primeiro Pacote de Lendas",
    subtitle: "Como presente de boas-vindas, escolha um Pacote de Lendas – gratuito, apenas uma vez.",
    chooseLabel: "Escolha um cantão:",
    confirmBtn: "Obter o Pacote de Lendas",
    loadingBtn: "Ativando …",
    successTitle: "Pacote de Lendas ativado!",
    successMsg: "O Pacote de Lendas de {{canton}} está agora desbloqueado. Boas caminhadas!",
    successBtn: "Começar a caminhar",
    alreadyClaimedTitle: "Já resgatado",
    alreadyClaimedMsg: "Você já resgatou seu Pacote de Lendas de boas-vindas.",
    alreadyClaimedBtn: "OK",
    errorTitle: "Erro",
    errorMsg: "O Pacote de Lendas não pôde ser ativado. Por favor, tente novamente.",
  },
  zh: {
    title: "您的第一个传说包",
    subtitle: "作为欢迎礼物，您可以选择一个传说包 — 免费，仅限一次。",
    chooseLabel: "选择一个州：",
    confirmBtn: "获取传说包",
    loadingBtn: "激活中 …",
    successTitle: "传说包已激活！",
    successMsg: "{{canton}} 的传说包现已解锁。祝您徒步愉快！",
    successBtn: "开始徒步",
    alreadyClaimedTitle: "已兑换",
    alreadyClaimedMsg: "您已经兑换了欢迎传说包。",
    alreadyClaimedBtn: "好",
    errorTitle: "错误",
    errorMsg: "传说包无法激活，请重试。",
  },
  ru: {
    title: "Ваш первый пакет легенд",
    subtitle: "В подарок добро пожаловать вы можете выбрать один пакет легенд — бесплатно, только один раз.",
    chooseLabel: "Выберите кантон:",
    confirmBtn: "Получить пакет легенд",
    loadingBtn: "Активация …",
    successTitle: "Пакет легенд активирован!",
    successMsg: "Пакет легенд для {{canton}} теперь разблокирован. Приятных прогулок!",
    successBtn: "Начать поход",
    alreadyClaimedTitle: "Уже использовано",
    alreadyClaimedMsg: "Вы уже использовали свой приветственный пакет легенд.",
    alreadyClaimedBtn: "OK",
    errorTitle: "Ошибка",
    errorMsg: "Не удалось активировать пакет легенд. Пожалуйста, повторите попытку.",
  },
};

export const useWelcomeSagenpaketStrings = createUseStrings(STRINGS);
