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
  permissionSettings: string;
  permissionAllow: (name: string) => string;
  shareAppBlurb: string;
}

const SHARED_STRINGS: StringsDict<SharedStrings> = {
  de: { back: "Zurück", close: "Schliessen", retry: "Erneut versuchen", errorTitle: "Etwas ist schiefgelaufen", errorMessage: "Bitte lade die App neu, um fortzufahren.", errorDetails: "Fehlerdetails", viewErrorDetails: "Fehlerdetails anzeigen", closeErrorDetails: "Fehlerdetails schliessen", avatar: "Profilbild", avatarOf: "Profilbild von", permissionSettings: "Systemeinstellungen öffnen", permissionAllow: (name) => `${name} erlauben`, shareAppBlurb: "SagaTrail – Wandere durch Schweizer Sagen 🏔️" },
  gsw: { back: "Zrugg", close: "Zuemache", retry: "Nomol probiere", errorTitle: "Öppis isch schiefgloffe", errorMessage: "Bitte lad d App nomol, zum wiiterzmache.", errorDetails: "Fehlerdetails", viewErrorDetails: "Fehlerdetails azeige", closeErrorDetails: "Fehlerdetails schliesse", avatar: "Profilbild", avatarOf: "Profilbild vo", permissionSettings: "Systemiistellige öffne", permissionAllow: (name) => `${name} erlaube`, shareAppBlurb: "SagaTrail – Wandere dur Schwiizer Sagen 🏔️" },
  en: { back: "Back", close: "Close", retry: "Try again", errorTitle: "Something went wrong", errorMessage: "Please reload the app to continue.", errorDetails: "Error details", viewErrorDetails: "View error details", closeErrorDetails: "Close error details", avatar: "Profile picture", avatarOf: "Profile picture of", permissionSettings: "Open system settings", permissionAllow: (name) => `Allow ${name}`, shareAppBlurb: "SagaTrail – Hike through Swiss legends 🏔️" },
  fr: { back: "Retour", close: "Fermer", retry: "Réessayer", errorTitle: "Une erreur est survenue", errorMessage: "Rechargez l’application pour continuer.", errorDetails: "Détails de l’erreur", viewErrorDetails: "Afficher les détails de l’erreur", closeErrorDetails: "Fermer les détails de l’erreur", avatar: "Photo de profil", avatarOf: "Photo de profil de", permissionSettings: "Ouvrir les réglages système", permissionAllow: (name) => `Autoriser ${name}`, shareAppBlurb: "SagaTrail – Randonnez au fil des légendes suisses 🏔️" },
  it: { back: "Indietro", close: "Chiudi", retry: "Riprova", errorTitle: "Si è verificato un errore", errorMessage: "Ricarica l’app per continuare.", errorDetails: "Dettagli dell’errore", viewErrorDetails: "Mostra i dettagli dell’errore", closeErrorDetails: "Chiudi i dettagli dell’errore", avatar: "Immagine del profilo", avatarOf: "Immagine del profilo di", permissionSettings: "Apri le impostazioni di sistema", permissionAllow: (name) => `Consenti ${name}`, shareAppBlurb: "SagaTrail – Cammina tra le leggende svizzere 🏔️" },
  es: { back: "Atrás", close: "Cerrar", retry: "Reintentar", errorTitle: "Algo salió mal", errorMessage: "Recarga la app para continuar.", errorDetails: "Detalles del error", viewErrorDetails: "Ver detalles del error", closeErrorDetails: "Cerrar detalles del error", avatar: "Foto de perfil", avatarOf: "Foto de perfil de", permissionSettings: "Abrir ajustes del sistema", permissionAllow: (name) => `Permitir ${name}`, shareAppBlurb: "SagaTrail – Recorre a pie las leyendas suizas 🏔️" },
  pt: { back: "Voltar", close: "Fechar", retry: "Tentar novamente", errorTitle: "Ocorreu um erro", errorMessage: "Recarrega a aplicação para continuar.", errorDetails: "Detalhes do erro", viewErrorDetails: "Ver detalhes do erro", closeErrorDetails: "Fechar detalhes do erro", avatar: "Foto de perfil", avatarOf: "Foto de perfil de", permissionSettings: "Abrir definições do sistema", permissionAllow: (name) => `Permitir ${name}`, shareAppBlurb: "SagaTrail – Caminhe pelas lendas suíças 🏔️" },
  zh: { back: "返回", close: "关闭", retry: "重试", errorTitle: "出了点问题", errorMessage: "请重新加载应用以继续。", errorDetails: "错误详情", viewErrorDetails: "查看错误详情", closeErrorDetails: "关闭错误详情", avatar: "头像", avatarOf: "头像：", permissionSettings: "打开系统设置", permissionAllow: (name) => `允许${name}`, shareAppBlurb: "SagaTrail – 徒步探寻瑞士传说 🏔️" },
  ru: { back: "Назад", close: "Закрыть", retry: "Повторить", errorTitle: "Что-то пошло не так", errorMessage: "Перезагрузите приложение, чтобы продолжить.", errorDetails: "Подробности ошибки", viewErrorDetails: "Показать подробности ошибки", closeErrorDetails: "Закрыть подробности ошибки", avatar: "Аватар", avatarOf: "Аватар пользователя", permissionSettings: "Открыть системные настройки", permissionAllow: (name) => `Разрешить: ${name}`, shareAppBlurb: "SagaTrail — походы по швейцарским легендам 🏔️" },
};

export const useSharedStrings = createUseStrings(SHARED_STRINGS);
