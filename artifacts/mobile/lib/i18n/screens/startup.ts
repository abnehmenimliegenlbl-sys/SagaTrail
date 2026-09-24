import { createUseStrings, StringsDict } from "../createStrings";

export interface StartupStrings {
  preparing: string;
  loadingData: string;
  checkingSignIn: string;
  restoringSession: string;
  loadingProfile: string;
  keepingTrips: string;
  checkingPermissions: string;
  browsingMeanwhile: string;
}

const STARTUP_STRINGS: StringsDict<StartupStrings> = {
  de: { preparing: "SagaTrail wird vorbereitet", loadingData: "Deine Daten und deine Wanderungen werden geladen.", checkingSignIn: "Anmeldung wird geprüft", restoringSession: "SagaTrail stellt deine Sitzung wieder her.", loadingProfile: "Dein Profil wird geladen", keepingTrips: "Deine gespeicherten Wanderungen bleiben erhalten.", checkingPermissions: "Berechtigungen werden geprüft", browsingMeanwhile: "Du kannst währenddessen weiter stöbern." },
  gsw: { preparing: "SagaTrail wird vorbereitet", loadingData: "Dini Date und dini Wanderige werde glade.", checkingSignIn: "Aamäldig wird prüeft", restoringSession: "SagaTrail stellt dini Sitzig wieder her.", loadingProfile: "Dis Profil wird glade", keepingTrips: "Dini gspeicherete Wanderige bliibed erhalte.", checkingPermissions: "Berechtigunge werde prüeft", browsingMeanwhile: "Du chasch derwiile wiiter stöbere." },
  fr: { preparing: "SagaTrail se prépare", loadingData: "Tes données et tes randonnées sont chargées.", checkingSignIn: "Connexion en cours de vérification", restoringSession: "SagaTrail restaure ta session.", loadingProfile: "Ton profil est chargé", keepingTrips: "Tes randonnées enregistrées restent disponibles.", checkingPermissions: "Vérification des autorisations", browsingMeanwhile: "Tu peux continuer à parcourir l'application." },
  it: { preparing: "SagaTrail si prepara", loadingData: "I tuoi dati e le tue escursioni vengono caricati.", checkingSignIn: "Verifica dell'accesso", restoringSession: "SagaTrail sta ripristinando la sessione.", loadingProfile: "Caricamento del profilo", keepingTrips: "Le tue escursioni salvate restano disponibili.", checkingPermissions: "Verifica dei permessi", browsingMeanwhile: "Puoi continuare a esplorare nel frattempo." },
  en: { preparing: "SagaTrail is getting ready", loadingData: "Your data and hikes are loading.", checkingSignIn: "Checking sign-in", restoringSession: "SagaTrail is restoring your session.", loadingProfile: "Loading your profile", keepingTrips: "Your saved hikes will remain available.", checkingPermissions: "Checking permissions", browsingMeanwhile: "You can keep browsing in the meantime." },
  zh: { preparing: "SagaTrail 正在准备", loadingData: "正在加载你的数据和徒步路线。", checkingSignIn: "正在检查登录状态", restoringSession: "SagaTrail 正在恢复你的会话。", loadingProfile: "正在加载你的个人资料", keepingTrips: "你保存的徒步路线将会保留。", checkingPermissions: "正在检查权限", browsingMeanwhile: "你可以继续浏览应用。" },
  es: { preparing: "SagaTrail se está preparando", loadingData: "Se cargan tus datos y excursiones.", checkingSignIn: "Comprobando el inicio de sesión", restoringSession: "SagaTrail está restaurando tu sesión.", loadingProfile: "Cargando tu perfil", keepingTrips: "Tus excursiones guardadas seguirán disponibles.", checkingPermissions: "Comprobando permisos", browsingMeanwhile: "Mientras tanto puedes seguir explorando." },
  pt: { preparing: "A SagaTrail está a preparar-se", loadingData: "Os teus dados e caminhadas estão a carregar.", checkingSignIn: "A verificar a sessão", restoringSession: "A SagaTrail está a restaurar a tua sessão.", loadingProfile: "A carregar o teu perfil", keepingTrips: "As tuas caminhadas guardadas continuam disponíveis.", checkingPermissions: "A verificar permissões", browsingMeanwhile: "Podes continuar a explorar entretanto." },
  ru: { preparing: "SagaTrail готовится", loadingData: "Загружаются ваши данные и походы.", checkingSignIn: "Проверка входа", restoringSession: "SagaTrail восстанавливает сеанс.", loadingProfile: "Загрузка профиля", keepingTrips: "Сохранённые походы останутся доступными.", checkingPermissions: "Проверка разрешений", browsingMeanwhile: "Пока вы можете продолжать просмотр." },
};

export const useStartupStrings = createUseStrings(STARTUP_STRINGS);