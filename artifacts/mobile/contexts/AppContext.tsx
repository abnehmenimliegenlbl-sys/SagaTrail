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
} from "@workspace/api-client-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Achievement, HikeSession, Profile } from "@/types";
import {
  GroupSocket,
  type GroupActivity,
  type GroupConnectionStatus,
  type GroupMember,
  type GroupSocketError,
  type HikeSyncEvent,
} from "@/lib/groupSocket";
import { DEFAULT_LANGUAGE, LanguageCode } from "@/lib/i18n/languageCode";
import { detectSystemLanguage } from "@/lib/i18n/systemLocale";
import { useSubscription } from "@/lib/revenuecat";

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
}

export interface GroupSession {
  code: string;
  members: GroupMember[];
  isLeader: boolean;
}

interface AppContextValue {
  hydrated: boolean;
  profile: Profile | null;
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
  lastHike: HikeSession | null;
  /**
   * Wander-Tagebuch: alle abgeschlossenen Wanderungen (neueste zuerst,
   * begrenzt auf die letzten 200). Grundlage fuer die Statistik im Profil
   * und die Tagebuch-Ansicht in der Sammlung.
   */
  hikeHistory: HikeSession[];
  activeHike: ActiveHike | null;
  groupSession: GroupSession | null;
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

  createGroupSession: () => void;
  joinGroupSession: (code: string) => void;
  leaveGroupSession: () => void;
  kickMember: (memberId: string) => void;
  setGroupActivity: (activity: GroupActivity) => void;
  /** Sendet ein Wander-Sync-Ereignis an die Gruppe (nur als Leitung wirksam). */
  sendGroupHikeEvent: (event: HikeSyncEvent) => void;
  clearGroupError: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: authLoaded, isSignedIn, userId, getToken } = useAuth();

  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [premium, setPremium] = useState(false);
  const [freeHikeUsed, setFreeHikeUsed] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [emergencyContact, setEmergencyContact] =
    useState<EmergencyContact | null>(null);
  const [energiesparmodus, setEnergiesparmodusState] = useState(false);
  const [lastHike, setLastHike] = useState<HikeSession | null>(null);
  const [hikeHistory, setHikeHistory] = useState<HikeSession[]>([]);
  const [activeHike, setActiveHike] = useState<ActiveHike | null>(null);
  const [pendingLanguage, setPendingLanguageState] =
    useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [groupSession, setGroupSession] = useState<GroupSession | null>(null);
  const [groupConnectionStatus, setGroupConnectionStatus] =
    useState<GroupConnectionStatus>("getrennt");
  const [groupError, setGroupError] = useState<GroupSocketError | null>(null);
  const [groupHikeEvent, setGroupHikeEvent] = useState<{
    event: HikeSyncEvent;
    receivedAt: number;
  } | null>(null);
  const [freieSagen, setFreieSagen] = useState<Record<string, string>>({});

  // Der Socket-Client lebt ausserhalb des React-State (eine Instanz pro
  // App-Laufzeit) und meldet Ereignisse ueber Callbacks zurueck, die den
  // React-Zustand aktualisieren. So bleibt Reconnect-Logik unabhaengig vom
  // Render-Zyklus.
  const groupSocketRef = React.useRef<GroupSocket | null>(null);
  const selfIdRef = React.useRef<string | null>(null);
  selfIdRef.current = userId ?? null;

  const getGroupToken = useCallback(async () => {
    try {
      return await getToken();
    } catch {
      return null;
    }
  }, [getToken]);

  useEffect(() => {
    const socket = new GroupSocket(getGroupToken, {
      onStatusChange: setGroupConnectionStatus,
      onJoined: (code, members) => {
        setGroupError(null);
        setGroupSession({
          code,
          members,
          isLeader: members.some(
            (m) => m.id === selfIdRef.current && m.isLeader
          ),
        });
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
        setGroupSession(null);
        setGroupHikeEvent(null);
      },
      onKicked: () => {
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
    });
    groupSocketRef.current = socket;
    return () => {
      socket.disconnect();
      groupSocketRef.current = null;
    };
  }, [getGroupToken]);

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
        ]);
        const map = Object.fromEntries(entries);
        if (map[KEYS.profile]) setProfile(JSON.parse(map[KEYS.profile]!));
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
      setProfile(null);
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
    if (!profileFetched) return;

    if (serverProfile) {
      const next: Profile = {
        id: serverProfile.id,
        name: serverProfile.name,
        archetype: serverProfile.archetype,
        homeCanton: serverProfile.homeCanton,
        language: serverProfile.language,
        ageTier: serverProfile.ageTier,
      };
      setProfile(next);
      setPremium(serverProfile.premium);
      setFreeHikeUsed(serverProfile.freeHikeUsed);
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
  }, [authLoaded, isSignedIn, profileFetched, serverProfile, profileError]);

  const { mutateAsync: saveMyProfileMutation } = useSaveMyProfile();
  const { mutateAsync: updateMyPremiumMutation } = useUpdateMyPremium();
  const { mutateAsync: syncMyPremiumMutation } = useSyncMyPremium();
  const {
    isSubscribed,
    isLoading: subscriptionLoading,
    rcAppUserId,
  } = useSubscription();

  const applyServerProfile = useCallback(
    async (result: {
      id: string;
      name: string;
      archetype: string;
      homeCanton: string;
      language: string;
      ageTier: string;
      premium: boolean;
      freeHikeUsed: boolean;
    }) => {
      const next = {
        id: result.id,
        name: result.name,
        archetype: result.archetype,
        homeCanton: result.homeCanton,
        language: result.language,
        ageTier: result.ageTier,
      } as Profile;
      setProfile(next);
      setPremium(result.premium);
      setFreeHikeUsed(result.freeHikeUsed);
      await AsyncStorage.setItem(KEYS.profile, JSON.stringify(next));
      await AsyncStorage.setItem(KEYS.premium, result.premium ? "true" : "false");
      await AsyncStorage.setItem(
        KEYS.freeHikeUsed,
        result.freeHikeUsed ? "true" : "false"
      );
    },
    []
  );

  const saveProfile = useCallback(
    async (next: Omit<Profile, "id">) => {
      const result = await saveMyProfileMutation({
        data: {
          name: next.name,
          archetype: next.archetype,
          homeCanton: next.homeCanton,
          language: next.language,
          ageTier: next.ageTier,
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
          homeCanton: merged.homeCanton,
          language: merged.language,
          ageTier: merged.ageTier,
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
    const result = await syncMyPremiumMutation();
    setPremium(result.premium);
    await AsyncStorage.setItem(
      KEYS.premium,
      result.premium ? "true" : "false"
    );
  }, [syncMyPremiumMutation]);

  const lockPremium = useCallback(async () => {
    const result = await updateMyPremiumMutation({ data: { premium: false } });
    setPremium(result.premium);
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
    if (!rcAppUserId || rcAppUserId !== profile.id) return;
    if (isSubscribed && !premium) {
      unlockPremium().catch(() => {});
    } else if (!isSubscribed && premium) {
      lockPremium().catch(() => {});
    }
  }, [
    authLoaded,
    isSignedIn,
    profile,
    subscriptionLoading,
    rcAppUserId,
    isSubscribed,
    premium,
    unlockPremium,
    lockPremium,
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
      setAchievements((prev) => {
        if (prev.some((a) => a.id === sagaId)) return prev;
        const next = [
          ...prev,
          { id: sagaId, sagaTitle, unlockedAt: Date.now() },
        ];
        AsyncStorage.setItem(KEYS.achievements, JSON.stringify(next));
        return next;
      });
    },
    []
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

  const setPendingLanguage = useCallback(async (code: LanguageCode) => {
    setPendingLanguageState(code);
    await AsyncStorage.setItem(KEYS.uiLanguage, code);
  }, []);

  const saveHike = useCallback(async (hike: HikeSession) => {
    setLastHike(hike);
    await AsyncStorage.setItem(KEYS.lastHike, JSON.stringify(hike));
    // Zusaetzlich ins Tagebuch schreiben (neueste zuerst, max. 200).
    setHikeHistory((prev) => {
      const next = [hike, ...prev.filter((h) => h.id !== hike.id)].slice(0, 200);
      AsyncStorage.setItem(KEYS.hikeHistory, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const attachHikePhoto = useCallback(async (hikeId: string, photoUri: string) => {
    setLastHike((prev) => {
      if (prev && prev.id === hikeId) {
        const next = { ...prev, photoUri };
        AsyncStorage.setItem(KEYS.lastHike, JSON.stringify(next)).catch(() => {});
        return next;
      }
      return prev;
    });
    setHikeHistory((prev) => {
      const next = prev.map((h) => (h.id === hikeId ? { ...h, photoUri } : h));
      AsyncStorage.setItem(KEYS.hikeHistory, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

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
    await AsyncStorage.multiRemove(Object.values(KEYS));
    setProfile(null);
    setPremium(false);
    setFreeHikeUsed(false);
    setAchievements([]);
    setEmergencyContact(null);
    setEnergiesparmodusState(false);
    setLastHike(null);
    setHikeHistory([]);
    setActiveHike(null);
    setGroupSession(null);
    setGroupError(null);
  }, []);

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
      language,
      premium,
      freeHikeUsed,
      achievements,
      emergencyContact,
      energiesparmodus,
      lastHike,
      hikeHistory,
      activeHike,
      groupSession,
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
      saveHike,
      attachHikePhoto,
      saveActiveHike,
      clearActiveHike,
      exportData,
      resetAll,
      createGroupSession,
      joinGroupSession,
      leaveGroupSession,
      kickMember,
      setGroupActivity,
      sendGroupHikeEvent,
      clearGroupError,
    }),
    [
      hydrated,
      profile,
      language,
      premium,
      freeHikeUsed,
      achievements,
      emergencyContact,
      energiesparmodus,
      lastHike,
      hikeHistory,
      activeHike,
      groupSession,
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
      saveHike,
      attachHikePhoto,
      saveActiveHike,
      clearActiveHike,
      exportData,
      resetAll,
      createGroupSession,
      joinGroupSession,
      leaveGroupSession,
      kickMember,
      setGroupActivity,
      sendGroupHikeEvent,
      clearGroupError,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp muss innerhalb von AppProvider genutzt werden");
  return ctx;
}
