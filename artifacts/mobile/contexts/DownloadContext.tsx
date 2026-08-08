import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createNarration,
  createStory,
  getPoiDetail,
  getPoiStory,
  getPois,
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
import { bboxAroundGeometry } from "@/lib/geo";
import {
  deleteTiles,
  downloadTiles,
  downloadTilesAlongRoute,
  loadTilesBase64,
} from "@/lib/offlineTiles";
import {
  downloadChapterAudio,
  deleteNarrationAudio,
} from "@/lib/narrationAudio";
import {
  cachePoiDetail,
  cachePoiStory,
  deletePoiCaches,
} from "@/lib/offlinePois";
import { Profile, Saga, StoryChapter } from "@/types";

/**
 * Download-Verwaltung fuer einzelne Wanderungen (Offline-Nutzung).
 *
 * Ein Download buendelt pro Wanderung:
 * - die generierte Sage (Kapitel) fuer das aktuelle Profil (Archetyp, Altersstufe,
 *   Sprache), bevorzugt vom Server, sonst lokal erzeugt
 * - die Offline-Kartenkacheln entlang der gesamten Routen-Geometrie (nur nativ)
 * - Kapitel-Audio-Dateien (MP3, nur Premium-Nutzer)
 * - POIs (Points of Interest) entlang der Route (fuer Offline-Anzeige)
 *
 * Inhalte werden in AsyncStorage (Story, POIs) und im Dateisystem (Kacheln,
 * Audio) abgelegt. Der Live-Hike bevorzugt heruntergeladene Inhalte.
 */

const INDEX_KEY = "sagatrail:downloads";
// Versionierter Prefix: muss mitbumpen, wenn der Server-Erzaehlstil (STORY_SOURCE
// in routes/stories.ts) wechselt — sonst bleiben alte, im Stil ueberholte
// Kapitel auf dem Geraet haengen. Alte v1-Eintraege werden schlicht ignoriert.
const storyKeyPrefix = "sagatrail:story:v2:";
const poisKeyPrefix = "sagatrail:pois:v1:";

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
  hasAudio?: boolean;
  hasPois?: boolean;
}

export type DownloadPhase = "story" | "audio" | "pois" | "tiles";

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
  loadOfflinePois: (routeId: string) => Promise<unknown[] | null>;
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

function poisKey(routeId: string): string {
  return `${poisKeyPrefix}${routeId}`;
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

      // 2. Kapitel-Audio vorladen (nur Premium; bei Fehler stumm ueberspringen).
      let hasAudio = false;
      if (premium && chapters.length > 0) {
        for (let i = 0; i < chapters.length; i++) {
          setProgress({ sagaId: saga.id, phase: "audio", done: i, total: chapters.length });
          try {
            const blob = await createNarration({ text: chapters[i].text, language: lang });
            await downloadChapterAudio(saga.id, i, blob);
            hasAudio = true;
          } catch {
            // Audio fuer dieses Kapitel nicht verfuegbar — kein Blocker.
          }
        }
        setProgress({ sagaId: saga.id, phase: "audio", done: chapters.length, total: chapters.length });
      }

      // 3. POIs laden, Detail und Story fuer jeden POI vorladen.
      let hasPois = false;
      const center = route.coordinates ?? saga.coordinates ?? null;
      if (center) {
        try {
          const bbox = bboxAroundGeometry(route.geometry ?? null, center, 0.5);
          setProgress({ sagaId: saga.id, phase: "pois", done: 0, total: 1 });
          const pois = await getPois(bbox);
          if (pois.length > 0) {
            await AsyncStorage.setItem(poisKey(route.id), JSON.stringify(pois)).catch(() => {});
            hasPois = true;
            // Detail und Story fuer jeden POI vorladen (total = 1 List + n Detail + n Story)
            const total = 1 + pois.length * 2;
            let done = 1;
            for (const poi of pois) {
              // Detail (Wikipedia-Auszug)
              setProgress({ sagaId: saga.id, phase: "pois", done, total });
              try {
                const detail = await getPoiDetail({
                  name: poi.name,
                  kind: poi.kind,
                  lat: poi.lat,
                  lng: poi.lng,
                  ...(poi.wikipediaTag ? { wikipediaTag: poi.wikipediaTag } : {}),
                  ...(poi.wikidataTag ? { wikidataTag: poi.wikidataTag } : {}),
                });
                await cachePoiDetail(poi.id, detail.wiki ?? null);
              } catch {
                await cachePoiDetail(poi.id, null);
              }
              done++;
              // Story (KI-Text in Download-Sprache)
              setProgress({ sagaId: saga.id, phase: "pois", done, total });
              try {
                const story = await getPoiStory({
                  name: poi.name,
                  extract: poi.wiki?.extract,
                  kind: poi.kind,
                  lang,
                  osmContext: poi.osmContext ?? undefined,
                });
                await cachePoiStory(poi.id, lang, story.text);
              } catch {
                // Story nicht verfuegbar — online Fallback im Hike.
              }
              done++;
            }
            setProgress({ sagaId: saga.id, phase: "pois", done: total, total });
          }
        } catch {
          // POIs konnten nicht gecacht werden — im Hike wird online nachgeladen.
        }
      }

      // 4. Kartenkacheln laden — gesamte Route wenn Geometrie vorhanden,
      //    sonst nur Korridor um Startpunkt.
      let tileCount = 0;
      let sizeBytes = 0;
      if (center) {
        if (route.geometry && route.geometry.length > 1) {
          // Konvertiere [lat, lng][] → LatLng[]
          const points = route.geometry.map(([lat, lng]) => ({ lat, lng }));
          const res = await downloadTilesAlongRoute(saga.id, points, (done, total) => {
            setProgress({ sagaId: saga.id, phase: "tiles", done, total });
          });
          tileCount = res.tileCount;
          sizeBytes = res.sizeBytes;
        } else {
          const res = await downloadTiles(saga.id, center, (done, total) => {
            setProgress({ sagaId: saga.id, phase: "tiles", done, total });
          });
          tileCount = res.tileCount;
          sizeBytes = res.sizeBytes;
        }
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
        hasAudio,
        hasPois,
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
        // POI-Detail- und Story-Caches loeschen
      try {
        const poisRaw = await AsyncStorage.getItem(poisKey(rec.routeId));
        if (poisRaw) {
          const pois = JSON.parse(poisRaw) as { id: string }[];
          await deletePoiCaches(pois.map((p) => p.id));
        }
      } catch {}
      await AsyncStorage.removeItem(poisKey(rec.routeId)).catch(() => {});
      }
      await deleteTiles(sagaId);
      await deleteNarrationAudio(sagaId);
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

  const loadOfflinePois = useCallback(
    async (routeId: string): Promise<unknown[] | null> => {
      try {
        const raw = await AsyncStorage.getItem(poisKey(routeId));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
      } catch {
        return null;
      }
    },
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
      loadOfflinePois,
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
      loadOfflinePois,
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
