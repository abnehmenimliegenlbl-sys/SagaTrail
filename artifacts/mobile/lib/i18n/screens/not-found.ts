import { createUseStrings, StringsDict } from "../createStrings";

export interface NotFoundStrings {
  title: string;
  message: string;
  home: string;
}

const NOT_FOUND_STRINGS: StringsDict<NotFoundStrings> = {
  de: { title: "Hoppla!", message: "Diese Seite gibt es nicht.", home: "Zur Startseite" },
  gsw: { title: "Hoppla!", message: "Die Siite git's nöd.", home: "Zur Startsiite" },
  fr: { title: "Oups !", message: "Cette page n'existe pas.", home: "Retour à l'accueil" },
  it: { title: "Ops!", message: "Questa schermata non esiste.", home: "Vai alla home" },
  en: { title: "Oops!", message: "This screen doesn't exist.", home: "Go to home screen" },
  zh: { title: "哎呀！", message: "此页面不存在。", home: "返回首页" },
  es: { title: "¡Vaya!", message: "Esta pantalla no existe.", home: "Ir a la pantalla de inicio" },
  pt: { title: "Ups!", message: "Este ecrã não existe.", home: "Ir para o início" },
  ru: { title: "Ой!", message: "Такого экрана не существует.", home: "На главную" },
};

export const useNotFoundStrings = createUseStrings(NOT_FOUND_STRINGS);