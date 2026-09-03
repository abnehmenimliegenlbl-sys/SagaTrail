import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createNarration,
  createStory,
  getPoiDetail,
  getPoiStory,
  getPeakPois,
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
import { getApiBaseUrl } from "@/lib/apiConfig";
import type { TerrainProfilePoint } from "@/lib/terrainCues";
import {
  deleteTiles,
  downloadTiles,
  downloadTilesAlongRoute,
  loadTilesBase64,
} from "@/lib/offlineTiles";
import {
  createOfflinePanoramaDatenbank,
  isOfflinePanoramaDatenbank,
  PANORAMA_ROUTE_CORRIDOR_KM,
  type OfflinePanoramaDatenbank,
} from "@/lib/panorama";
import {
  isLocalTerrainModel,
  type LocalTerrainModel,
} from "@/lib/terrainModel";
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
const panoramaKeyPrefix = "sagatrail:panorama:v3:";

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
  /** Eigenständiger, versionierter Gipfelbestand im Offline-Paket. */
  peakCount?: number;
  panoramaDatabaseVersion?: number;
  panoramaSource?: string;
  /** Der Download kann offline nutzbar sein, auch wenn einzelne Phasen fehlen. */
  status?: "complete" | "partial" | "failed";
  phaseStatus?: Partial<Record<DownloadPhase, "complete" | "partial" | "failed">>;
  failedPhase?: DownloadPhase;
  /** Vollständige lokale Katalog-Snapshots — damit Navigation auch nach
   * einem Kaltstart ohne Online-Katalog möglich bleibt. */
  routeSnapshot?: HikingRoute;
  sagaSnapshot?: Saga;
  offlinePackageVersion?: number;
  emergencyNumbers?: string[];
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
  loadOfflinePanorama: (routeId: string) => Promise<OfflinePanoramaDatenbank | null>;
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

function panoramaKey(routeId: string): string {
  return `${panoramaKeyPrefix}${routeId}`;
}

async function loadTerrainProfileForDownload(
  geometry: number[][] | null | undefined,
): Promise<TerrainProfilePoint[] | null> {
  if (!geometry || geometry.length < 2) return null;
  const requestGeometry =
    geometry.length <= 2000
      ? geometry
      : geometry.filter(
          (_, index) =>
            index === 0 ||
            index === geometry.length - 1 ||
            index % Math.ceil(geometry.length / 2000) === 0,
        );
  try {
    const response = await fetch(`${getApiBaseUrl() ?? ""}/api/elevation-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geometry: requestGeometry }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { profile?: TerrainProfilePoint[] };
    const profile = (data.profile ?? []).filter(
      (point) => Number.isFinite(point.distanceKm) && Number.isFinite(point.altM),
    );
    return profile.length >= 2 ? profile : null;
  } catch {
    return null;
  }
}

async function loadLocalTerrainModelForDownload(
  center: { lat: number; lng: number } | null | undefined,
): Promise<LocalTerrainModel | null> {
  if (!center) return null;
  try {
    const response = await fetch(`${getApiBaseUrl() ?? ""}/api/terrain-surface`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ center, radiusM: 500, sectors: 16, rings: 7 }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as unknown;
    return isLocalTerrainModel(data) ? data : null;
  } catch {
    return null;
  }
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
      const phaseStatus: Partial<Record<DownloadPhase, "complete" | "partial" | "failed">> = {};
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
      phaseStatus.story = "complete";

      // 2. Kapitel-Audio vorladen (nur Premium; bei Fehler stumm ueberspringen).
      let hasAudio = false;
      let audioFailed = false;
      if (premium && chapters.length > 0) {
        for (let i = 0; i < chapters.length; i++) {
          setProgress({ sagaId: saga.id, phase: "audio", done: i, total: chapters.length });
          try {
            const blob = await createNarration({ text: chapters[i].text, language: lang });
            await downloadChapterAudio(saga.id, i, blob);
            hasAudio = true;
          } catch {
            audioFailed = true;
          }
        }
        setProgress({ sagaId: saga.id, phase: "audio", done: chapters.length, total: chapters.length });
        phaseStatus.audio = audioFailed ? (hasAudio ? "partial" : "failed") : "complete";
      }

      // 3. POIs laden, Detail und Story fuer jeden POI vorladen.
      let hasPois = false;
      let poisFailed = false;
      let panoramaDatabase: OfflinePanoramaDatenbank | null = null;
      const center = route.coordinates ?? saga.coordinates ?? null;
      if (center) {
        try {
          const bbox = bboxAroundGeometry(route.geometry ?? null, center, 0.5);
          setProgress({ sagaId: saga.id, phase: "pois", done: 0, total: 1 });
          const pois = await getPois(bbox);
          const terrainProfile = await loadTerrainProfileForDownload(route.geometry);
          const terrainModel = await loadLocalTerrainModelForDownload(center);
          // Das Panorama braucht einen größeren Korridor als historische
          // Weg-POIs. Die zweite Abfrage bleibt vom Detail-Preload getrennt;
          // fällt sie aus, bleibt zumindest der kleinere POI-Bestand nutzbar.
          try {
            const panoramaPois = await getPeakPois(
              bboxAroundGeometry(
                route.geometry ?? null,
                center,
                PANORAMA_ROUTE_CORRIDOR_KM,
              ),
            );
            panoramaDatabase = createOfflinePanoramaDatenbank(
              panoramaPois,
              terrainProfile,
              terrainModel,
            );
          } catch {
            panoramaDatabase = createOfflinePanoramaDatenbank(
              pois,
              terrainProfile,
              terrainModel,
            );
          }
          await AsyncStorage.setItem(
            panoramaKey(route.id),
            JSON.stringify(panoramaDatabase),
          ).catch(() => {});
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
                poisFailed = true;
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
                poisFailed = true;
              }
              done++;
            }
            setProgress({ sagaId: saga.id, phase: "pois", done: total, total });
          }
        } catch {
          poisFailed = true;
        }
        phaseStatus.pois = poisFailed ? "failed" : "complete";
      }

      // 4. Kartenkacheln laden — gesamte Route wenn Geometrie vorhanden,
      //    sonst nur Korridor um Startpunkt.
      let tileCount = 0;
      let sizeBytes = 0;
      if (center) {
        try {
          if (route.geometry && route.geometry.length > 1) {
            // Konvertiere [lat, lng][] → LatLng[]
            const points = route.geometry.map(([lat, lng]) => ({ lat, lng }));
            const res = await downloadTilesAlongRoute(saga.id, points, (done, total) => {
              setProgress({ sagaId: saga.id, phase: "tiles", done, total });
            });
            tileCount = res.tileCount;
            sizeBytes = res.sizeBytes;
          phaseStatus.tiles = res.complete ? "complete" : res.tileCount > 0 ? "partial" : "failed";
          } else {
            const res = await downloadTiles(saga.id, center, (done, total) => {
              setProgress({ sagaId: saga.id, phase: "tiles", done, total });
            });
            tileCount = res.tileCount;
            sizeBytes = res.sizeBytes;
            phaseStatus.tiles = res.complete ? "complete" : res.tileCount > 0 ? "partial" : "failed";
          }
        } catch {
          phaseStatus.tiles = "failed";
        }
      } else {
        phaseStatus.tiles = "failed";
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
        peakCount: panoramaDatabase?.peaks.length ?? 0,
        panoramaDatabaseVersion: panoramaDatabase?.version,
        panoramaSource: panoramaDatabase?.source,
        downloadedAt: Date.now(),
        status: Object.values(phaseStatus).some((s) => s === "failed" || s === "partial")
          ? "partial"
          : "complete",
        phaseStatus,
        failedPhase: Object.entries(phaseStatus).find(([, status]) => status !== "complete")?.[0] as DownloadPhase | undefined,
        routeSnapshot: route,
        sagaSnapshot: saga,
        offlinePackageVersion: 5,
        emergencyNumbers: ["1414", "144", "117", "112"],
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
      await AsyncStorage.removeItem(panoramaKey(rec.routeId)).catch(() => {});
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
    (sagaId: string) => {
      // Tile-Dateien aus älteren Paketen stammen noch aus der CARTO-Zeit.
      // Nicht als swisstopo-Kacheln anzeigen — erst nach einem neuen Download
      // mit der aktuellen Paketversion wieder aktivieren.
      if (downloads[sagaId]?.offlinePackageVersion !== 5) return Promise.resolve({});
      return loadTilesBase64(sagaId);
    },
    [downloads]
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

  const loadOfflinePanorama = useCallback(
    async (routeId: string): Promise<OfflinePanoramaDatenbank | null> => {
      try {
        const raw = await AsyncStorage.getItem(panoramaKey(routeId));
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isOfflinePanoramaDatenbank(parsed) ? parsed : null;
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
      loadOfflinePanorama,
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
      loadOfflinePanorama,
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
