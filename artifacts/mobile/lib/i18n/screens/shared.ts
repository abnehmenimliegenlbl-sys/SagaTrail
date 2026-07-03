import { createUseStrings, StringsDict } from "../createStrings";

export interface SharedStrings {
  back: string;
}

const SHARED_STRINGS: StringsDict<SharedStrings> = {
  de: { back: "Zurück" },
  gsw: { back: "Zrugg" },
  en: { back: "Back" },
  fr: { back: "Retour" },
  it: { back: "Indietro" },
  es: { back: "Atrás" },
  pt: { back: "Voltar" },
  zh: { back: "返回" },
};

export const useSharedStrings = createUseStrings(SHARED_STRINGS);
