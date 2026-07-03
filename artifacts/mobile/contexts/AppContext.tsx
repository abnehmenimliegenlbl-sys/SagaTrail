import { useAuth } from "@clerk/expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getGetMyProfileQueryKey,
  useGetMyProfile,
  useSaveMyProfile,
  useUpdateMyPremium,
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

// Persistente Schluessel im AsyncStorage — dienen als Offline-Cache,
// seit Profil/Premium serverseitig (Clerk-Benutzer) verwaltet werden.
const KEYS = {
  profile: "sagatrail:profile",
  premium: "sagatrail:premium",
  achievements: "sagatrail:achievements",
  emergency: "sagatrail:emergencyContact",
  energysave: "sagatrail:energiesparmodus",
  lastHike: "sagatrail:lastHike",
} as const;

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface GroupMember {
  id: string;
  name: string;
  ageTier: string;
  isLeader: boolean;
}

export interface GroupSession {
  code: string;
  createdAt: number;
  members: GroupMember[];
  isLeader: boolean;
}

interface AppContextValue {
  hydrated: boolean;
  profile: Profile | null;
  premium: boolean;
  achievements: Achievement[];
  emergencyContact: EmergencyContact | null;
  energiesparmodus: boolean;
  lastHike: HikeSession | null;
  groupSession: GroupSession | null;

  saveProfile: (profile: Omit<Profile, "id">) => Promise<void>;
  updateProfile: (patch: Partial<Omit<Profile, "id">>) => Promise<void>;
  unlockPremium: () => Promise<void>;
  lockPremium: () => Promise<void>;
  addAchievement: (sagaTitle: string, sagaId: string) => Promise<void>;
  saveEmergencyContact: (contact: EmergencyContact | null) => Promise<void>;
  setEnergiesparmodus: (value: boolean) => Promise<void>;
  saveHike: (hike: HikeSession) => Promise<void>;
  exportData: () => Promise<string>;
  resetAll: () => Promise<void>;

  createGroupSession: () => void;
  joinGroupSession: (code: string) => void;
  leaveGroupSession: () => void;
  removeMember: (memberId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();

  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [premium, setPremium] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [emergencyContact, setEmergencyContact] =
    useState<EmergencyContact | null>(null);
  const [energiesparmodus, setEnergiesparmodusState] = useState(false);
  const [lastHike, setLastHike] = useState<HikeSession | null>(null);
  const [groupSession, setGroupSession] = useState<GroupSession | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          KEYS.profile,
          KEYS.premium,
          KEYS.achievements,
          KEYS.emergency,
          KEYS.energysave,
          KEYS.lastHike,
        ]);
        const map = Object.fromEntries(entries);
        if (map[KEYS.profile]) setProfile(JSON.parse(map[KEYS.profile]!));
        if (map[KEYS.premium]) setPremium(map[KEYS.premium] === "true");
        if (map[KEYS.achievements])
          setAchievements(JSON.parse(map[KEYS.achievements]!));
        if (map[KEYS.emergency])
          setEmergencyContact(JSON.parse(map[KEYS.emergency]!));
        if (map[KEYS.energysave])
          setEnergiesparmodusState(map[KEYS.energysave] === "true");
        if (map[KEYS.lastHike]) setLastHike(JSON.parse(map[KEYS.lastHike]!));
      } catch {
        // Bei defekten Daten starten wir mit leerem Zustand
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Serverseitiges Profil ist die Wahrheitsquelle, sobald ein Clerk-Benutzer
  // angemeldet ist. Der AsyncStorage-Cache bleibt fuer Offline-Start bestehen.
  const {
    data: serverProfile,
    error: profileError,
    isFetched: profileFetched,
  } = useGetMyProfile({
    query: {
      queryKey: getGetMyProfileQueryKey(),
      enabled: authLoaded && !!isSignedIn,
      retry: false,
    },
  });

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
      AsyncStorage.setItem(KEYS.profile, JSON.stringify(next));
      AsyncStorage.setItem(KEYS.premium, serverProfile.premium ? "true" : "false");
    } else if (profileError) {
      // 404: noch kein Profil auf dem Server — Onboarding erforderlich.
      setProfile(null);
      setPremium(false);
      AsyncStorage.removeItem(KEYS.profile);
      AsyncStorage.removeItem(KEYS.premium);
    }
  }, [authLoaded, isSignedIn, profileFetched, serverProfile, profileError]);

  const { mutateAsync: saveMyProfileMutation } = useSaveMyProfile();
  const { mutateAsync: updateMyPremiumMutation } = useUpdateMyPremium();

  const applyServerProfile = useCallback(
    async (result: {
      id: string;
      name: string;
      archetype: string;
      homeCanton: string;
      language: string;
      ageTier: string;
      premium: boolean;
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
      await AsyncStorage.setItem(KEYS.profile, JSON.stringify(next));
      await AsyncStorage.setItem(KEYS.premium, result.premium ? "true" : "false");
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

  const unlockPremium = useCallback(async () => {
    const result = await updateMyPremiumMutation({ data: { premium: true } });
    setPremium(result.premium);
    await AsyncStorage.setItem(KEYS.premium, "true");
  }, [updateMyPremiumMutation]);

  const lockPremium = useCallback(async () => {
    const result = await updateMyPremiumMutation({ data: { premium: false } });
    setPremium(result.premium);
    await AsyncStorage.setItem(KEYS.premium, "false");
  }, [updateMyPremiumMutation]);

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

  const saveHike = useCallback(async (hike: HikeSession) => {
    setLastHike(hike);
    await AsyncStorage.setItem(KEYS.lastHike, JSON.stringify(hike));
  }, []);

  const exportData = useCallback(async () => {
    const data = {
      profile,
      premium,
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
    achievements,
    emergencyContact,
    energiesparmodus,
    lastHike,
  ]);

  const resetAll = useCallback(async () => {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    setProfile(null);
    setPremium(false);
    setAchievements([]);
    setEmergencyContact(null);
    setEnergiesparmodusState(false);
    setLastHike(null);
    setGroupSession(null);
  }, []);

  const createGroupSession = useCallback(() => {
    setGroupSession({
      code: randomCode(),
      createdAt: Date.now(),
      isLeader: true,
      members: [
        {
          id: "self",
          name: profile?.name ?? "Du",
          ageTier: profile?.ageTier ?? "erwachsene",
          isLeader: true,
        },
        {
          id: "m2",
          name: "Lena",
          ageTier: "jugendliche",
          isLeader: false,
        },
        {
          id: "m3",
          name: "Tim",
          ageTier: "kinder",
          isLeader: false,
        },
      ],
    });
  }, [profile]);

  const joinGroupSession = useCallback(
    (code: string) => {
      setGroupSession({
        code: code.toUpperCase(),
        createdAt: Date.now(),
        isLeader: false,
        members: [
          {
            id: "leader",
            name: "Gruppenleitung",
            ageTier: "erwachsene",
            isLeader: true,
          },
          {
            id: "self",
            name: profile?.name ?? "Du",
            ageTier: profile?.ageTier ?? "erwachsene",
            isLeader: false,
          },
        ],
      });
    },
    [profile]
  );

  const leaveGroupSession = useCallback(() => setGroupSession(null), []);

  const removeMember = useCallback((memberId: string) => {
    setGroupSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.filter((m) => m.id !== memberId),
      };
    });
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated,
      profile,
      premium,
      achievements,
      emergencyContact,
      energiesparmodus,
      lastHike,
      groupSession,
      saveProfile,
      updateProfile,
      unlockPremium,
      lockPremium,
      addAchievement,
      saveEmergencyContact,
      setEnergiesparmodus,
      saveHike,
      exportData,
      resetAll,
      createGroupSession,
      joinGroupSession,
      leaveGroupSession,
      removeMember,
    }),
    [
      hydrated,
      profile,
      premium,
      achievements,
      emergencyContact,
      energiesparmodus,
      lastHike,
      groupSession,
      saveProfile,
      updateProfile,
      unlockPremium,
      lockPremium,
      addAchievement,
      saveEmergencyContact,
      setEnergiesparmodus,
      saveHike,
      exportData,
      resetAll,
      createGroupSession,
      joinGroupSession,
      leaveGroupSession,
      removeMember,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp muss innerhalb von AppProvider genutzt werden");
  return ctx;
}
