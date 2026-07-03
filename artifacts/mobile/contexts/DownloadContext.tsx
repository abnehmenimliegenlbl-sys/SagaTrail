import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createStory,
  StoryRequestAgeTier,
  StoryRequestArchetype,
} from "@workspace/api-client-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { HikingRoute } from "@/constants/routes";
import { generateStory } from "@/lib/storyEngine";
import { effectiveStoryLanguage } from "@/lib/storyContent";
import {
  deleteTiles,
  downloadTiles,
  loadTilesBase64,
} from "@/lib/offlineTiles";
import { Profile, Saga, StoryChapter } from "@/types";

/**
 * Download-Verwaltung fuer einzelne Wanderungen (Offline-Nutzung).
 *
 * Ein Download buendelt pro Wanderung:
 * - die generierte Sage (Kapitel) fuer das aktuelle Profil (Archetyp, Altersstufe,
 *   Sprache), bevorzugt vom Server, sonst lokal erzeugt
 * - die Offline-Kartenkacheln des Startkorridors (nur nativ)
 *
 * Inhalte werden in AsyncStorage abgelegt, Kacheln im Dateisystem. Der
 * Live-Hike bevorzugt heruntergeladene Inhalte und funktioniert so offline.
 */

const INDEX_KEY = "sagatrail:downloads";
const storyKeyPrefix = "sagatrail:story:";

export interface DownloadRecord {
  sagaId: string;
  routeId: string;
  routeName: string;
  sagaTitle: string;
  archetype: string;
  ageTier: string;
  language: string;
  chapterCount: number;
  tileCount: number;
  sizeBytes: number;
  storySource: string;
  downloadedAt: number;
}

export type DownloadPhase = "story" | "tiles";

export interface DownloadProgress {
  sagaId: string;
  phase: DownloadPhase;
  done: number;
  total: number;
}

interface DownloadContextValue {
  ready: boolean;
  downloads: Record<string, DownloadRecord>;
  progress: DownloadProgress | null;
  isDownloaded: (sagaId?: string) => boolean;
  getRecord: (sagaId?: string) => DownloadRecord | undefined;
  download: (saga: Saga, route: HikingRoute, profile: Profile, premium: boolean) => Promise<void>;
  remove: (sagaId: string) => Promise<void>;
  loadOfflineTiles: (sagaId: string) => Promise<Record<string, string>>;
  resolveStory: (
    saga: Saga,
    profile: Profile,
    premium: boolean
  ) => Promise<{ chapters: StoryChapter[]; source: "download" | "server" | "seed" }>;
}

const DownloadContext = createContext<DownloadContextValue | null>(null);

function storyKey(sagaId: string, archetype: string, ageTier: string, language: string): string {
  return `${storyKeyPrefix}${sagaId}:${archetype}:${ageTier}:${language}`;
}

async function readStory(
  sagaId: string,
  profile: Profile
): Promise<StoryChapter[] | null> {
  try {
    const raw = await AsyncStorage.getItem(
      storyKey(sagaId, profile.archetype, profile.ageTier, profile.language)
    );
    if (!raw) return null;
    const chapters = JSON.parse(raw) as StoryChapter[];
    return chapters?.length ? chapters : null;
  } catch {
    return null;
  }
}

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [downloads, setDownloads] = useState<Record<string, DownloadRecord>>({});
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(INDEX_KEY);
        if (raw) setDownloads(JSON.parse(raw) as Record<string, DownloadRecord>);
      } catch {
        // defekter Index — leer starten
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: Record<string, DownloadRecord>) => {
    setDownloads(next);
    await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const download = useCallback(
    async (saga: Saga, route: HikingRoute, profile: Profile, premium: boolean) => {
      // Fuer Premium (KI-Erzaehlstimme) wird gsw nie als Dialekt-Text
      // heruntergeladen — siehe effectiveStoryLanguage.
      const lang = effectiveStoryLanguage(profile.language, premium);

      // 1. Sage besorgen — bevorzugt vom Server, sonst lokal erzeugen.
      setProgress({ sagaId: saga.id, phase: "story", done: 0, total: 1 });
      let chapters: StoryChapter[];
      let storySource = "seed";
      try {
        const res = await createStory({
          sagaId: saga.id,
          archetype: profile.archetype as StoryRequestArchetype,
          ageTier: profile.ageTier as StoryRequestAgeTier,
          language: lang,
        });
        chapters = res.chapters as StoryChapter[];
        storySource = res.source ?? "server";
      } catch {
        chapters = generateStory(saga, profile.archetype, profile.ageTier, lang);
        storySource = "seed";
      }
      await AsyncStorage.setItem(
        storyKey(saga.id, profile.archetype, profile.ageTier, lang),
        JSON.stringify(chapters)
      ).catch(() => {});
      setProgress({ sagaId: saga.id, phase: "story", done: 1, total: 1 });

      // 2. Kartenkacheln laden (nur nativ; im Web No-Op).
      const center = route.coordinates ?? saga.coordinates ?? null;
      let tileCount = 0;
      let sizeBytes = 0;
      if (center) {
        const res = await downloadTiles(saga.id, center, (done, total) => {
          setProgress({ sagaId: saga.id, phase: "tiles", done, total });
        });
        tileCount = res.tileCount;
        sizeBytes = res.sizeBytes;
      }

      const record: DownloadRecord = {
        sagaId: saga.id,
        routeId: route.id,
        routeName: route.name,
        sagaTitle: saga.title,
        archetype: profile.archetype,
        ageTier: profile.ageTier,
        language: lang,
        chapterCount: chapters.length,
        tileCount,
        sizeBytes,
        storySource,
        downloadedAt: Date.now(),
      };
      await persist({ ...downloads, [saga.id]: record });
      setProgress(null);
    },
    [downloads, persist]
  );

  const remove = useCallback(
    async (sagaId: string) => {
      const rec = downloads[sagaId];
      if (rec) {
        await AsyncStorage.removeItem(
          storyKey(sagaId, rec.archetype, rec.ageTier, rec.language)
        ).catch(() => {});
      }
      await deleteTiles(sagaId);
      const next = { ...downloads };
      delete next[sagaId];
      await persist(next);
    },
    [downloads, persist]
  );

  const resolveStory = useCallback(
    async (saga: Saga, profile: Profile, premium: boolean) => {
      // Fuer Premium (KI-Erzaehlstimme) wird gsw nie als Dialekt-Text
      // angefordert/angezeigt — siehe effectiveStoryLanguage.
      const lang = effectiveStoryLanguage(profile.language, premium);
      const storyProfile = lang === profile.language ? profile : { ...profile, language: lang };

      // Offline-First: zuerst heruntergeladene/gespeicherte Sage nutzen.
      const local = await readStory(saga.id, storyProfile);
      if (local) return { chapters: local, source: "download" as const };

      // Sonst vom Server holen und fuer spaeter zwischenspeichern.
      try {
        const res = await createStory({
          sagaId: saga.id,
          archetype: profile.archetype as StoryRequestArchetype,
          ageTier: profile.ageTier as StoryRequestAgeTier,
          language: lang,
        });
        const chapters = res.chapters as StoryChapter[];
        AsyncStorage.setItem(
          storyKey(saga.id, profile.archetype, profile.ageTier, lang),
          JSON.stringify(chapters)
        ).catch(() => {});
        return { chapters, source: "server" as const };
      } catch {
        // Weder lokal noch Server — auf Seed-Erzeugung zurueckfallen.
        const chapters = generateStory(saga, profile.archetype, profile.ageTier, lang);
        return { chapters, source: "seed" as const };
      }
    },
    []
  );

  const isDownloaded = useCallback(
    (sagaId?: string) => (sagaId ? !!downloads[sagaId] : false),
    [downloads]
  );

  const getRecord = useCallback(
    (sagaId?: string) => (sagaId ? downloads[sagaId] : undefined),
    [downloads]
  );

  const loadOfflineTiles = useCallback(
    (sagaId: string) => loadTilesBase64(sagaId),
    []
  );

  const value = useMemo<DownloadContextValue>(
    () => ({
      ready,
      downloads,
      progress,
      isDownloaded,
      getRecord,
      download,
      remove,
      loadOfflineTiles,
      resolveStory,
    }),
    [
      ready,
      downloads,
      progress,
      isDownloaded,
      getRecord,
      download,
      remove,
      loadOfflineTiles,
      resolveStory,
    ]
  );

  return (
    <DownloadContext.Provider value={value}>{children}</DownloadContext.Provider>
  );
}

export function useDownloads(): DownloadContextValue {
  const ctx = useContext(DownloadContext);
  if (!ctx) {
    throw new Error("useDownloads muss innerhalb von DownloadProvider genutzt werden");
  }
  return ctx;
}
