import { createUseStrings, StringsDict } from "../createStrings";

export interface SharedStrings {
  back: string;
  close: string;
  retry: string;
}

const SHARED_STRINGS: StringsDict<SharedStrings> = {
  de: { back: "Zurück", close: "Schliessen", retry: "Erneut versuchen" },
  gsw: { back: "Zrugg", close: "Zuemache", retry: "Nomol probiere" },
  en: { back: "Back", close: "Close", retry: "Try again" },
  fr: { back: "Retour", close: "Fermer", retry: "Réessayer" },
  it: { back: "Indietro", close: "Chiudi", retry: "Riprova" },
  es: { back: "Atrás", close: "Cerrar", retry: "Reintentar" },
  pt: { back: "Voltar", close: "Fechar", retry: "Tentar novamente" },
  zh: { back: "返回", close: "关闭", retry: "重试" },
  ru: { back: "Назад", close: "Закрыть", retry: "Повторить" },
};

export const useSharedStrings = createUseStrings(SHARED_STRINGS);
