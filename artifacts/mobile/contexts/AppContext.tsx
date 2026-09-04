import { useAuth } from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ApiError,
  getGetMyProfileQueryKey,
  useGetMyProfile,
  useSaveMyProfile,
  useUpdateMyPremium,
  useSyncMyPremium,
  useConsumeMyFreeHike,
  useSyncMyProgress,
} from "@workspace/api-client-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Achievement, HikeSession, Profile } from "@/types";
import type { HikingRoute } from "@/constants/routes";
import {
  GroupSocket,
  type GroupActivity,
  type GroupConnectionStatus,
  type GroupMember,
  type GroupSocketError,
  type HikeSyncEvent,
  type GroupLocation,
} from "@/lib/groupSocket";
import type { ThemeMode } from "@/constants/colors";
import { DEFAULT_LANGUAGE, LanguageCode } from "@/lib/i18n/languageCode";
import { detectSystemLanguage } from "@/lib/i18n/systemLocale";
import { iapLog, useSubscription } from "@/lib/revenuecat";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import { getApiBaseUrl } from "@/lib/apiConfig";

// Persistente Schluessel im AsyncStorage — dienen als Offline-Cache,
// seit Profil/Premium serverseitig (Clerk-Benutzer) verwaltet werden.
const KEYS = {
  profile: "sagatrail:profile",
  premium: "sagatrail:premium",
  freeHikeUsed: "sagatrail:freeHikeUsed",
  achievements: "sagatrail:achievements",
  emergency: "sagatrail:emergencyContact",
  energysave: "sagatrail:energiesparmodus",
  lastHike: "sagatrail:lastHike",
  hikeHistory: "sagatrail:hikeHistory",
  activeHike: "sagatrail:activeHike",
  uiLanguage: "sagatrail:uiLanguage",
  freieSagen: "sagatrail:freieSagen",
  themeMode: "sagatrail:themeMode",
  groupLocationSharing: "sagatrail:groupLocationSharing",
  groupSessionCodePrefix: "sagatrail:groupSessionCode:",
} as const;

export interface EmergencyContact {
  name: string;
  phone: string;
}

export type { GroupActivity, GroupMember };

/**
 * Unterbrochene Wanderung fuer die "Weiter wandern"-Karte auf dem Home-Tab.
 * Wird waehrend der Wanderung bei jedem Kapitelwechsel aktualisiert und beim
 * Abschluss (Gipfel erreicht) wieder geloescht.
 */
export interface ActiveHike {
  routeId: string;
  sagaId: string;
  routeName: string;
  chapterIndex: number;
  chapterCount: number;
  updatedAt: number;
  // Vollstaendige Route (mit Wegverlauf) mitpersistieren: Routen sind
  // online-only ohne Seed — stuerzt die App unterwegs ab, waere die Route
  // beim Fortsetzen sonst weg, wenn der Katalog (noch) nicht geladen ist.
  route?: HikingRoute;
  // Falls waehrend der Wanderung eine Umleitung akzeptiert wurde, ist dies
  // die tatsaechlich aktive zusammengesetzte Geometrie.
  activeGeometry?: number[][];
}

export interface GroupSession {
  code: string;
  members: GroupMember[];
  isLeader: boolean;
  rendezvous: GroupLocation | null;
}

interface AppContextValue {
  hydrated: boolean;
  profile: Profile | null;
  purchasedPacks: string[];
  /**
   * Aktive UI-/Erzaehlsprache: `profile.language`, falls ein Profil
   * existiert, sonst die einmalig erkannte Systemsprache (Fallback
   * Englisch). Nutzt dies fuer alle UI-Texte (siehe `lib/i18n`).
   */
  language: LanguageCode;
  premium: boolean;
  /**
   * Ob die einmalige kostenlose Wanderung (unabhaengig vom Kanton) bereits
   * verbraucht wurde. Solange false, ist genau eine Wanderung auch ohne
   * Premium freigeschaltet — siehe `markFreeHikeUsed`.
   */
  freeHikeUsed: boolean;
  achievements: Achievement[];
  emergencyContact: EmergencyContact | null;
  energiesparmodus: boolean;
  /** Hell/Dunkel-Anzeigemodus (Schweizer Rot-Weiss-Design). Standard: "hell". */
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  lastHike: HikeSession | null;
  /**
   * Wander-Tagebuch: alle abgeschlossenen Wanderungen (neueste zuerst,
   * begrenzt auf die letzten 200). Grundlage fuer die Statistik im Profil
   * und die Tagebuch-Ansicht in der Sammlung.
   */
  hikeHistory: HikeSession[];
  activeHike: ActiveHike | null;
  groupSession: GroupSession | null;
  groupLocationSharingEnabled: boolean;
  groupConnectionStatus: GroupConnectionStatus;
  groupError: GroupSocketError | null;
  /**
   * Letztes empfangenes Wander-Sync-Ereignis der Gruppenleitung (nur bei
   * Mitgliedern gesetzt). `receivedAt` erzwingt neue Objekt-Identitaet,
   * damit Effekte auch bei identischen Ereignissen feuern.
   */
  groupHikeEvent: { event: HikeSyncEvent; receivedAt: number } | null;
  /**
   * Erste entdeckte Sage pro Kanton (Kanton -> Saga-ID). Im Premium-Abo ist
   * genau diese eine Sage pro Kanton inklusive; alle weiteren Sagen des
   * Kantons brauchen das Sagen-Pack des Kantons oder Elite.
   */
  freieSagen: Record<string, string>;
  /**
   * Registriert beim Wanderstart die Sage als "erste entdeckte" des Kantons,
   * falls fuer diesen Kanton noch keine registriert ist. No-op sonst.
   */
  registriereSagenEntdeckung: (kanton: string, sagaId: string) => Promise<void>;
  /** Ob die Sage die inkludierte Gratis-Sage ihres Kantons ist (oder es wuerde). */
  istSageInklusive: (kanton: string, sagaId: string) => boolean;

  saveProfile: (profile: Omit<Profile, "id">) => Promise<void>;
  updateProfile: (patch: Partial<Omit<Profile, "id">>) => Promise<void>;
  /**
   * Setzt die Sprache VOR Abschluss des Onboardings (kein Profil
   * vorhanden). Wird von der Sprachauswahl im Onboarding aufgerufen, damit
   * sich die UI live umstellt und die Wahl auch bei Abbruch erhalten
   * bleibt. Hat, sobald ein Profil existiert, keine Wirkung mehr — dann
   * gilt ausschliesslich `profile.language`.
   */
  setPendingLanguage: (code: LanguageCode) => Promise<void>;
  unlockPremium: () => Promise<void>;
  lockPremium: () => Promise<void>;
  /**
   * Verbraucht die einmalige kostenlose Wanderung serverseitig. Wird beim
   * Start der ersten Wanderung eines nicht-Premium-Nutzers aufgerufen.
   * No-op, falls bereits verbraucht.
   */
  markFreeHikeUsed: () => Promise<void>;
  addAchievement: (sagaTitle: string, sagaId: string) => Promise<void>;
  saveEmergencyContact: (contact: EmergencyContact | null) => Promise<void>;
  setEnergiesparmodus: (value: boolean) => Promise<void>;
  saveHike: (hike: HikeSession) => Promise<void>;
  /** Haengt nachtraeglich ein Erinnerungsfoto an eine Wanderung an. */
  attachHikePhoto: (hikeId: string, photoUri: string) => Promise<void>;
  saveActiveHike: (hike: ActiveHike) => Promise<void>;
  clearActiveHike: () => Promise<void>;
  exportData: () => Promise<string>;
  resetAll: () => Promise<void>;
  deleteAccount: () => Promise<void>;

  createGroupSession: () => void;
  joinGroupSession: (code: string) => void;
  leaveGroupSession: () => void;
  kickMember: (memberId: string) => void;
  setGroupActivity: (activity: GroupActivity) => void;
  /** Sendet ein Wander-Sync-Ereignis an die Gruppe (nur als Leitung wirksam). */
  sendGroupHikeEvent: (event: HikeSyncEvent) => void;
  setGroupRendezvous: (location: GroupLocation | null) => void;
  setGroupLocationSharingEnabled: (enabled: boolean) => void;
  clearGroupError: () => void;

  /** Gespeicherte Saga-IDs (Lesezeichen) des Nutzers. */
  savedSagaIds: string[];
  /** Ob Wetter-Push-Benachrichtigungen aktiv sind. */
  pushWeatherEnabled: boolean;
  /** Anzahl ausstehender Pack-Belohnungen aus erfolgreichen Einladungen. */
  pendingPackRewards: number;
  /** Saga zu Lesezeichen hinzufuegen oder entfernen (Toggle). */
  toggleBookmark: (sagaId: string) => Promise<void>;
  /** Wetter-Push-Einstellung aktualisieren (lokal + Server). */
  setPushWeatherEnabled: (enabled: boolean) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Fuer Konsumenten ausserhalb des Providers (z.B. ErrorFallback, der auch
 * Fehler waehrend der AppProvider-Initialisierung abfangen muss). Liefert
 * nur den read-only Anzeigemodus, ohne die volle Context-Pflicht.
 */
export function useThemeModeSafe(): ThemeMode {
  const ctx = useContext(AppContext);
  return ctx?.themeMode ?? "hell";
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: authLoaded, isSignedIn, userId, getToken } = useAuth();

  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [purchasedPacks, setPurchasedPacks] = useState<string[]>([]);
  // Aktueller Profil-Stand fuer Callbacks ohne `profile`-Abhaengigkeit
  // (z.B. applyServerProfile muss purchasedPacks erhalten koennen).
  const profileRef = useRef<Profile | null>(null);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);
  const [premium, setPremium] = useState(false);
  const [freeHikeUsed, setFreeHikeUsed] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [emergencyContact, setEmergencyContact] =
    useState<EmergencyContact | null>(null);
  const [energiesparmodus, setEnergiesparmodusState] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>("hell");
  const [lastHike, setLastHike] = useState<HikeSession | null>(null);
  const [hikeHistory, setHikeHistory] = useState<HikeSession[]>([]);
  const [activeHike, setActiveHike] = useState<ActiveHike | null>(null);
  const [pendingLanguage, setPendingLanguageState] =
    useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [groupSession, setGroupSession] = useState<GroupSession | null>(null);
  const [groupLocationSharingEnabled, setGroupLocationSharingEnabledState] = useState(false);
  const [groupConnectionStatus, setGroupConnectionStatus] =
    useState<GroupConnectionStatus>("getrennt");
  const [groupError, setGroupError] = useState<GroupSocketError | null>(null);
  const [groupHikeEvent, setGroupHikeEvent] = useState<{
    event: HikeSyncEvent;
    receivedAt: number;
  } | null>(null);
  const [persistedGroupCode, setPersistedGroupCode] = useState<string | null>(null);
  const [freieSagen, setFreieSagen] = useState<Record<string, string>>({});
  const [savedSagaIds, setSavedSagaIds] = useState<string[]>([]);
  const [pushWeatherEnabled, setPushWeatherEnabledState] = useState(true);
  const [pendingPackRewards, setPendingPackRewards] = useState(0);

  // Der Socket-Client lebt ausserhalb des React-State (eine Instanz pro
  // App-Laufzeit) und meldet Ereignisse ueber Callbacks zurueck, die den
  // React-Zustand aktualisieren. So bleibt Reconnect-Logik unabhaengig vom
  // Render-Zyklus.
  const groupSocketRef = React.useRef<GroupSocket | null>(null);
  const selfIdRef = React.useRef<string | null>(null);
  selfIdRef.current = userId ?? null;

  // `getToken` von Clerk kann sich bei jedem Render neu referenzieren.
  // Wuerde die Socket-Erstellung direkt davon abhaengen, wuerde bei jedem
  // Render eine neue GroupSocket-Instanz erzeugt und die alte (samt gerade
  // aufgebauter Verbindung) sofort wieder getrennt — sichtbar als
  // "Session erstellen"/"Beitreten" muss mehrfach gedrueckt werden bzw.
  // reagiert gar nicht. Der aktuelle `getToken` wird daher per Ref gehalten;
  // die Socket-Instanz selbst wird nur einmal pro App-Laufzeit erzeugt.
  const getTokenRef = React.useRef(getToken);
  getTokenRef.current = getToken;

  const getGroupToken = useCallback(async () => {
    try {
      return await getTokenRef.current();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const socket = new GroupSocket(getGroupToken, {
      onStatusChange: setGroupConnectionStatus,
      onJoined: (code, members, rendezvous, hikeState) => {
        setGroupError(null);
        if (selfIdRef.current) {
          void AsyncStorage.setItem(
            `${KEYS.groupSessionCodePrefix}${selfIdRef.current}`,
            code,
          );
          setPersistedGroupCode(code);
        }
        setGroupSession({
          code,
          members,
          isLeader: members.some(
            (m) => m.id === selfIdRef.current && m.isLeader
          ),
          rendezvous: rendezvous ?? null,
        });
        if (hikeState?.event) {
          setGroupHikeEvent({ event: hikeState.event, receivedAt: Date.now() });
        }
      },
      onMembers: (members) => {
        setGroupSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            members,
            isLeader: members.some(
              (m) => m.id === selfIdRef.current && m.isLeader
            ),
          };
        });
      },
      onClosedByLeader: () => {
        if (selfIdRef.current) {
          void AsyncStorage.removeItem(
            `${KEYS.groupSessionCodePrefix}${selfIdRef.current}`,
          );
        }
        setPersistedGroupCode(null);
        setGroupSession(null);
        setGroupHikeEvent(null);
      },
      onKicked: () => {
        if (selfIdRef.current) {
          void AsyncStorage.removeItem(
            `${KEYS.groupSessionCodePrefix}${selfIdRef.current}`,
          );
        }
        setPersistedGroupCode(null);
        setGroupSession(null);
        setGroupHikeEvent(null);
      },
      onError: (error) => {
        setGroupError(error);
      },
      onHikeEvent: (event) => {
        // Zeitstempel erzwingt ein neues State-Objekt, damit auch identische
        // aufeinanderfolgende Ereignisse (z.B. zweimal "chapter 2") Effekte
        // ausloesen.
        setGroupHikeEvent({ event, receivedAt: Date.now() });
      },
      onRendezvous: (location) => {
        setGroupSession((prev) => prev ? { ...prev, rendezvous: location } : prev);
      },
    });
    groupSocketRef.current = socket;
    return () => {
      socket.disconnect();
      groupSocketRef.current = null;
    };
  }, [getGroupToken]);

  // Ein laufender Gruppenraum wird beim App-Start automatisch wieder
  // aufgenommen. Der Code ist pro Clerk-User getrennt, damit ein
  // Kontowechsel nie versehentlich der vorherigen Gruppe beitritt.
  useEffect(() => {
    if (!authLoaded || !isSignedIn || !userId || !hydrated) return;
    const key = `${KEYS.groupSessionCodePrefix}${userId}`;
    let cancelled = false;
    void AsyncStorage.getItem(key).then((code) => {
      if (!cancelled) setPersistedGroupCode(code?.trim().toUpperCase() || null);
    });
    return () => {
      cancelled = true;
    };
  }, [authLoaded, isSignedIn, userId, hydrated]);

  useEffect(() => {
    if (!isSignedIn || !persistedGroupCode) return;
    groupSocketRef.current?.join(persistedGroupCode);
  }, [isSignedIn, persistedGroupCode]);

  // Standort wird ausschliesslich waehrend einer aktiven Wanderung und nur
  // ueber echte Vordergrund-GPS-Fixes geteilt. Keine Hintergrund-Tracking-
  // Schleife wird fuer die Gruppensichtbarkeit eingerichtet.
  useEffect(() => {
    const own = groupSession?.members.find((m) => m.id === selfIdRef.current);
    if (!groupLocationSharingEnabled || !own || own.activity.type !== "wandert") return;
    const wandering = own.activity;
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (cancelled || permission.status !== Location.PermissionStatus.GRANTED) return;
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 30_000, distanceInterval: 25 },
        (fix) => {
          const { latitude: lat, longitude: lng, accuracy } = fix.coords;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          groupSocketRef.current?.setActivity({
            type: "wandert",
            sagaTitle: wandering.sagaTitle,
            startedAt: wandering.startedAt,
            ...(wandering.sagaId ? { sagaId: wandering.sagaId } : {}),
            ...(wandering.routeId ? { routeId: wandering.routeId } : {}),
            location: { lat, lng, accuracy: accuracy ?? null, updatedAt: Date.now() },
          });
        },
      );
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [
    groupSession?.code,
    groupLocationSharingEnabled,
    groupSession?.members.some(
      (m) => m.id === selfIdRef.current && m.activity.type === "wandert",
    ),
  ]);

  useEffect(() => {
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          KEYS.profile,
          KEYS.premium,
          KEYS.freeHikeUsed,
          KEYS.achievements,
          KEYS.emergency,
          KEYS.energysave,
          KEYS.lastHike,
          KEYS.hikeHistory,
          KEYS.activeHike,
          KEYS.uiLanguage,
          KEYS.freieSagen,
          KEYS.themeMode,
          KEYS.groupLocationSharing,
        ]);
        const map = Object.fromEntries(entries);
        if (map[KEYS.profile]) {
          const cachedProfile = JSON.parse(map[KEYS.profile]!) as Profile;
          setProfile(cachedProfile);
          setPurchasedPacks(cachedProfile.purchasedPacks ?? []);
        }
        if (map[KEYS.premium]) setPremium(map[KEYS.premium] === "true");
        if (map[KEYS.freeHikeUsed])
          setFreeHikeUsed(map[KEYS.freeHikeUsed] === "true");
        if (map[KEYS.achievements])
          setAchievements(JSON.parse(map[KEYS.achievements]!));
        if (map[KEYS.emergency])
          setEmergencyContact(JSON.parse(map[KEYS.emergency]!));
        if (map[KEYS.energysave])
          setEnergiesparmodusState(map[KEYS.energysave] === "true");
        if (map[KEYS.lastHike]) setLastHike(JSON.parse(map[KEYS.lastHike]!));
        if (map[KEYS.hikeHistory])
          setHikeHistory(JSON.parse(map[KEYS.hikeHistory]!));
        if (map[KEYS.activeHike])
          setActiveHike(JSON.parse(map[KEYS.activeHike]!));
        if (map[KEYS.freieSagen])
          setFreieSagen(JSON.parse(map[KEYS.freieSagen]!));
        if (map[KEYS.themeMode] === "hell" || map[KEYS.themeMode] === "dunkel") {
          setThemeModeState(map[KEYS.themeMode] as ThemeMode);
        }
        if (map[KEYS.groupLocationSharing]) {
          setGroupLocationSharingEnabledState(map[KEYS.groupLocationSharing] === "true");
        }
        if (map[KEYS.uiLanguage]) {
          // Sprache wurde schon einmal festgelegt (System-Erkennung oder
          // explizite Wahl) — diese hat fuer immer Vorrang.
          setPendingLanguageState(map[KEYS.uiLanguage] as LanguageCode);
        } else {
          // Allererster Start: Systemsprache erkennen, auf unterstuetzte
          // Sprachen abbilden (sonst Englisch) und dauerhaft merken.
          const detected = detectSystemLanguage();
          setPendingLanguageState(detected);
          AsyncStorage.setItem(KEYS.uiLanguage, detected);
        }
      } catch {
        // Bei defekten Daten starten wir mit leerem Zustand
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Serverseitiges Profil ist die Wahrheitsquelle, sobald ein Clerk-Benutzer
  // angemeldet ist. Der AsyncStorage-Cache bleibt fuer Offline-Start bestehen.
  // Der Query-Key wird um die Clerk-`userId` erweitert: so bleibt der
  // React-Query-Cache pro Benutzerkonto getrennt und beim Kontowechsel auf
  // demselben Geraet kann nie kurzzeitig das Profil des vorherigen Nutzers
  // aus dem Cache aufscheinen.
  const {
    data: serverProfile,
    error: profileError,
    isFetched: profileFetched,
  } = useGetMyProfile({
    query: {
      queryKey: [...getGetMyProfileQueryKey(), userId],
      enabled: authLoaded && !!isSignedIn && !!userId,
      retry: false,
    },
  });

  // Sobald sich die angemeldete `userId` aendert (Kontowechsel auf demselben
  // Geraet), lokalen Profil-/Premium-Zustand sofort verwerfen, damit nie
  // Daten des vorherigen Kontos angezeigt werden, bis das neue Profil vom
  // Server geladen ist.
  const [lastUserId, setLastUserId] = useState<string | null | undefined>(
    undefined
  );
  useEffect(() => {
    if (!authLoaded) return;
    if (lastUserId === undefined) {
      setLastUserId(userId ?? null);
      return;
    }
    const currentUserId = userId ?? null;
    if (currentUserId !== lastUserId) {
      setLastUserId(currentUserId);
      groupSocketRef.current?.disconnect();
      setGroupSession(null);
      setPersistedGroupCode(null);
      setGroupHikeEvent(null);
      setProfile(null);
      setPurchasedPacks([]);
      setPremium(false);
      setFreeHikeUsed(false);
      AsyncStorage.removeItem(KEYS.profile);
      AsyncStorage.removeItem(KEYS.premium);
      AsyncStorage.removeItem(KEYS.freeHikeUsed);
    }
  }, [authLoaded, userId, lastUserId]);

  useEffect(() => {
    if (!authLoaded) return;
    if (!isSignedIn) {
      // Abgemeldet: lokalen Zustand nicht loeschen (bleibt als Cache fuer
      // erneute Anmeldung desselben Geraets), aber nicht als "eingeloggt"
      // fuehren — resetAll() bei explizitem Logout uebernimmt das Aufraeumen.
      return;
    }
    // Erst den lokalen Cache hydratisieren, danach das Serverprofil anwenden.
    // Sonst kann ein langsamer AsyncStorage-Read das bereits geladene
    // Serverprofil (inklusive purchasedPacks) wieder überschreiben.
    if (!hydrated) return;
    if (!profileFetched) return;

    if (serverProfile) {
      const next: Profile = {
        id: serverProfile.id,
        name: serverProfile.name,
        archetype: serverProfile.archetype,
        ...(serverProfile.homeCanton ? { homeCanton: serverProfile.homeCanton } : {}),
        language: serverProfile.language,
        ageTier: serverProfile.ageTier,
        navAnnouncementsEnabled: serverProfile.navAnnouncementsEnabled ?? true,
        purchasedPacks: serverProfile.purchasedPacks ?? [],
        ...(serverProfile.subscriptionTier ? { subscriptionTier: serverProfile.subscriptionTier } : {}),
      };
      setPurchasedPacks(serverProfile.purchasedPacks ?? []);
      setProfile(next);
      setPremium(serverProfile.premium);
      setFreeHikeUsed(serverProfile.freeHikeUsed);
      if (serverProfile.subscriptionTier) setDbTier(serverProfile.subscriptionTier);
      AsyncStorage.setItem(KEYS.profile, JSON.stringify(next));
      AsyncStorage.setItem(KEYS.premium, serverProfile.premium ? "true" : "false");
      AsyncStorage.setItem(
        KEYS.freeHikeUsed,
        serverProfile.freeHikeUsed ? "true" : "false"
      );
    } else if (
      profileError instanceof ApiError &&
      profileError.status === 404
    ) {
      // Echtes 404: noch kein Profil auf dem Server — Onboarding erforderlich.
      setProfile(null);
      setPurchasedPacks([]);
      setPremium(false);
      setFreeHikeUsed(false);
      AsyncStorage.removeItem(KEYS.profile);
      AsyncStorage.removeItem(KEYS.premium);
      AsyncStorage.removeItem(KEYS.freeHikeUsed);
    }
    // Andere Fehler (401 waehrend Token noch nicht bereit, 5xx, Netzwerk):
    // bewusst NICHT als "kein Profil" behandeln — lokaler Cache/Zustand
    // bleibt erhalten, damit angemeldete Nutzer nicht faelschlich ins
    // Onboarding geschickt werden oder ihr Offline-Cache geloescht wird.
  }, [authLoaded, isSignedIn, hydrated, profileFetched, serverProfile, profileError]);

  const { mutateAsync: saveMyProfileMutation } = useSaveMyProfile();
  const { mutateAsync: updateMyPremiumMutation } = useUpdateMyPremium();
  const { mutateAsync: syncMyPremiumMutation } = useSyncMyPremium();
  const { mutateAsync: syncMyProgressMutation } = useSyncMyProgress();

  // Wanderverlauf/Errungenschaften waren bisher NUR in AsyncStorage abgelegt
  // und gingen bei Abmelden+Neuanmelden (resetAll loescht AsyncStorage) oder
  // Geraetewechsel verloren. Server-Sync gleicht per Vereinigung (nie
  // loeschend) ab; hikeHistoryRef/achievementsRef vermeiden veraltete
  // Closures beim Push aus useCallback-Handlern.
  const hikeHistoryRef = useRef<HikeSession[]>([]);
  const achievementsRef = useRef<Achievement[]>([]);
  useEffect(() => {
    hikeHistoryRef.current = hikeHistory;
  }, [hikeHistory]);
  useEffect(() => {
    achievementsRef.current = achievements;
  }, [achievements]);

  const pushProgressSync = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      // hikeHistoryRef/achievementsRef werden synchron in saveHike/
      // addAchievement/attachHikePhoto aktualisiert, damit dieser Push nie
      // mit veralteten Daten (Race gegen den ref-Sync-useEffect) sendet.
      const result = await syncMyProgressMutation({
        data: {
          hikeHistory: hikeHistoryRef.current as unknown as {
            id: string;
            [key: string]: unknown;
          }[],
          achievements: achievementsRef.current as unknown as {
            id: string;
            sagaTitle: string;
            unlockedAt: number;
            [key: string]: unknown;
          }[],
        },
      });
      // Das Zod-Schema des Servers haelt hikeHistory auf { id } reduziert
      // (orval ignoriert additionalProperties:true fuer Passthrough). Um
      // sagaId, routeName etc. nicht zu verlieren, werden lokale Eintraege
      // bevorzugt; vom Server gemeldete neue IDs (anderes Geraet) kommen
      // als sparse Eintraege hinzu.
      const localById = new Map(hikeHistoryRef.current.map((h) => [h.id, h]));
      const serverOnlyNew = (result.hikeHistory as unknown as HikeSession[]).filter(
        (h) => !localById.has(h.id)
      );
      const mergedHistory = [...hikeHistoryRef.current, ...serverOnlyNew].slice(0, 200);
      setHikeHistory(mergedHistory);
      setAchievements(result.achievements as unknown as Achievement[]);
      AsyncStorage.setItem(
        KEYS.hikeHistory,
        JSON.stringify(mergedHistory)
      ).catch(() => {});
      AsyncStorage.setItem(
        KEYS.achievements,
        JSON.stringify(result.achievements)
      ).catch(() => {});
    } catch {
      // Offline oder Server nicht erreichbar: lokaler Zustand bleibt
      // massgeblich, naechster erfolgreicher Sync holt es nach.
    }
  }, [isSignedIn, syncMyProgressMutation]);

  // Einmaliger Abgleich pro Anmeldung: fuehrt den lokalen Stand des
  // Geraets mit dem serverseitigen zusammen, sobald der Nutzer angemeldet
  // ist und geladen wurde. Das behebt den Datenverlust, wenn ein Nutzer
  // sich ab- und wieder anmeldet (AsyncStorage wird bei Abmelden geleert).
  const progressSyncedForUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!authLoaded || !isSignedIn || !userId || !hydrated) return;
    if (!profileFetched || !serverProfile) return;
    if (progressSyncedForUserRef.current === userId) return;
    progressSyncedForUserRef.current = userId;
    pushProgressSync();
  }, [
    authLoaded,
    isSignedIn,
    userId,
    hydrated,
    profileFetched,
    serverProfile,
    pushProgressSync,
  ]);

  // Der Packzugriff ist sicherheitsrelevant fuer die Sperrlogik. Er wird
  // deshalb zusaetzlich zum Profil-Query direkt aus der authentifizierten
  // /api/me-Antwort gespiegelt. So bleibt ein veralteter Query-/Profilcache
  // ohne Einfluss auf gekaufte Sagenpakete.
  const packSyncedForUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!authLoaded || !isSignedIn || !userId || !hydrated) {
      if (!isSignedIn) packSyncedForUserRef.current = null;
      return;
    }
    if (packSyncedForUserRef.current === userId) return;

    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const response = await fetch(`${getApiBaseUrl()}api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = (await response.json()) as { purchasedPacks?: unknown };
        if (!Array.isArray(data.purchasedPacks)) return;
        const packs = data.purchasedPacks.filter(
          (pack): pack is string => typeof pack === "string",
        );
        if (cancelled) return;
        packSyncedForUserRef.current = userId;
        setPurchasedPacks(packs);
        setProfile((current) =>
          current ? { ...current, purchasedPacks: packs } : current,
        );
        void AsyncStorage.getItem(KEYS.profile).then((raw) => {
          if (!raw || cancelled) return;
          try {
            const cached = JSON.parse(raw) as Profile;
            return AsyncStorage.setItem(
              KEYS.profile,
              JSON.stringify({ ...cached, purchasedPacks: packs }),
            );
          } catch {
            return undefined;
          }
        });
      } catch {
        // Netzwerkfehler: Query- und lokaler Cache bleiben als Fallback aktiv.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoaded, isSignedIn, userId, hydrated, getToken]);

  // Lesezeichen + Benachrichtigungseinstellungen laden + Push-Token registrieren
  const pushTokenSyncedForUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!authLoaded || !isSignedIn || !userId || !hydrated) return;
    if (pushTokenSyncedForUserRef.current === userId) return;
    pushTokenSyncedForUserRef.current = userId;
    void (async () => {
      const base = getApiBaseUrl();
      const token = await getToken();
      if (!token) return;
      // Lesezeichen + Benachrichtigungseinstellung laden
      try {
        const res = await fetch(`${base}api/me/bookmarks`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as {
            sagaIds: string[];
            pushWeatherEnabled?: boolean;
          };
          setSavedSagaIds(data.sagaIds ?? []);
          if (data.pushWeatherEnabled !== undefined) {
            setPushWeatherEnabledState(data.pushWeatherEnabled);
          }
        }
      } catch { /* nicht kritisch */ }
      // Push-Token registrieren (nur auf nativen Plattformen)
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") return;
        const tokenData = await Notifications.getExpoPushTokenAsync();
        await fetch(`${base}api/me/push-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ token: tokenData.data }),
        });
      } catch { /* Push-Token optional */ }
    })();
  }, [authLoaded, isSignedIn, userId, hydrated, getToken]);
  const {
    isSubscribed,
    isElite: isEliteSubscription,
    isLoading: subscriptionLoading,
    rcAppUserId,
    setDbTier,
  } = useSubscription();

  const applyServerProfile = useCallback(
    async (result: {
      id: string;
      name: string;
      archetype: string;
      homeCanton?: string;
      language: string;
      ageTier: string;
      navAnnouncementsEnabled?: boolean;
      premium: boolean;
      freeHikeUsed: boolean;
      purchasedPacks?: string[];
      subscriptionTier?: string;
      pendingPackRewards?: number;
    }) => {
      // WICHTIG: purchasedPacks muss erhalten bleiben. Frueher wurde das
      // Profil hier OHNE purchasedPacks neu aufgebaut, wodurch gekaufte
      // Sagenpakete lokal "verschwanden", sobald das Profil gespeichert
      // wurde (z.B. nach einer Wanderung) — obwohl der Server sie kannte.
      // Vorrang: Server-Antwort; Fallback: bisheriger lokaler Stand.
      const next: Profile = {
        id: result.id,
        name: result.name,
        archetype: result.archetype,
        ...(result.homeCanton ? { homeCanton: result.homeCanton } : {}),
        language: result.language,
        ageTier: result.ageTier,
        navAnnouncementsEnabled:
          result.navAnnouncementsEnabled ??
          profileRef.current?.navAnnouncementsEnabled ??
          true,
        purchasedPacks:
          result.purchasedPacks ?? profileRef.current?.purchasedPacks ?? [],
        ...(result.subscriptionTier ? { subscriptionTier: result.subscriptionTier } : {}),
      } as Profile;
      setPurchasedPacks(next.purchasedPacks ?? []);
      setProfile(next);
      setPremium(result.premium);
      setFreeHikeUsed(result.freeHikeUsed);
      if (result.subscriptionTier) setDbTier(result.subscriptionTier);
      setPendingPackRewards(result.pendingPackRewards ?? 0);
      await AsyncStorage.setItem(KEYS.profile, JSON.stringify(next));
      await AsyncStorage.setItem(KEYS.premium, result.premium ? "true" : "false");
      await AsyncStorage.setItem(
        KEYS.freeHikeUsed,
        result.freeHikeUsed ? "true" : "false"
      );
    },
    [setDbTier]
  );

  const saveProfile = useCallback(
    async (next: Omit<Profile, "id">) => {
      const result = await saveMyProfileMutation({
        data: {
          name: next.name,
          archetype: next.archetype,
          ...(next.homeCanton ? { homeCanton: next.homeCanton } : {}),
          language: next.language,
          ageTier: next.ageTier,
          ...(next.navAnnouncementsEnabled !== undefined
            ? { navAnnouncementsEnabled: next.navAnnouncementsEnabled }
            : {}),
        },
      });
      await applyServerProfile(result);
    },
    [saveMyProfileMutation, applyServerProfile]
  );

  const updateProfile = useCallback(
    async (patch: Partial<Omit<Profile, "id">>) => {
      if (!profile) return;
      const merged = { ...profile, ...patch };
      const result = await saveMyProfileMutation({
        data: {
          name: merged.name,
          archetype: merged.archetype,
          ...(merged.homeCanton ? { homeCanton: merged.homeCanton } : {}),
          language: merged.language,
          ageTier: merged.ageTier,
          ...(merged.navAnnouncementsEnabled !== undefined
            ? { navAnnouncementsEnabled: merged.navAnnouncementsEnabled }
            : {}),
        },
      });
      await applyServerProfile(result);
    },
    [profile, saveMyProfileMutation, applyServerProfile]
  );

  // Verifizierter Upgrade-Pfad: Der Server prueft selbst bei RevenueCat,
  // ob ein aktives "premium"-Entitlement vorliegt (der Client darf sich
  // Premium nicht per Self-Service geben — PATCH /me/premium lehnt
  // premium=true mit 403 ab).
  const unlockPremium = useCallback(async () => {
    iapLog("unlockPremium: rufe POST /me/premium/sync auf");
    const result = await syncMyPremiumMutation();
    iapLog("unlockPremium: Server-Antwort", { premium: result.premium });
    // `setPremium` loest ueber den globalen Context ein Re-Render praktisch
    // des gesamten Bildschirms aus (u.a. schaltet paywall.tsx auf einen
    // komplett anderen JSX-Zweig um). Kommt die Server-Antwort waehrend eine
    // native Modal-Uebergangsanimation laeuft (z.B. der Erfolgs-Dialog nach
    // dem Kauf), kollidiert dieser schwere Re-Render mit der laufenden
    // Animation und kann die App komplett einfrieren.
    // InteractionManager.runAfterInteractions greift hier NICHT, weil
    // Reanimated-Animationen (FadeInDown/FadeOut in AppModal) keinen
    // Interaction-Handle registrieren und daher sofort feuert. Stattdessen
    // ein expliziter Timeout, deutlich laenger als AppModal's 220ms
    // Eintritts-Animation.
    setTimeout(() => {
      iapLog("unlockPremium: setPremium nach Verzoegerung");
      setPremium(result.premium);
    }, 400);
    await AsyncStorage.setItem(
      KEYS.premium,
      result.premium ? "true" : "false"
    );
  }, [syncMyPremiumMutation]);

  // Verhindert, dass der Auto-Sync-Effekt einen manuellen Reset sofort
  // wieder rueckgaengig macht, solange RevenueCat noch ein aktives Abo
  // meldet (z.B. Sandbox-Abo laeuft weiter). Der manuelle Reset hat fuer
  // ein paar Sekunden Vorrang, danach greift der Abgleich wieder normal.
  const manualLockUntilRef = useRef<number>(0);

  const lockPremium = useCallback(async () => {
    manualLockUntilRef.current = Date.now() + 8000;
    const result = await updateMyPremiumMutation({ data: { premium: false } });
    // Gleicher Grund wie in unlockPremium: den schweren Context-Re-Render
    // von einer eventuell laufenden Modal-Animation entkoppeln. Expliziter
    // Timeout statt InteractionManager, siehe Kommentar in unlockPremium.
    setTimeout(() => {
      setPremium(result.premium);
    }, 400);
    await AsyncStorage.setItem(KEYS.premium, "false");
  }, [updateMyPremiumMutation]);

  // Gleicht den RevenueCat-Kaufstatus (Quelle der Wahrheit fuer aktive
  // Abos) mit dem serverseitigen `premium`-Flag ab. Deckt Faelle ab, die
  // ein direkter unlockPremium()-Aufruf im Kauf-Flow nicht abdeckt: Ablauf,
  // Kuendigung, Rueckerstattung oder Wiederherstellung auf einem neuen
  // Geraet. Der Server bleibt die eigentliche Durchsetzungsinstanz (siehe
  // `premium_required`-Pruefung), dies haelt sie nur synchron.
  useEffect(() => {
    if (!authLoaded || !isSignedIn || !profile) return;
    if (subscriptionLoading) return;
    // Erst synchronisieren, wenn RevenueCat mit der Clerk-Nutzer-ID
    // angemeldet ist: vorher wuerde der Server einen Customer pruefen,
    // dem ein anonym getaetigter Kauf noch nicht zugeordnet wurde.
    if (!rcAppUserId || rcAppUserId !== profile.id) {
      iapLog("premium-sync-effect: warte auf Identitaets-Verknuepfung", {
        rcAppUserId,
        profileId: profile.id,
      });
      return;
    }
    // Manueller Reset (Demo-Button) hat kurz Vorrang: sonst wuerde dieser
    // Effekt ein noch aktives RevenueCat-Abo sofort wieder hochsynchronisieren.
    if (Date.now() < manualLockUntilRef.current) return;
    iapLog("premium-sync-effect: geprueft", { isSubscribed, isElite: isEliteSubscription, premium });
    // Elite-Entitlement berechtigt ebenfalls zu Premium auf dem Server.
    // Wichtig: isEliteSubscription wird direkt aus RC gelesen und ist auch
    // dann sofort korrekt, wenn das DB-Premium-Flag noch nicht synchronisiert
    // wurde (z. B. Erstinstall, Restore auf neuem Geraet).
    if ((isSubscribed || isEliteSubscription) && !premium) {
      unlockPremium().catch((err) =>
        iapLog("premium-sync-effect: unlockPremium fehlgeschlagen", {
          message: err instanceof Error ? err.message : String(err),
        })
      );
    }
    // Kein automatisches lockPremium() mehr: RC-Ablauf/Kuendigung entzieht
    // Premium serverseitig (POST /me/premium/sync setzt bei naechster
    // Erneuerung premium: false). Admin-gewaehrtes Premium wuerde sonst
    // bei fehlendem RC-Abo faelschlich entzogen.
  }, [
    authLoaded,
    isSignedIn,
    profile,
    subscriptionLoading,
    rcAppUserId,
    isSubscribed,
    isEliteSubscription,
    premium,
    unlockPremium,
  ]);

  const { mutateAsync: consumeMyFreeHikeMutation } = useConsumeMyFreeHike();

  const markFreeHikeUsed = useCallback(async () => {
    if (freeHikeUsed) return;
    const result = await consumeMyFreeHikeMutation();
    setFreeHikeUsed(result.freeHikeUsed);
    await AsyncStorage.setItem(
      KEYS.freeHikeUsed,
      result.freeHikeUsed ? "true" : "false"
    );
  }, [freeHikeUsed, consumeMyFreeHikeMutation]);

  const addAchievement = useCallback(
    async (sagaTitle: string, sagaId: string) => {
      let changed = false;
      setAchievements((prev) => {
        if (prev.some((a) => a.id === sagaId)) return prev;
        changed = true;
        const next = [
          ...prev,
          { id: sagaId, sagaTitle, unlockedAt: Date.now() },
        ];
        achievementsRef.current = next;
        AsyncStorage.setItem(KEYS.achievements, JSON.stringify(next));
        return next;
      });
      if (changed) pushProgressSync();
    },
    [pushProgressSync]
  );

  const registriereSagenEntdeckung = useCallback(
    async (kanton: string, sagaId: string) => {
      setFreieSagen((prev) => {
        if (prev[kanton]) return prev;
        const next = { ...prev, [kanton]: sagaId };
        AsyncStorage.setItem(KEYS.freieSagen, JSON.stringify(next)).catch(
          () => {}
        );
        return next;
      });
    },
    []
  );

  const istSageInklusive = useCallback(
    (kanton: string, sagaId: string) => {
      const registriert = freieSagen[kanton];
      // Noch keine Sage im Kanton entdeckt: die naechste gestartete waere
      // die inkludierte — also gilt jede als zugaenglich.
      if (!registriert) return true;
      return registriert === sagaId;
    },
    [freieSagen]
  );

  const saveEmergencyContact = useCallback(
    async (contact: EmergencyContact | null) => {
      setEmergencyContact(contact);
      if (contact) {
        await AsyncStorage.setItem(KEYS.emergency, JSON.stringify(contact));
      } else {
        await AsyncStorage.removeItem(KEYS.emergency);
      }
    },
    []
  );

  const setEnergiesparmodus = useCallback(async (value: boolean) => {
    setEnergiesparmodusState(value);
    await AsyncStorage.setItem(KEYS.energysave, value ? "true" : "false");
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(KEYS.themeMode, mode);
  }, []);

  const setPendingLanguage = useCallback(async (code: LanguageCode) => {
    setPendingLanguageState(code);
    await AsyncStorage.setItem(KEYS.uiLanguage, code);
  }, []);

  const saveHike = useCallback(
    async (hike: HikeSession) => {
      setLastHike(hike);
      await AsyncStorage.setItem(KEYS.lastHike, JSON.stringify(hike));
      // Ref sofort synchron aktualisieren, BEVOR pushProgressSync aufgerufen
      // wird — sonst liest pushProgressSync den alten (leeren) Ref-Wert,
      // schickt eine leere Liste an den Server, und der Server-Response
      // ueberschreibt den lokalen State wieder mit leer (Race-Condition).
      const next = [hike, ...hikeHistoryRef.current.filter((h) => h.id !== hike.id)].slice(0, 200);
      hikeHistoryRef.current = next;
      setHikeHistory(next);
      AsyncStorage.setItem(KEYS.hikeHistory, JSON.stringify(next)).catch(() => {});
      pushProgressSync();
    },
    [pushProgressSync]
  );

  const attachHikePhoto = useCallback(
    async (hikeId: string, photoUri: string) => {
      setLastHike((prev) => {
        if (prev && prev.id === hikeId) {
          const next = { ...prev, photoUri };
          AsyncStorage.setItem(KEYS.lastHike, JSON.stringify(next)).catch(
            () => {}
          );
          return next;
        }
        return prev;
      });
      setHikeHistory((prev) => {
        const next = prev.map((h) => (h.id === hikeId ? { ...h, photoUri } : h));
        hikeHistoryRef.current = next;
        AsyncStorage.setItem(KEYS.hikeHistory, JSON.stringify(next)).catch(
          () => {}
        );
        return next;
      });
      pushProgressSync();
    },
    [pushProgressSync]
  );

  const saveActiveHike = useCallback(async (hike: ActiveHike) => {
    setActiveHike(hike);
    await AsyncStorage.setItem(KEYS.activeHike, JSON.stringify(hike));
  }, []);

  const clearActiveHike = useCallback(async () => {
    setActiveHike(null);
    await AsyncStorage.removeItem(KEYS.activeHike);
  }, []);

  const exportData = useCallback(async () => {
    const data = {
      profile,
      premium,
      freeHikeUsed,
      achievements,
      emergencyContact,
      energiesparmodus,
      lastHike,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }, [
    profile,
    premium,
    freeHikeUsed,
    achievements,
    emergencyContact,
    energiesparmodus,
    lastHike,
  ]);

  const resetAll = useCallback(async () => {
    groupSocketRef.current?.disconnect();
    const groupCodeKey = userId
      ? `${KEYS.groupSessionCodePrefix}${userId}`
      : null;
    await AsyncStorage.multiRemove([
      ...Object.values(KEYS).filter((key) => key !== KEYS.groupSessionCodePrefix),
      ...(groupCodeKey ? [groupCodeKey] : []),
    ]);
    setProfile(null);
    setPurchasedPacks([]);
    setPremium(false);
    setFreeHikeUsed(false);
    setAchievements([]);
    setEmergencyContact(null);
    setEnergiesparmodusState(false);
    setLastHike(null);
    setHikeHistory([]);
    setActiveHike(null);
    setGroupSession(null);
    setPersistedGroupCode(null);
    setGroupError(null);
    setSavedSagaIds([]);
    setPushWeatherEnabledState(true);
    pushTokenSyncedForUserRef.current = null;
  }, [userId]);

  const deleteAccount = useCallback(async () => {
    try {
      const base = getApiBaseUrl();
      const token = await getTokenRef.current();
      if (token) {
        await fetch(`${base}api/me`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Serverseitiger Fehler darf den lokalen Abbruch nicht blockieren
    }
    await resetAll();
  }, [resetAll]);

  const toggleBookmark = useCallback(
    async (sagaId: string) => {
      const isCurrentlyBookmarked = savedSagaIds.includes(sagaId);
      try {
        const base = getApiBaseUrl();
        const token = await getToken();
        if (!token) return;
        const res = await fetch(
          isCurrentlyBookmarked
            ? `${base}api/me/bookmarks/${encodeURIComponent(sagaId)}`
            : `${base}api/me/bookmarks`,
          {
            method: isCurrentlyBookmarked ? "DELETE" : "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            ...(isCurrentlyBookmarked ? {} : { body: JSON.stringify({ sagaId }) }),
          }
        );
        if (res.ok) {
          const data = (await res.json()) as { sagaIds: string[] };
          setSavedSagaIds(data.sagaIds ?? []);
        }
      } catch { /* nicht kritisch */ }
    },
    [savedSagaIds, getToken]
  );

  const setPushWeatherEnabled = useCallback(
    async (enabled: boolean) => {
      setPushWeatherEnabledState(enabled);
      try {
        const base = getApiBaseUrl();
        const token = await getToken();
        if (!token) return;
        await fetch(`${base}api/me/notifications`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ pushWeatherEnabled: enabled }),
        });
      } catch { /* nicht kritisch */ }
    },
    [getToken]
  );

  // Client-seitig wird Premium bereits hier geprueft (schnelle Ruecksicht auf
  // die UI, siehe gruppe.tsx). Der Server prueft unabhaengig davon erneut
  // (`premium_required`-Fehler) und bleibt die eigentliche Quelle der
  // Wahrheit — ein manipulierter Client kann die Pruefung nicht umgehen.
  const createGroupSession = useCallback(() => {
    setGroupError(null);
    groupSocketRef.current?.create();
  }, []);

  const joinGroupSession = useCallback((code: string) => {
    setGroupError(null);
    groupSocketRef.current?.join(code);
  }, []);

  const leaveGroupSession = useCallback(() => {
    groupSocketRef.current?.leave();
    if (selfIdRef.current) {
      void AsyncStorage.removeItem(
        `${KEYS.groupSessionCodePrefix}${selfIdRef.current}`,
      );
    }
    setPersistedGroupCode(null);
    setGroupSession(null);
    setGroupError(null);
    setGroupHikeEvent(null);
  }, []);

  const kickMember = useCallback((memberId: string) => {
    groupSocketRef.current?.kick(memberId);
  }, []);

  const setGroupActivity = useCallback((activity: GroupActivity) => {
    groupSocketRef.current?.setActivity(activity);
  }, []);

  const setGroupRendezvous = useCallback((location: GroupLocation | null) => {
    groupSocketRef.current?.setRendezvous(location);
  }, []);

  const setGroupLocationSharingEnabled = useCallback((enabled: boolean) => {
    setGroupLocationSharingEnabledState(enabled);
    AsyncStorage.setItem(KEYS.groupLocationSharing, enabled ? "true" : "false").catch(() => {});
    if (!enabled) {
      const own = groupSession?.members.find((m) => m.id === selfIdRef.current);
      if (own?.activity.type === "wandert") {
        groupSocketRef.current?.setActivity({ ...own.activity, location: undefined });
      }
    }
  }, [groupSession]);

  // Wander-Sync-Ereignis an die Gruppe senden — nur sinnvoll als Leitung;
  // der Server weist Ereignisse von Nicht-Leitern ohnehin ab.
  const sendGroupHikeEvent = useCallback((event: HikeSyncEvent) => {
    groupSocketRef.current?.sendHikeEvent(event);
  }, []);

  const clearGroupError = useCallback(() => setGroupError(null), []);

  const language = (profile?.language as LanguageCode | undefined) ?? pendingLanguage;

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated,
      profile,
      purchasedPacks,
      language,
      premium,
      freeHikeUsed,
      achievements,
      emergencyContact,
      energiesparmodus,
      themeMode,
      lastHike,
      hikeHistory,
      activeHike,
      groupSession,
      groupLocationSharingEnabled,
      groupConnectionStatus,
      groupError,
      groupHikeEvent,
      freieSagen,
      registriereSagenEntdeckung,
      istSageInklusive,
      saveProfile,
      updateProfile,
      setPendingLanguage,
      unlockPremium,
      lockPremium,
      markFreeHikeUsed,
      addAchievement,
      saveEmergencyContact,
      setEnergiesparmodus,
      setThemeMode,
      saveHike,
      attachHikePhoto,
      saveActiveHike,
      clearActiveHike,
      exportData,
      resetAll,
      deleteAccount,
      createGroupSession,
      joinGroupSession,
      leaveGroupSession,
      kickMember,
      setGroupActivity,
      setGroupRendezvous,
      setGroupLocationSharingEnabled,
      sendGroupHikeEvent,
      clearGroupError,
      savedSagaIds,
      pushWeatherEnabled,
      pendingPackRewards,
      toggleBookmark,
      setPushWeatherEnabled,
    }),
    [
      hydrated,
      profile,
      purchasedPacks,
      language,
      premium,
      freeHikeUsed,
      achievements,
      emergencyContact,
      energiesparmodus,
      themeMode,
      lastHike,
      hikeHistory,
      activeHike,
      groupSession,
      groupLocationSharingEnabled,
      groupConnectionStatus,
      groupError,
      groupHikeEvent,
      freieSagen,
      registriereSagenEntdeckung,
      istSageInklusive,
      saveProfile,
      updateProfile,
      setPendingLanguage,
      unlockPremium,
      lockPremium,
      markFreeHikeUsed,
      addAchievement,
      saveEmergencyContact,
      setEnergiesparmodus,
      setThemeMode,
      saveHike,
      attachHikePhoto,
      saveActiveHike,
      clearActiveHike,
      exportData,
      resetAll,
      deleteAccount,
      createGroupSession,
      joinGroupSession,
      leaveGroupSession,
      kickMember,
      setGroupActivity,
      setGroupRendezvous,
      setGroupLocationSharingEnabled,
      sendGroupHikeEvent,
      clearGroupError,
      savedSagaIds,
      pushWeatherEnabled,
      pendingPackRewards,
      toggleBookmark,
      setPushWeatherEnabled,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp muss innerhalb von AppProvider genutzt werden");
  return ctx;
}
