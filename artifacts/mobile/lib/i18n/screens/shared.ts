import { createUseStrings, StringsDict } from "../createStrings";

export interface SharedStrings {
  back: string;
  close: string;
  retry: string;
  errorTitle: string;
  errorMessage: string;
  errorDetails: string;
  viewErrorDetails: string;
  closeErrorDetails: string;
  avatar: string;
  avatarOf: string;
}

const SHARED_STRINGS: StringsDict<SharedStrings> = {
  de: { back: "Zurück", close: "Schliessen", retry: "Erneut versuchen", errorTitle: "Etwas ist schiefgelaufen", errorMessage: "Bitte lade die App neu, um fortzufahren.", errorDetails: "Fehlerdetails", viewErrorDetails: "Fehlerdetails anzeigen", closeErrorDetails: "Fehlerdetails schliessen", avatar: "Profilbild", avatarOf: "Profilbild von" },
  gsw: { back: "Zrugg", close: "Zuemache", retry: "Nomol probiere", errorTitle: "Öppis isch schiefgloffe", errorMessage: "Bitte lad d App nomol, zum wiiterzmache.", errorDetails: "Fehlerdetails", viewErrorDetails: "Fehlerdetails azeige", closeErrorDetails: "Fehlerdetails schliesse", avatar: "Profilbild", avatarOf: "Profilbild vo" },
  en: { back: "Back", close: "Close", retry: "Try again", errorTitle: "Something went wrong", errorMessage: "Please reload the app to continue.", errorDetails: "Error details", viewErrorDetails: "View error details", closeErrorDetails: "Close error details", avatar: "Profile picture", avatarOf: "Profile picture of" },
  fr: { back: "Retour", close: "Fermer", retry: "Réessayer", errorTitle: "Une erreur est survenue", errorMessage: "Rechargez l’application pour continuer.", errorDetails: "Détails de l’erreur", viewErrorDetails: "Afficher les détails de l’erreur", closeErrorDetails: "Fermer les détails de l’erreur", avatar: "Photo de profil", avatarOf: "Photo de profil de" },
  it: { back: "Indietro", close: "Chiudi", retry: "Riprova", errorTitle: "Si è verificato un errore", errorMessage: "Ricarica l’app per continuare.", errorDetails: "Dettagli dell’errore", viewErrorDetails: "Mostra i dettagli dell’errore", closeErrorDetails: "Chiudi i dettagli dell’errore", avatar: "Immagine del profilo", avatarOf: "Immagine del profilo di" },
  es: { back: "Atrás", close: "Cerrar", retry: "Reintentar", errorTitle: "Algo salió mal", errorMessage: "Recarga la app para continuar.", errorDetails: "Detalles del error", viewErrorDetails: "Ver detalles del error", closeErrorDetails: "Cerrar detalles del error", avatar: "Foto de perfil", avatarOf: "Foto de perfil de" },
  pt: { back: "Voltar", close: "Fechar", retry: "Tentar novamente", errorTitle: "Ocorreu um erro", errorMessage: "Recarrega a aplicação para continuar.", errorDetails: "Detalhes do erro", viewErrorDetails: "Ver detalhes do erro", closeErrorDetails: "Fechar detalhes do erro", avatar: "Foto de perfil", avatarOf: "Foto de perfil de" },
  zh: { back: "返回", close: "关闭", retry: "重试", errorTitle: "出了点问题", errorMessage: "请重新加载应用以继续。", errorDetails: "错误详情", viewErrorDetails: "查看错误详情", closeErrorDetails: "关闭错误详情", avatar: "头像", avatarOf: "头像：" },
  ru: { back: "Назад", close: "Закрыть", retry: "Повторить", errorTitle: "Что-то пошло не так", errorMessage: "Перезагрузите приложение, чтобы продолжить.", errorDetails: "Подробности ошибки", viewErrorDetails: "Показать подробности ошибки", closeErrorDetails: "Закрыть подробности ошибки", avatar: "Аватар", avatarOf: "Аватар пользователя" },
};

export const useSharedStrings = createUseStrings(SHARED_STRINGS);
