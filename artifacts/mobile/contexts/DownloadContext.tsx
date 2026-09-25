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
  clearOfflinePoiDetail,
  deletePoiCaches,
} from "@/lib/offlinePois";
import { Profile, Saga, StoryChapter } from "@/types";
import { getLocalizedSagaTitle } from "@/lib/sagaTitle";
import type { MapPoi } from "@/components/brand/swisstopoMapHtml";

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
const storyKeyPrefix = "sagatrail:story:v5:";
const MIN_STORY_CHAPTERS = 8;
const MIN_SERVER_STORY_CHAPTERS = 8;
const poisKeyPrefix = "sagatrail:pois:v1:";
const panoramaKeyPrefix = "sagatrail:panorama:v4:";
const safetyKeyPrefix = "sagatrail:safety:v1:";

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
  safetyInfo?: boolean;
}

export type DownloadPhase = "story" | "audio" | "pois" | "safety" | "tiles";

export interface OfflineSafetyData {
  emergencyNumbers: string[];
  waterSources: MapPoi[];
  safetyPois: MapPoi[];
  parkingSpots: MapPoi[];
}

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
  loadOfflineSafety: (routeId: string) => Promise<OfflineSafetyData | null>;
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

function safetyKey(routeId: string): string {
  return `${safetyKeyPrefix}${routeId}`;
}

async function deleteOfflinePayload(record: DownloadRecord): Promise<void> {
  await AsyncStorage.removeItem(
    storyKey(record.sagaId, record.archetype, record.ageTier, record.language),
  ).catch(() => {});

  try {
    const poisRaw = await AsyncStorage.getItem(poisKey(record.routeId));
    if (poisRaw) {
      const pois = JSON.parse(poisRaw) as { id: string }[];
      await deletePoiCaches(pois.map((poi) => poi.id));
    }
  } catch {
    // Einzelne fehlerhafte POI-Daten dürfen den restlichen Löschvorgang nicht blockieren.
  }

  await AsyncStorage.removeItem(poisKey(record.routeId)).catch(() => {});
  await AsyncStorage.removeItem(panoramaKey(record.routeId)).catch(() => {});
  await AsyncStorage.removeItem(safetyKey(record.routeId)).catch(() => {});
  await deleteTiles(record.sagaId);
  await deleteNarrationAudio(record.sagaId);
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
    return chapters?.length >= MIN_STORY_CHAPTERS ? chapters : null;
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
      if (!ready) {
        throw new Error("Offline-Pakete werden noch geladen.");
      }
      // SagaTrail hält bewusst nur ein Offline-Paket gleichzeitig. Vor einem
      // neuen Download bleibt das bisherige Paket erhalten, bis der Ersatz
      // vollständig bereitsteht.
      const previousDownloads = Object.values(downloads);
      const sameSagaDownload = previousDownloads.find((item) => item.sagaId === saga.id);
      if (sameSagaDownload?.status === "complete") {
        if (sameSagaDownload.routeId === route.id) return;
        throw new Error("Bitte entferne zuerst das bestehende Offline-Paket dieser Sage.");
      }

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
        if (chapters.length < MIN_SERVER_STORY_CHAPTERS) {
          throw new Error("Server-Sage enthaelt zu wenige Kapitel");
        }
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
      let panoramaFailed = false;
      let safetyInfo = false;
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
            // Ohne gespeichertes DTM bleiben Gipfel zwar auffindbar, die
            // Verdeckung ist offline aber nicht belastbar. Das Paket wird
            // deshalb sichtbar als unvollständig markiert.
            panoramaFailed = panoramaDatabase.coverage.terrainRadiusM == null;
          } catch {
            // Allgemeine POIs sind keine verlässliche Gipfelquelle. Eine
            // fehlende Peak-Abfrage darf deshalb nicht stillschweigend durch
            // einen gemischten POI-Bestand ersetzt werden.
            panoramaFailed = true;
          }
          if (panoramaDatabase) {
            await AsyncStorage.setItem(
              panoramaKey(route.id),
              JSON.stringify(panoramaDatabase),
            ).catch(() => {});
          }
          {
            // Auch eine valide leere Antwort wird gespeichert. Sie bedeutet
            // "keine thematischen POIs", nicht "offline nicht vorbereitet".
            await AsyncStorage.setItem(poisKey(route.id), JSON.stringify(pois)).catch(() => {});
            hasPois = true;
          }
          if (pois.length > 0) {
            // Detail und Story fuer jeden POI vorladen (total = 1 List + n Detail + n Story)
            const total = 1 + pois.length * 2;
            let done = 1;
            for (const poi of pois) {
              // Quellenbelegtes Detail (Wikipedia, Wikidata oder Ortsquelle)
              setProgress({ sagaId: saga.id, phase: "pois", done, total });
              let narrationExtract = poi.wiki?.extract;
              try {
                const detail = await getPoiDetail({
                  name: poi.name,
                  kind: poi.kind,
                  lat: poi.lat,
                  lng: poi.lng,
                  ...(poi.wikipediaTag ? { wikipediaTag: poi.wikipediaTag } : {}),
                  ...(poi.wikidataTag ? { wikidataTag: poi.wikidataTag } : {}),
                  ...(poi.websiteUrl ? { websiteUrl: poi.websiteUrl } : {}),
                });
                await cachePoiDetail(poi.id, detail.wiki ?? null);
                if (detail.wiki?.extract?.trim()) {
                  narrationExtract = detail.wiki.extract;
                }
              } catch {
                // Ein transienter Netzwerk-/Serverfehler ist kein belastbarer
                // "kein Wikipedia-Eintrag"-Befund. Nicht als null speichern,
                // sonst bleibt der POI offline dauerhaft ohne Detail.
                await clearOfflinePoiDetail(poi.id);
                poisFailed = true;
              }
              done++;
              // Story (KI-Text in Download-Sprache)
              setProgress({ sagaId: saga.id, phase: "pois", done, total });
              try {
                const story = await getPoiStory({
                  name: poi.name,
                  extract: narrationExtract,
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
        phaseStatus.pois = poisFailed || panoramaFailed ? "failed" : "complete";
      } else {
        // Ohne Route/Mittelpunkt können keine POIs oder Panorama-Daten
        // belastbar offline bereitgestellt werden.
        phaseStatus.pois = "failed";
      }

      // 4. Sicherheitsinformationen: Trinkwasser, sicherheitsrelevante POIs
      // und Parkplätze werden als Teil des Pakets gespeichert. Diese Daten
      // dürfen im Berggebiet nicht erst beim Öffnen der Karte online kommen.
      try {
        if (!center) throw new Error("Kein Routenmittelpunkt");
        setProgress({ sagaId: saga.id, phase: "safety", done: 0, total: 4 });
        const base = getApiBaseUrl() ?? "";
        const geometry = route.geometry ?? [];
        const first = geometry[0] ?? [center.lat, center.lng];
        const last = geometry[geometry.length - 1] ?? first;
        const readArray = async <T,>(url: string): Promise<T[]> => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(
              "Die Offline-Sicherheitsdaten konnten nicht geladen werden. Bitte versuche es erneut.",
            );
          }
          const value: unknown = await response.json();
          if (!Array.isArray(value)) throw new Error("Ungültige Offline-Sicherheitsdaten");
          return value as T[];
        };
        const [water, safety, fromStart, fromEnd] = await Promise.all([
          readArray<{ osmId: string; lat: number; lng: number; name: string | null }>(
            `${base}/api/trinkwasser?lat=${center.lat}&lng=${center.lng}&radius=8000`,
          ),
          readArray<{
            osmId: string;
            category: string;
            name: string;
            lat: number;
            lng: number;
            description?: string | null;
            phone?: string | null;
            openingHours?: string | null;
          }>(`${base}/api/safety-pois?lat=${center.lat}&lng=${center.lng}&radius=10000`),
          readArray<{
            osmId: string;
            lat: number;
            lng: number;
            name: string | null;
            address: string | null;
            parkingType: string | null;
            capacity: number | null;
          }>(`${base}/api/parking?lat=${first[0]}&lng=${first[1]}&radius=800`),
          readArray<{
            osmId: string;
            lat: number;
            lng: number;
            name: string | null;
            address: string | null;
            parkingType: string | null;
            capacity: number | null;
          }>(`${base}/api/parking?lat=${last[0]}&lng=${last[1]}&radius=800`),
        ]);
        const parking = [...fromStart, ...fromEnd]
          .filter((item, index, all) => all.findIndex((other) => other.osmId === item.osmId) === index)
          .map((item) => ({
            id: item.osmId,
            name: item.name ?? item.parkingType ?? "Parkplatz",
            lat: item.lat,
            lng: item.lng,
            description: [item.parkingType, item.address, item.capacity ? `${item.capacity} Plätze` : null]
              .filter(Boolean)
              .join(" · ") || null,
          }));
        const safetyData: OfflineSafetyData = {
          emergencyNumbers: ["1414", "144", "117", "112"],
          waterSources: water
            .filter((item) => Boolean(item.osmId))
            .map((item) => ({ id: item.osmId, name: item.name ?? "Trinkwasser", lat: item.lat, lng: item.lng })),
          safetyPois: safety
            .filter((item) => Boolean(item.osmId))
            .map((item) => ({
              id: item.osmId,
              name: item.name,
              lat: item.lat,
              lng: item.lng,
              category: item.category,
              description: [item.description, item.phone ? `Tel. ${item.phone}` : null, item.openingHours]
                .filter(Boolean)
                .join(" · ") || null,
            })),
          parkingSpots: parking,
        };
        await AsyncStorage.setItem(safetyKey(route.id), JSON.stringify(safetyData));
        safetyInfo = true;
        setProgress({ sagaId: saga.id, phase: "safety", done: 4, total: 4 });
      } catch {
        // Ein unvollständiges Paket wird sichtbar markiert und nicht als
        // vollständig offline-tauglich ausgegeben.
      }
      phaseStatus.safety = safetyInfo ? "complete" : "failed";

      // 5. Kartenkacheln laden — gesamte Route wenn Geometrie vorhanden,
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
        sagaTitle: getLocalizedSagaTitle(saga, lang),
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
        safetyInfo,
        downloadedAt: Date.now(),
        status: Object.values(phaseStatus).some((s) => s === "failed" || s === "partial")
          ? "partial"
          : "complete",
        phaseStatus,
        failedPhase: Object.entries(phaseStatus).find(([, status]) => status !== "complete")?.[0] as DownloadPhase | undefined,
        routeSnapshot: route,
        sagaSnapshot: saga,
        offlinePackageVersion: 7,
        emergencyNumbers: ["1414", "144", "117", "112"],
      };
      const canRollBackToPrevious =
        record.status !== "complete" &&
        previousDownloads.length > 0 &&
        previousDownloads.every((item) => item.sagaId !== saga.id);
      if (canRollBackToPrevious) {
        await deleteOfflinePayload(record);
        setProgress(null);
        throw new Error("Der Ersatzdownload war unvollständig; das bisherige Offline-Paket bleibt erhalten.");
      }

      const nextDownloads = { [saga.id]: record };
      try {
        await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(nextDownloads));
      } catch (error) {
        if (previousDownloads.every((item) => item.sagaId !== saga.id)) {
          await deleteOfflinePayload(record);
        }
        throw error;
      }
      setDownloads(nextDownloads);
      for (const previousDownload of previousDownloads) {
        if (previousDownload.sagaId !== saga.id) {
          await deleteOfflinePayload(previousDownload);
        }
      }
      setProgress(null);
    },
    [downloads, persist, ready]
  );

  const remove = useCallback(
    async (sagaId: string) => {
      const rec = downloads[sagaId];
      if (rec) {
        await deleteOfflinePayload(rec);
      }
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
        if (chapters.length < MIN_SERVER_STORY_CHAPTERS) {
          throw new Error("Server-Sage enthaelt zu wenige Kapitel");
        }
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
    (sagaIdOrRouteId?: string) => {
      if (!sagaIdOrRouteId) return undefined;
      return (
        downloads[sagaIdOrRouteId] ??
        Object.values(downloads).find((record) => record.routeId === sagaIdOrRouteId)
      );
    },
    [downloads]
  );

  const loadOfflineTiles = useCallback(
    (sagaId: string) => {
      // Tile-Dateien aus älteren Paketen stammen noch aus der CARTO-Zeit.
      // Nicht als swisstopo-Kacheln anzeigen — erst nach einem neuen Download
      // mit der aktuellen Paketversion wieder aktivieren.
       if (downloads[sagaId]?.offlinePackageVersion !== 7) return Promise.resolve({});
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
        // An empty array is a valid completed response ("no POIs"), while
        // null means that the offline package has no POI evidence at all.
        return Array.isArray(parsed) ? parsed : null;
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

  const loadOfflineSafety = useCallback(
    async (routeId: string): Promise<OfflineSafetyData | null> => {
      try {
        const raw = await AsyncStorage.getItem(safetyKey(routeId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as OfflineSafetyData;
        return parsed &&
          Array.isArray(parsed.emergencyNumbers) &&
          Array.isArray(parsed.waterSources) &&
          Array.isArray(parsed.safetyPois) &&
          Array.isArray(parsed.parkingSpots)
          ? parsed
          : null;
      } catch {
        return null;
      }
    },
    [],
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
      loadOfflineSafety,
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
      loadOfflineSafety,
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
