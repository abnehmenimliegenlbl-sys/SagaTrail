import { createUseStrings, StringsDict } from "../createStrings";

export interface ReferralRewardStrings {
  title: string;
  subtitle: string;
  chooseHint: string;
  claimButton: string;
  claimingButton: string;
  successTitle: string;
  successBody: string;
  successButton: string;
  errorBody: string;
}

const REFERRAL_REWARD_STRINGS: StringsDict<ReferralRewardStrings> = {
  de: {
    title: "Dein Sagenpaket-Geschenk",
    subtitle: "Ein Freund hat über deinen Link Premium abonniert. Wähle jetzt ein Sagenpaket als Dankeschön.",
    chooseHint: "Tippe auf einen Kanton, um das Paket auszuwählen",
    claimButton: "Paket einlösen",
    claimingButton: "Wird eingelöst…",
    successTitle: "Paket freigeschaltet 🎉",
    successBody: "Das Sagenpaket ist jetzt in deiner Sammlung.",
    successButton: "Weiter wandern",
    errorBody: "Etwas ist schiefgelaufen – bitte versuche es später erneut.",
  },
  gsw: {
    title: "Dis Sagenpaket-Gschenk",
    subtitle: "En Fründ het über dine Link Premium abonniert. Wähl jetzt es Sagenpaket aus.",
    chooseHint: "Tipf uf en Kanton, zum Paket uswähle",
    claimButton: "Paket iilöse",
    claimingButton: "Wird iigläst…",
    successTitle: "Paket freigeschaltet 🎉",
    successBody: "Das Sagenpaket isch jetzt in dinere Sammlig.",
    successButton: "Wiiter wandere",
    errorBody: "Öppis isch schiefgloffe – versuech's spöter nomal.",
  },
  en: {
    title: "Your saga pack gift",
    subtitle: "A friend subscribed to Premium through your link. Choose a saga pack as a thank-you.",
    chooseHint: "Tap a canton to select the pack",
    claimButton: "Claim pack",
    claimingButton: "Claiming…",
    successTitle: "Pack unlocked 🎉",
    successBody: "The saga pack is now in your collection.",
    successButton: "Keep hiking",
    errorBody: "Something went wrong – please try again later.",
  },
  fr: {
    title: "Ton cadeau de pack de légendes",
    subtitle: "Un·e ami·e s'est abonné·e à Premium via ton lien. Choisis un pack de légendes en guise de remerciement.",
    chooseHint: "Appuie sur un canton pour sélectionner le pack",
    claimButton: "Utiliser le pack",
    claimingButton: "En cours…",
    successTitle: "Pack débloqué 🎉",
    successBody: "Le pack de légendes est maintenant dans ta collection.",
    successButton: "Continuer la randonnée",
    errorBody: "Une erreur est survenue – réessaie plus tard.",
  },
  it: {
    title: "Il tuo regalo di pacchetto",
    subtitle: "Un amico si è abbonato a Premium tramite il tuo link. Scegli un pacchetto di leggende come ringraziamento.",
    chooseHint: "Tocca un cantone per selezionare il pacchetto",
    claimButton: "Riscatta pacchetto",
    claimingButton: "In corso…",
    successTitle: "Pacchetto sbloccato 🎉",
    successBody: "Il pacchetto di leggende è ora nella tua collezione.",
    successButton: "Continua l'escursione",
    errorBody: "Qualcosa è andato storto – riprova più tardi.",
  },
  es: {
    title: "Tu regalo de pack de sagas",
    subtitle: "Un amigo se suscribió a Premium a través de tu enlace. Elige un pack de sagas como agradecimiento.",
    chooseHint: "Toca un cantón para seleccionar el pack",
    claimButton: "Canjear pack",
    claimingButton: "Canjeando…",
    successTitle: "Pack desbloqueado 🎉",
    successBody: "El pack de sagas está ahora en tu colección.",
    successButton: "Continuar caminata",
    errorBody: "Algo salió mal – inténtalo de nuevo más tarde.",
  },
  pt: {
    title: "O teu presente de pacote de lendas",
    subtitle: "Um amigo subscreveu o Premium através do teu link. Escolhe um pacote de lendas como agradecimento.",
    chooseHint: "Toca num cantão para selecionar o pacote",
    claimButton: "Resgatar pacote",
    claimingButton: "A resgatar…",
    successTitle: "Pacote desbloqueado 🎉",
    successBody: "O pacote de lendas está agora na tua coleção.",
    successButton: "Continuar caminhada",
    errorBody: "Algo correu mal – tenta novamente mais tarde.",
  },
  zh: {
    title: "你的传说包礼物",
    subtitle: "一位朋友通过你的链接订阅了 Premium。选择一个传说包作为感谢。",
    chooseHint: "点击某个州以选择礼包",
    claimButton: "领取礼包",
    claimingButton: "领取中…",
    successTitle: "礼包已解锁 🎉",
    successBody: "传说包现已加入你的收藏。",
    successButton: "继续徒步",
    errorBody: "出错了——请稍后重试。",
  },
  ru: {
    title: "Твой подарок — пакет саг",
    subtitle: "Друг подписался на Premium по твоей ссылке. Выбери пакет саг в знак благодарности.",
    chooseHint: "Нажми на кантон, чтобы выбрать пакет",
    claimButton: "Получить пакет",
    claimingButton: "Получение…",
    successTitle: "Пакет разблокирован 🎉",
    successBody: "Пакет саг теперь в твоей коллекции.",
    successButton: "Продолжить поход",
    errorBody: "Что-то пошло не так – повтори попытку позже.",
  },
};

export const useReferralRewardStrings = createUseStrings(REFERRAL_REWARD_STRINGS);
