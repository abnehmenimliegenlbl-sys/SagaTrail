import { Feather } from "@expo/vector-icons";
import {
  createNarration,
  getAerialways,
  getTransportNearby,
  getPeakPois,
  getPartners,
  getPois,
  getPoiDetail,
  getPoiStory,
  getRouteSurfaces,
  getWeather,
  useGetRouteConditions,
  reportRouteCondition,
  ApiError,
} from "@workspace/api-client-react";
import type {
  Partner,
  Poi,
  RouteSurfacePoint,
  TrailConditionReport,
  WeatherReport,
  WikiSummary,
} from "@workspace/api-client-react";
import type { MapPoi } from "@/components/brand/swisstopoMapHtml";
import type { RecognitionJournalEntry } from "@/types";
import { getApiBaseUrl } from "../../lib/apiConfig";
import { setAudioModeAsync } from "expo-audio";
import {
  createAudioSound,
  isAudioPlaybackFinished,
  type AudioSound,
} from "@/lib/audioPlayer";
import {
  hapticDoublePulse,
  hapticHeavy,
  hapticMedium,
  hapticRigid,
  hapticSuccess,
} from "@/lib/haptics";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DeviceMotion, Magnetometer, Pedometer } from "expo-sensors";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { alert } from "@/lib/appAlert";
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLAS_3D } from "@/constants/depth";
import type { HikingRoute } from "@/constants/routes";
import { Background } from "@/components/brand/Background";
import { Glass } from "@/components/brand/Glass";
import { CloseButton } from "@/components/brand/CloseButton";
import { KarteVollbild } from "@/components/brand/KarteVollbild";
import { LoadingBar } from "@/components/brand/LoadingBar";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import {
  SafetyCheckin,
  type SafetyCheckinHandle,
} from "@/components/brand/SafetyCheckin";
import { RouteMap } from "@/components/brand/RouteMap";
import { PeakPanorama } from "@/components/brand/PeakPanorama";
import { PeakCameraOverlay } from "@/components/brand/PeakCameraOverlay";
import { FeatureTileDeck } from "@/components/brand/FeatureTileDeck";
import { ObjectRecognition } from "@/components/brand/ObjectRecognition";
import { SparkMountain } from "@/components/brand/SparkMountain";
import { SwisstopoMap } from "@/components/brand/SwisstopoMap";
import RouteTerrain3D from "@/components/brand/RouteTerrain3D";
import { fonts } from "@/constants/typography";
import { useApp, useThemeModeSafe } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useDownloads } from "@/contexts/DownloadContext";
import { useColors } from "@/hooks/useColors";
import { BackButton } from "@/components/brand/BackButton";
import { useHikeStrings } from "@/lib/i18n/screens/hike";
import { useMapStrings } from "@/lib/i18n/screens/map";
import { useObjectRecognitionStrings } from "@/lib/i18n/objectRecognition";
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  subscribeToBackgroundLocation,
} from "@/lib/backgroundLocation";
import {
  bboxAroundGeometry,
  bearingDeg,
  compassIndex,
  decodePolyline6,
  distanzZuSegmentKm,
  filterByRouteCorridor,
  fortschrittAufRoute,
  haversineKm,
} from "@/lib/geo";
import {
  computeRouteWaypoints,
  type RouteWaypoint,
} from "@/lib/routeWaypoints";
import { getRuntimeDiagnostics } from "@/lib/runtimeDiagnostics";
import {
  effectiveStoryLanguage,
  formatSpokenDistance,
  resolveLang,
  STORY_PACKS,
  trimForNarration,
  type Lang,
  type WetterKlasse,
} from "@/lib/storyContent";
import { getLocalizedSagaTitle } from "@/lib/sagaTitle";
import type { OfflinePanoramaDatenbank } from "@/lib/panorama";
import {
  isLocalTerrainModel,
  type LocalTerrainModel,
} from "@/lib/terrainModel";
import { blobToTempFileUri, getOfflineAudioUri } from "@/lib/narrationAudio";
import { getTurnAudio } from "@/lib/turnAudio";
import { getOfflinePoiDetail, getOfflinePoiStory } from "@/lib/offlinePois";
import * as FileSystem from "expo-file-system/legacy";
import { detectNavigationCues, NavigationCue } from "@/lib/navigationCues";
import {
  buildRouteGradeSegments,
  buildTerrainSections,
  calculateProfileAscentM,
  limitTerrainSectionsForSpeech,
  type TerrainProfilePoint,
} from "@/lib/terrainCues";
import { estimateRouteMinutes } from "@/lib/waypointEta";
import {
  enqueueNarrationItem,
  type NarrationKind,
  type NarrationQueueItem,
  type ReplaceableNarrationCategory,
} from "@/lib/narrationQueue";
import {
  bereiteAbbiegeMitteilungenVor,
  sendeAbbiegeMitteilung,
  sendePoiMitteilung,
} from "@/lib/turnNotifications";
import {
  clearWatchStatus,
  publishHikeLiveState,
  prepareWatchCompanion,
  sendWatchSos,
  sendWatchStatus,
  subscribeToCompanionEvents,
  type HikeLiveState,
  type WatchMapPoint,
  type WatchOffRoute,
  type WatchSafetyCheckin,
  type WatchPoiStory,
  type WatchWeather,
  type WatchNavigation,
  type WatchTerrainSection,
  type WatchUpcomingAttraction,
  type WatchUpcomingGradeChange,
  type WatchUpcomingSurfaceChange,
} from "@/lib/watchCompanion";
import { useVoiceDecision } from "@/lib/useVoiceDecision";
import {
  poiDisplayName,
  isPoiNameSpecific,
  POI_APPROACH_KINDS,
} from "@/lib/poiDisplay";
import {
  erkenneGipfel,
  PANORAMA_ROUTE_CORRIDOR_KM,
  selectPanoramaPeaks,
} from "@/lib/panorama";
import * as ImagePicker from "expo-image-picker";
import * as StoreReview from "expo-store-review";
import { useAuth } from "@clerk/expo";
import {
  uploadWaypointPhoto,
  waypointPhotoUrl,
} from "@/lib/waypointPhotoUpload";
import { HikeSession, LatLng, StoryChapter } from "@/types";
import { makeLogger } from "@/lib/debugLog";

const watchLiveStateLog = makeLogger("[WATCH-STATE]", "watch_state");
const watchPoiLog = makeLogger("[WATCH-POI]", "watch_poi");
const locationPermissionLog = makeLogger(
  "[LOCATION-PERM]",
  "location_permission",
);
const decisionFlowLog = makeLogger("[DECISION-FLOW]", "decision_flow");
const storyAudioLog = makeLogger("[STORY-AUDIO]", "story_audio");
const locationDiagnosticContext = () => ({
  ...getRuntimeDiagnostics(),
  appState: AppState.currentState,
});

const WEB_TOP = 67;
const COMPASS_GOLD = "#D8A84E";
const COMPASS_ANTIQUE_FONT = Platform.select({
  web: "Georgia, Times New Roman, serif",
  ios: "Georgia",
  android: "serif",
  default: "serif",
});

function createClientHikeId(): string {
  return `hike_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

type SpeakOptions = {
  interrupt?: boolean;
  allowDuringStartup?: boolean;
  chapterIndex?: number;
  useOpenAI?: boolean;
  preFetchedUri?: string;
  navInterrupt?: boolean;
  turnAudio?: "links" | "rechts";
  replaceQueuedCategory?: ReplaceableNarrationCategory;
  kind?: NarrationKind;
  displayTitle?: string;
  traceId?: string;
  audioRole?: "decision-prompt" | "decision-ack" | "decision-feedback";
};

type NowPlayingNarration = {
  kind: NarrationKind;
  label: string;
  title?: string;
  text: string;
  chapterIndex?: number;
};

type WatchDiscoveryAlert = {
  text: string;
  haptic: "notification" | "success";
  action?: "openPoiStory";
};

function geometryLengthKm(geometry: number[][] | null | undefined): number {
  if (!geometry || geometry.length < 2) return 0;
  let lengthKm = 0;
  for (let i = 1; i < geometry.length; i++) {
    lengthKm += haversineKm(
      { lat: geometry[i - 1][0], lng: geometry[i - 1][1] },
      { lat: geometry[i][0], lng: geometry[i][1] },
    );
  }
  return lengthKm;
}

function nearestAerialwayEndpoint(
  position: LatLng,
  aerialway: { id: string; geometry: number[][] },
): LatLng | null {
  const first = aerialway.geometry[0];
  const last = aerialway.geometry[aerialway.geometry.length - 1];
  if (!first || !last) return null;
  const firstPoint = { lat: first[0], lng: first[1] };
  const lastPoint = { lat: last[0], lng: last[1] };
  return haversineKm(position, firstPoint) <= haversineKm(position, lastPoint)
    ? firstPoint
    : lastPoint;
}

function createTimedSignal(parentSignal: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort();
  if (parentSignal.aborted) {
    controller.abort();
  } else {
    parentSignal.addEventListener("abort", abortFromParent, { once: true });
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      parentSignal.removeEventListener("abort", abortFromParent);
    },
  };
}

/**
 * Holt eine Fussweg-Geometrie. Valhalla bleibt der bevorzugte Router; der
 * zweite Dienst wird genutzt, wenn Valhalla im Netz nicht erreichbar ist.
 * Beide Antworten werden auf das app-interne [lat, lng]-Format vereinheitlicht.
 */
async function requestWalkingRoute(
  start: LatLng,
  end: LatLng,
  parentSignal: AbortSignal,
): Promise<number[][]> {
  let primaryError: unknown;
  const primary = createTimedSignal(parentSignal, 8000);
  try {
    const res = await fetch(VALHALLA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: [
          { lon: start.lng, lat: start.lat },
          { lon: end.lng, lat: end.lat },
        ],
        costing: "pedestrian",
        shape_format: "polyline6",
      }),
      signal: primary.signal,
    });
    if (!res.ok) throw new Error(`Valhalla HTTP ${res.status}`);
    const data = (await res.json()) as {
      trip?: { legs?: { shape?: string }[] };
    };
    const shape = data.trip?.legs?.[0]?.shape;
    if (!shape) throw new Error("Valhalla ohne Routengeometrie");
    return decodePolyline6(shape);
  } catch (error) {
    if ((error as Error).name === "AbortError" && parentSignal.aborted)
      throw error;
    primaryError = error;
  } finally {
    primary.cleanup();
  }

  const fallback = createTimedSignal(parentSignal, 15000);
  try {
    const coordinates = `${start.lng},${start.lat};${end.lng},${end.lat}`;
    const url =
      `${OSM_FOOT_ROUTER_URL}/${coordinates}` +
      "?overview=full&geometries=geojson&steps=false";
    const res = await fetch(url, { signal: fallback.signal });
    if (!res.ok) throw new Error(`OSM-Fussweg-Router HTTP ${res.status}`);
    const data = (await res.json()) as {
      routes?: { geometry?: { coordinates?: unknown } }[];
    };
    const rawCoordinates = data.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(rawCoordinates))
      throw new Error("OSM-Router ohne Routengeometrie");
    const geometry = rawCoordinates
      .filter(
        (point): point is [number, number] =>
          Array.isArray(point) &&
          point.length >= 2 &&
          Number.isFinite(point[0]) &&
          Number.isFinite(point[1]),
      )
      .map(([lng, lat]) => [lat, lng]);
    if (geometry.length < 2)
      throw new Error("OSM-Router mit zu kurzer Geometrie");
    return geometry;
  } catch (error) {
    if ((error as Error).name === "AbortError" && parentSignal.aborted)
      throw error;
    throw new Error(
      `Keine Fusswegroute verfuegbar (primaer: ${String(primaryError)}, fallback: ${String(error)})`,
    );
  } finally {
    fallback.cleanup();
  }
}

// Lokalisierte Wochentagnamen für die Partner-Öffnungszeiten-Anzeige.
const PARTNER_WOCHENTAGE: Record<string, Record<string, string>> = {
  de: {
    montag: "Montag",
    dienstag: "Dienstag",
    mittwoch: "Mittwoch",
    donnerstag: "Donnerstag",
    freitag: "Freitag",
    samstag: "Samstag",
    sonntag: "Sonntag",
  },
  gsw: {
    montag: "Mäntig",
    dienstag: "Zischtig",
    mittwoch: "Mittwuch",
    donnerstag: "Dunschtig",
    freitag: "Friitig",
    samstag: "Samschtig",
    sonntag: "Sunntig",
  },
  en: {
    montag: "Monday",
    dienstag: "Tuesday",
    mittwoch: "Wednesday",
    donnerstag: "Thursday",
    freitag: "Friday",
    samstag: "Saturday",
    sonntag: "Sunday",
  },
  fr: {
    montag: "lundi",
    dienstag: "mardi",
    mittwoch: "mercredi",
    donnerstag: "jeudi",
    freitag: "vendredi",
    samstag: "samedi",
    sonntag: "dimanche",
  },
  it: {
    montag: "lunedì",
    dienstag: "martedì",
    mittwoch: "mercoledì",
    donnerstag: "giovedì",
    freitag: "venerdì",
    samstag: "sabato",
    sonntag: "domenica",
  },
  es: {
    montag: "lunes",
    dienstag: "martes",
    mittwoch: "miércoles",
    donnerstag: "jueves",
    freitag: "viernes",
    samstag: "sábado",
    sonntag: "domingo",
  },
  pt: {
    montag: "segunda",
    dienstag: "terça",
    mittwoch: "quarta",
    donnerstag: "quinta",
    freitag: "sexta",
    samstag: "sábado",
    sonntag: "domingo",
  },
  zh: {
    montag: "周一",
    dienstag: "周二",
    mittwoch: "周三",
    donnerstag: "周四",
    freitag: "周五",
    samstag: "周六",
    sonntag: "周日",
  },
  ru: {
    montag: "понедельник",
    dienstag: "вторник",
    mittwoch: "среда",
    donnerstag: "четверг",
    freitag: "пятница",
    samstag: "суббота",
    sonntag: "воскресенье",
  },
};

type HikeOeffnungsStrings = {
  partnerSchliesstUm: string;
  partnerOeffnetUm: string;
  partnerOeffnetAm: string;
  partnerHeute: string;
  partnerMorgen: string;
  partnerUhr: string;
};

function formatPartnerOeffnungsInfo(
  partner: {
    istOffen?: boolean | null;
    schliesstUm?: string | null;
    oeffnetAmTag?: string | null;
    oeffnetUm?: string | null;
  },
  t: HikeOeffnungsStrings,
  lang: string,
): string | null {
  const uhrSuffix = t.partnerUhr ? " " + t.partnerUhr : "";
  if (partner.istOffen && partner.schliesstUm) {
    return `${t.partnerSchliesstUm} ${partner.schliesstUm}${uhrSuffix}`;
  }
  if (!partner.istOffen && partner.oeffnetAmTag && partner.oeffnetUm) {
    const tag = partner.oeffnetAmTag;
    const uhr = partner.oeffnetUm;
    if (tag === "heute")
      return `${t.partnerOeffnetUm} ${t.partnerHeute} ${uhr}${uhrSuffix}`;
    if (tag === "morgen")
      return `${t.partnerOeffnetUm} ${t.partnerMorgen} ${uhr}${uhrSuffix}`;
    const tagName =
      PARTNER_WOCHENTAGE[lang]?.[tag] ?? PARTNER_WOCHENTAGE["de"]?.[tag] ?? tag;
    return `${t.partnerOeffnetAm} ${tagName} ${uhr}${uhrSuffix}`;
  }
  return null;
}

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];
const PARTNER_KATEGORIE: Record<
  string,
  { icon: FeatherIconName; label: string }
> = {
  restaurant: { icon: "coffee", label: "Restaurant" },
  cafe: { icon: "coffee", label: "Café" },
  bar: { icon: "music", label: "Bar" },
  hotel: { icon: "home", label: "Hotel" },
  uebernachtung: { icon: "home", label: "Hotel" },
  shop: { icon: "shopping-bag", label: "Shop" },
};
const PARTNER_KAT_DEFAULT: { icon: FeatherIconName; label: string } = {
  icon: "coffee",
  label: "Partnerbetrieb",
};

/** Minimaler Zeitabstand zwischen zwei geloggten Track-Punkten (ms). */
const TRACK_LOG_INTERVAL_MS = 8000;
// Die Expo-Magnetometerachsen liefern in der verwendeten Portrait-Konvention
// eine gespiegelte Drehrichtung und den Gegenkurs zur geografischen
// Blickrichtung. Invertierung und Offset bleiben zentral, damit CompassCard,
// Panorama und AR dieselbe Nordreferenz verwenden.
const COMPASS_HEADING_OFFSET_DEG = 180;

/** Abstand in km ab dem eine Warnung "vom Weg abgekommen" ausgeloest wird. */
const OFF_ROUTE_THRESHOLD_KM = 0.08;
/** Abstand in km ab dem die Warnung automatisch wieder erlischt. */
const OFF_ROUTE_RECOVER_KM = 0.04;
/** Abstand zum offiziellen Wegstart, ab dem beim Wanderungsbeginn eine Auswahl erscheint. */
const START_NEARBY_KM = 0.1;
/** Das letzte Kapitel soll kurz vor dem Routenende beginnen, nicht erst ganz am Schluss. */
const STORY_FINAL_CHAPTER_PROGRESS = 0.95;
/** Anzahl aufeinanderfolgender GPS-Fixes, die ueberschritten sein muessen, bevor gewarnt wird. */
const OFF_ROUTE_CONFIRM_FIXES = 3;
/** Eigene Statusfarbe fuer ein gueltiges Live-GPS-Signal — nicht mit dem roten Markenakzent vermischen. */
const GPS_LIVE_COLOR = "#00E676";
/** Ein realer GPS-Fix gilt drei Minuten lang als live. */
const GPS_FRESHNESS_WINDOW_MS = 3 * 60 * 1000;
/** Valhalla-Fussweg-Routing (FOSSGIS, kein API-Key noetig). */
const VALHALLA_URL = "https://valhalla1.openstreetmap.de/route";
/** Fallback: routing.openstreetmap.de stellt ein direktes Fusswegprofil bereit. */
const OSM_FOOT_ROUTER_URL =
  "https://routing.openstreetmap.de/routed-foot/route/v1/driving";
/** RDP-Epsilon in Grad (≈ 8 m bei Schweizer Breitengraden). */
const RDP_EPSILON = 0.00007;
/** Mindestanzahl Punkte damit der Live-Track statt der Routen-Geometrie verwendet wird.
 *  Bewusst niedrig: auch bei vorzeitigem Abbruch oder Routenaenderung soll die
 *  Share-Karte die TATSAECHLICH gelaufene Strecke zeigen, nicht die geplante. */
const MIN_TRACK_POINTS = 2;

function estimateSunsetEpochMs(
  lat: number,
  lng: number,
  date: Date,
): number | null {
  const day = Math.floor(
    (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      Date.UTC(date.getUTCFullYear(), 0, 0)) /
      86_400_000,
  );
  const lngHour = lng / 15;
  const t = day + (18 - lngHour) / 24;
  const rad = Math.PI / 180;
  const mod360 = (value: number) => ((value % 360) + 360) % 360;
  const meanAnomaly = 0.9856 * t - 3.289;
  const longitude = mod360(
    meanAnomaly +
      1.916 * Math.sin(meanAnomaly * rad) +
      0.02 * Math.sin(2 * meanAnomaly * rad) +
      282.634,
  );
  let rightAscension = Math.atan(0.91764 * Math.tan(longitude * rad)) / rad;
  rightAscension = mod360(rightAscension);
  rightAscension +=
    90 * Math.floor(longitude / 90) - 90 * Math.floor(rightAscension / 90);
  rightAscension /= 15;
  const declinationSin = 0.39782 * Math.sin(longitude * rad);
  const declinationCos = Math.cos(Math.asin(declinationSin));
  const cosHourAngle =
    (Math.cos(90.833 * rad) - declinationSin * Math.sin(lat * rad)) /
    (declinationCos * Math.cos(lat * rad));
  if (cosHourAngle > 1 || cosHourAngle < -1) return null;
  const hourAngle = Math.acos(cosHourAngle) / rad / 15;
  const localMeanTime = hourAngle + rightAscension - 0.06571 * t - 6.622;
  const utcHour = (((localMeanTime - lngHour) % 24) + 24) % 24;
  return (
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) +
    utcHour * 3_600_000
  );
}

/** Senkrechter Abstand eines Punkts von der Gerade start→end (in Grad). */
function rdpPerpendicularDist(
  p: [number, number],
  start: [number, number],
  end: [number, number],
): number {
  const [x, y] = p;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = Math.max(
    0,
    Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)),
  );
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Ramer-Douglas-Peucker — iterativ um Stack-Overflow bei langen Tracks zu vermeiden. */
function rdpThin(
  points: [number, number][],
  epsilon: number,
): [number, number][] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length).fill(1);
  // Stapel aus [startIdx, endIdx]-Paaren
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [si, ei] = stack.pop()!;
    if (ei - si < 2) continue;
    let maxDist = 0;
    let maxIdx = si;
    for (let i = si + 1; i < ei; i++) {
      if (!keep[i]) continue;
      const d = rdpPerpendicularDist(points[i], points[si], points[ei]);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxDist > epsilon) {
      stack.push([si, maxIdx], [maxIdx, ei]);
    } else {
      for (let i = si + 1; i < ei; i++) keep[i] = 0;
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * Erzeugt einen 2-Sekunden-WAV-Keepalive als Base64-String (8-bit, mono, 8 kHz)
 * mit einem 80-Hz-Ton. 80 Hz liegt innerhalb des SBC-Codec-Durchlassbereichs
 * (SBC schneidet typisch bei < 20 Hz ab) und ist fuer Menschen praktisch
 * unhoerbar bei der verwendeten Amplitude. Viele Auto-Radios (A2DP) erkennen
 * digitale Stille (alle Samples = 128) als "nichts spielt" und deaktivieren
 * den Stream; ein echtes Audiosignal haelt den A2DP-Stream aktiv.
 * Wird als Loop bei sehr niedrigem volume abgespielt — nur so viel, dass echte
 * PCM-Werte den Codec erreichen, ohne Lautstaerke wahrzunehmen.
 */
function buildKeepaliveWavBase64(): string {
  const sampleRate = 8000;
  const numSamples = sampleRate * 2; // 2 Sekunden (reduziert Loop-Frequenz)
  const dataSize = numSamples; // 8-bit mono = 1 Byte/Sample
  const buf = new Uint8Array(44 + dataSize);
  const u16 = (off: number, v: number) => {
    buf[off] = v & 0xff;
    buf[off + 1] = (v >> 8) & 0xff;
  };
  const u32 = (off: number, v: number) => {
    buf[off] = v & 0xff;
    buf[off + 1] = (v >> 8) & 0xff;
    buf[off + 2] = (v >> 16) & 0xff;
    buf[off + 3] = (v >> 24) & 0xff;
  };
  buf.set([82, 73, 70, 70]);
  u32(4, 36 + dataSize);
  buf.set([87, 65, 86, 69], 8);
  buf.set([102, 109, 116, 32], 12);
  u32(16, 16);
  u16(20, 1);
  u16(22, 1);
  u32(24, sampleRate);
  u32(28, sampleRate);
  u16(32, 1);
  u16(34, 8);
  buf.set([100, 97, 116, 97], 36);
  u32(40, dataSize);
  // 80-Hz-Sinus: Period = 100 Samples bei 8 kHz.
  // Amplitude 12 (von max. 127) → mit volume:0.015 ergibt das < 0.1 %
  // des Vollausschlags — absolut unhoerbar, aber der Bluetooth-SBC-Encoder
  // sieht nicht-triviale PCM-Werte und haelt den A2DP-Stream aktiv.
  const freq = 80; // Hz — SBC-Codec-sicher (10 Hz wurde von manchen Encodern gefiltert)
  const amp = 12; // 0..127 — bei volume:0.015 absolut unhoerbar, aber nicht-stille PCM-Werte
  for (let i = 0; i < numSamples; i++) {
    buf[44 + i] =
      128 + Math.round(amp * Math.sin((2 * Math.PI * freq * i) / sampleRate));
  }
  let s = "";
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return typeof btoa !== "undefined"
    ? btoa(s)
    : Buffer.from(buf).toString("base64");
}

type LocState = "idle" | "granted" | "denied";

const SAFETY_POI_CATEGORIES = [
  { category: "toilet", code: "TO" },
  { category: "pharmacy", code: "PH" },
  { category: "hospital", code: "H" },
  { category: "clinic", code: "CL" },
  { category: "police", code: "P" },
  { category: "fire", code: "F" },
  { category: "defibrillator", code: "DE" },
  { category: "assembly_point", code: "A" },
  { category: "emergency_phone", code: "!" },
  { category: "shelter", code: "S" },
] as const;

type SafetyPoiCategory = (typeof SAFETY_POI_CATEGORIES)[number]["category"];

const DEFAULT_SAFETY_POI_FILTERS = Object.fromEntries(
  SAFETY_POI_CATEGORIES.map(({ category }) => [category, true]),
) as Record<SafetyPoiCategory, boolean>;

function smoothCompassHeading(
  previous: number | null,
  next: number,
  factor = 0.2,
): number {
  if (previous == null) return next;
  // Den kürzesten Weg über den 0°/360°-Übergang nehmen, damit die Anzeige
  // nicht einmal quer über das Zifferblatt springt.
  const delta = ((next - previous + 540) % 360) - 180;
  return (previous + delta * factor + 360) % 360;
}

type CompassVector = { x: number; y: number; z: number };

function compassVectorLength(vector: CompassVector): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

/**
 * Reduces the magnetometer to the horizontal plane before calculating the
 * azimuth. A plain x/y atan2 becomes very noisy as soon as the phone is held
 * upright, because gravity then changes which part of the magnetic field is
 * visible on the x/y axes.
 *
 * The -90° offset preserves the portrait convention used by the previous
 * compass card: a positive y magnetic vector represents north.
 */
function tiltCompensatedCompassHeading(
  magnetic: CompassVector,
  gravity: CompassVector,
): number | null {
  const gravityLength = compassVectorLength(gravity);
  const magneticLength = compassVectorLength(magnetic);
  if (
    !Number.isFinite(gravityLength) ||
    !Number.isFinite(magneticLength) ||
    gravityLength < 6 ||
    gravityLength > 14 ||
    magneticLength < 10 ||
    magneticLength > 120
  ) {
    return null;
  }

  const gx = gravity.x / gravityLength;
  const gy = gravity.y / gravityLength;
  const gz = gravity.z / gravityLength;

  // Standard tilt compensation for the device coordinate system. The
  // magnetometer is projected onto the plane perpendicular to gravity, so
  // portrait tilt no longer turns into a fake compass rotation.
  const pitch = Math.asin(Math.max(-1, Math.min(1, -gx)));
  const roll = Math.atan2(gy, gz);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const cosRoll = Math.cos(roll);
  const sinRoll = Math.sin(roll);
  const horizontalX = magnetic.x * cosPitch + magnetic.z * sinPitch;
  const horizontalY =
    magnetic.x * sinRoll * sinPitch +
    magnetic.y * cosRoll -
    magnetic.z * sinRoll * cosPitch;

  if (!Number.isFinite(horizontalX) || !Number.isFinite(horizontalY)) {
    return null;
  }

  const rawHeading =
    (Math.atan2(horizontalY, horizontalX) * 180) / Math.PI - 90;
  return (COMPASS_HEADING_OFFSET_DEG - rawHeading + 360) % 360;
}

function circularMeanHeading(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let sine = 0;
  let cosine = 0;
  for (const value of values) {
    const radians = (value * Math.PI) / 180;
    sine += Math.sin(radians);
    cosine += Math.cos(radians);
  }
  if (Math.hypot(sine, cosine) < 0.001) return null;
  return ((Math.atan2(sine, cosine) * 180) / Math.PI + 360) % 360;
}

const AUDIO_WAVE_HEIGHTS = [10, 20, 14, 28, 18, 24, 12, 22, 16];

function AudioWaveBar({
  color,
  height,
  delay,
}: {
  color: string;
  height: number;
  delay: number;
}) {
  const progress = useSharedValue(0.35);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 420 + delay }),
        withTiming(0.3, { duration: 520 + delay }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: progress.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.audioWaveBar,
        { backgroundColor: color, height },
        animatedStyle,
      ]}
    />
  );
}

function AudioWaveform({ color }: { color: string }) {
  return (
    <View
      style={styles.audioWaveform}
      accessibilityLabel="Audio wird abgespielt"
    >
      {AUDIO_WAVE_HEIGHTS.map((height, index) => (
        <AudioWaveBar
          key={`${height}-${index}`}
          color={color}
          height={height}
          delay={index * 55}
        />
      ))}
    </View>
  );
}

export default function LiveHike() {
  const colors = useColors();
  const themeMode = useThemeModeSafe();
  // POI-Infokacheln liegen ueber duesteren Karten/Bildern — im Hellmodus
  // fast deckendes Weiss statt Milchglas, sonst wirken sie zu dunkel.
  const poiOverlay =
    themeMode === "hell" ? "rgba(255,255,255,0.94)" : undefined;
  const t = useHikeStrings();
  const mapT = useMapStrings();
  const objectRecognitionT = useObjectRecognitionStrings();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, routeId, resume } = useLocalSearchParams<{
    id: string;
    routeId?: string;
    resume?: string;
  }>();
  const isResume = resume === "1";
  const { getToken: clerkGetToken } = useAuth();
  const getTokenRef = React.useRef(clerkGetToken);
  getTokenRef.current = clerkGetToken;
  const getSafetyAuthToken = useCallback(() => getTokenRef.current(), []);
  const confirmInterruptHike = useCallback(() => {
    alert(t.interruptHikeConfirmTitle, t.interruptHikeConfirmMessage, [
      { text: t.interruptHikeCancelAction, style: "cancel" },
      { text: t.interruptHikeConfirmAction, onPress: () => router.back() },
    ]);
  }, [router, t]);
  const {
    profile,
    emergencyContact,
    premium,
    freeHikeUsed,
    markFreeHikeUsed,
    saveHike,
    addAchievement,
    groupSession,
    setGroupActivity,
    sendGroupHikeEvent,
    groupHikeEvent,
    energiesparmodus,
    activeHike,
    saveActiveHike,
    clearActiveHike,
    hikeHistory,
  } = useApp();

  // Beim ersten Aufbau der Story einmalig pruefen, ob eine unterbrochene
  // Wanderung derselben Sage fortgesetzt wird — dann ab dem gespeicherten
  // Kapitel weitererzaehlen statt wieder bei Kapitel 1 zu beginnen.
  const resumeIndexRef = useRef<number | null>(
    isResume && activeHike && activeHike.sagaId === id
      ? activeHike.chapterIndex
      : null,
  );

  // Wenn dieselbe Sage auf einer anderen Route neu gestartet wird (kein Resume),
  // den alten activeHike-Eintrag loeschen — er wuerde sonst eine veraltete Route
  // im "Weiter wandern"-Banner anzeigen.
  useEffect(() => {
    if (
      !isResume &&
      activeHike?.sagaId === id &&
      routeId != null &&
      activeHike.routeId !== routeId
    ) {
      clearActiveHike();
    }
    // Nur einmalig beim Mount ausfuehren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Beim Fortsetzen nach Absturz/Neustart: die mitpersistierte Route aus dem
  // gespeicherten Wanderstand — Routen sind online-only, der Katalog ist nach
  // einem Kaltstart also oft (noch) leer.
  const resumeRouteRef = useRef<HikingRoute | null>(
    isResume && activeHike && activeHike.sagaId === id
      ? (activeHike.route ?? null)
      : null,
  );
  const clientHikeIdRef = useRef<string | null>(null);
  // Bleibt über alle Diagnoseereignisse dieser Screen-Instanz konstant.
  // Zusammen mit clientHikeId unterscheidet das Remounts von normalen
  // Re-Renders und von einer fortgesetzten Wanderung.
  const hikeDebugInstanceIdRef = useRef<string>(createClientHikeId());
  const groupHikeStartedRef = useRef(false);
  const groupHikeFinishedRef = useRef(false);
  const ensureClientHikeId = useCallback(() => {
    if (clientHikeIdRef.current) return clientHikeIdRef.current;
    const persistedId =
      isResume && activeHike?.sagaId === id
        ? activeHike.clientHikeId?.trim()
        : undefined;
    clientHikeIdRef.current = persistedId || createClientHikeId();
    return clientHikeIdRef.current;
  }, [activeHike?.clientHikeId, activeHike?.sagaId, id, isResume]);
  const { getSaga, getRoute, getRouteBySaga, loadCantonRoutes } = useCatalog();
  const {
    resolveStory,
    loadOfflineTiles,
    loadOfflinePois,
    loadOfflinePanorama,
    loadOfflineSafety,
    isDownloaded,
    getRecord,
  } = useDownloads();

  const offlineRecord = getRecord(id);
  const saga = getSaga(id) ?? offlineRecord?.sagaSnapshot;
  // Die konkret gewaehlte Route (mit Wegverlauf) hat Vorrang; nur wenn keine
  // Route-Id durchgereicht wurde (z. B. Start aus der Sammlung), wird ueber die
  // Sage die naechste bekannte Route gesucht. Als letzter Rueckhalt dient die
  // im unterbrochenen Wanderstand mitgespeicherte Route.
  const route =
    getRoute(routeId) ??
    getRouteBySaga(id) ??
    resumeRouteRef.current ??
    (routeId
      ? getRecord(routeId)?.routeSnapshot
      : offlineRecord?.routeSnapshot) ??
    undefined;

  // Wurde eine konkrete routeId uebergeben, ist die Route aber (noch) nicht im
  // Katalog-Cache (z. B. Direktstart ohne vorherige Kantonssuche, oder nach
  // App-Neustart), fehlt der eigentliche Wegverlauf komplett. Der
  // Kartenmittelpunkt faellt dann auf die Sagen-Koordinate zurueck, die vom
  // tatsaechlichen Wegverlauf oft mehrere hundert Meter entfernt liegt — die
  // enge 0,5-km-Box fuer POIs faende dort faelschlich nichts. Deshalb wird die
  // Route bei Bedarf einmalig ueber die Kantonssuche nachgeladen.
  useEffect(() => {
    if (!routeId || getRoute(routeId) || !saga) return;
    loadCantonRoutes(saga.canton).catch(() => {
      // Best effort — schlaegt das Nachladen fehl, bleibt der bisherige
      // Rueckfall (Sagen-Koordinate) bestehen.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, saga?.canton]);

  // Nach dem Akzeptieren einer Umleitung ist die zusammengesetzte Geometrie
  // die aktive Wanderroute: zuerst der Zubringer, danach der verbleibende
  // Originalweg. Damit werden auch Routenfortschritt und Kapitel auf genau
  // diese neue Route verteilt.
  const [acceptedRouteGeometry, setAcceptedRouteGeometry] = useState<
    number[][] | null
  >(() => {
    const savedGeometry =
      isResume && activeHike?.sagaId === id ? activeHike.activeGeometry : null;
    return savedGeometry && savedGeometry.length > 1 ? savedGeometry : null;
  });
  // Der Context kann den gespeicherten Hike beim ersten Render noch laden.
  // Eine bereits akzeptierte Umleitung darf dann nachtraeglich als aktive
  // Geometrie uebernommen werden, aber nie eine laufende neue Route ersetzen.
  useEffect(() => {
    if (
      acceptedRouteGeometry ||
      !isResume ||
      activeHike?.sagaId !== id ||
      !activeHike.activeGeometry ||
      activeHike.activeGeometry.length < 2
    ) {
      return;
    }
    setAcceptedRouteGeometry(activeHike.activeGeometry);
  }, [acceptedRouteGeometry, activeHike, id, isResume]);
  const navigationGeometry = acceptedRouteGeometry ?? route?.geometry;
  const watchSunsetAtEpochMs = useMemo(() => {
    const coordinates = route?.coordinates;
    if (!coordinates) return null;
    return estimateSunsetEpochMs(coordinates.lat, coordinates.lng, new Date());
  }, [route?.coordinates]);
  const watchMapRoute = useMemo<WatchMapPoint[] | null>(() => {
    if (!navigationGeometry || navigationGeometry.length < 2) return null;
    const maxPoints = 100;
    const lastIndex = navigationGeometry.length - 1;
    const sampleCount = Math.min(maxPoints, navigationGeometry.length);
    return Array.from({ length: sampleCount }, (_, index) => {
      const sourceIndex = Math.min(
        lastIndex,
        Math.round((index * lastIndex) / Math.max(1, sampleCount - 1)),
      );
      const [lat, lng] = navigationGeometry[sourceIndex];
      return { lat, lng };
    });
  }, [navigationGeometry]);
  // Kennwerte der Route (mit sinnvollen Rueckfallwerten)
  const rawTotalKm = acceptedRouteGeometry
    ? geometryLengthKm(acceptedRouteGeometry)
    : (route?.distanceKm ?? 6.4);
  const totalKm =
    Number.isFinite(rawTotalKm) && rawTotalKm > 0
      ? Math.max(0.01, rawTotalKm)
      : 6.4;
  const [terrainProfile, setTerrainProfile] = useState<
    TerrainProfilePoint[] | null
  >(null);
  const [terrainProfileGeometry, setTerrainProfileGeometry] = useState<
    number[][] | null
  >(null);
  const activeProfileReady =
    !!acceptedRouteGeometry &&
    terrainProfileGeometry === navigationGeometry &&
    !!terrainProfile &&
    terrainProfile.length >= 2;
  const watchMapRouteWithGrades = useMemo<WatchMapPoint[] | null>(() => {
    if (
      !watchMapRoute ||
      !navigationGeometry ||
      navigationGeometry.length < 2 ||
      !activeProfileReady ||
      !terrainProfile ||
      terrainProfile.length < 2
    ) {
      return watchMapRoute;
    }
    const gradeSegments = buildRouteGradeSegments(
      navigationGeometry,
      terrainProfile,
    );
    if (gradeSegments.length === 0) return watchMapRoute;

    const routeDistances = [0];
    for (let index = 1; index < navigationGeometry.length; index++) {
      routeDistances.push(
        routeDistances[index - 1] +
          haversineKm(
            {
              lat: navigationGeometry[index - 1][0],
              lng: navigationGeometry[index - 1][1],
            },
            {
              lat: navigationGeometry[index][0],
              lng: navigationGeometry[index][1],
            },
          ),
      );
    }
    const segmentEnds: number[] = [];
    let segmentDistance = 0;
    for (const segment of gradeSegments) {
      const [start, end] = segment.coordinates;
      if (!start || !end) continue;
      segmentDistance += haversineKm(
        { lat: start[0], lng: start[1] },
        { lat: end[0], lng: end[1] },
      );
      segmentEnds.push(segmentDistance);
    }
    if (segmentEnds.length === 0) return watchMapRoute;

    const lastIndex = navigationGeometry.length - 1;
    return watchMapRoute.map((point, index) => {
      const sourceIndex = Math.min(
        lastIndex,
        Math.round((index * lastIndex) / Math.max(1, watchMapRoute.length - 1)),
      );
      const routeDistance = routeDistances[sourceIndex] ?? 0;
      const matchingSegment = segmentEnds.findIndex(
        (end) => routeDistance <= end + 0.000001,
      );
      const segmentIndex =
        matchingSegment >= 0 ? matchingSegment : gradeSegments.length - 1;
      return {
        ...point,
        gradeBand: gradeSegments[segmentIndex]?.band ?? "green",
      };
    });
  }, [activeProfileReady, navigationGeometry, terrainProfile, watchMapRoute]);
  const rawAscentM = activeProfileReady
    ? calculateProfileAscentM(terrainProfile)
    : (route?.ascentM ?? 480);
  const ascentM =
    Number.isFinite(rawAscentM) && rawAscentM >= 0 ? rawAscentM : 0;
  const allTerrainSections = useMemo(
    () => buildTerrainSections(terrainProfile),
    [terrainProfile],
  );
  const terrainSections = useMemo(
    () => limitTerrainSectionsForSpeech(allTerrainSections),
    [allTerrainSections],
  );
  const rawTotalMin = activeProfileReady
    ? estimateRouteMinutes(totalKm, ascentM)
    : (route?.minutes ?? 165);
  const totalMin =
    Number.isFinite(rawTotalMin) && rawTotalMin >= 0 ? rawTotalMin : 0;
  const sac = route?.sac ?? "T3";
  // Einmalig beim Mount gesetzt — aendert sich danach nicht mehr, um einen
  // sichtbaren Kartensprung zu vermeiden, wenn die Route kurz nach der Saga
  // asynchron aus dem Katalog nachgeladen wird.
  const [mapCenter] = useState<LatLng | null>(
    () => route?.coordinates ?? saga?.coordinates ?? null,
  );

  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [preparing, setPreparing] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const narrationLabel = useCallback(
    (kind: NarrationKind): string => {
      switch (kind) {
        case "introduction":
          return t.preparingText;
        case "poi":
          return t.poiNearby;
        case "decisionPrompt":
          return t.perception;
        case "feedback":
          return t.perception;
        case "navigation":
          return t.turnNotifTitle;
        case "partner":
          return t.partnerDetailEyebrow;
        case "terrain":
          return t.terrainWarningTitle;
        case "surface":
          return t.surfaceChangeTitle;
        case "walkToStart":
          return t.walkToStartTitle;
        case "chapter":
        default:
          return t.chapterMark(currentIndex + 1, chapters.length);
      }
    },
    [chapters.length, currentIndex, t],
  );
  const [awaitingDecision, setAwaitingDecision] = useState(false);
  const [decisionFeedbackPending, setDecisionFeedbackPending] = useState(false);
  const decisionFeedbackPendingRef = useRef(false);
  const setDecisionFeedbackPendingNow = useCallback((pending: boolean) => {
    decisionFeedbackPendingRef.current = pending;
    setDecisionFeedbackPending(pending);
  }, []);
  /** Ref-Spiegel fuer awaitingDecision — erlaubt Zugriff aus asynchronen
   *  Audio-Callbacks (speak/didJustFinish, Meilenstein-Fetch) ohne Closure-
   *  Veraltung. Wird unmittelbar nach dem useState-Setter auf dem Render-Pfad
   *  gesetzt, sodass er immer den aktuellen Wert traegt. */
  const awaitingDecisionRef = useRef(false);
  awaitingDecisionRef.current = awaitingDecision;
  const [isOffline, setIsOffline] = useState<boolean>(false);
  /** GPS-Position zum Zeitpunkt der Off-Route-Erkennung — treibt die Neuberechnung. */
  const [offRoutePos, setOffRoutePos] = useState<LatLng | null>(null);
  const watchOffRoute = useMemo<WatchOffRoute | null>(() => {
    if (!offRoutePos || !navigationGeometry || navigationGeometry.length < 2)
      return null;
    const projection = fortschrittAufRoute(offRoutePos, navigationGeometry);
    if (!projection) return null;
    const targetIndex = Math.min(
      navigationGeometry.length - 1,
      Math.max(
        1,
        Math.round(projection.fraction * (navigationGeometry.length - 1)),
      ),
    );
    const target = navigationGeometry[targetIndex];
    return {
      distanceM: Math.round(projection.distKm * 1000),
      bearingToRouteDeg: target
        ? bearingDeg(offRoutePos, { lat: target[0], lng: target[1] })
        : null,
    };
  }, [navigationGeometry, offRoutePos]);
  /** Neuberechnete Alternativroute von Valhalla (gestrichelte Linie auf der Karte). */
  const [recalcGeom, setRecalcGeom] = useState<number[][] | null>(null);
  /** true waehrend die Valhalla-Anfrage laeuft. */
  const [isRecalculating, setIsRecalculating] = useState(false);
  /** true wenn Valhalla nicht erreichbar war. */
  const [recalcFailed, setRecalcFailed] = useState(false);
  /** true wenn der Nutzer "Dieser Route folgen" getippt hat. */
  const [followingRecalc, setFollowingRecalc] = useState(false);
  /** Anteil (0..1) der Originalroute, an dem die Neuberechnung wieder einmuendet. */
  const [recalcRejoinFraction, setRecalcRejoinFraction] = useState<
    number | null
  >(null);
  const [routeChangeOpen, setRouteChangeOpen] = useState(false);
  const [routeChangePickerOpen, setRouteChangePickerOpen] = useState(false);
  const [routeChangeLoading, setRouteChangeLoading] = useState(false);
  const [routeChangeError, setRouteChangeError] = useState(false);
  const routeChangeAbortRef = useRef<AbortController | null>(null);
  // Der Storystart ist nicht an den offiziellen Routenpunkt gebunden. Das
  // Audio darf nach dem Story-Load beginnen; startReached bleibt davon
  // getrennt und wird nur durch echte GPS-Nähe zum Routenstart gesetzt.
  const [startReached, setStartReached] = useState(false);
  /** Verhindert, dass die Startauswahl bei jedem GPS-Render erneut erscheint. */
  const startRecalcChoiceShownRef = useRef(false);
  const [startRecalcChoice, setStartRecalcChoice] = useState<
    "start" | "fastest" | null
  >(null);
  const [startChoicePending, setStartChoicePending] = useState(false);
  const startChoicePendingRef = useRef(false);
  const startChoiceHandledRef = useRef(false);
  // Jeder Einstieg bleibt bis zur GPS-basierten Startentscheidung komplett
  // stumm — auch ein Resume über den "Weiter wandern"-Button.
  const [startGateConfirmed, setStartGateConfirmed] = useState(false);
  const startGateConfirmedRef = useRef(false);
  const startGateShownRef = useRef(false);
  const startTimeRef = useRef<number>(isResume ? Date.now() : 0);
  const [startAudioReleased, setStartAudioReleased] = useState(false);
  const startAudioReleasedRef = useRef(false);
  const autoFollowRecalcStartedRef = useRef(false);
  const releaseStartAudio = useCallback(() => {
    startAudioReleasedRef.current = true;
    setStartAudioReleased(true);
  }, []);
  const confirmStartAtTrailhead = useCallback(() => {
    // Mitglieder dürfen erst starten, nachdem der Server den verbindlichen
    // Start der Leitung mit Sage und Route geliefert hat. So kann niemand
    // versehentlich dieselbe Gruppe auf einer anderen Sage beginnen.
    if (
      groupSession &&
      !groupSession.isLeader &&
      groupHikeEvent?.event.kind !== "start"
    ) {
      startGateShownRef.current = false;
      return;
    }
    if (!isResume || startTimeRef.current === 0) {
      startTimeRef.current = Date.now();
    }
    startGateConfirmedRef.current = true;
    startGateShownRef.current = true;
    startChoiceHandledRef.current = true;
    startChoicePendingRef.current = false;
    setStartGateConfirmed(true);
    setStartChoicePending(false);
    setStartRecalcChoice(null);
    setStartReached(true);
    setOffRoutePos(null);
    releaseStartAudio();
  }, [groupHikeEvent, groupSession, isResume, releaseStartAudio]);
  const chooseStartRoute = useCallback(
    (mode: "start" | "fastest", position: LatLng) => {
      startChoicePendingRef.current = true;
      autoFollowRecalcStartedRef.current = false;
      setStartChoicePending(true);
      setStartRecalcChoice(mode);
      setOffRoutePos(position);
    },
    [],
  );

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.addEventListener !== "function"
    )
      return;
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Valhalla-Neuberechnung: laeuft immer wenn offRoutePos sich aendert.
  // Bei null (wieder auf der Route): alle Off-Route-States zuruecksetzen —
  // AUSSER wenn der Nutzer gerade "Dieser Route folgen" akzeptiert hat
  // (followingRecalcRef), dann bleibt recalcGeom als Hauptroute erhalten.
  useEffect(() => {
    if (!offRoutePos) {
      setStartRecalcChoice(null);
      startRecalcChoiceShownRef.current = false;
      if (!followingRecalcRef.current) {
        setRecalcGeom(null);
        setRecalcRejoinFraction(null);
        setIsRecalculating(false);
        setRecalcFailed(false);
        setFollowingRecalc(false);
      }
      return;
    }
    // Neue Off-Route-Position: akzeptierte Neuberechnung aufheben,
    // damit der neue Recalc-Zyklus sauber startet.
    followingRecalcRef.current = false;
    const geom = routeGeomRef.current;
    if (!geom || geom.length < 2) return;
    // Ohne Netz bleibt die ursprüngliche Geometrie autoritativ. Die lokale
    // Projektion und der Richtungszeiger zeigen den Weg zurück; eine
    // serverseitige Neuberechnung darf den Offline-Hike nicht blockieren.
    if (isOffline) {
      setIsRecalculating(false);
      setRecalcFailed(false);
      return;
    }
    // Ziel: naechster sinnvoller Punkt auf der Restroute.
    // fortschrittAufRoute liefert den naechsten Segment-Index; von dort aus
    // navigieren wir ein Stueck vorwaerts (mind. 10% der Geometrie), sodass
    // Valhalla eine echte Strecke plant statt einen trivialen 0-m-Sprung.
    // Vor dem Trailhead (fraction ≈ 0) zeigt das zum Startpunkt; mitten auf
    // der Route zeigt es zum naechsten Abschnitt; am Ende zum Schlusspunkt.
    const proj = fortschrittAufRoute(offRoutePos, geom);
    const nearestIdx = proj ? Math.floor(proj.fraction * (geom.length - 1)) : 0;
    const lookahead = Math.max(10, Math.floor(geom.length * 0.1));
    const destIdx = Math.min(geom.length - 1, nearestIdx + lookahead);
    const distanceToStartKm = haversineKm(offRoutePos, {
      lat: geom[0][0],
      lng: geom[0][1],
    });
    const needsStartChoice =
      !startReached && distanceToStartKm > START_NEARBY_KM;
    if (
      needsStartChoice &&
      !startRecalcChoiceShownRef.current &&
      startRecalcChoice == null
    ) {
      startRecalcChoiceShownRef.current = true;
      alert(t.offRouteStartChoiceTitle, t.offRouteStartChoiceMessage, [
        {
          text: t.offRouteToStart,
          onPress: () => chooseStartRoute("start", offRoutePos),
        },
        {
          text: t.offRouteFastestToRoute,
          onPress: () => chooseStartRoute("fastest", offRoutePos),
        },
      ]);
      return;
    }
    // Die Startauswahl kann in einem separaten Render eintreffen als
    // offRoutePos. In diesem Zwischenzustand darf keine Standardroute
    // gestartet werden, sonst laufen zwei Anfragen parallel.
    if (needsStartChoice && startRecalcChoice == null) return;
    const targetIdx =
      needsStartChoice && startRecalcChoice === "start"
        ? 0
        : needsStartChoice && startRecalcChoice === "fastest"
          ? nearestIdx
          : destIdx;
    const dest = geom[targetIdx];
    setIsRecalculating(true);
    setRecalcFailed(false);
    setRecalcGeom(null);
    setRecalcRejoinFraction(null);
    setFollowingRecalc(false);
    const controller = new AbortController();
    (async () => {
      try {
        const geometry = await requestWalkingRoute(
          offRoutePos,
          { lat: dest[0], lng: dest[1] },
          controller.signal,
        );
        setRecalcGeom(geometry);
        setRecalcRejoinFraction(
          geom.length > 1 ? targetIdx / (geom.length - 1) : null,
        );
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setRecalcFailed(true);
        }
      } finally {
        setIsRecalculating(false);
      }
    })();
    return () => controller.abort();
  }, [
    chooseStartRoute,
    isOffline,
    offRoutePos,
    startRecalcChoice,
    startReached,
    t,
  ]);

  const [speaking, setSpeaking] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingNarration | null>(
    null,
  );
  const [chapterNarrationRetry, setChapterNarrationRetry] = useState(0);
  const nowPlayingRef = useRef<NowPlayingNarration | null>(null);
  const nowPlayingVisible =
    nowPlaying !== null && (speaking || nowPlaying.kind === "navigation");
  const updateNowPlaying = useCallback((value: NowPlayingNarration | null) => {
    nowPlayingRef.current = value;
    setNowPlaying(value);
  }, []);
  const [locState, setLocState] = useState<LocState>("idle");
  const [locationPermissionRetry, setLocationPermissionRetry] = useState(0);
  const [watchLifecycleRevision, setWatchLifecycleRevision] = useState(0);
  const locationTraceRef = useRef(0);
  const locStateRef = useRef<LocState>("idle");
  locStateRef.current = locState;
  const [sosOpen, setSosOpen] = useState(false);
  const [sosAcknowledgement, setSosAcknowledgement] = useState<
    "none" | "acknowledged" | "failed"
  >("none");
  const [showConditionForm, setShowConditionForm] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<
    TrailConditionReport["condition"] | null
  >(null);
  const [conditionNote, setConditionNote] = useState("");
  const [conditionSubmitting, setConditionSubmitting] = useState(false);
  const [conditionSubmitResult, setConditionSubmitResult] = useState<
    "ok" | "ratelimit" | "error" | null
  >(null);
  const { refetch: refetchConditions } = useGetRouteConditions(id ?? "");
  const [choiceFeedback, setChoiceFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rollen in einer Gruppenwanderung: die Leitung sendet Kapitel- und
  // Entscheidungs-Ereignisse, Mitglieder folgen ihnen und entscheiden nicht
  // selbst.
  const inGruppe = !!groupSession;
  const istGruppenleitung = groupSession?.isLeader ?? false;
  const folgtGruppenleitung = inGruppe && !istGruppenleitung;
  const canonicalGroupStart =
    folgtGruppenleitung && groupHikeEvent?.event.kind === "start"
      ? groupHikeEvent.event
      : null;
  const groupPlanRedirectRef = useRef<string>("");

  // Mitglieder dürfen keine eigene Sage/Route starten. Sobald die Leitung
  // den kanonischen Start sendet, wird ein falsch geöffneter Bildschirm
  // automatisch auf exakt dieselbe Sage und Route umgeleitet.
  useEffect(() => {
    if (!canonicalGroupStart) return;
    const routeMatches =
      canonicalGroupStart.sagaId === id &&
      (canonicalGroupStart.routeId === routeId ||
        canonicalGroupStart.routeId === route?.id);
    if (routeMatches) return;
    const redirectKey = `${canonicalGroupStart.sagaId}:${canonicalGroupStart.routeId}`;
    if (groupPlanRedirectRef.current === redirectKey) return;
    groupPlanRedirectRef.current = redirectKey;
    router.replace(
      `/hike/${encodeURIComponent(canonicalGroupStart.sagaId)}?routeId=${encodeURIComponent(canonicalGroupStart.routeId)}`,
    );
  }, [canonicalGroupStart, id, route?.id, routeId, router]);
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);
  const [distance, setDistance] = useState(0);
  const [steps, setSteps] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [hikePaused, setHikePaused] = useState(false);
  const [heartRate, setHeartRate] = useState<{
    bpm: number;
    measuredAt: number;
    source: "watch" | "garmin" | "phone";
  } | null>(null);
  const [livePos, setLivePos] = useState<LatLng | null>(null);
  const [livePosAccuracy, setLivePosAccuracy] = useState<number | null>(null);
  const [liveAltitude, setLiveAltitude] = useState<number | null>(null);
  const livePosRef = useRef<LatLng | null>(null);
  const hasFreshGpsRef = useRef(false);
  const [livePlace, setLivePlace] = useState<string | null>(null);
  // Tickt regelmässig weiter, damit ein ausbleibendes GPS-Signal auch ohne
  // neuen Fix sichtbar wird und Fortschritt/Navigationslogik pausieren können.
  const [locationNow, setLocationNow] = useState(() => Date.now());
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [compassAvailable, setCompassAvailable] = useState<boolean | null>(
    null,
  );
  const [watchReady, setWatchReady] = useState<boolean | null>(null);
  // Watch accompaniment is a device-level choice, not a new permission for
  // every hike. Read the persisted OS permission automatically when this hike
  // screen mounts so opening the Watch tile does not require a second tap.
  useEffect(() => {
    let cancelled = false;
    void prepareWatchCompanion().then((ready) => {
      if (!cancelled) setWatchReady(ready);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const safetyCheckinRef = useRef<SafetyCheckinHandle>(null);
  const [safetyCheckinState, setSafetyCheckinState] =
    useState<WatchSafetyCheckin | null>(null);
  const handleSafetyCheckinStatus = useCallback(
    (status: WatchSafetyCheckin) => setSafetyCheckinState(status),
    [],
  );
  const [watchDiscoveryAlert, setWatchDiscoveryAlert] =
    useState<WatchDiscoveryAlert | null>(null);
  const watchDiscoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastWatchDiscoveryAlertRef = useRef<string | null>(null);
  const watchPoiTraceRef = useRef<{
    poiId: string;
    traceId: string;
    kind: "partner" | "poi";
  } | null>(null);
  const lastWatchPoiDebugKeyRef = useRef<string | null>(null);
  const poiDebugSequenceRef = useRef(0);
  const createPoiTrace = useCallback(
    (
      poiId: string,
      kind: "partner" | "poi",
      source:
        | "nearby"
        | "approach-200m"
        | "approach-50m"
        | "partner-500m"
        | "waypoint",
    ) => {
      const traceId = `poi-${Date.now()}-${++poiDebugSequenceRef.current}`;
      watchPoiLog("POI event created", { traceId, poiId, kind, source });
      return traceId;
    },
    [],
  );
  const raiseWatchDiscoveryAlert = useCallback((alert: WatchDiscoveryAlert) => {
    setWatchDiscoveryAlert(alert);
    if (watchDiscoveryTimerRef.current)
      clearTimeout(watchDiscoveryTimerRef.current);
    watchDiscoveryTimerRef.current = setTimeout(() => {
      watchDiscoveryTimerRef.current = null;
      setWatchDiscoveryAlert(null);
    }, 12_000);
  }, []);
  useEffect(() => {
    return () => {
      if (watchDiscoveryTimerRef.current)
        clearTimeout(watchDiscoveryTimerRef.current);
    };
  }, []);
  const [terrainModel, setTerrainModel] = useState<LocalTerrainModel | null>(
    null,
  );
  const [terrainModelRetryKey, setTerrainModelRetryKey] = useState(0);
  const [finished, setFinished] = useState(false);
  const [offlineTiles, setOfflineTiles] = useState<Record<
    string,
    string
  > | null>(null);
  const [offlinePanorama, setOfflinePanorama] =
    useState<OfflinePanoramaDatenbank | null>(null);
  const [aerialways, setAerialways] = useState<
    { id: string; geometry: number[][] }[] | null
  >(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [panoramaOnlinePois, setPanoramaOnlinePois] = useState<Poi[]>([]);
  const [panoramaTileOpen, setPanoramaTileOpen] = useState(false);
  const [panoramaCameraOpen, setPanoramaCameraOpen] = useState(false);
  const [panoramaTileCloseSignal, setPanoramaTileCloseSignal] = useState(0);
  const [storyTileOpen, setStoryTileOpen] = useState(false);
  const panoramaCameraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const panoramaPeakRequestRef = useRef<{
    lat: number;
    lng: number;
    requestedAt: number;
  } | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [waterSources, setWaterSources] = useState<MapPoi[]>([]);
  const [parkingSpots, setParkingSpots] = useState<MapPoi[]>([]);
  const [safetyPois, setSafetyPois] = useState<MapPoi[]>([]);
  const [detourPois, setDetourPois] = useState<Poi[]>([]);
  const detourPoiSearchKeyRef = useRef<string | null>(null);
  const displayedPois = useMemo(() => {
    if (detourPois.length === 0) return pois;
    const existingIds = new Set(pois.map((poi) => poi.id));
    return [...pois, ...detourPois.filter((poi) => !existingIds.has(poi.id))];
  }, [detourPois, pois]);
  const [safetyPoiFiltersOpen, setSafetyPoiFiltersOpen] = useState(false);
  const [enabledSafetyPoiCategories, setEnabledSafetyPoiCategories] = useState<
    Record<SafetyPoiCategory, boolean>
  >(DEFAULT_SAFETY_POI_FILTERS);
  const safetyPoiFilterLabels = useMemo(() => {
    const descriptions = mapT.legendSafetyCodes.split(" · ");
    return SAFETY_POI_CATEGORIES.map((entry, index) => ({
      ...entry,
      label:
        descriptions[index]?.replace(/^(TO|PH|H|CL|P|F|DE|A|!|S)\s+/, "") ??
        entry.code,
    }));
  }, [mapT.legendSafetyCodes]);
  const enabledSafetyPoiCount = SAFETY_POI_CATEGORIES.filter(
    ({ category }) => enabledSafetyPoiCategories[category],
  ).length;
  const allSafetyPoiCategoriesEnabled =
    enabledSafetyPoiCount === SAFETY_POI_CATEGORIES.length;
  const visibleSafetyPois = useMemo(
    () =>
      safetyPois.filter((poi) => {
        const category = poi.category as SafetyPoiCategory | undefined;
        if (!category || !(category in DEFAULT_SAFETY_POI_FILTERS)) return true;
        return enabledSafetyPoiCategories[category];
      }),
    [enabledSafetyPoiCategories, safetyPois],
  );
  const [routeWaypoints, setRouteWaypoints] = useState<RouteWaypoint[]>([]);
  const [reachedWaypointIds, setReachedWaypointIds] = useState<
    ReadonlySet<string>
  >(new Set());
  const waypointAnnouncedRef = useRef<Set<string>>(new Set());
  const announcedPremiumPartnerIdsRef = useRef<Set<string>>(new Set());
  const premiumPartnerDuplicateLogRef = useRef<Set<string>>(new Set());
  /** Partner mit laufender Anpreisungs-Anfrage — verhindert Doppelrequests,
   * ohne einen fehlgeschlagenen Aufruf dauerhaft als erledigt zu markieren. */
  const announcingPremiumPartnerIdsRef = useRef<Set<string>>(new Set());
  const [nearbyPoi, setNearbyPoi] = useState<Poi | null>(null);
  const announcedWatchPeakIdsRef = useRef<Set<string>>(new Set());
  const notifiedPoiIdsRef = useRef<Set<string>>(new Set());
  const nearbyPoiDistanceRef = useRef<{
    id: string;
    distanceKm: number;
    increasingReadings: number;
  } | null>(null);
  // undefined = noch am Laden, null = geladen aber nichts gefunden, WikiSummary = fertig
  const [nearbyPoiWiki, setNearbyPoiWiki] = useState<
    WikiSummary | null | undefined
  >(undefined);
  const [nearbyPoiWikiPoiId, setNearbyPoiWikiPoiId] = useState<string | null>(
    null,
  );
  const [watchPoiStory, setWatchPoiStory] = useState<WatchPoiStory | null>(
    null,
  );
  const previousNearbyPoiIdRef = useRef<string | null>(null);
  useEffect(() => {
    const nextPoiId = nearbyPoi?.id ?? null;
    const previousPoiId = previousNearbyPoiIdRef.current;
    if (previousPoiId !== null && previousPoiId !== nextPoiId) {
      // The Watch mirrors the currently active automatic POI card. Clear the
      // old story immediately when the phone moves to a different POI (or no
      // longer has one), instead of waiting for the old narration callback.
      setWatchPoiStory(null);
    }
    previousNearbyPoiIdRef.current = nextPoiId;
  }, [nearbyPoi?.id]);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  // undefined = noch am Laden, null = geladen aber nichts gefunden, WikiSummary = fertig
  const [selectedPoiWiki, setSelectedPoiWiki] = useState<
    WikiSummary | null | undefined
  >(undefined);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerTranslation, setPartnerTranslation] = useState<{
    beschreibung: string | null;
    angebot: string | null;
  } | null>(null);
  const [partnerAnnouncementText, setPartnerAnnouncementText] = useState<{
    partnerId: string;
    text: string;
  } | null>(null);
  const [karteVollbild, setKarteVollbild] = useState(false);
  const [karteCloseSignal, setKarteCloseSignal] = useState(0);
  const [routeTerrain3dOpen, setRouteTerrain3dOpen] = useState(false);
  // Aktion, die nach vollstaendigem Schliessen der Vollbild-Karte ausgefuehrt
  // werden soll (z. B. POI- oder Partner-Detail oeffnen). onDismiss des nativen
  // iOS-Modals faengt beim zweiten Schliessen nicht zuverlaessig — stattdessen
  // beobachten wir karteVollbild→false via useEffect und warten 320 ms (Fade-
  // Animation) bevor die Aktion ausgefuehrt wird.
  const pendingKarteActionRef = React.useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!karteVollbild && pendingKarteActionRef.current) {
      const action = pendingKarteActionRef.current;
      pendingKarteActionRef.current = null;
      const t = setTimeout(action, 320);
      return () => clearTimeout(t);
    }
  }, [karteVollbild]);
  const [poiStory, setPoiStory] = useState<string | null>(null);
  const [poiStoryLoading, setPoiStoryLoading] = useState(false);
  /** Getippte POIs waehrend dieser Wanderung, fuer das Wandertagebuch */
  const visitedPoisRef = useRef<
    Map<
      string,
      { id: string; name: string; extract?: string; photoUrl?: string }
    >
  >(new Map());
  // KI-Kontext fuer die "Entdeckt"-Karte, wenn der POI keinen
  // Wikipedia-Auszug hat (wird im Erzaehl-Effekt mitbefuellt).
  const [nearbyPoiKontext, setNearbyPoiKontext] = useState<string | null>(null);
  const [narrationUnavailable, setNarrationUnavailable] = useState(false);
  // Feature: Foto-Challenge + Waypoint-Fotos
  const [hikePhotos, setHikePhotos] = useState<string[]>([]);
  const [photoObjectPaths, setPhotoObjectPaths] = useState<string[]>([]);
  const [recognitionEntries, setRecognitionEntries] = useState<
    RecognitionJournalEntry[]
  >([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadFeedback, setPhotoUploadFeedback] = useState<
    "ok" | "error" | null
  >(null);
  const [showPhotoChallenge, setShowPhotoChallenge] = useState(false);
  const photoChallengeShownRef = useRef(false);
  const sagaArrivalSpokenRef = useRef(false);
  const [rawSurfacePoints, setRawSurfacePoints] = useState<RouteSurfacePoint[]>(
    [],
  );
  const notifiedSurfaceFractionsRef = useRef<Set<number>>(new Set());
  const notifiedMilestonesRef = useRef<Set<number>>(new Set());
  // Feature: Entscheidungs-Countdown
  const [decisionCountdown, setDecisionCountdown] = useState<number | null>(
    null,
  );
  // Live-Wetter am Wanderungsstart — wird einmalig geladen, sobald Route-Koordinaten bekannt sind.
  const [hikeWeather, setHikeWeather] = useState<WeatherReport | null>(null);
  const watchWeather = useMemo<WatchWeather | null>(() => {
    if (!hikeWeather) return null;
    const weatherValues = [
      hikeWeather.temperatureC,
      hikeWeather.weatherCode,
      hikeWeather.windKmh,
      hikeWeather.windGustsKmh,
      hikeWeather.precipitationMm,
    ];
    // The Watch protocol is deliberately strict. If a partially populated
    // weather response ever reaches the client, omit the optional weather
    // block instead of rejecting the complete live snapshot.
    if (weatherValues.some((value) => !Number.isFinite(value))) return null;
    return {
      temperatureC: hikeWeather.temperatureC,
      weatherCode: hikeWeather.weatherCode,
      windKmh: hikeWeather.windKmh,
      windGustsKmh: hikeWeather.windGustsKmh,
      precipitationMm: hikeWeather.precipitationMm,
      isThunderstorm: hikeWeather.isThunderstorm ?? false,
    };
  }, [hikeWeather]);

  const addRecognitionEntry = useCallback((entry: RecognitionJournalEntry) => {
    setRecognitionEntries((current) => {
      if (current.some((existing) => existing.id === entry.id)) return current;
      return [...current, entry];
    });
  }, []);

  const decisionsRef = useRef<StoryChapter[]>([]);
  const hikePausedRef = useRef(false);
  const pauseStartedAtRef = useRef<number | null>(null);
  const pausedDurationMsRef = useRef(0);
  const lastFixRef = useRef<LatLng | null>(null);
  /** Vorherige GPS-Position vor dem letzten signifikanten Schritt — fuer Himmelsrichtungsberechnung zum POI. */
  const prevLivePosRef = useRef<LatLng | null>(null);
  /** Aufgezeichneter GPS-Track: [lat, lng]-Paare im zeitlichen Abstand >= TRACK_LOG_INTERVAL_MS */
  const posLogRef = useRef<[number, number][]>([]);
  const lastTrackLogTimeRef = useRef<number>(0);
  /** Zeitpunkt des letzten akzeptierten GPS-Fixes fuer die Watcher-Wiederherstellung. */
  const lastLocationAtRef = useRef<number>(0);
  const liveSnapshotSequenceRef = useRef(0);
  const lastWatchLifecycleRevisionRef = useRef(0);
  const lastCriticalWatchAlertRef = useRef<string | null>(null);
  const lastSosAcknowledgementRef = useRef<"none" | "acknowledged" | "failed">(
    "none",
  );
  const lastSafetyCheckinKeyRef = useRef<string | null>(null);
  const lastWatchPoiStoryIdRef = useRef<string | null>(null);
  const lastWatchStateDebugKeyRef = useRef<string | null>(null);
  // Ein Resume aus dem Katalog kann direkt nach dem letzten Live-State der
  // vorherigen Hike-Instanz entstehen. Der erste Wechsel von unavailable/
  // stale zu fresh muss deshalb auch innerhalb des globalen Publish-Throttles
  // sicher an die Watch gelangen.
  const lastPublishedGpsFreshRef = useRef<boolean | null>(null);
  const compassHeadingRef = useRef<number | null>(null);
  const compassGravityRef = useRef<CompassVector | null>(null);
  const compassSamplesRef = useRef<number[]>([]);
  const livePlaceLookupRef = useRef<{
    lat: number;
    lng: number;
    requestedAt: number;
  } | null>(null);
  const livePlaceLookupGenerationRef = useRef(0);
  /** Ref auf die aktuelle Routen-Geometrie — ermoeglicht Zugriff aus handleFix (leere Deps). */
  const routeGeomRef = useRef<number[][] | null | undefined>(null);
  /** true waehrend der Nutzer als "vom Weg" gilt — verhindert doppeltes Ausloesen. */
  const isOffRouteRef = useRef(false);
  /** Synchrones Flag: User hat die neu berechnete Route akzeptiert —
   *  verhindert dass setOffRoutePos(null) den recalcGeom-State loescht. */
  const followingRecalcRef = useRef(false);
  /** Zaehler aufeinanderfolgender GPS-Fixes ausserhalb der Route. */
  const offRouteCountRef = useRef(0);
  const hasFreshGps =
    locState === "granted" &&
    livePos !== null &&
    locationNow - lastLocationAtRef.current <= GPS_FRESHNESS_WINDOW_MS;
  livePosRef.current = livePos;
  hasFreshGpsRef.current = hasFreshGps;

  // Bei jedem Einstieg: erst nach dem ersten frischen GPS-Fix entscheiden, ob
  // der Nutzer bereits am offiziellen Start steht oder einen Zubringer braucht.
  useEffect(() => {
    if (
      startGateConfirmedRef.current ||
      startGateShownRef.current ||
      !hasFreshGps ||
      !livePos ||
      !navigationGeometry ||
      navigationGeometry.length < 2
    ) {
      return;
    }
    startGateShownRef.current = true;
    startRecalcChoiceShownRef.current = true;
    const distanceToStartKm = haversineKm(livePos, {
      lat: navigationGeometry[0][0],
      lng: navigationGeometry[0][1],
    });
    if (distanceToStartKm <= START_NEARBY_KM) {
      alert(t.startHikeNow, t.startHikeMessage, [
        { text: t.startHikeNow, onPress: confirmStartAtTrailhead },
      ]);
      return;
    }
    alert(t.offRouteStartChoiceTitle, t.offRouteStartChoiceMessage, [
      {
        text: t.offRouteToStart,
        onPress: () => chooseStartRoute("start", livePos),
      },
      {
        text: t.offRouteFastestToRoute,
        onPress: () => chooseStartRoute("fastest", livePos),
      },
    ]);
  }, [
    chooseStartRoute,
    confirmStartAtTrailhead,
    hasFreshGps,
    livePos,
    navigationGeometry,
    t,
  ]);

  const requestLocationAccess = useCallback(async () => {
    if (Platform.OS === "web") return;
    const traceId = `request-${++locationTraceRef.current}`;
    const startedAt = Date.now();
    locationPermissionLog("request begin", {
      ...locationDiagnosticContext(),
      traceId,
      locState: locStateRef.current,
    });
    try {
      const current = await Location.getForegroundPermissionsAsync();
      locationPermissionLog("request preflight", {
        ...locationDiagnosticContext(),
        traceId,
        elapsedMs: Date.now() - startedAt,
        status: current.status,
        granted: current.granted,
        canAskAgain: current.canAskAgain,
      });
      const permission = current.granted
        ? current
        : await Location.requestForegroundPermissionsAsync();

      locationPermissionLog("request finished", {
        ...locationDiagnosticContext(),
        traceId,
        elapsedMs: Date.now() - startedAt,
        status: permission.status,
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
      });
      if (permission.granted) {
        setLocState("idle");
        setLocationPermissionRetry((value) => value + 1);
        return;
      }

      setLocState("denied");
      if (!permission.canAskAgain) {
        await Linking.openSettings();
      }
    } catch (error) {
      locationPermissionLog("request failed", {
        ...locationDiagnosticContext(),
        traceId,
        elapsedMs: Date.now() - startedAt,
        errorName: error instanceof Error ? error.name : "unknown",
        errorMessage:
          error instanceof Error ? error.message.slice(0, 160) : "unknown",
      });
      // A failed native call is not proof of denial. Keep the permission
      // banner out of the confirmed-denied state until iOS returns a result.
      setLocState("idle");
    }
  }, []);
  const readForegroundLocationPermission = useCallback(
    async (reason: string) => {
      if (Platform.OS === "web") return true;
      const traceId = `read-${++locationTraceRef.current}`;
      const startedAt = Date.now();
      locationPermissionLog("read begin", {
        ...locationDiagnosticContext(),
        traceId,
        reason,
        locState: locStateRef.current,
      });

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const permission = await Location.getForegroundPermissionsAsync();
          locationPermissionLog("read", {
            ...locationDiagnosticContext(),
            traceId,
            reason,
            attempt: attempt + 1,
            elapsedMs: Date.now() - startedAt,
            status: permission.status,
            granted: permission.granted,
            canAskAgain: permission.canAskAgain,
          });
          if (permission.granted) {
            setLocState("granted");
            return true;
          }
          if (attempt < 2) {
            locationPermissionLog("read retry scheduled", {
              ...locationDiagnosticContext(),
              traceId,
              reason,
              nextAttempt: attempt + 2,
              elapsedMs: Date.now() - startedAt,
            });
            await new Promise((resolve) =>
              setTimeout(resolve, 250 * (attempt + 1)),
            );
            continue;
          }
          if (
            permission.status === Location.PermissionStatus.UNDETERMINED &&
            permission.canAskAgain
          ) {
            locationPermissionLog("read requesting undetermined permission", {
              ...locationDiagnosticContext(),
              traceId,
              reason,
              elapsedMs: Date.now() - startedAt,
            });
            const requested =
              await Location.requestForegroundPermissionsAsync();
            locationPermissionLog("read request finished", {
              ...locationDiagnosticContext(),
              traceId,
              reason,
              elapsedMs: Date.now() - startedAt,
              status: requested.status,
              granted: requested.granted,
              canAskAgain: requested.canAskAgain,
            });
            if (requested.granted) {
              setLocState("granted");
              return true;
            }
          }
          // A confirmed non-granted response is different from a failed read:
          // only the former should show the action banner.
          setLocState("denied");
          locationPermissionLog("read confirmed denied", {
            ...locationDiagnosticContext(),
            traceId,
            reason,
            elapsedMs: Date.now() - startedAt,
            uiState: "denied",
          });
          return false;
        } catch (error) {
          locationPermissionLog("read failed", {
            ...locationDiagnosticContext(),
            traceId,
            reason,
            attempt: attempt + 1,
            elapsedMs: Date.now() - startedAt,
            errorName: error instanceof Error ? error.name : "unknown",
            errorMessage:
              error instanceof Error ? error.message.slice(0, 160) : "unknown",
          });
          if (attempt < 2) {
            locationPermissionLog("read failure retry scheduled", {
              ...locationDiagnosticContext(),
              traceId,
              reason,
              nextAttempt: attempt + 2,
              elapsedMs: Date.now() - startedAt,
            });
            await new Promise((resolve) =>
              setTimeout(resolve, 250 * (attempt + 1)),
            );
            continue;
          }
          // Keep the UI neutral after a native read failure. AppState retry
          // below will check again when the app is active.
          setLocState("idle");
          locationPermissionLog("read ended unknown", {
            ...locationDiagnosticContext(),
            traceId,
            reason,
            elapsedMs: Date.now() - startedAt,
            uiState: "idle",
          });
          return false;
        }
      }
      return false;
    },
    [],
  );
  useEffect(() => {
    locationPermissionLog("screen AppState listener attached", {
      ...locationDiagnosticContext(),
    });
    const subscription = AppState.addEventListener("change", (nextState) => {
      locationPermissionLog("screen AppState", {
        ...locationDiagnosticContext(),
        nextState,
      });
      if (nextState === "active") {
        setLocationPermissionRetry((value) => value + 1);
        setWatchLifecycleRevision((value) => value + 1);
      }
    });
    return () => {
      locationPermissionLog("screen AppState listener removed", {
        ...locationDiagnosticContext(),
      });
      subscription.remove();
    };
  }, []);
  const requestPhoneSideSos = useCallback(() => {
    // A request from a wrist device deliberately opens the established phone
    // emergency flow. It does not imply that emergency services were reached.
    setSosAcknowledgement("none");
    setSosOpen(true);
    void sendWatchSos(null).then((handled) => {
      setSosAcknowledgement(handled ? "acknowledged" : "failed");
    });
  }, []);

  const setHikePause = useCallback((paused: boolean) => {
    if (paused) {
      if (hikePausedRef.current) return;
      hikePausedRef.current = true;
      pauseStartedAtRef.current = Date.now();
      setElapsedSec(
        Math.max(
          0,
          Math.round(
            (Date.now() - startTimeRef.current - pausedDurationMsRef.current) /
              1000,
          ),
        ),
      );
      setHikePaused(true);
      return;
    }
    if (!hikePausedRef.current) return;
    const pausedAt = pauseStartedAtRef.current;
    if (pausedAt != null)
      pausedDurationMsRef.current += Math.max(0, Date.now() - pausedAt);
    pauseStartedAtRef.current = null;
    hikePausedRef.current = false;
    setHikePaused(false);
  }, []);
  const lastNarratedRef = useRef<number>(-1);
  /** Die Sage laeuft unabhaengig von GPS und Routenposition bis zum letzten Kapitel. */
  const storyCompleteRef = useRef(false);
  /** Die Route kann vor oder nach dem letzten Sagenkapitel enden. */
  const routeCompletedRef = useRef(false);
  /** Story-Fortschritt bleibt monoton, auch wenn GPS-Fixes schwanken. */
  const storyProgressMaxRef = useRef(0);
  /** Hoechstes Kapitel, das die Strecke bereits freigegeben hat. */
  const storyEligibleChapterRef = useRef(0);
  /** Hoechstes Kapitel, dessen Audio vollstaendig beendet wurde. */
  const narratedThroughRef = useRef(-1);
  /** Gruppenmitglieder warten nach einer fremden Entscheidung bis ihr Audio endet. */
  const pendingGroupDecisionAdvanceRef = useRef<number | null>(null);
  /** Verhindert, dass setAwaitingDecision(true) mehrfach fuer denselben
   *  Kapitel-Index aufgerufen wird, wenn chapters-Mutationen (Group-Sync,
   *  async Enrichment) den Kapitel-Effekt erneut ausloesen. */
  const lastDecisionTriggeredRef = useRef<number>(-1);
  /** Diagnosezaehler bleiben ueber die gesamte Wanderung erhalten. */
  const decisionTriggerCountRef = useRef<Map<number, number>>(new Map());
  const decisionPromptCountRef = useRef<Map<number, number>>(new Map());
  const decisionDebugSequenceRef = useRef(0);
  const storyLoadGenerationRef = useRef(0);
  const storySetupInputsRef = useRef<{
    saga: unknown;
    profile: unknown;
    premium: boolean;
    storyLanguage: string;
    resolveStory: unknown;
  } | null>(null);
  const promptedDecisionRef = useRef<number>(-1);
  /** Wird synchron gesetzt, sobald eine Antwort angenommen wurde. Dadurch
   *  kann derselbe Entscheidungspunkt auch bei einem verspäteten Render,
   *  Queue-Eintrag oder Sprach-Callback nicht erneut öffnen. */
  const resolvedDecisionIndexRef = useRef<number | null>(null);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const decisionDebugSnapshot = useCallback(
    (chapterIndex = currentIndexRef.current) => ({
      hikeDebugInstanceId: hikeDebugInstanceIdRef.current,
      clientHikeId: clientHikeIdRef.current,
      sagaId: saga?.id ?? id,
      routeId: route?.id ?? routeId ?? null,
      appState: AppState.currentState,
      storyLoadGeneration: storyLoadGenerationRef.current,
      refs: {
        currentIndex: currentIndexRef.current,
        chapterIndex,
        awaitingDecision: awaitingDecisionRef.current,
        decisionFeedbackPending: decisionFeedbackPendingRef.current,
        resolvedDecisionIndex: resolvedDecisionIndexRef.current,
        promptedDecision: promptedDecisionRef.current,
        lastDecisionTriggered: lastDecisionTriggeredRef.current,
        triggerCount: decisionTriggerCountRef.current.get(chapterIndex) ?? 0,
        promptCount: decisionPromptCountRef.current.get(chapterIndex) ?? 0,
      },
      narrationQueue: narrationQueueRef.current.map((item) => ({
        kind: item.kind ?? null,
        chapterIndex: item.chapterIndex ?? null,
      })),
    }),
    [id, route?.id, routeId, saga?.id],
  );
  const logDecisionFlow = useCallback(
    (
      event: string,
      chapterIndex: number,
      details: Record<string, unknown> = {},
    ) => {
      const chapterDecision = decisionsRef.current[chapterIndex]?.decision;
      const chapter = decisionsRef.current[chapterIndex];
      decisionFlowLog(event, {
        ...decisionDebugSnapshot(chapterIndex),
        localSequence: ++decisionDebugSequenceRef.current,
        chapterIndex,
        currentIndex: currentIndexRef.current,
        awaitingDecision: awaitingDecisionRef.current,
        decisionFeedbackPending: decisionFeedbackPendingRef.current,
        chosenOptionIndex: chapter?.chosenOptionIndex ?? null,
        resolved: resolvedDecisionIndexRef.current === chapterIndex,
        triggerCount: decisionTriggerCountRef.current.get(chapterIndex) ?? 0,
        promptCount: decisionPromptCountRef.current.get(chapterIndex) ?? 0,
        ...details,
      });
    },
    [decisionDebugSnapshot],
  );
  useEffect(() => {
    logDecisionFlow("screen_instance_mounted", currentIndexRef.current, {
      runtime: getRuntimeDiagnostics(),
      isResume,
    });
    return () => {
      logDecisionFlow("screen_instance_unmounted", currentIndexRef.current, {
        runtime: getRuntimeDiagnostics(),
      });
    };
  }, [isResume, logDecisionFlow]);
  const triggerDecision = useCallback(
    (chapterIndex: number, reason: string) => {
      const triggerCount =
        (decisionTriggerCountRef.current.get(chapterIndex) ?? 0) + 1;
      decisionTriggerCountRef.current.set(chapterIndex, triggerCount);
      const chapter = decisionsRef.current[chapterIndex];
      const alreadyResolved =
        chapter?.chosenOptionIndex != null ||
        resolvedDecisionIndexRef.current === chapterIndex;
      const duplicateOpen =
        lastDecisionTriggeredRef.current === chapterIndex &&
        awaitingDecisionRef.current;
      logDecisionFlow("trigger_attempt", chapterIndex, {
        reason,
        triggerCount,
        blocked: alreadyResolved || duplicateOpen,
        blockReason: alreadyResolved
          ? "already_resolved"
          : duplicateOpen
            ? "already_open"
            : null,
      });
      if (triggerCount > 1) {
        logDecisionFlow("duplicate_trigger_detected", chapterIndex, {
          reason,
          triggerCount,
        });
      }
      if (
        chapterIndex !== currentIndexRef.current ||
        alreadyResolved ||
        lastDecisionTriggeredRef.current === chapterIndex
      ) {
        logDecisionFlow("trigger_blocked", chapterIndex, {
          reason,
          blockReason:
            chapterIndex !== currentIndexRef.current
              ? "not_current_chapter"
              : alreadyResolved
                ? "already_resolved"
                : "already_triggered",
        });
        return false;
      }
      lastDecisionTriggeredRef.current = chapterIndex;
      awaitingDecisionRef.current = true;
      setAwaitingDecision(true);
      logDecisionFlow("opened", chapterIndex, { reason });
      return true;
    },
    [logDecisionFlow],
  );
  // true waehrend eine Navigationsansage laeuft und die Erzaehlung pausiert ist.
  const navInterruptingRef = useRef(false);
  const announcedPoiIdsRef = useRef<Set<string>>(new Set());
  // Koordinaten bereits angesagter POIs — verhindert Doppel-Ansage wenn
  // derselbe physische Ort als mehrere OSM-Objekte (node + way) vorliegt
  // und unterschiedliche IDs traegt.
  const announcedPoiLocsRef = useRef<Array<{ lat: number; lng: number }>>([]);
  const narratedPoiIdRef = useRef<string | null>(null);
  /** Bereits mit 200-m-Richtungshinweis angesagte POI-IDs (Annaeherungs-Flow). */
  const hintedPoiIdRef = useRef<string | null>(null);
  /** Bereits mit voller Geschichte (50 m) erzaehlte POI-IDs (Annaeherungs-Flow). */
  const poiStoryToldRef = useRef<string | null>(null);
  /** Gemeinsame Sperre fuer alle vollstaendigen POI-Erzaehlpfade. */
  const poiStoryClaimsRef = useRef<
    Array<{ id: string; lat: number; lng: number }>
  >([]);
  const claimPoiStory = useCallback(
    (poi: Poi, source: "nearby" | "approach-50m", traceId: string) => {
      const alreadyClaimed = poiStoryClaimsRef.current.some(
        (claim) =>
          claim.id === poi.id ||
          haversineKm(
            { lat: claim.lat, lng: claim.lng },
            { lat: poi.lat, lng: poi.lng },
          ) <= 0.1,
      );
      if (alreadyClaimed) {
        watchPoiLog("POI narration claim rejected as duplicate", {
          traceId,
          poiId: poi.id,
          kind: "poi",
          source,
          claimCount: poiStoryClaimsRef.current.length,
        });
        return false;
      }
      poiStoryClaimsRef.current.push({
        id: poi.id,
        lat: poi.lat,
        lng: poi.lng,
      });
      watchPoiLog("POI narration claim reserved", {
        traceId,
        poiId: poi.id,
        kind: "poi",
        source,
        claimCount: poiStoryClaimsRef.current.length,
      });
      return true;
    },
    [],
  );
  /** POI-Erzaehlungen, die geladen werden oder bereits in der Audio-Queue stehen. */
  const poiNarrationPendingRef = useRef<Set<number>>(new Set());
  const poiNarrationTokenRef = useRef(0);
  const isPoiStillRelevant = useCallback((poi: Poi, radiusKm: number) => {
    const current = livePosRef.current;
    return (
      hasFreshGpsRef.current &&
      current != null &&
      haversineKm(current, { lat: poi.lat, lng: poi.lng }) <= radiusKm
    );
  }, []);
  const beginPoiNarration = useCallback((traceId: string, source: string) => {
    const token = ++poiNarrationTokenRef.current;
    poiNarrationPendingRef.current.add(token);
    watchPoiLog("POI narration started", { traceId, source, token });
    return (reason = "released") => {
      const wasPending = poiNarrationPendingRef.current.delete(token);
      watchPoiLog("POI narration ended", {
        traceId,
        source,
        token,
        reason,
        wasPending,
      });
    };
  }, []);
  /** Terrain-Abschnitte werden pro Wanderung jeweils nur einmal angesagt. */
  const terrainStartedRef = useRef<Set<string>>(new Set());
  const terrainProgressRef = useRef<Set<string>>(new Set());
  const terrainEndedRef = useRef<Set<string>>(new Set());
  const narrationSoundRef = useRef<AudioSound | null>(null);
  const narrationTeardownRef = useRef<Promise<void>>(Promise.resolve());
  const turnSoundRef = useRef<AudioSound | null>(null);
  const turnCompletionRef = useRef<(() => void) | null>(null);
  const turnGenRef = useRef(0);
  const keepaliveSoundRef = useRef<AudioSound | null>(null);
  // Generationszaehler gegen ueberlappende Sprecher: jeder speak()-Aufruf
  // erhoeht ihn; nach jedem await prueft der Aufruf, ob er noch die aktuelle
  // Generation ist. Ein schneller Doppel-Tipp auf "Wiederholen" startet sonst
  // zwei parallele KI-Anfragen, die BEIDE abspielen (die erste hatte beim
  // stopNarration() der zweiten noch keinen Sound zum Stoppen).
  const narrationGenRef = useRef(0);
  const narrationTraceSequenceRef = useRef(0);
  const narrationActiveKindRef = useRef<NarrationKind | null>(null);
  const narrationActiveTraceIdRef = useRef<string | null>(null);
  // Warteschlange fuer Sprachausgaben: POI, Navigation, Wegoberflaech,
  // Meilenstein etc. unterbrechen keine laufende Erzaehlung, sondern reihen
  // sich ein und spielen ab, sobald das aktuelle Audio zu Ende ist.
  const narrationQueueRef = useRef<NarrationQueueItem[]>([]);
  // Solange die Einleitung noch nicht gestartet/abgeschlossen ist, werden
  // alle nicht-navigierenden Ansagen bereits vorgemerkt.
  const startupSequenceActiveRef = useRef(false);
  // Vorgeladene OpenAI-URI fuer den Entscheidungs-Ack ("Ich verstehe.").
  // Wird beim Hike-Start im Hintergrund erzeugt, damit bei der Wahl zero
  // Netzwerk-Latenz anfaellt und das OpenAI-Audio sofort ertönt.
  const ackAudioUriRef = useRef<string | null>(null);
  const startupSequenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const startupSequenceGenRef = useRef(0);
  const chapterAudioRetryTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const chapterAudioRetryCountRef = useRef<Map<number, number>>(new Map());
  const terrainModelRequestRef = useRef<{
    lat: number;
    lng: number;
    requestedAt: number;
    focusBearingKey: string;
  } | null>(null);
  const terrainModelRetryTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  // OSM-Relation-ID aus Route-ID extrahieren (Format: "osm-NNNN")
  const osmId = route?.id?.startsWith("osm-")
    ? parseInt(route.id.slice(4), 10)
    : null;

  // Wegoberflaechenkategorie normalisieren (OSM-surface-Tag → 5 Klassen)
  function normalizeSurface(s: string): WatchUpcomingSurfaceChange["surface"] {
    const v = s.toLowerCase();
    if (/^(asphalt|paved|concrete|paving_stones|cobblestone|sett)/.test(v))
      return "asphalt";
    if (/^(gravel|compacted|fine_gravel|pebblestone|crushed_limestone)/.test(v))
      return "kies";
    if (/^(rock|stone|bare_rock)/.test(v)) return "fels";
    if (/^(wood|boardwalk)/.test(v)) return "holz";
    return "naturweg";
  }

  // Wetter-Klassifizierung: aus WeatherReport wird eine von 8 atmosphaerischen
  // Kategorien abgeleitet, die als stimmungsvoller Einstieg in die Narration dient.
  function classifyWetter(r: WeatherReport): WetterKlasse {
    const c = r.weatherCode;
    if (c >= 95) return "gewitter";
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "schnee";
    if (c >= 51 && c <= 82) return "regen";
    if (c === 45 || c === 48) return "nebel";
    if (r.temperatureC >= 28) return "heiss";
    if (r.temperatureC <= 3) return "kalt";
    if (c <= 1) return "sonnig";
    return "bewoelkt";
  }

  // KI-Erzaehlstimme (ElevenLabs) ist online-only und ausschliesslich fuer
  // Premium — kein Offline-Fallback. Fuer "gsw" wird dabei NIE Dialekt-Text
  // verwendet: die Story wird in diesem Fall in Hochdeutsch angefordert, die
  // Schweizer Faerbung kommt allein ueber die Stimmwahl (server-seitig).
  const storyLanguage = effectiveStoryLanguage(profile?.language ?? "de", true);
  const localizedSagaTitle = saga
    ? getLocalizedSagaTitle(saga, storyLanguage)
    : (route?.name ?? "");
  // cueLanguage: fuer alle OpenAI-gesprochenen Texte (Vorspann, Nav-Cues,
  // Meilensteine, POI-Ansagen). OpenAI kann kein Schweizerdeutsch — gsw→de.
  const cueLanguage = storyLanguage === "gsw" ? "de" : storyLanguage;

  // Tageszeit beim Wanderungsstart (unveraenderlich fuer die ganze Session).
  const timeOfDay = useMemo((): "morgen" | "mittag" | "abend" | "nacht" => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return "morgen";
    if (h >= 11 && h < 17) return "mittag";
    if (h >= 17 && h < 22) return "abend";
    return "nacht";
  }, []);

  // Wetter einmalig laden, sobald Route-Koordinaten bekannt sind.
  // Schlägt die Anfrage fehl (offline/Timeout), bleibt hikeWeather null —
  // die Narration läuft dann ohne Wettereinleitung weiter.
  useEffect(() => {
    const coords = route?.coordinates;
    if (!coords) return;
    let cancelled = false;
    getWeather({ lat: coords.lat, lng: coords.lng })
      .then((r) => {
        if (!cancelled) setHikeWeather(r);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [route?.coordinates?.lat, route?.coordinates?.lng]);

  // Höhenprofil einmalig pro Route laden. Die Profilpunkte werden nicht nur
  // gezeichnet: terrainCues.ts verdichtet sie für die gesprochenen
  // Aufstiegs-/Gefällehinweise und die Sicherheitswarnung ab 30 Prozent.
  useEffect(() => {
    const geometry = navigationGeometry;
    terrainStartedRef.current.clear();
    terrainProgressRef.current.clear();
    terrainEndedRef.current.clear();
    if (!geometry || geometry.length < 2) {
      setTerrainProfile(null);
      setTerrainProfileGeometry(null);
      return;
    }
    let cancelled = false;
    setTerrainProfile(null);
    setTerrainProfileGeometry(null);
    const requestGeometry =
      geometry.length <= 2000
        ? geometry
        : geometry.filter(
            (_, index) =>
              index === 0 ||
              index === geometry.length - 1 ||
              index % Math.ceil(geometry.length / 2000) === 0,
          );
    const base = getApiBaseUrl() ?? "";
    fetch(`${base}/api/elevation-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geometry: requestGeometry }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Höhenprofil nicht verfügbar");
        return response.json() as Promise<{ profile?: TerrainProfilePoint[] }>;
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data.profile)) {
          if (__DEV__) {
            const profile = data.profile.filter(
              (point) =>
                Number.isFinite(point.distanceKm) &&
                Number.isFinite(point.altM),
            );
            const profileStart = profile[0] ?? null;
            const profileEnd = profile[profile.length - 1] ?? null;
            const firstBands = buildRouteGradeSegments(geometry, profile)
              .slice(0, 4)
              .map((segment) => segment.band);
            console.info("[TerrainProfile] active geometry aligned", {
              geometryPoints: geometry.length,
              geometryLengthKm: Number(geometryLengthKm(geometry).toFixed(3)),
              profilePoints: profile.length,
              profileStart,
              profileEnd,
              firstBands,
            });
          }
          setTerrainProfileGeometry(geometry);
          setTerrainProfile(data.profile);
        }
      })
      .catch(() => {
        // Ohne Profil bleibt die Wanderung unverändert nutzbar; es gibt dann
        // lediglich keine Terrain-Ansagen.
      });
    return () => {
      cancelled = true;
    };
  }, [route?.id, navigationGeometry]);

  // Wegoberflaechenpunkte einmalig laden, sobald die OSM-Relation-ID bekannt ist.
  // Schlaegt die Anfrage fehl, bleibt rawSurfacePoints leer — kein Fehlerfall.
  useEffect(() => {
    if (!osmId) return;
    let cancelled = false;
    getRouteSurfaces({ osmId })
      .then((r) => {
        if (!cancelled) setRawSurfacePoints(r.points);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [osmId]);

  // Wegoberflaechenpunkte → fraktionsbasierte Abschnitte (0–1) entlang der Route.
  // Dedupliziert konsekutive gleiche Kategorien, filtert Startbereich heraus.
  const surfacePoints = useMemo(() => {
    if (
      !navigationGeometry ||
      navigationGeometry.length < 2 ||
      rawSurfacePoints.length === 0
    )
      return [];
    return rawSurfacePoints
      .map((p) => {
        const match = fortschrittAufRoute(
          { lat: p.lat, lng: p.lng },
          navigationGeometry,
        );
        if (!match || match.distKm > 0.5) return null;
        return {
          fraction: match.fraction,
          surface: normalizeSurface(p.surface),
        };
      })
      .filter(
        (
          x,
        ): x is {
          fraction: number;
          surface: WatchUpcomingSurfaceChange["surface"];
        } => x !== null,
      )
      .sort((a, b) => a.fraction - b.fraction)
      .filter((p, i, arr) => i === 0 || p.surface !== arr[i - 1].surface);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSurfacePoints, navigationGeometry]);

  // Begruessung (Wetter + Solo-Name + Tageszeit + Routen-Einleitung),
  // die dem ersten Kapitel vorangestellt wird.
  // gsw → de: OpenAI TTS kann kein Schweizerdeutsch; der Begrüssungstext
  // bleibt deshalb immer Hochdeutsch — nur die Sage selbst ist Mundart.
  const greetingPrefix = useMemo(() => {
    const greetingLang = storyLanguage === "gsw" ? "de" : storyLanguage;
    const pack = STORY_PACKS[resolveLang(greetingLang)];
    const wetterSatz = hikeWeather
      ? pack.weatherPhrase(classifyWetter(hikeWeather))
      : "";
    const tod = pack.timeOfDayGreeting(timeOfDay);
    const personal =
      !inGruppe && profile?.name?.trim()
        ? `${pack.soloGreeting(profile.name.trim())} `
        : "";
    // SAC-Schwierigkeit → vereinfachte Dreistufung
    const difficulty: "leicht" | "mittel" | "anspruchsvoll" =
      sac === "T1" || sac === "T2"
        ? "leicht"
        : sac === "T4" || sac === "T5" || sac === "T6"
          ? "anspruchsvoll"
          : "mittel";
    const hasSteepSections = totalKm > 0 && ascentM / totalKm > 80;
    const mainSurfaces = [
      ...new Set(surfacePoints.map((sp) => sp.surface)),
    ].slice(0, 2);
    const poiNamesList = displayedPois
      .slice(0, 3)
      .map((poi) => poi.name)
      .filter((n): n is string => Boolean(n));
    const briefing = route
      ? pack.routeBriefing({
          name: !inGruppe ? (profile?.name?.trim() ?? null) : null,
          distanceKm: totalKm,
          minutes: totalMin,
          difficulty,
          hasSteepSections,
          surfaces: mainSurfaces,
          poiNames: poiNamesList,
          wetterKlasse: hikeWeather ? classifyWetter(hikeWeather) : null,
        })
      : "";
    return `${wetterSatz} ${personal}${tod} ${briefing}`.trim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    storyLanguage,
    timeOfDay,
    hikeWeather,
    surfacePoints,
    displayedPois,
    totalKm,
    totalMin,
    sac,
    ascentM,
    route,
    inGruppe,
  ]);

  // Audiosession so konfigurieren, dass die Sprachausgabe auch bei
  // aktiviertem Stummschalter (iOS) hoerbar ist.
  // shouldPlayInBackground: true ist die eigentliche Voraussetzung dafuer,
  // dass die KI-Erzaehlung via expo-audio weiterlaeuft, wenn die App in den
  // Hintergrund geht oder das Display gesperrt wird — zusammen mit
  // UIBackgroundModes "audio" (app.json) und, fuer echte GPS-Fortschritte im
  // Hintergrund, dem Standort-Foreground-Service (siehe unten).
  // DuckOthers statt MixWithOthers: laeuft im Hintergrund z. B. Musik/ein
  // Podcast, wird diese waehrend der Erzaehlung leiser gedreht statt in
  // voller Lautstaerke weiterzulaufen, und danach wieder normal laut.
  useEffect(() => {
    // Grundmodus: MixWithOthers — der stille Keepalive-Loop darf andere Apps
    // (Musik, Podcasts) nicht dauerhaft ducken. DuckOthers wird nur waehrend
    // aktiver Erzaehlung gesetzt und danach sofort zurueckgenommen.
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "mixWithOthers",
    }).catch(() => {});
  }, []);

  // Stiller Audio-Keepalive — haelt die iOS-Audiosession zwischen zwei Kapiteln
  // aktiv. Ohne laufendes Audio suspendiert iOS den JS-Thread, selbst wenn
  // shouldPlayInBackground:true gesetzt ist; der naechste GPS-Event aus dem
  // Background-Task weckt den Thread dann nicht zuverlaessig genug, um das
  // naechste Kapitel zu starten. Ein unhoerabarer (volume:0) WAV-Loop
  // signalisiert iOS, dass die App Audio "spielt", und haelt den Thread wach.
  // Wird gestoppt, sobald die Wanderung endet oder die Komponente ausgehaengt.
  useEffect(() => {
    // Bei einer neuen Wanderung bleibt auch der stille Keepalive bis zur
    // GPS-basierten Startbestätigung aus. Sonst wäre bereits vor der Auswahl
    // eine aktive Audiosession vorhanden.
    if (Platform.OS === "web" || !startGateConfirmedRef.current) return;
    let mounted = true;
    let sound: AudioSound | null = null;
    (async () => {
      try {
        const base64 = buildKeepaliveWavBase64();
        const uri =
          (FileSystem.cacheDirectory ?? "") + "sagatrail_keepalive.wav";
        await FileSystem.writeAsStringAsync(uri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (!mounted) return;
        const result = await createAudioSound(
          { uri },
          // volume: 0.015 — 80-Hz-Ton bei ~0.1 % Amplitude (absolut unhoerbar).
          // Hoeher als zuvor (0.008) damit SBC-Encoder des Auto-Radios den
          // Datenstrom zuverlaessig als "aktiv" einordnet und nicht abbricht.
          { shouldPlay: true, isLooping: true, volume: 0.015 },
        );
        if (!mounted) {
          result.sound.unloadAsync().catch(() => {});
          return;
        }
        sound = result.sound;
        keepaliveSoundRef.current = sound;
      } catch {
        // Best effort — ohne Keepalive laeuft die Erzaehlung weiter,
        // aber iOS koennte den JS-Thread zwischen Kapiteln einschlaefern.
      }
    })();
    return () => {
      mounted = false;
      sound?.unloadAsync().catch(() => {});
      keepaliveSoundRef.current = null;
    };
  }, [startGateConfirmed]);

  // Story vorbereiten: Offline-First (lokal -> Server -> Seed) ueber resolveStory.
  // resolveStory wendet effectiveStoryLanguage intern selbst an — hier wird
  // bewusst das UNveraenderte Profil uebergeben, storyProfile dient nur dazu,
  // die tatsaechlich verwendete Sprache lokal zu kennen.
  useEffect(() => {
    if (!saga || !profile) return;
    let cancelled = false;
    let completed = false;
    const previousInputs = storySetupInputsRef.current;
    const dependencyChanges = previousInputs
      ? {
          sagaReferenceChanged: previousInputs.saga !== saga,
          profileReferenceChanged: previousInputs.profile !== profile,
          premiumChanged: previousInputs.premium !== premium,
          storyLanguageChanged: previousInputs.storyLanguage !== storyLanguage,
          resolveStoryReferenceChanged:
            previousInputs.resolveStory !== resolveStory,
        }
      : { initial: true };
    const storyLoadGeneration = ++storyLoadGenerationRef.current;
    storySetupInputsRef.current = {
      saga,
      profile,
      premium,
      storyLanguage,
      resolveStory,
    };
    logDecisionFlow("story_setup_started", currentIndexRef.current, {
      storyLoadGeneration,
      dependencyChanges,
      preparingBefore: preparing,
      isResume,
    });
    setPreparing(true);
    poiStoryClaimsRef.current = [];
    narratedPoiIdRef.current = null;
    poiStoryToldRef.current = null;
    (async () => {
      const { chapters: story } = await resolveStory(saga, profile, premium);
      if (cancelled) return;
      logDecisionFlow("story_state_reset", currentIndexRef.current, {
        storyLoadGeneration,
        loadedChapterCount: story.length,
        previousState: decisionDebugSnapshot(currentIndexRef.current),
      });
      setChapters(story);
      decisionsRef.current = story;
      decisionTriggerCountRef.current.clear();
      decisionPromptCountRef.current.clear();
      decisionDebugSequenceRef.current = 0;
      lastDecisionTriggeredRef.current = -1;
      resolvedDecisionIndexRef.current = null;
      promptedDecisionRef.current = -1;
      const resumeAt = resumeIndexRef.current;
      resumeIndexRef.current = null;
      if (resumeAt != null && resumeAt > 0 && resumeAt < story.length) {
        setCurrentIndex(resumeAt);
      }
      storyCompleteRef.current = false;
      routeCompletedRef.current = false;
      storyProgressMaxRef.current = 0;
      storyEligibleChapterRef.current = 0;
      startupSequenceActiveRef.current = false;
      chapterAudioRetryCountRef.current.clear();
      if (chapterAudioRetryTimerRef.current !== null) {
        clearTimeout(chapterAudioRetryTimerRef.current);
        chapterAudioRetryTimerRef.current = null;
      }
      narratedThroughRef.current =
        resumeAt != null && resumeAt > 0 ? resumeAt - 1 : -1;
      setFinished(false);
      setPreparing(false);
      completed = true;
      logDecisionFlow("story_loaded", currentIndexRef.current, {
        storyLoadGeneration,
        chapterCount: story.length,
        resumeAt: resumeAt ?? null,
        resetRefs: true,
      });
    })();
    return () => {
      cancelled = true;
      logDecisionFlow("story_setup_cleanup", currentIndexRef.current, {
        storyLoadGeneration,
        completed,
      });
    };
  }, [saga, profile, premium, storyLanguage, resolveStory]);

  // Die einmalige kostenlose Wanderung wird genau dann verbraucht, wenn ein
  // nicht-Premium-Nutzer hier tatsaechlich eine Wanderung startet (Story ist
  // bereit). markFreeHikeUsed ist selbst ein No-op, falls bereits verbraucht.
  useEffect(() => {
    if (!startGateConfirmedRef.current || preparing || premium || freeHikeUsed)
      return;
    markFreeHikeUsed().catch(() => {
      // Best effort — schlaegt der Serveraufruf fehl, bleibt die Wanderung
      // trotzdem nutzbar; ein erneuter Versuch erfolgt bei der naechsten
      // Wanderung.
    });
  }, [preparing, premium, freeHikeUsed, markFreeHikeUsed, startGateConfirmed]);

  // Meldet den Wander-Status an eine aktive Gruppensitzung, damit andere
  // Mitglieder live sehen, wenn jemand die gemeinsame Wanderung startet.
  useEffect(() => {
    if (
      !startGateConfirmedRef.current ||
      !groupSession ||
      !saga ||
      preparing ||
      groupHikeStartedRef.current
    )
      return;
    setGroupActivity({
      type: "wandert",
      sagaTitle: localizedSagaTitle,
      startedAt: Date.now(),
      sagaId: saga.id,
      ...(route ? { routeId: route.id } : {}),
    });
    // Die Leitung kuendigt den Start der gemeinsamen Wanderung an, damit
    // Mitglieder direkt auf dieselbe Route einsteigen koennen.
    if (groupSession.isLeader && route) {
      groupHikeStartedRef.current = true;
      sendGroupHikeEvent({
        kind: "start",
        sagaId: saga.id,
        routeId: route.id,
        routeName: route.name,
        clientHikeId: ensureClientHikeId(),
      });
    }
    return () => {
      setGroupActivity({ type: "idle" });
    };
  }, [
    groupSession?.code,
    groupSession?.isLeader,
    saga,
    route,
    preparing,
    localizedSagaTitle,
    setGroupActivity,
    sendGroupHikeEvent,
    startGateConfirmed,
    ensureClientHikeId,
  ]);

  // Leitung: Kapitelwechsel an die Gruppe senden, damit Mitglieder synchron
  // dieselbe Stelle der Sage hoeren. Aendert sich die Mitgliederliste
  // (spaeter Beitritt), wird der aktuelle Stand erneut gesendet, damit auch
  // Nachzuegler sofort auf dem richtigen Kapitel stehen.
  const mitgliederAnzahl = groupSession?.members.length ?? 0;
  useEffect(() => {
    if (!istGruppenleitung || preparing || chapters.length === 0) return;
    sendGroupHikeEvent({ kind: "chapter", index: currentIndex });
  }, [
    istGruppenleitung,
    preparing,
    chapters.length,
    currentIndex,
    mitgliederAnzahl,
    sendGroupHikeEvent,
  ]);

  // Mitglied: Ereignissen der Gruppenleitung folgen (Kapitel und
  // Entscheidungen). Entscheidungen trifft ausschliesslich die Leitung.
  // Jedes Ereignis wird genau einmal verarbeitet (receivedAt als Marke).
  const verarbeitetesEreignisRef = useRef<number>(0);
  const advanceStoryChapter = useCallback(
    (chapterIndex: number) => {
      if (
        storyCompleteRef.current ||
        chapterIndex !== currentIndexRef.current ||
        chapters.length === 0 ||
        narratedThroughRef.current < chapterIndex
      ) {
        return;
      }
      if (chapterIndex >= chapters.length - 1) {
        storyCompleteRef.current = true;
        if (routeCompletedRef.current) setFinished(true);
        return;
      }
      // Die gelaufene Distanz gibt nur das nächste Kapitel frei; die
      // Routenprojektion oder ein Routenabschluss darf keine fehlenden
      // Kapitel vorzeitig freigeben.
      if (storyEligibleChapterRef.current <= chapterIndex) {
        return;
      }
      awaitingDecisionRef.current = false;
      setAwaitingDecision(false);
      setCurrentIndex(chapterIndex + 1);
    },
    [chapters.length],
  );
  useEffect(() => {
    if (!folgtGruppenleitung || !groupHikeEvent || preparing) return;
    if (groupHikeEvent.receivedAt === verarbeitetesEreignisRef.current) return;
    verarbeitetesEreignisRef.current = groupHikeEvent.receivedAt;
    const { event } = groupHikeEvent;
    if (event.kind === "chapter") {
      setCurrentIndex((prev) => {
        if (event.index <= prev || event.index >= chapters.length) return prev;
        return event.index;
      });
      return;
    }
    if (event.kind === "decision") {
      logDecisionFlow("group_decision_received", event.chapterIndex, {
        optionIndex: event.optionIndex,
        receivedAt: groupHikeEvent.receivedAt,
      });
      const gewaehlt =
        chapters[event.chapterIndex]?.decision?.options[event.optionIndex]
          ?.label;
      if (!gewaehlt) {
        logDecisionFlow("group_decision_ignored", event.chapterIndex, {
          optionIndex: event.optionIndex,
          reason: "invalid_option",
        });
        return;
      }
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      setChoiceFeedback(t.leaderChose(gewaehlt));
      feedbackTimerRef.current = setTimeout(
        () => setChoiceFeedback(null),
        3000,
      );
      setChapters((prev) => {
        if (!prev[event.chapterIndex]?.decision) return prev;
        const next = [...prev];
        next[event.chapterIndex] = {
          ...next[event.chapterIndex],
          chosenOptionIndex: event.optionIndex,
        };
        decisionsRef.current = next;
        return next;
      });
      // Der offene Entscheidungspunkt wird nur geschlossen, wenn die
      // Entscheidung tatsaechlich das aktuell angezeigte Kapitel betrifft.
      if (event.chapterIndex === currentIndexRef.current) {
        awaitingDecisionRef.current = false;
        setAwaitingDecision(false);
        logDecisionFlow("group_decision_closed", event.chapterIndex, {
          optionIndex: event.optionIndex,
        });
        if (!speakingRef.current) {
          advanceStoryChapter(event.chapterIndex);
        } else {
          pendingGroupDecisionAdvanceRef.current = event.chapterIndex;
        }
      }
    }
  }, [
    advanceStoryChapter,
    folgtGruppenleitung,
    groupHikeEvent,
    preparing,
    chapters,
    t,
  ]);

  // Seilbahnen/Standseilbahnen im Kartenausschnitt laden (typisches alpines
  // Wander-Verkehrsmittel) — nur mit Kartenmittelpunkt sinnvoll, best effort.
  useEffect(() => {
    const first = navigationGeometry?.[0];
    const center = first
      ? { lat: first[0], lng: first[1] }
      : (route?.coordinates ?? saga?.coordinates ?? mapCenter);
    if (!center) return;
    let cancelled = false;
    const bbox = bboxAroundGeometry(navigationGeometry, center);
    getAerialways(bbox)
      .then((result) => {
        if (!cancelled) setAerialways(result);
      })
      .catch(() => {
        if (!cancelled) setAerialways(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    navigationGeometry,
    route?.coordinates,
    saga?.coordinates,
    mapCenter?.lat,
    mapCenter?.lng,
  ]);

  // Historische/touristische Orte im Kartenausschnitt laden, live mit
  // Wikipedia-Zusammenfassungen angereichert — best effort, kein Blocker.
  useEffect(() => {
    const first = navigationGeometry?.[0];
    const center = first
      ? { lat: first[0], lng: first[1] }
      : (route?.coordinates ?? saga?.coordinates ?? mapCenter);
    if (!center) return;
    let cancelled = false;
    // Der Gipfelkorridor entspricht der maximalen Erkennungsdistanz. Andere
    // POI-Typen werden danach weiterhin mit ihren engeren Korridoren gefiltert.
    const bbox = bboxAroundGeometry(navigationGeometry, center, 2.0);
    // Alpine Naturmerkmale dürfen bis 2 km vom Routenverlauf entfernt sein.
    // Ruinen/archäologische Fundstätten: 1 km (oft etwas abseits des Weges).
    // Alle anderen POIs (Kreuze, Kapellen, Brunnen, …): 0.5 km.
    const ALPINE_KINDS = new Set([
      "natural=peak",
      "natural=saddle",
      "natural=glacier",
      "natural=rock",
      "natural=arch",
      "natural=gorge",
      "geological=erratic",
      "geological=moraine",
    ]);
    const RUIN_KINDS = new Set([
      "historic=ruins",
      "historic=archaeological_site",
      "historic=fort",
      "historic=roman_road",
      "historic=roman_villa",
      "historic=roman_building",
      "historic=battlefield",
    ]);
    const korridorKm = (kind: string): number => {
      if (ALPINE_KINDS.has(kind)) return 2.0;
      if (RUIN_KINDS.has(kind)) return 1.0;
      return 0.5;
    };
    const geo = navigationGeometry;

    const filterAndSet = (result: Awaited<ReturnType<typeof getPois>>) => {
      // Ein leeres Resultat kann der kurzfristige Overpass-Warm-up sein.
      // Vorhandene Original-/Offline-POIs bleiben bis zum erfolgreichen
      // Nachladen des aktiven Zubringerkorridors erhalten.
      if (result.length === 0) return;
      const gefiltert =
        geo && geo.length > 1
          ? result.filter((p) => {
              const punkt = { lat: p.lat, lng: p.lng };
              const maxKm = korridorKm(p.kind ?? "");
              for (let i = 0; i < geo.length - 1; i++) {
                if (
                  distanzZuSegmentKm(
                    punkt,
                    { lat: geo[i][0], lng: geo[i][1] },
                    { lat: geo[i + 1][0], lng: geo[i + 1][1] },
                  ) <= maxKm
                ) {
                  return true;
                }
              }
              return false;
            })
          : [];
      // Sagenmittelpunkt als synthetischen POI einfügen — nur wenn die
      // Koordinaten als "exakt" klassifiziert sind (99 von 236 Sagen).
      // "ungefaehr"-Koordinaten liegen nur grob im Gemeindegebiet und
      // würden den POI an der falschen Stelle auslösen.
      const sagaHeartPoi: Poi | null =
        saga?.coordinates &&
        localizedSagaTitle &&
        saga?.id &&
        saga?.koordinatenSicherheit === "exakt"
          ? {
              id: `saga-heart-${saga.id}`,
              name: localizedSagaTitle,
              kind: "saga=heart",
              lat: saga.coordinates.lat,
              lng: saga.coordinates.lng,
              osmContext: saga.summary ?? undefined,
            }
          : null;
      const mitSagaHerz = sagaHeartPoi
        ? [...gefiltert.filter((p) => p.id !== sagaHeartPoi.id), sagaHeartPoi]
        : gefiltert;
      if (!cancelled) setPois(mitSagaHerz);
    };

    // Bei Netzfehler ODER leerem Ergebnis (transienter Overpass-Timeout-Cache)
    // wird automatisch nachgeladen: sofort, dann alle 35 s — max. 10 Versuche.
    // 35 s > 30 s Server-Error-Cache UND > typische Overpass-Ladezeit (~5-15 s),
    // damit der naechste Versuch echte Daten aus dem Cache bekommt.
    const MAX_RETRIES = 10;
    // 35 s > 30 s Server-Error-Cache, aber kuerzer als fruehere 60 s.
    // Seit getPois() sofort [] zurueckgibt (fire-and-forget), ist der
    // Overpass-Cache nach ~5–15 s gefuellt; 35 s-Retry holt dann echte Daten.
    const RETRY_INTERVAL_MS = 35_000;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const tryLoad = () => {
      getPois(bbox)
        .then((result) => {
          filterAndSet(result);
          if (result.length === 0 && attempt < MAX_RETRIES && !cancelled) {
            attempt++;
            retryTimer = setTimeout(tryLoad, RETRY_INTERVAL_MS);
          }
        })
        .catch(() => {
          if (attempt < MAX_RETRIES && !cancelled) {
            attempt++;
            retryTimer = setTimeout(tryLoad, RETRY_INTERVAL_MS);
          }
        });
    };

    // Offline-Cache bevorzugen wenn heruntergeladen — kein Netzwerk noetig.
    (async () => {
      let offlineLoaded = false;
      if (route?.id) {
        try {
          const offlinePois = await loadOfflinePois(route.id);
          if (offlinePois && !cancelled) {
            filterAndSet(offlinePois as Awaited<ReturnType<typeof getPois>>);
            offlineLoaded = true;
          }
        } catch {}
      }
      if (cancelled || isOffline) return;
      // Der Offline-Cache gehört zur Katalogroute. Nach einem Zubringer muss
      // online zusätzlich der neue aktive Gesamtkorridor geladen werden.
      if (offlineLoaded && !acceptedRouteGeometry) return;
      // Immer laden — cancelled-Check ist in filterAndSet/retry enthalten.
      tryLoad();
    })();

    return () => {
      cancelled = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
    };
  }, [
    acceptedRouteGeometry,
    navigationGeometry,
    route?.id,
    route?.coordinates,
    saga?.coordinates,
    mapCenter?.lat,
    mapCenter?.lng,
    loadOfflinePois,
    isOffline,
  ]);

  // Gipfel werden erst bei geöffneter Panorama-Kachel geladen. Die Abfrage
  // verwendet den aktuellen, frischen GPS-Standort und enthält ausschließlich
  // natural=peak — ein 20-km-Radius darf die normalen POIs nicht aufblasen.
  useEffect(() => {
    if (!panoramaTileOpen || !hasFreshGps || !livePos) {
      return;
    }
    const previous = panoramaPeakRequestRef.current;
    if (
      previous &&
      Date.now() - previous.requestedAt < 120_000 &&
      haversineKm(previous, livePos) < 0.5
    ) {
      return;
    }
    panoramaPeakRequestRef.current = {
      lat: livePos.lat,
      lng: livePos.lng,
      requestedAt: Date.now(),
    };
    let cancelled = false;
    const bbox = bboxAroundGeometry(null, livePos, PANORAMA_ROUTE_CORRIDOR_KM);
    getPeakPois({
      ...bbox,
      centerLat: livePos.lat,
      centerLng: livePos.lng,
      radiusKm: PANORAMA_ROUTE_CORRIDOR_KM,
    })
      .then((result) => {
        if (!cancelled) setPanoramaOnlinePois(result);
      })
      .catch(() => {
        if (!cancelled) {
          panoramaPeakRequestRef.current = null;
          setPanoramaOnlinePois([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [panoramaTileOpen, hasFreshGps, livePos?.lat, livePos?.lng]);

  // Aktive Partnerbetriebe (Restaurants, Souvenirlaeden, ...) im Kartenausschnitt
  // laden — gleiche Bounding Box wie die Seilbahnen, kein Korridorfilter noetig,
  // da Partner ohnehin nur vereinzelt gepflegt werden.
  useEffect(() => {
    const first = navigationGeometry?.[0];
    const center = first
      ? { lat: first[0], lng: first[1] }
      : (route?.coordinates ?? saga?.coordinates ?? mapCenter);
    if (!center) return;
    let cancelled = false;
    const bbox = bboxAroundGeometry(navigationGeometry, center, 5.0);
    getPartners(bbox)
      .then((result) => {
        if (!cancelled) setPartners(result);
      })
      .catch(() => {
        if (!cancelled) setPartners([]);
      });
    return () => {
      cancelled = true;
    };
  }, [
    navigationGeometry,
    route?.coordinates,
    saga?.coordinates,
    mapCenter?.lat,
    mapCenter?.lng,
  ]);

  // Trinkwasser im Umkreis der Route laden (Mittelpunkt, 8 km Radius).
  useEffect(() => {
    const first = navigationGeometry?.[0];
    const center = first
      ? { lat: first[0], lng: first[1] }
      : (route?.coordinates ?? saga?.coordinates ?? mapCenter);
    if (!center) return;
    const geometry = navigationGeometry;
    if (!geometry || geometry.length < 2) {
      setWaterSources([]);
      return;
    }
    let cancelled = false;
    loadOfflineSafety(route?.id ?? "").then((cached) => {
      if (!cancelled && cached) {
        setWaterSources(
          filterByRouteCorridor(cached.waterSources, geometry, 0.75),
        );
      }
    });
    if (isOffline) {
      return () => {
        cancelled = true;
      };
    }
    const base = getApiBaseUrl() ?? "";
    fetch(
      `${base}/api/trinkwasser?lat=${center.lat}&lng=${center.lng}&radius=8000`,
    )
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return;
        const mapped: MapPoi[] = (
          data as {
            osmId: string;
            lat: number;
            lng: number;
            name: string | null;
          }[]
        )
          .filter((w) => w?.osmId)
          .map((w) => ({
            id: w.osmId,
            name: w.name ?? "Trinkwasser",
            lat: w.lat,
            lng: w.lng,
            description: null,
          }));
        setWaterSources(filterByRouteCorridor(mapped, geometry, 0.75));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    navigationGeometry,
    route?.coordinates,
    saga?.coordinates,
    mapCenter?.lat,
    mapCenter?.lng,
    isOffline,
    loadOfflineSafety,
  ]);

  // Toiletten und Sicherheitsinfrastruktur als sachliche Kartenebene laden.
  // Diese POIs werden absichtlich nicht in den Erzähl-/Wikipedia-Flow gegeben.
  useEffect(() => {
    const first = navigationGeometry?.[0];
    const center = first
      ? { lat: first[0], lng: first[1] }
      : (route?.coordinates ?? saga?.coordinates ?? mapCenter);
    if (!center) return;
    const geometry = navigationGeometry;
    if (!geometry || geometry.length < 2) {
      setSafetyPois([]);
      return;
    }
    let cancelled = false;
    loadOfflineSafety(route?.id ?? "").then((cached) => {
      if (!cancelled && cached) {
        setSafetyPois(filterByRouteCorridor(cached.safetyPois, geometry, 0.75));
      }
    });
    if (isOffline) {
      return () => {
        cancelled = true;
      };
    }
    const base = getApiBaseUrl() ?? "";
    fetch(
      `${base}/api/safety-pois?lat=${center.lat}&lng=${center.lng}&radius=10000`,
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return;
        const mapped = data
          .filter(
            (
              p,
            ): p is {
              osmId: string;
              category: string;
              name: string;
              lat: number;
              lng: number;
              description?: string | null;
              phone?: string | null;
              openingHours?: string | null;
            } => Boolean(p && typeof p.osmId === "string"),
          )
          .map((p) => ({
            id: p.osmId,
            name: p.name,
            lat: p.lat,
            lng: p.lng,
            category: p.category,
            description:
              [
                p.description,
                p.phone ? `Tel. ${p.phone}` : null,
                p.openingHours,
              ]
                .filter(Boolean)
                .join(" · ") || null,
          }));
        setSafetyPois(filterByRouteCorridor(mapped, geometry, 0.75));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    navigationGeometry,
    route?.coordinates,
    saga?.coordinates,
    mapCenter?.lat,
    mapCenter?.lng,
    isOffline,
    loadOfflineSafety,
  ]);

  // Parkplätze am Start- und Endpunkt der Route laden (je 800 m Radius).
  useEffect(() => {
    const geom = navigationGeometry;
    if (!geom || geom.length < 2) return;
    let cancelled = false;
    loadOfflineSafety(route?.id ?? "").then((cached) => {
      if (!cancelled && cached) {
        setParkingSpots(cached.parkingSpots);
      }
    });
    if (isOffline) {
      return () => {
        cancelled = true;
      };
    }
    const base = getApiBaseUrl() ?? "";
    const startPt = { lat: geom[0][0], lng: geom[0][1] };
    const endPt = {
      lat: geom[geom.length - 1][0],
      lng: geom[geom.length - 1][1],
    };
    type ParkingItem = {
      osmId: string;
      lat: number;
      lng: number;
      name: string | null;
      address: string | null;
      parkingType: string | null;
      capacity: number | null;
    };
    const fetchOne = (lat: number, lng: number) =>
      fetch(`${base}/api/parking?lat=${lat}&lng=${lng}&radius=800`)
        .then((r) => r.json() as Promise<ParkingItem[]>)
        .catch(() => [] as ParkingItem[]);
    Promise.all([
      fetchOne(startPt.lat, startPt.lng),
      fetchOne(endPt.lat, endPt.lng),
    ]).then(([fromStart, fromEnd]) => {
      if (cancelled) return;
      const seen = new Set<string>();
      const merged: MapPoi[] = [];
      for (const item of [
        ...(Array.isArray(fromStart) ? fromStart : []),
        ...(Array.isArray(fromEnd) ? fromEnd : []),
      ]) {
        if (!item?.osmId || seen.has(item.osmId)) continue;
        seen.add(item.osmId);
        const descParts: string[] = [];
        if (item.parkingType) descParts.push(item.parkingType);
        if (item.address) descParts.push(item.address);
        if (item.capacity) descParts.push(`${item.capacity} Plätze`);
        merged.push({
          id: item.osmId,
          name: item.name ?? item.parkingType ?? "Parkplatz",
          lat: item.lat,
          lng: item.lng,
          description: descParts.length > 0 ? descParts.join(" · ") : null,
        });
      }
      setParkingSpots(merged);
    });
    return () => {
      cancelled = true;
    };
  }, [navigationGeometry, route?.id, isOffline, loadOfflineSafety]);

  // Zwischenziele entlang der Route berechnen: Partner (Prio) + POIs,
  // max. 3, innerhalb 100 m Routenabstand.
  useEffect(() => {
    const geom = navigationGeometry;
    if (!geom || geom.length < 2) return;
    if (displayedPois.length === 0 && partners.length === 0) return;
    const wps = computeRouteWaypoints(geom, partners, displayedPois);
    setRouteWaypoints(wps);
    waypointAnnouncedRef.current = new Set();
    announcedPremiumPartnerIdsRef.current = new Set();
    announcingPremiumPartnerIdsRef.current = new Set();
    premiumPartnerDuplicateLogRef.current = new Set();
    setReachedWaypointIds(new Set());
  }, [navigationGeometry, partners, displayedPois]);

  // Heruntergeladene Offline-Kacheln laden, falls diese Wanderung verfuegbar ist.
  useEffect(() => {
    if (!saga || !isDownloaded(saga.id)) return;
    let cancelled = false;
    loadOfflineTiles(saga.id).then((t) => {
      if (!cancelled) setOfflineTiles(t);
    });
    return () => {
      cancelled = true;
    };
  }, [saga, isDownloaded, loadOfflineTiles]);

  // Die Gipfeldatenbank ist separat vom historischen POI-Cache versioniert.
  // So bleibt das Panorama auch dann nachvollziehbar, wenn andere POIs fehlen.
  useEffect(() => {
    setTerrainModel(null);
    setTerrainProfileGeometry(null);
    if (!route?.id || !saga || !isDownloaded(saga.id)) {
      setOfflinePanorama(null);
      return;
    }
    let cancelled = false;
    loadOfflinePanorama(route.id).then((data) => {
      if (!cancelled) {
        setOfflinePanorama(data);
        if (data?.terrainModel) setTerrainModel(data.terrainModel);
        // An offline profile belongs to the catalog geometry. After accepting
        // a start detour, the network effect above fetches a new profile for
        // navigationGeometry; never let the old offline profile overwrite it.
        if (
          !acceptedRouteGeometry &&
          data?.terrainProfile &&
          data.terrainProfile.length >= 2
        ) {
          setTerrainProfile(data.terrainProfile);
          setTerrainProfileGeometry(route.geometry ?? null);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    acceptedRouteGeometry,
    route?.id,
    saga,
    isDownloaded,
    loadOfflinePanorama,
    route?.geometry,
    loadOfflineSafety,
  ]);

  // routeGeomRef wird synchron gehalten damit handleFix (leere Deps)
  // die aktuelle Geometrie immer per Ref lesen kann.
  useEffect(() => {
    routeGeomRef.current = navigationGeometry;
  }, [navigationGeometry]);

  // Neue GPS-Position verarbeiten: real zurueckgelegte Strecke aufaddieren,
  // Track-Punkt loggen und Off-Route-Status ueberpruefen.
  const handleFix = useCallback(
    (
      lat: number,
      lng: number,
      accuracy: number | null = null,
      altitude: number | null = null,
    ) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      lastLocationAtRef.current = Date.now();
      const cur: LatLng = { lat, lng };
      setLivePos(cur);
      setLivePosAccuracy(accuracy);
      // Ein Fix ohne Höhenwert darf keinen alten Messwert weiterverwenden:
      // sonst würde der Höhenwinkel mit einer früheren Beobachterhöhe berechnet.
      setLiveAltitude(
        altitude != null && Number.isFinite(altitude) ? altitude : null,
      );
      // GPS bleibt für die Startdistanz sichtbar, zählt aber vor der
      // Nutzerbestätigung weder als Strecke noch als Track-/Off-Route-Fortschritt.
      if (!startGateConfirmedRef.current) {
        lastFixRef.current = cur;
        return;
      }
      const prev = lastFixRef.current;
      if (hikePausedRef.current) {
        // Keep the reference fresh while paused so resuming does not count the
        // whole pause interval as walked distance or trigger a false detour.
        lastFixRef.current = cur;
        return;
      }
      if (prev) {
        const d = haversineKm(prev, cur);
        // GPS-Rauschen (<3 m) und unrealistische Spruenge (>500 m) ignorieren
        if (d > 0.003 && d < 0.5) {
          setDistance((x) => x + d);
          prevLivePosRef.current = prev; // Vorgaenger fuer Himmelsrichtungsberechnung merken
        }
      }
      lastFixRef.current = cur;
      // Track-Punkt loggen: mindestens TRACK_LOG_INTERVAL_MS Abstand
      const now = Date.now();
      if (now - lastTrackLogTimeRef.current >= TRACK_LOG_INTERVAL_MS) {
        posLogRef.current.push([lat, lng]);
        lastTrackLogTimeRef.current = now;
      }
      // Off-Route-Erkennung: Distanz zum naechsten Punkt auf der geplanten Route.
      const geom = routeGeomRef.current;
      if (startGateConfirmedRef.current && geom && geom.length >= 2) {
        const proj = fortschrittAufRoute(cur, geom);
        const distKm = proj?.distKm ?? 0;
        if (distKm > OFF_ROUTE_THRESHOLD_KM) {
          offRouteCountRef.current += 1;
          if (
            offRouteCountRef.current >= OFF_ROUTE_CONFIRM_FIXES &&
            !isOffRouteRef.current
          ) {
            isOffRouteRef.current = true;
            setOffRoutePos(cur);
          } else if (isOffRouteRef.current) {
            setOffRoutePos(cur);
          }
        } else if (distKm < OFF_ROUTE_RECOVER_KM) {
          offRouteCountRef.current = 0;
          if (isOffRouteRef.current) {
            isOffRouteRef.current = false;
            setOffRoutePos(null);
          }
        }
      }
    },
    [],
  );

  // Den naechsten Ort nicht bei jedem GPS-Fix abfragen: Nominatim erlaubt nur
  // eine Anfrage pro Sekunde, und beim Wandern reicht ein Update alle 100 m
  // bzw. spaetestens nach einer Minute.
  useEffect(() => {
    if (!livePos) return;
    const previous = livePlaceLookupRef.current;
    const movedKm = previous
      ? haversineKm(previous, livePos)
      : Number.POSITIVE_INFINITY;
    const elapsedMs = previous
      ? Date.now() - previous.requestedAt
      : Number.POSITIVE_INFINITY;
    if (previous && movedKm < 0.1 && elapsedMs < 60_000) return;

    livePlaceLookupRef.current = { ...livePos, requestedAt: Date.now() };
    const requestGeneration = ++livePlaceLookupGenerationRef.current;
    const base = getApiBaseUrl() ?? "";
    fetch(
      `${base}/api/routes/reverse-geocode?lat=${livePos.lat}&lng=${livePos.lng}`,
    )
      .then((response) => {
        if (!response.ok) throw new Error("Ortsbestimmung nicht verfügbar");
        return response.json() as Promise<{ place?: string | null }>;
      })
      .then((data) => {
        if (requestGeneration !== livePlaceLookupGenerationRef.current) return;
        const place =
          typeof data.place === "string" && data.place.trim()
            ? data.place.trim()
            : null;
        setLivePlace(place);
      })
      .catch(() => {
        // Der letzte bekannte Ort bleibt bei einem kurzen Netzfehler erhalten.
      });
  }, [livePos?.lat, livePos?.lng]);

  // Beim Antippen eines POI-Markers wird der rohe Wikipedia-Auszug live per
  // KI in denselben Erzaehlton wie die Sagen umgeschrieben. Schlaegt das
  // fehl oder laedt es noch, zeigt das Modal den rohen Auszug als Fallback.
  // Ohne Wikipedia-Auszug liefert der Server stattdessen einen kurzen,
  // zurueckhaltenden Kontext aus Name + OSM-Kategorie (kind).
  useEffect(() => {
    if (!selectedPoi) {
      setPoiStory(null);
      setPoiStoryLoading(false);
      return;
    }
    let cancelled = false;
    setPoiStory(null);
    setPoiStoryLoading(true);
    (async () => {
      // Offline-Cache bevorzugen
      const cached = await getOfflinePoiStory(selectedPoi.id, storyLanguage);
      if (cached !== null && !cancelled) {
        setPoiStory(cached);
        setPoiStoryLoading(false);
        return;
      }
      getPoiStory({
        name: selectedPoi.name,
        extract: selectedPoiWiki?.extract ?? selectedPoi.wiki?.extract,
        kind: selectedPoi.kind,
        lang: storyLanguage,
        osmContext: selectedPoi.osmContext ?? undefined,
      })
        .then((result) => {
          if (!cancelled) setPoiStory(result.text);
        })
        .catch(() => {
          // Fallback bleibt der rohe Wikipedia-Auszug (siehe Rendering unten).
        })
        .finally(() => {
          if (!cancelled) setPoiStoryLoading(false);
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPoi, storyLanguage]);

  // Lazy Wiki-Anreicherung fuer getippte POIs (selectedPoi).
  // Identisch zum nearbyPoiWiki-Effekt, aber fuer manuell geoeffnete Karten-POIs.
  useEffect(() => {
    if (!selectedPoi) {
      setSelectedPoiWiki(undefined);
      return;
    }
    setSelectedPoiWiki(undefined);
    let cancelled = false;
    (async () => {
      const cached = await getOfflinePoiDetail(selectedPoi.id);
      if (cached !== undefined) {
        if (!cancelled) setSelectedPoiWiki(cached);
        return;
      }
      getPoiDetail({
        name: selectedPoi.name,
        kind: selectedPoi.kind,
        lat: selectedPoi.lat,
        lng: selectedPoi.lng,
        ...(selectedPoi.wikipediaTag
          ? { wikipediaTag: selectedPoi.wikipediaTag }
          : {}),
        ...(selectedPoi.wikidataTag
          ? { wikidataTag: selectedPoi.wikidataTag }
          : {}),
      })
        .then((r) => {
          if (!cancelled) setSelectedPoiWiki(r.wiki ?? null);
        })
        .catch(() => {
          if (!cancelled) setSelectedPoiWiki(null);
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPoi?.id]);

  // Automatisch vorbeigelaufene POIs fuer das Wandertagebuch aufzeichnen.
  // Laeuft wenn nearbyPoi erkannt wird und wenn das Wiki nachlaedt.
  useEffect(() => {
    if (!startGateConfirmedRef.current || !nearbyPoi) return;
    const existing = visitedPoisRef.current.get(nearbyPoi.id) ?? {
      id: nearbyPoi.id,
      name: nearbyPoi.name,
    };
    visitedPoisRef.current.set(nearbyPoi.id, {
      ...existing,
      ...(nearbyPoiWiki?.extract ? { extract: nearbyPoiWiki.extract } : {}),
      ...(nearbyPoiWiki?.image ? { photoUrl: nearbyPoiWiki.image } : {}),
    });
  }, [nearbyPoi?.id, nearbyPoiWiki]);

  // Partner-View-Tracking: sobald das Overlay erscheint, einmal fire-and-forget.
  useEffect(() => {
    if (!selectedPartner?.id) return;
    const base = getApiBaseUrl() ?? "";
    fetch(`${base}/partners/${selectedPartner.id}/view`, {
      method: "POST",
    }).catch(() => {});
  }, [selectedPartner?.id]);

  // Partner-Übersetzung: beschreibung + angebot in Nutzersprache laden (on-demand, gecacht am Server).
  // Für DE/GSW übersprungen — Texte sind primär Deutsch.
  useEffect(() => {
    if (
      !selectedPartner?.id ||
      storyLanguage === "de" ||
      storyLanguage === "gsw"
    ) {
      setPartnerTranslation(null);
      return;
    }
    let cancelled = false;
    const base = getApiBaseUrl() ?? "";
    const lang = storyLanguage === "gsw" ? "de" : storyLanguage;
    fetch(`${base}/partners/${selectedPartner.id}/translate?lang=${lang}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setPartnerTranslation(data);
      })
      .catch(() => {
        if (!cancelled) setPartnerTranslation(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPartner?.id, storyLanguage]);

  // POI-Panel automatisch schliessen, wenn ein anderer nearbyPoi auftaucht.
  // KEIN Distanz-Auto-Close: manuell angetippte POIs bleiben offen bis der
  // Nutzer sie explizit schliesst (X-Button oder Backdrop-Tap). Ein
  // distanzbasiertes Schliessen wuerde den Panel sofort wieder zumachen,
  // sobald der Nutzer weiter als 500 m vom POI steht — was beim Testen
  // oder auf grossen Karten permanent passiert.
  useEffect(() => {
    if (!selectedPoi) return;
    if (nearbyPoi && nearbyPoi.id !== selectedPoi.id) {
      setSelectedPoi(null);
    }
  }, [nearbyPoi, selectedPoi]);

  // Die automatisch geöffnete POI-Kachel bleibt nur während der Annäherung
  // offen. GPS-Rauschen darf sie aber nicht sofort schließen: Dafür muss der
  // Abstand mindestens 5 m und drei GPS-Messungen hintereinander zunehmen
  // (z. B. 220 → 240 → 260 → 280 m).
  useEffect(() => {
    if (!nearbyPoi || !livePos) {
      nearbyPoiDistanceRef.current = null;
      return;
    }
    const dist = haversineKm(livePos, {
      lat: nearbyPoi.lat,
      lng: nearbyPoi.lng,
    });
    const previous = nearbyPoiDistanceRef.current;
    if (!previous || previous.id !== nearbyPoi.id) {
      nearbyPoiDistanceRef.current = {
        id: nearbyPoi.id,
        distanceKm: dist,
        increasingReadings: 0,
      };
      return;
    }
    const increased = dist > previous.distanceKm + 0.005;
    const increasingReadings = increased ? previous.increasingReadings + 1 : 0;
    if (increasingReadings >= 3) {
      nearbyPoiDistanceRef.current = null;
      setNearbyPoi(null);
      return;
    }
    nearbyPoiDistanceRef.current = {
      id: nearbyPoi.id,
      distanceKm: dist,
      increasingReadings,
    };
  }, [livePos, nearbyPoi]);

  // Abbiege-Mitteilungen: markante Abzweigungen der Route (echte Geometrie,
  // siehe navigationCues.ts) loesen bei Annaeherung genau einmal eine lokale
  // Mitteilung aus. iOS spiegelt diese auf eine gekoppelte Smartwatch (inkl.
  // Vibration), sobald das iPhone gesperrt ist. Web: No-op.
  const turnCues = useMemo<NavigationCue[]>(
    () => detectNavigationCues(navigationGeometry, 50),
    [navigationGeometry],
  );
  const notifiedTurnsRef = useRef<Set<number>>(new Set());
  const [turnNotifsReady, setTurnNotifsReady] = useState(false);
  // Ref-Spiegel fuer turnNotifsReady: erlaubt Mitteilungs-Effekten (Surface,
  // Meilenstein, POI) den aktuellen Berechtigungsstatus zu lesen, ohne in
  // ihren deps-Arrays auf den State angewiesen zu sein.
  const turnNotifsReadyRef = useRef(false);
  // Forward-Ref fuer speak() — wird nach der speak-useCallback-Deklaration
  // befuellt, damit der Turn-Proximity-Effekt (der vor speak liegt) es nutzen kann.
  const speakRef = useRef<
    | ((
        text: string,
        onFinished?: () => void,
        opts?: SpeakOptions,
      ) => Promise<void>)
    | null
  >(null);
  // Mitteilungs-Berechtigung beim Start EINMALIG anfragen — unabhaengig davon,
  // ob die Route Navigation-Cues hat. Bisher war die Abfrage hinter
  // `turnCues.length > 0` versteckt: auf einfachen Routen ohne erkannte
  // Abzweigungen wurde sie nie aufgerufen, turnNotifsReady blieb false,
  // und weder Kapitel- noch Interaktions-Mitteilungen kamen je an der Watch an.
  useEffect(() => {
    if (!startGateConfirmedRef.current) return;
    let cancelled = false;
    bereiteAbbiegeMitteilungenVor().then((ok) => {
      if (!cancelled) {
        setTurnNotifsReady(ok);
        turnNotifsReadyRef.current = ok;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [startGateConfirmed]);
  useEffect(() => {
    return () => {
      void clearWatchStatus();
    };
  }, []);
  // The optional native companion emits only these namespaced events. Native
  // absence is a supported no-op, including in Expo Go.
  useEffect(
    () =>
      subscribeToCompanionEvents({
        onHeartRate: (event) => setHeartRate(event),
        onSosRequest: () => requestPhoneSideSos(),
        onWatchVisibility: (active) =>
          watchLiveStateLog("watch display visibility", { active }),
        onHikeCommand: ({ command, durationMinutes }) => {
          if (command === "pause") {
            setHikePause(true);
          } else if (command === "resume") {
            setHikePause(false);
          } else if (command === "start") {
            watchLiveStateLog(
              "watch start ignored: phone GPS decision required",
              {
                startGateConfirmed: startGateConfirmedRef.current,
              },
            );
          } else if (command === "safetyStart" && durationMinutes) {
            safetyCheckinRef.current?.startFromWatch(durationMinutes);
          } else if (command === "safetyConfirm") {
            safetyCheckinRef.current?.confirmFromWatch();
          }
        },
      }),
    [requestPhoneSideSos, setHikePause],
  );
  useEffect(() => {
    const interval = setInterval(() => setLocationNow(Date.now()), 5_000);
    return () => clearInterval(interval);
  }, []);

  const nextWatchNavigations = useMemo<WatchNavigation[]>(() => {
    if (!hasFreshGps || !livePos) return [];
    const fraction = navigationGeometry
      ? fortschrittAufRoute(livePos, navigationGeometry)?.fraction
      : null;
    return turnCues
      .map((cue, index) => ({ cue, index }))
      .filter(
        ({ cue, index }) =>
          !notifiedTurnsRef.current.has(index) &&
          (fraction == null || cue.distanceFraction >= fraction - 0.01),
      )
      .slice(0, 3)
      .map(({ cue }) => ({
        direction:
          cue.direction === "links" ? ("left" as const) : ("right" as const),
        bearingDeg: bearingDeg(livePos, cue.point),
        distanceM: Math.round(haversineKm(livePos, cue.point) * 1000),
      }));
  }, [hasFreshGps, livePos, navigationGeometry, turnCues]);
  const nextWatchNavigation = nextWatchNavigations[0] ?? null;
  const nextArTurn = useMemo(() => {
    if (!hasFreshGps || !livePos || turnCues.length === 0) return null;
    const progress = navigationGeometry
      ? fortschrittAufRoute(livePos, navigationGeometry)?.fraction
      : null;
    const upcoming = turnCues
      .map((cue) => {
        const routeDistanceM =
          progress != null && totalKm > 0
            ? Math.max(0, (cue.distanceFraction - progress) * totalKm * 1000)
            : haversineKm(livePos, cue.point) * 1000;
        return { cue, routeDistanceM };
      })
      .filter(
        ({ cue }) =>
          progress == null || cue.distanceFraction >= progress - 0.005,
      )
      .sort((a, b) => a.routeDistanceM - b.routeDistanceM)[0];
    if (!upcoming || upcoming.routeDistanceM < 1) return null;
    return {
      direction:
        upcoming.cue.direction === "links"
          ? ("left" as const)
          : ("right" as const),
      distanceM: Math.round(upcoming.routeDistanceM),
      title: t.turnNotifTitle,
      label:
        upcoming.cue.direction === "links" ? t.turnNotifLeft : t.turnNotifRight,
    };
  }, [hasFreshGps, livePos, navigationGeometry, t, totalKm, turnCues]);
  const watchRouteProgress = useMemo<number | null>(() => {
    if (!hasFreshGps || !livePos) return null;
    const projected = navigationGeometry
      ? fortschrittAufRoute(livePos, navigationGeometry)?.fraction
      : null;
    return (
      projected ??
      (totalKm > 0 ? Math.min(1, Math.max(0, distance / totalKm)) : null)
    );
  }, [hasFreshGps, livePos, navigationGeometry, totalKm, distance]);
  const watchTerrainSection = useMemo<WatchTerrainSection | null>(() => {
    if (
      watchRouteProgress == null ||
      allTerrainSections.length === 0 ||
      !terrainProfile ||
      terrainProfile.length < 2
    ) {
      return null;
    }
    const profileLengthKm = Math.max(
      0,
      terrainProfile[terrainProfile.length - 1].distanceKm -
        terrainProfile[0].distanceKm,
    );
    if (profileLengthKm <= 0) return null;
    const currentKm = watchRouteProgress * profileLengthKm;
    const section = allTerrainSections.find(
      (candidate) =>
        currentKm >= candidate.startKm - 0.15 &&
        currentKm <= candidate.endKm + 0.05,
    );
    if (!section) return null;
    return {
      direction: section.direction,
      gradePct: Math.max(1, Math.round(Math.abs(section.averageGradePct))),
      remainingM: Math.max(0, Math.round((section.endKm - currentKm) * 1000)),
      startsInM: Math.max(0, Math.round((section.startKm - currentKm) * 1000)),
    };
  }, [allTerrainSections, terrainProfile, watchRouteProgress]);
  const watchUpcomingGradeChange =
    useMemo<WatchUpcomingGradeChange | null>(() => {
      if (
        watchRouteProgress == null ||
        allTerrainSections.length === 0 ||
        !terrainProfile ||
        terrainProfile.length < 2
      ) {
        return null;
      }
      const profileLengthKm = Math.max(
        0,
        terrainProfile[terrainProfile.length - 1].distanceKm -
          terrainProfile[0].distanceKm,
      );
      if (profileLengthKm <= 0) return null;
      const currentKm = watchRouteProgress * profileLengthKm;
      const nextSection = allTerrainSections.find(
        (section) => section.startKm > currentKm + 0.025,
      );
      if (!nextSection) return null;
      return {
        direction: nextSection.direction,
        gradePct: Math.max(
          1,
          Math.round(Math.abs(nextSection.averageGradePct)),
        ),
        distanceM: Math.max(
          0,
          Math.round((nextSection.startKm - currentKm) * 1000),
        ),
      };
    }, [allTerrainSections, terrainProfile, watchRouteProgress]);
  const watchUpcomingSurfaceChange =
    useMemo<WatchUpcomingSurfaceChange | null>(() => {
      if (
        watchRouteProgress == null ||
        totalKm <= 0 ||
        surfacePoints.length === 0
      ) {
        return null;
      }
      const firstFutureIndex = surfacePoints.findIndex(
        (point) => point.fraction > watchRouteProgress + 0.002,
      );
      const nextSurface =
        firstFutureIndex === 0
          ? surfacePoints[1]
          : firstFutureIndex > 0
            ? surfacePoints[firstFutureIndex]
            : null;
      if (!nextSurface) return null;
      return {
        surface: nextSurface.surface,
        distanceM: Math.max(
          0,
          Math.round(
            (nextSurface.fraction - watchRouteProgress) * totalKm * 1000,
          ),
        ),
      };
    }, [surfacePoints, totalKm, watchRouteProgress]);
  const watchUpcomingAttraction =
    useMemo<WatchUpcomingAttraction | null>(() => {
      if (
        watchRouteProgress == null ||
        totalKm <= 0 ||
        !navigationGeometry ||
        navigationGeometry.length < 2 ||
        displayedPois.length === 0
      ) {
        return null;
      }
      const candidates = displayedPois
        .map((attraction) => {
          const match = fortschrittAufRoute(
            { lat: attraction.lat, lng: attraction.lng },
            navigationGeometry,
          );
          if (
            !match ||
            match.distKm > 0.5 ||
            match.fraction <= watchRouteProgress + 0.002
          ) {
            return null;
          }
          const name = poiDisplayName(attraction.name, attraction.kind).trim();
          if (!name) return null;
          return {
            name,
            distanceM: Math.max(
              0,
              Math.round(
                (match.fraction - watchRouteProgress) * totalKm * 1000,
              ),
            ),
          };
        })
        .filter(
          (candidate): candidate is WatchUpcomingAttraction =>
            candidate !== null,
        )
        .sort((a, b) => a.distanceM - b.distanceM);
      return candidates[0] ?? null;
    }, [displayedPois, navigationGeometry, totalKm, watchRouteProgress]);
  const watchStoryAudio = useMemo(() => {
    const language = storyLanguage.toLowerCase().split("-")[0];
    const labels = {
      introduction:
        language === "en"
          ? "Introduction"
          : language === "fr"
            ? "Introduction"
            : language === "it"
              ? "Introduzione"
              : language === "es"
                ? "Introducción"
                : language === "nl"
                  ? "Inleiding"
                  : language === "pt"
                    ? "Introdução"
                    : "Einleitung",
      decision:
        language === "en"
          ? "Decision question"
          : language === "fr"
            ? "Question de décision"
            : language === "it"
              ? "Domanda decisionale"
              : language === "es"
                ? "Pregunta de decisión"
                : language === "nl"
                  ? "Beslissingsvraag"
                  : language === "pt"
                    ? "Pergunta de decisão"
                    : "Entscheidungsfrage",
      feedback:
        language === "en"
          ? "Feedback"
          : language === "fr"
            ? "Retour"
            : language === "it"
              ? "Feedback"
              : language === "es"
                ? "Feedback"
                : language === "nl"
                  ? "Feedback"
                  : language === "pt"
                    ? "Feedback"
                    : "Feedback",
      navigation:
        language === "en"
          ? "Navigation"
          : language === "fr"
            ? "Navigation"
            : language === "it"
              ? "Navigazione"
              : language === "es"
                ? "Navegación"
                : language === "nl"
                  ? "Navigatie"
                  : language === "pt"
                    ? "Navegação"
                    : "Navigation",
    };
    const chapter = chapters[currentIndex];
    const question = chapter?.decision?.question?.trim();
    const title = nowPlaying?.title?.trim();
    let text: string;

    if (nowPlayingVisible && nowPlaying) {
      switch (nowPlaying.kind) {
        case "introduction":
          text = labels.introduction;
          break;
        case "chapter":
          text = t.chapterMark(currentIndex + 1, Math.max(1, chapters.length));
          break;
        case "decisionPrompt":
          text = `${labels.decision}${question ? ` · ${question}` : ""}`;
          break;
        case "feedback":
          text = awaitingDecision
            ? `${labels.decision}${question ? ` · ${question}` : ""}`
            : `${labels.feedback}${title ? ` · ${title}` : ""}`;
          break;
        case "navigation":
          text = `${labels.navigation} · ${title || nowPlaying.text}`;
          break;
        default:
          text = `${nowPlaying.label}${title ? ` · ${title}` : ""}`;
          break;
      }
    } else if (preparing) {
      text = labels.introduction;
    } else if (awaitingDecision) {
      text = `${labels.decision}${question ? ` · ${question}` : ""}`;
    } else if (decisionFeedbackPending) {
      text = labels.feedback;
    } else if (chapters.length > 0) {
      text = t.chapterMark(currentIndex + 1, chapters.length);
    } else {
      text = t.readAloud;
    }

    return {
      isPlaying:
        speaking || (nowPlayingVisible && nowPlaying?.kind === "navigation"),
      text: text.slice(0, 2_000),
    };
  }, [
    awaitingDecision,
    chapters,
    currentIndex,
    decisionFeedbackPending,
    nowPlaying,
    nowPlayingVisible,
    preparing,
    speaking,
    storyLanguage,
    t,
  ]);

  useEffect(() => {
    const now = Date.now();
    const heartRateFreshness = !heartRate
      ? null
      : now - heartRate.measuredAt <= 30_000
        ? ("fresh" as const)
        : ("stale" as const);
    const isPoiNarration =
      nowPlaying?.kind === "poi" ||
      nowPlaying?.kind === "partner" ||
      watchPoiStory?.kind === "poi" ||
      watchPoiStory?.kind === "partner";
    const activeAlert = sosOpen
      ? { kind: "sos" as const, text: "SOS requested on phone", critical: true }
      : !startGateConfirmed
        ? null
        : offRoutePos
          ? { kind: "safety" as const, text: "Off route", critical: true }
          : watchDiscoveryAlert
            ? {
                kind: "discovery" as const,
                text: watchDiscoveryAlert.text,
                haptic: watchDiscoveryAlert.haptic,
                action: watchDiscoveryAlert.action,
                critical: false,
              }
            : speaking && !isPoiNarration
              ? {
                  kind: "narration" as const,
                  text:
                    storyLanguage === "de" || storyLanguage === "gsw"
                      ? "Erzählung läuft"
                      : storyLanguage === "fr"
                        ? "Récit en cours"
                        : storyLanguage === "it"
                          ? "Narrazione in corso"
                          : storyLanguage === "en"
                            ? "Narration playing"
                            : "Erzählung läuft",
                  critical: false,
                }
              : null;
    const state: HikeLiveState = {
      version: 1,
      sequence: ++liveSnapshotSequenceRef.current,
      timestamp: now,
      gpsFreshness: hasFreshGps ? "fresh" : livePos ? "stale" : "unavailable",
      nextNavigation: nextWatchNavigation,
      upcomingNavigations: nextWatchNavigations,
      plannedAscentM: Number.isFinite(ascentM)
        ? Math.max(0, Math.round(ascentM))
        : null,
      remainingAscentM:
        watchRouteProgress == null || !Number.isFinite(ascentM)
          ? null
          : Math.max(0, Math.round(ascentM * (1 - watchRouteProgress))),
      terrainSection: watchTerrainSection,
      upcomingGradeChange: watchUpcomingGradeChange,
      upcomingSurfaceChange: watchUpcomingSurfaceChange,
      upcomingAttraction: watchUpcomingAttraction,
      safetyCheckin: safetyCheckinState,
      map: watchMapRouteWithGrades
        ? {
            route: watchMapRouteWithGrades,
            current:
              hasFreshGps && livePos
                ? { lat: livePos.lat, lng: livePos.lng }
                : null,
            gpsFresh: hasFreshGps,
          }
        : null,
      offRoute: watchOffRoute,
      weather: watchWeather,
      daylight: watchSunsetAtEpochMs
        ? {
            sunsetAtEpochMs: watchSunsetAtEpochMs,
            arrivalAfterSunset:
              now +
                Math.max(
                  0,
                  Math.round(
                    totalMin *
                      60 *
                      (1 - (totalKm > 0 ? Math.min(1, distance / totalKm) : 0)),
                  ),
                ) *
                  1000 >
              watchSunsetAtEpochMs,
          }
        : null,
      poiStory: watchPoiStory,
      storyAudio: startGateConfirmed ? watchStoryAudio : null,
      language: storyLanguage,
      elapsedSec: !startGateConfirmed || preparing ? null : elapsedSec,
      walkedDistanceM: distance > 0 ? Math.round(distance * 1000) : null,
      // The route's planned ascent is not passed off as measured ascent.
      ascentM: null,
      steps: steps > 0 ? steps : null,
      heartRate:
        heartRate && heartRateFreshness
          ? { ...heartRate, freshness: heartRateFreshness }
          : null,
      activeAlert,
      audioPlaying: startGateConfirmed && speaking,
      remainingDistanceM: Number.isFinite(distance)
        ? Math.max(0, totalKm - distance) * 1000
        : null,
      remainingSeconds:
        Number.isFinite(distance) && Number.isFinite(totalMin)
          ? Math.max(
              0,
              Math.round(
                totalMin *
                  60 *
                  (1 - (totalKm > 0 ? Math.min(1, distance / totalKm) : 0)),
              ),
            )
          : null,
      arrivalAtEpochMs:
        Number.isFinite(distance) && Number.isFinite(totalMin)
          ? now +
            Math.max(
              0,
              Math.round(
                totalMin *
                  60 *
                  (1 - (totalKm > 0 ? Math.min(1, distance / totalKm) : 0)),
              ),
            ) *
              1000
          : null,
      sosAcknowledgement,
      isHiking:
        startGateConfirmed &&
        !sosOpen &&
        !finished &&
        !hikePaused &&
        !preparing,
      sessionStatus: sosOpen
        ? "sos_requested"
        : finished
          ? "finished"
          : hikePaused
            ? "paused"
            : preparing || !startGateConfirmed
              ? "preparing"
              : "active",
    };
    const watchStateDebugKey = [
      state.sessionStatus,
      state.isHiking,
      preparing,
      hikePaused,
      finished,
      sosOpen,
    ].join(":");
    if (watchStateDebugKey !== lastWatchStateDebugKeyRef.current) {
      lastWatchStateDebugKeyRef.current = watchStateDebugKey;
      watchLiveStateLog("live state transition", {
        sessionStatus: state.sessionStatus,
        isHiking: state.isHiking,
        preparing,
        hikePaused,
        finished,
        sosOpen,
      });
    }
    const criticalKey = activeAlert?.critical
      ? `${activeAlert.kind}:${activeAlert.text}`
      : null;
    const discoveryKey =
      activeAlert?.kind === "discovery"
        ? `${activeAlert.text}:${activeAlert.haptic ?? ""}`
        : null;
    const safetyCheckinKey = safetyCheckinState
      ? `${safetyCheckinState.status}:${safetyCheckinState.expiresAtEpochMs ?? 0}:${safetyCheckinState.liveLinkActive}`
      : null;
    const watchPoiStoryId = watchPoiStory?.id ?? null;
    const gpsFreshnessChanged =
      lastPublishedGpsFreshRef.current !== hasFreshGps;
    const watchResumed =
      watchLifecycleRevision !== lastWatchLifecycleRevisionRef.current;
    const force =
      gpsFreshnessChanged ||
      watchResumed ||
      (criticalKey !== null &&
        criticalKey !== lastCriticalWatchAlertRef.current) ||
      (discoveryKey !== null &&
        discoveryKey !== lastWatchDiscoveryAlertRef.current) ||
      safetyCheckinKey !== lastSafetyCheckinKeyRef.current ||
      watchPoiStoryId !== lastWatchPoiStoryIdRef.current ||
      sosAcknowledgement !== lastSosAcknowledgementRef.current;
    if (watchPoiStory || activeAlert?.action === "openPoiStory") {
      const trace = watchPoiTraceRef.current;
      const debugKey = [
        trace?.traceId ?? "no-trace",
        watchPoiStory?.id ?? "no-story",
        activeAlert?.action ?? "no-action",
      ].join(":");
      if (debugKey !== lastWatchPoiDebugKeyRef.current) {
        lastWatchPoiDebugKeyRef.current = debugKey;
        watchPoiLog("phone prepared POI watch snapshot", {
          traceId: trace?.traceId ?? null,
          poiId: watchPoiStory?.id ?? trace?.poiId ?? null,
          kind: watchPoiStory?.kind ?? trace?.kind ?? null,
          sequence: state.sequence,
          storyPresent: watchPoiStory != null,
          storyTextLength: watchPoiStory?.text.length ?? 0,
          activeAlertAction: activeAlert?.action ?? null,
          forcePublish: force,
        });
      }
    }
    lastPublishedGpsFreshRef.current = hasFreshGps;
    lastWatchLifecycleRevisionRef.current = watchLifecycleRevision;
    lastCriticalWatchAlertRef.current = criticalKey;
    lastWatchDiscoveryAlertRef.current = discoveryKey;
    lastSafetyCheckinKeyRef.current = safetyCheckinKey;
    lastWatchPoiStoryIdRef.current = watchPoiStoryId;
    lastSosAcknowledgementRef.current = sosAcknowledgement;
    void publishHikeLiveState(state, { force });
    // Notification mirroring intentionally stays lower frequency than the
    // private native snapshot channel and contains no location data.
    void sendWatchStatus(
      {
        direction:
          nextWatchNavigation?.direction === "left"
            ? "Links"
            : nextWatchNavigation?.direction === "right"
              ? "Rechts"
              : "Navigation",
        heading: nextWatchNavigation?.bearingDeg ?? null,
        remainingKm: Math.max(0, totalKm - distance),
        hasFreshGps,
        position: livePos ? { lat: livePos.lat, lng: livePos.lng } : null,
      },
      { force },
    );
  }, [
    ascentM,
    distance,
    elapsedSec,
    finished,
    hasFreshGps,
    heartRate,
    hikePaused,
    livePos,
    nextWatchNavigation,
    nextWatchNavigations,
    nowPlaying?.kind,
    offRoutePos,
    preparing,
    safetyCheckinState,
    sosAcknowledgement,
    sosOpen,
    speaking,
    storyLanguage,
    totalKm,
    totalMin,
    watchDiscoveryAlert,
    watchLifecycleRevision,
    watchMapRouteWithGrades,
    watchOffRoute,
    watchPoiStory,
    watchRouteProgress,
    watchStoryAudio,
    watchSunsetAtEpochMs,
    watchTerrainSection,
    watchUpcomingAttraction,
    watchUpcomingGradeChange,
    watchUpcomingSurfaceChange,
    watchWeather,
    startGateConfirmed,
  ]);

  useEffect(() => {
    if (!startGateConfirmedRef.current) return;
    if (!turnNotifsReady || turnCues.length === 0) return;
    if (!hasFreshGps) return;
    const geo = navigationGeometry;
    const current: LatLng | null =
      livePos ??
      (geo && geo.length > 1 && totalKm > 0
        ? (() => {
            const f = Math.max(0, Math.min(1, distance / totalKm));
            const p = geo[Math.round(f * (geo.length - 1))];
            return { lat: p[0], lng: p[1] };
          })()
        : null);
    if (!current) return;
    const TURN_NEARBY_KM = 0.1; // ~100 m vor der Abzweigung ans Handgelenk tippen
    // Hoechstens EINE Mitteilung pro Positionsupdate (die naechstgelegene) —
    // in engen Serpentinen koennen sonst mehrere Cues gleichzeitig ausloesen.
    let bester: { index: number; cue: NavigationCue; distKm: number } | null =
      null;
    turnCues.forEach((cue, i) => {
      if (notifiedTurnsRef.current.has(i)) return;
      const d = haversineKm(current, cue.point);
      if (d <= TURN_NEARBY_KM && (!bester || d < bester.distKm)) {
        bester = { index: i, cue, distKm: d };
      }
    });
    if (bester) {
      const treffer: { index: number; cue: NavigationCue } = bester;
      notifiedTurnsRef.current.add(treffer.index);
      if (profile?.navAnnouncementsEnabled !== false) {
        sendeAbbiegeMitteilung(
          t.turnNotifTitle,
          treffer.cue.direction === "links"
            ? t.turnNotifLeft
            : t.turnNotifRight,
        );
      }
      // Doppelimpuls fuer Navigationsanweisungen — staerker und deutlich
      // unterscheidbar vom einfachen Kapitel-/POI-Start-Feedback.
      hapticDoublePulse();
      // Sprachansage kurz vor der Abbiegung — unterbricht sofortig und setzt
      // eine laufende Erzaehlung danach an derselben Stelle fort.
      const pack = STORY_PACKS[resolveLang(storyLanguage)];
      speakRef.current?.(pack.turnVoice(treffer.cue.direction), undefined, {
        navInterrupt: true,
        turnAudio: treffer.cue.direction,
        kind: "navigation",
        displayTitle: t.turnNotifTitle,
      });
    }
  }, [
    livePos,
    distance,
    totalKm,
    navigationGeometry,
    turnCues,
    turnNotifsReady,
    t,
    storyLanguage,
    locState,
    hasFreshGps,
    startGateConfirmed,
  ]);

  // Erkennt, ob die aktuelle Position (echtes GPS oder entlang des Weges
  // interpoliert) nahe an einem geladenen POI liegt, und zeigt ihn genau
  // einmal je Wanderung als Karte an ("live entlang der Route entdeckt").
  useEffect(() => {
    if (!startGateConfirmedRef.current) return;
    if (displayedPois.length === 0) return;
    if (!hasFreshGps) return;
    // Solange ein POI aktiv angezeigt/erzaehlt wird, keinen neuen suchen:
    // mehrere POIs in 300-m-Naehe wuerden sonst die laufende Ansage
    // unterbrechen und den POI mehrfach vorgelesen klingen lassen.
    //
    // Ausnahme: Ein POI ohne spezifischen Kontext darf die Route nicht
    // blockieren. Sobald seine Detailabfrage abgeschlossen ist und weder
    // osmContext noch Wikipedia-Text vorhanden sind, darf ein nachfolgender
    // relevanter POI die Kachel ersetzen und seinen eigenen 200-/50-m-Flow
    // starten. Waehrend die Abfrage noch laeuft (nearbyPoiWiki === undefined)
    // bleibt der alte Schutz aktiv.
    const nearbyPoiIsContextless =
      nearbyPoi != null &&
      nearbyPoiWiki !== undefined &&
      !nearbyPoi.osmContext?.trim() &&
      !nearbyPoiWiki?.extract;
    if (nearbyPoi && !nearbyPoiIsContextless) return;
    const geo = navigationGeometry;
    const current: LatLng | null =
      livePos ??
      (geo && geo.length > 1 && totalKm > 0
        ? (() => {
            const f = Math.max(0, Math.min(1, distance / totalKm));
            const p = geo[Math.round(f * (geo.length - 1))];
            return { lat: p[0], lng: p[1] };
          })()
        : null);
    if (!current) return;
    // Premium-Partner werden im separaten 500-m-Flow aktiv beworben.
    // Solange ein solcher Partner in der Nähe ist, darf ein normaler POI
    // nicht gleichzeitig als Erzählziel ausgewählt werden.
    const premiumPartnerNearby = partners.some(
      (partner) =>
        partner.paket === "premium" &&
        haversineKm(current, { lat: partner.lat, lng: partner.lng }) <= 0.5,
    );
    if (premiumPartnerNearby) return;
    // Doppel-Schutz: (1) per ID, (2) per Koordinaten (derselbe Ort kann als
    // node-NNN und als way-MMM in Overpass auftauchen — gleicher Ort, zwei IDs).
    const DEDUP_KM = 0.1;
    const hit = displayedPois.find((poi) => {
      // Sagenmittelpunkt: 500 m Radius (Herzort der laufenden Sage ist
      // immer relevant, auch auf dem Land). Normale POIs: 300 m.
      const radiusKm = poi.kind === "saga=heart" ? 0.5 : 0.3;
      return (
        !announcedPoiIdsRef.current.has(poi.id) &&
        !announcedPoiLocsRef.current.some(
          (loc) => haversineKm({ lat: poi.lat, lng: poi.lng }, loc) <= DEDUP_KM,
        ) &&
        haversineKm(current, { lat: poi.lat, lng: poi.lng }) <= radiusKm
      );
    });
    if (hit) {
      announcedPoiIdsRef.current.add(hit.id);
      announcedPoiLocsRef.current.push({ lat: hit.lat, lng: hit.lng });
      setNearbyPoi(hit);
    }
  }, [
    livePos,
    distance,
    totalKm,
    navigationGeometry,
    displayedPois,
    nearbyPoi,
    nearbyPoiWiki,
    partners,
    locState,
    hasFreshGps,
    startGateConfirmed,
  ]);

  // Zwischenziel-Erkennung: 50-m-Radius um den POI/Partner-Standort.
  useEffect(() => {
    if (!startGateConfirmedRef.current) return;
    if (routeWaypoints.length === 0 || !livePos) return;
    for (const wp of routeWaypoints) {
      if (waypointAnnouncedRef.current.has(wp.id)) continue;
      if (haversineKm(livePos, { lat: wp.lat, lng: wp.lng }) <= 0.05) {
        waypointAnnouncedRef.current.add(wp.id);
        setReachedWaypointIds((prev) => new Set([...prev, wp.id]));
        const isPartner = wp.type === "partner";
        const traceId = createPoiTrace(
          wp.id,
          isPartner ? "partner" : "poi",
          "waypoint",
        );
        watchPoiTraceRef.current = {
          poiId: wp.id,
          traceId,
          kind: isPartner ? "partner" : "poi",
        };
        const partner =
          wp.type === "partner"
            ? partners.find((candidate) => `partner-${candidate.id}` === wp.id)
            : null;
        watchPoiLog("waypoint reached on phone", {
          traceId,
          poiId: wp.id,
          kind: wp.type,
          partnerDataPresent: partner != null,
          partnerImagePresent: Boolean(partner?.fotoUrl),
        });
        if (partner) {
          const partnerText = [partner.beschreibung, partner.angebot]
            .filter(
              (value): value is string =>
                typeof value === "string" && value.trim().length > 0,
            )
            .join("\n\n");
          const storyText = (
            partnerText || "Partner entlang deiner Route."
          ).slice(0, 8_000);
          setWatchPoiStory({
            id: wp.id,
            name: partner.name,
            imageUrl: partner.fotoUrl ?? null,
            text: storyText,
            kind: "partner",
          });
          watchPoiLog("partner story staged for watch state", {
            traceId,
            poiId: wp.id,
            storyTextLength: storyText.length,
            imageUrlValid:
              !partner.fotoUrl || /^https?:\/\//i.test(partner.fotoUrl),
          });
        } else if (isPartner) {
          watchPoiLog("partner waypoint has no matching partner record", {
            traceId,
            poiId: wp.id,
          });
        }
        raiseWatchDiscoveryAlert({
          text: `${wp.type === "partner" ? "Partner" : "Sehenswürdigkeit"} in der Nähe: ${wp.name}`,
          haptic: "notification",
          action: isPartner && partner ? "openPoiStory" : undefined,
        });
        watchPoiLog("Watch discovery alert staged", {
          traceId,
          poiId: wp.id,
          kind: isPartner ? "partner" : "poi",
          source: "waypoint",
          action: isPartner && partner ? "openPoiStory" : null,
          storyPresent: Boolean(partner),
        });
        sendeAbbiegeMitteilung(
          wp.type === "partner" ? t.partnerNearby : t.poiNearby,
          wp.name,
        );
      }
    }
  }, [
    createPoiTrace,
    livePos,
    partners,
    raiseWatchDiscoveryAlert,
    routeWaypoints,
    t,
    startGateConfirmed,
  ]);

  // Premium-Partner-Anpreisung: sobald der Wanderer auf 500 m an einen
  // Premium-Partner herankommt, wird einmalig ein KI-generierter Text
  // abgespielt, der den Betrieb in den Kontext der laufenden Sage einwebt.
  // Nur aktive Partner, nur einmal pro Hike, nur wenn nicht gerade am Vorbereiten.
  useEffect(() => {
    if (!startGateConfirmedRef.current) return;
    if (preparing || !saga) return;
    if (!hasFreshGps) return;
    const premiumPartners = partners.filter((p) => p.paket === "premium");
    if (premiumPartners.length === 0) return;
    const geo = route?.geometry;
    const current: LatLng | null =
      livePos ??
      (geo && geo.length > 1 && totalKm > 0
        ? (() => {
            const f = Math.max(0, Math.min(1, distance / totalKm));
            const p = geo[Math.round(f * (geo.length - 1))];
            return { lat: p[0], lng: p[1] };
          })()
        : null);
    if (!current) return;
    const PARTNER_NEARBY_KM = 0.5;
    for (const partner of premiumPartners) {
      const partnerId = String(partner.id);
      if (
        announcedPremiumPartnerIdsRef.current.has(partnerId) ||
        announcingPremiumPartnerIdsRef.current.has(partnerId)
      ) {
        if (!premiumPartnerDuplicateLogRef.current.has(partnerId)) {
          premiumPartnerDuplicateLogRef.current.add(partnerId);
          watchPoiLog(
            "premium partner narration trigger ignored by duplicate guard",
            {
              poiId: `partner-${partnerId}`,
              kind: "partner",
              source: "partner-500m",
              announced: announcedPremiumPartnerIdsRef.current.has(partnerId),
              requestInFlight:
                announcingPremiumPartnerIdsRef.current.has(partnerId),
            },
          );
        }
        continue;
      }
      if (
        haversineKm(current, { lat: partner.lat, lng: partner.lng }) >
        PARTNER_NEARBY_KM
      )
        continue;
      const traceId = createPoiTrace(
        `partner-${partnerId}`,
        "partner",
        "partner-500m",
      );
      announcingPremiumPartnerIdsRef.current.add(partnerId);
      watchPoiLog("premium partner narration request started", {
        traceId,
        poiId: `partner-${partnerId}`,
        kind: "partner",
        source: "partner-500m",
      });
      const base = getApiBaseUrl() ?? "";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      fetch(`${base}/api/partners/${partner.id}/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sagaTitle: localizedSagaTitle,
          coreMotif: saga.coreMotif ?? "",
          partnerName: partner.name,
          angebot: partner.angebot ?? null,
          beschreibung: partner.beschreibung ?? null,
          lang: cueLanguage,
        }),
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data: { text?: string }) => {
          clearTimeout(timeout);
          const text = data?.text?.trim();
          announcingPremiumPartnerIdsRef.current.delete(partnerId);
          // Während einer Entscheidungsfrage nichts verwerfen: Der Effekt
          // läuft erneut, sobald die Frage beantwortet ist, und versucht die
          // Anpreisung dann nochmals. So geht ein erfolgreicher Text nicht
          // durch den alten "skip while awaiting" verloren.
          if (text && !awaitingDecisionRef.current) {
            announcedPremiumPartnerIdsRef.current.add(partnerId);
            watchPoiLog(
              "premium partner narration accepted and staged on phone",
              {
                traceId,
                poiId: `partner-${partnerId}`,
                kind: "partner",
                source: "partner-500m",
                storyTextLength: text.length,
                watchStoryCreated: false,
              },
            );
            setPartnerAnnouncementText({ partnerId, text });
            if (karteVollbild) {
              pendingKarteActionRef.current = () => setSelectedPartner(partner);
              setKarteVollbild(false);
              setKarteCloseSignal((value) => value + 1);
            } else {
              setSelectedPartner(partner);
            }
            watchPoiLog("premium partner narration playback started", {
              traceId,
              poiId: `partner-${partnerId}`,
              kind: "partner",
              source: "partner-500m",
            });
            speakRef.current?.(text, undefined, {
              useOpenAI: true,
              kind: "partner",
              displayTitle: partner.name,
            });
          } else {
            watchPoiLog("premium partner narration result not played", {
              traceId,
              poiId: `partner-${partnerId}`,
              kind: "partner",
              source: "partner-500m",
              hasText: Boolean(text),
              awaitingDecision: awaitingDecisionRef.current,
            });
          }
        })
        .catch((error) => {
          clearTimeout(timeout);
          // Fehler/Timeouts sind nicht endgültig: der nächste GPS-Fix im
          // Radius darf die Anfrage erneut auslösen.
          announcingPremiumPartnerIdsRef.current.delete(partnerId);
          watchPoiLog("premium partner narration request failed", {
            traceId,
            poiId: `partner-${partnerId}`,
            kind: "partner",
            source: "partner-500m",
            error: error instanceof Error ? error.message : String(error),
          });
        });
    }
  }, [
    createPoiTrace,
    livePos,
    distance,
    totalKm,
    route?.geometry,
    partners,
    saga,
    storyLanguage,
    cueLanguage,
    localizedSagaTitle,
    preparing,
    awaitingDecision,
    locState,
    hasFreshGps,
    karteVollbild,
    startGateConfirmed,
  ]);

  // GPS-Foto-Challenge: sobald der Wanderer den Herzort der Sage betritt
  // (150-m-Radius um die Sagen-Koordinate), erscheint einmalig eine
  // Aufforderung, diesen besonderen Ort zu fotografieren.
  useEffect(() => {
    if (!startGateConfirmedRef.current) return;
    if (
      !hasFreshGps ||
      !livePos ||
      !saga?.coordinates ||
      photoChallengeShownRef.current
    )
      return;
    const dist = haversineKm(livePos, saga.coordinates);
    if (dist <= 0.15) {
      photoChallengeShownRef.current = true;
      setShowPhotoChallenge(true);
      const pack = STORY_PACKS[resolveLang(storyLanguage)];
      speakRef.current?.(pack.photoChallengePrompt, undefined, {
        kind: "poi",
        displayTitle: t.poiNearby,
      });
    }
  }, [
    livePos,
    saga?.coordinates,
    storyLanguage,
    hasFreshGps,
    startGateConfirmed,
  ]);

  // Sagenmittelpunkt-Ankunft: einmalige kurze Ansage wenn GPS < 10 m entfernt (GPS-bestätigt,
  // daher darf die Phrase "du stehst hier" sagen). Nur für Sagen mit exakten Koordinaten —
  // der saga=heart-POI wurde dort bereits auf koordinatenSicherheit='exakt' beschränkt.
  useEffect(() => {
    if (!startGateConfirmedRef.current) return;
    if (
      !hasFreshGps ||
      !livePos ||
      !saga?.coordinates ||
      saga.koordinatenSicherheit !== "exakt"
    )
      return;
    if (sagaArrivalSpokenRef.current) return;
    const dist = haversineKm(livePos, saga.coordinates);
    if (dist <= 0.01) {
      sagaArrivalSpokenRef.current = true;
      const pack = STORY_PACKS[resolveLang(storyLanguage)];
      speakRef.current?.(pack.sagaHeartArrival, undefined, {
        kind: "poi",
        displayTitle: t.poiNearby,
      });
    }
  }, [
    livePos,
    saga?.coordinates,
    saga?.koordinatenSicherheit,
    storyLanguage,
    hasFreshGps,
    startGateConfirmed,
  ]);

  // Wegoberflaechenansage: sobald der Wanderer einen neuen Oberflaechenabschnitt betritt,
  // wird ein saga-atmosphaerischer Satz gesprochen (und optional als Push-Notif gesendet).
  useEffect(() => {
    if (!startGateConfirmedRef.current) return;
    // Erst nach dem ersten Meter ansagen — GPS gibt sonst sofort eine Route-Position
    // zurueck (z. B. Fraction 0.15) und loest alle Wechsel davor auf einmal aus.
    if (
      !hasFreshGps ||
      surfacePoints.length === 0 ||
      preparing ||
      distance === 0
    )
      return;
    const currentFraction = (() => {
      if (livePos && navigationGeometry && navigationGeometry.length >= 2) {
        const match = fortschrittAufRoute(livePos, navigationGeometry);
        if (match && match.distKm <= 1) return match.fraction;
      }
      return totalKm > 0 ? distance / totalKm : 0;
    })();
    let latestReachedSurface: (typeof surfacePoints)[number] | null = null;
    for (const sp of surfacePoints) {
      if (sp.fraction < 0.05) continue; // Startbereich ueberspringen
      const key = Math.round(sp.fraction * 100);
      if (notifiedSurfaceFractionsRef.current.has(key)) continue;
      if (currentFraction >= sp.fraction - 0.02) {
        notifiedSurfaceFractionsRef.current.add(key);
        latestReachedSurface = sp;
      }
    }
    // Bei einem GPS-Sprung nur den aktuellen, zuletzt erreichten Zustand
    // melden. Uebersprungene Asphalt/Kies-Wechsel duerfen keinen Audio-Stack
    // bilden, der spaeter als veraltete Historie abgespielt wird.
    if (latestReachedSurface) {
      const pack = STORY_PACKS[resolveLang(cueLanguage)];
      const text = pack.surfaceTransitionPhrase(latestReachedSurface.surface);
      if (
        turnNotifsReadyRef.current &&
        profile?.navAnnouncementsEnabled !== false
      ) {
        sendeAbbiegeMitteilung(t.surfaceChangeTitle, text);
      }
      if (!awaitingDecisionRef.current) {
        speakRef.current?.(text, undefined, {
          useOpenAI: true,
          kind: "surface",
          displayTitle: t.surfaceChangeTitle,
          replaceQueuedCategory: "surface",
        });
      }
    }
  }, [
    livePos,
    distance,
    totalKm,
    surfacePoints,
    storyLanguage,
    profile?.navAnnouncementsEnabled,
    preparing,
    t,
    navigationGeometry,
    hasFreshGps,
    startGateConfirmed,
  ]);

  // Verstrichene Zeit: alle 15 Sekunden aktualisieren (fuer ETA-Berechnung).
  useEffect(() => {
    if (preparing || finished || hikePaused) return;
    const id = setInterval(() => {
      setElapsedSec(
        Math.max(
          0,
          Math.round(
            (Date.now() - startTimeRef.current - pausedDurationMsRef.current) /
              1000,
          ),
        ),
      );
    }, 15_000);
    return () => clearInterval(id);
  }, [preparing, finished, hikePaused]);

  // Meilenstein-Ansage bei 25/50/75 % der Wanderung — per KI im Sagen-Stil,
  // Fallback auf atmosphaerische Standardphrase aus STORY_PACKS.
  useEffect(() => {
    if (!startGateConfirmedRef.current) return;
    if (!hasFreshGps || preparing || totalKm <= 0) return;
    const fraction = Math.min(1, distance / totalKm);
    const milestones = [25, 50, 75] as const;
    for (const pct of milestones) {
      if (fraction * 100 >= pct && !notifiedMilestonesRef.current.has(pct)) {
        notifiedMilestonesRef.current.add(pct);
        const pack = STORY_PACKS[resolveLang(cueLanguage)];
        const name = profile?.name?.trim() || null;
        const fallback = pack.milestonePhrase(pct, name);
        // KI-Ansage im Sagen-Stil: async, Fallback bei Fehler oder Timeout.
        if (saga) {
          const base = getApiBaseUrl() ?? "";
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 6000);
          fetch(`${base}/api/waypoint-announce`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sagaId: saga.id,
              sagaTitle: localizedSagaTitle,
              coreMotif: saga.coreMotif ?? "",
              pct,
              lang: cueLanguage,
            }),
            signal: controller.signal,
          })
            .then((r) => r.json())
            .then((data: { text?: string }) => {
              clearTimeout(timeout);
              const text = data?.text?.trim() || fallback;
              if (
                turnNotifsReadyRef.current &&
                profile?.navAnnouncementsEnabled !== false
              ) {
                sendeAbbiegeMitteilung(t.milestoneTitle, text);
              }
              // Keine Sprachausgabe waehrend Entscheidungspunkt: Meilenstein wuerde
              // speaking=true setzen → Spracherkennung stoppt → Audio-Session-Reset
              // → Mikrofon tot. Uhr-Mitteilung (oben) wird immer gesendet.
              if (!awaitingDecisionRef.current) {
                speakRef.current?.(text, undefined, {
                  useOpenAI: true,
                  kind: "chapter",
                  displayTitle: t.milestoneTitle,
                });
              }
            })
            .catch(() => {
              clearTimeout(timeout);
              if (
                turnNotifsReadyRef.current &&
                profile?.navAnnouncementsEnabled !== false
              ) {
                sendeAbbiegeMitteilung(t.milestoneTitle, fallback);
              }
              if (!awaitingDecisionRef.current) {
                speakRef.current?.(fallback, undefined, {
                  useOpenAI: true,
                  kind: "chapter",
                  displayTitle: t.milestoneTitle,
                });
              }
            });
        } else {
          if (
            turnNotifsReadyRef.current &&
            profile?.navAnnouncementsEnabled !== false
          ) {
            sendeAbbiegeMitteilung(t.milestoneTitle, fallback);
          }
          if (!awaitingDecisionRef.current) {
            speakRef.current?.(fallback, undefined, {
              useOpenAI: true,
              kind: "chapter",
              displayTitle: t.milestoneTitle,
            });
          }
        }
      }
    }
  }, [
    distance,
    totalKm,
    storyLanguage,
    cueLanguage,
    localizedSagaTitle,
    saga,
    profile?.name,
    profile?.navAnnouncementsEnabled,
    preparing,
    t,
    hasFreshGps,
    startGateConfirmed,
  ]);

  const takePhoto = async () => {
    setShowPhotoChallenge(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        const localUri = result.assets[0].uri;
        setHikePhotos((prev) => [...prev, localUri]);
        hapticSuccess();
        setPhotoUploading(true);
        setPhotoUploadFeedback(null);
        try {
          const uploaded = await uploadWaypointPhoto(
            localUri,
            {
              sagaId: id,
              routeId: typeof routeId === "string" ? routeId : undefined,
              chapterIndex: currentIndexRef.current,
              lat: livePos?.lat,
              lng: livePos?.lng,
            },
            () => getTokenRef.current(),
          );
          if (uploaded.objectPath) {
            setPhotoObjectPaths((prev) => [...prev, uploaded.objectPath]);
          }
          setPhotoUploadFeedback("ok");
        } catch {
          setPhotoUploadFeedback("error");
        } finally {
          setPhotoUploading(false);
          setTimeout(() => setPhotoUploadFeedback(null), 3000);
        }
      }
    } catch {
      // Kamera nicht verfuegbar — kein Fehlerzustand noetig
    }
  };

  // Standort verfolgen: nativ ueber expo-location, im Web ueber die Geolocation-API
  useEffect(() => {
    const effectTraceId = `watch-${++locationTraceRef.current}`;
    locationPermissionLog("watch effect begin", {
      ...locationDiagnosticContext(),
      effectTraceId,
      retry: locationPermissionRetry,
      locState: locStateRef.current,
    });
    let sub: Location.LocationSubscription | null = null;
    let webId: number | null = null;
    let unsubscribeBackground: (() => void) | null = null;
    let watchdog: ReturnType<typeof setInterval> | null = null;
    let restartingForegroundWatch = false;
    let cancelled = false;

    (async () => {
      if (Platform.OS === "web") {
        locationPermissionLog("web watcher branch", {
          ...locationDiagnosticContext(),
          effectTraceId,
          hasNavigatorGeolocation:
            typeof navigator !== "undefined" && Boolean(navigator.geolocation),
        });
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          webId = navigator.geolocation.watchPosition(
            (p) => {
              if (cancelled) return;
              setLocState("granted");
              handleFix(
                p.coords.latitude,
                p.coords.longitude,
                p.coords.accuracy ?? null,
                p.coords.altitude ?? null,
              );
            },
            () => {
              if (!cancelled) setLocState("denied");
            },
            { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 },
          );
        } else {
          setLocState("denied");
        }
        return;
      }
      try {
        if (cancelled) return;
        const permissionGranted =
          await readForegroundLocationPermission("hike-start");
        locationPermissionLog("watch permission gate", {
          ...locationDiagnosticContext(),
          effectTraceId,
          permissionGranted,
          locState: locStateRef.current,
        });
        if (cancelled || !permissionGranted) return;
        // Energiesparmodus: groebere GPS-Genauigkeit und seltenere Fixes
        // schonen den Akku spuerbar auf langen Touren.
        const trackingOptions: Location.LocationOptions = energiesparmodus
          ? {
              accuracy: Location.Accuracy.Low,
              distanceInterval: 20,
              timeInterval: 10000,
            }
          : {
              accuracy: Location.Accuracy.High,
              distanceInterval: 5,
              timeInterval: 3000,
            };

        // Der erste Fix darf den laufenden Watcher nicht blockieren: Auf
        // einzelnen Geraeten kann getCurrentPositionAsync ohne Timeout sehr
        // lange offen bleiben. Beide Anfragen laufen deshalb unabhaengig.
        lastLocationAtRef.current = Date.now();
        void Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
          .then((first) => {
            if (!cancelled) {
              handleFix(
                first.coords.latitude,
                first.coords.longitude,
                first.coords.accuracy ?? null,
                first.coords.altitude ?? null,
              );
            }
          })
          .catch(() => {
            // Der Vordergrund-Watcher liefert den ersten Fix nach.
          });

        // Der Vordergrund-Watcher bleibt immer aktiv, auch wenn der
        // Hintergrund-Task gestartet werden kann. So bleibt die Karte bei
        // geoeffneter App unabhaengig vom TaskManager-Kanal live.
        const startForegroundWatch = async (): Promise<void> => {
          if (cancelled || restartingForegroundWatch) return;
          restartingForegroundWatch = true;
          const watcherStartedAt = Date.now();
          locationPermissionLog("foreground watcher begin", {
            ...locationDiagnosticContext(),
            effectTraceId,
          });
          try {
            sub?.remove();
            const nextSub = await Location.watchPositionAsync(
              trackingOptions,
              (p) => {
                if (!cancelled) {
                  handleFix(
                    p.coords.latitude,
                    p.coords.longitude,
                    p.coords.accuracy ?? null,
                    p.coords.altitude ?? null,
                  );
                }
              },
            );
            if (cancelled) {
              nextSub.remove();
              locationPermissionLog("foreground watcher cancelled", {
                ...locationDiagnosticContext(),
                effectTraceId,
                elapsedMs: Date.now() - watcherStartedAt,
              });
            } else {
              sub = nextSub;
              locationPermissionLog("foreground watcher ready", {
                ...locationDiagnosticContext(),
                effectTraceId,
                elapsedMs: Date.now() - watcherStartedAt,
              });
            }
          } catch (error) {
            locationPermissionLog("foreground watcher failed", {
              ...locationDiagnosticContext(),
              effectTraceId,
              elapsedMs: Date.now() - watcherStartedAt,
              errorName: error instanceof Error ? error.name : "unknown",
              errorMessage:
                error instanceof Error
                  ? error.message.slice(0, 160)
                  : "unknown",
            });
            // A watcher failure is not a permission denial. The watchdog
            // may retry it while the confirmed permission state stays intact.
          } finally {
            restartingForegroundWatch = false;
          }
        };

        await startForegroundWatch();
        if (cancelled) return;

        // "Immer"-Freigabe ist optional (nur fuer echten Hintergrundbetrieb
        // noetig) — ohne sie funktioniert die Wanderung weiterhin normal,
        // nur eben nur im Vordergrund. Kein Fehler, kein Blockieren.
        let backgroundStarted = false;
        try {
          const bg = await Location.getBackgroundPermissionsAsync();
          locationPermissionLog("background permission read", {
            ...locationDiagnosticContext(),
            effectTraceId,
            status: bg.status,
            granted: bg.granted,
            canAskAgain: bg.canAskAgain,
          });
          if (!cancelled && bg.status === "granted") {
            backgroundStarted = await startBackgroundLocationTracking(
              trackingOptions,
              {
                title: t.backgroundNotificationTitle,
                body: t.backgroundNotificationBody,
              },
            );
          }
        } catch {
          // Best effort — z. B. auf Web/Expo Go nicht unterstuetzt.
        }

        if (cancelled) return;
        locationPermissionLog("watch setup complete", {
          ...locationDiagnosticContext(),
          effectTraceId,
          backgroundStarted,
          watcherReady: Boolean(sub),
        });

        if (backgroundStarted) {
          // TaskManager liefert Fixes ueber ein modulweites Pub/Sub, auch
          // wenn die App im Hintergrund ist oder der Bildschirm gesperrt ist.
          // Der Vordergrund-Watcher laeuft parallel und ist bei sichtbarer App
          // der primaere Kanal.
          unsubscribeBackground = subscribeToBackgroundLocation(handleFix);
        }

        // Manche native Location-Subscriptions liefern nach langer Laufzeit
        // keine Fehler, aber auch keine Callbacks mehr. Solange die App
        // sichtbar ist, wird der Watcher nach 45 Sekunden ohne Fix erneuert.
        watchdog = setInterval(() => {
          if (
            cancelled ||
            AppState.currentState !== "active" ||
            Date.now() - lastLocationAtRef.current < 45_000
          ) {
            return;
          }
          void startForegroundWatch();
        }, 15_000);
      } catch (error) {
        locationPermissionLog("watch effect failed", {
          ...locationDiagnosticContext(),
          effectTraceId,
          errorName: error instanceof Error ? error.name : "unknown",
          errorMessage:
            error instanceof Error ? error.message.slice(0, 160) : "unknown",
          locState: locStateRef.current,
        });
        // Only readForegroundLocationPermission can establish a confirmed
        // denial. Unexpected watcher/setup failures must not masquerade as it.
        if (!cancelled) setLocState("idle");
      }
    })();

    return () => {
      cancelled = true;
      locationPermissionLog("watch effect cleanup", {
        ...locationDiagnosticContext(),
        effectTraceId,
        hadForegroundWatcher: Boolean(sub),
      });
      if (watchdog) clearInterval(watchdog);
      sub?.remove();
      unsubscribeBackground?.();
      stopBackgroundLocationTracking();
      if (
        webId != null &&
        typeof navigator !== "undefined" &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(webId);
      }
    };
  }, [
    handleFix,
    energiesparmodus,
    t.backgroundNotificationTitle,
    t.backgroundNotificationBody,
    locationPermissionRetry,
    readForegroundLocationPermission,
  ]);

  // iOS uses Core Location's calibrated heading so Panorama and Apple Maps
  // share the same device reference. Android retains the tilt-compensated
  // magnetometer path below.
  useEffect(() => {
    let cancelled = false;
    let magnetometerSubscription: ReturnType<
      typeof Magnetometer.addListener
    > | null = null;
    let motionSubscription: ReturnType<typeof DeviceMotion.addListener> | null =
      null;
    let headingSubscription: Location.LocationSubscription | null = null;

    if (Platform.OS === "web") {
      setCompassAvailable(false);
      return () => {
        cancelled = true;
      };
    }

    compassHeadingRef.current = null;
    compassGravityRef.current = null;
    compassSamplesRef.current = [];

    const acceptHeading = (heading: number) => {
      if (cancelled || !Number.isFinite(heading)) return;
      const normalized = ((heading % 360) + 360) % 360;
      const samples = compassSamplesRef.current;
      samples.push(normalized);
      if (samples.length > 7) samples.shift();
      const robustHeading = circularMeanHeading(samples);
      if (robustHeading == null) return;

      const smoothed = smoothCompassHeading(
        compassHeadingRef.current,
        robustHeading,
        0.18,
      );
      compassHeadingRef.current = smoothed;
      setCompassHeading(smoothed);
    };

    if (Platform.OS === "ios") {
      setCompassAvailable(true);
      void Location.watchHeadingAsync(({ trueHeading, magHeading }) => {
        acceptHeading(trueHeading >= 0 ? trueHeading : magHeading);
      })
        .then((subscription) => {
          if (cancelled) subscription.remove();
          else headingSubscription = subscription;
        })
        .catch(() => {
          if (!cancelled) setCompassAvailable(false);
        });
      return () => {
        cancelled = true;
        headingSubscription?.remove();
      };
    }

    void Promise.all([
      Magnetometer.isAvailableAsync(),
      DeviceMotion.isAvailableAsync(),
    ])
      .then(([magnetometerAvailable, motionAvailable]) => {
        if (cancelled) return;
        setCompassAvailable(magnetometerAvailable);
        if (!magnetometerAvailable) return;

        Magnetometer.setUpdateInterval(120);
        if (motionAvailable) {
          DeviceMotion.setUpdateInterval(120);
          motionSubscription = DeviceMotion.addListener(
            ({ accelerationIncludingGravity }) => {
              const { x, y, z } = accelerationIncludingGravity;
              if (
                cancelled ||
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                !Number.isFinite(z)
              ) {
                return;
              }
              const previous = compassGravityRef.current;
              const factor = previous == null ? 1 : 0.18;
              compassGravityRef.current = previous
                ? {
                    x: previous.x + (x - previous.x) * factor,
                    y: previous.y + (y - previous.y) * factor,
                    z: previous.z + (z - previous.z) * factor,
                  }
                : { x, y, z };
            },
          );
        }

        magnetometerSubscription = Magnetometer.addListener(({ x, y, z }) => {
          if (
            cancelled ||
            !Number.isFinite(x) ||
            !Number.isFinite(y) ||
            !Number.isFinite(z)
          ) {
            return;
          }

          const magnetic = { x, y, z };
          const heading =
            motionAvailable && compassGravityRef.current
              ? tiltCompensatedCompassHeading(
                  magnetic,
                  compassGravityRef.current,
                )
              : tiltCompensatedCompassHeading(magnetic, {
                  x: 0,
                  y: 0,
                  z: 9.80665,
                });
          if (heading == null) return;

          acceptHeading(heading);
        });
      })
      .catch(() => {
        if (!cancelled) setCompassAvailable(false);
      });

    return () => {
      cancelled = true;
      magnetometerSubscription?.remove();
      motionSubscription?.remove();
      headingSubscription?.remove();
      magnetometerSubscription = null;
      motionSubscription = null;
      headingSubscription = null;
    };
  }, [locationPermissionRetry]);

  const stopTurnAudio = useCallback(async () => {
    const sound = turnSoundRef.current;
    turnSoundRef.current = null;
    const complete = turnCompletionRef.current;
    turnCompletionRef.current = null;
    complete?.();
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch {
        // Best effort — der kurze Clip koennte bereits beendet sein.
      }
    }
  }, []);

  const teardownNarrationSound = useCallback((sound: AudioSound | null) => {
    if (!sound) return narrationTeardownRef.current;
    const teardown = narrationTeardownRef.current.then(async () => {
      try {
        await sound.stopAsync();
      } catch {
        // Der Player kann bei einem nativen Playback-Fehler bereits gestoppt sein.
      }
      try {
        await sound.unloadAsync();
      } catch {
        // Best effort — der Player kann bereits entladen sein.
      }
    });
    narrationTeardownRef.current = teardown.catch(() => {});
    return teardown;
  }, []);

  const stopNarration = useCallback(async () => {
    const sound = narrationSoundRef.current;
    narrationSoundRef.current = null;
    navInterruptingRef.current = false;
    await Promise.all([stopTurnAudio(), teardownNarrationSound(sound)]);
    // Zurueck auf MixWithOthers — andere Apps duerfen wieder ungedimmt spielen.
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "mixWithOthers",
    }).catch(() => {});
    setSpeaking(false);
    speakingRef.current = false;
    updateNowPlaying(null);
  }, [stopTurnAudio, teardownNarrationSound, updateNowPlaying]);

  // Manueller Stopp (Pause-Button, Abschluss, Verlassen des Screens):
  // erhoeht zusaetzlich die Generation, damit auch noch in-flight laufende
  // speak()-Aufrufe (z. B. eine KI-Anfrage, die gerade laedt) verfallen und
  // nach dem Stopp nicht doch noch zu sprechen beginnen.
  const cancelNarration = useCallback(async () => {
    narrationQueueRef.current = [];
    startupSequenceActiveRef.current = false;
    chapterAudioRetryCountRef.current.clear();
    if (chapterAudioRetryTimerRef.current !== null) {
      clearTimeout(chapterAudioRetryTimerRef.current);
      chapterAudioRetryTimerRef.current = null;
    }
    startupSequenceGenRef.current++;
    if (startupSequenceTimerRef.current !== null) {
      clearTimeout(startupSequenceTimerRef.current);
      startupSequenceTimerRef.current = null;
    }
    narrationGenRef.current++;
    turnGenRef.current++;
    await stopNarration();
  }, [stopNarration]);

  useEffect(() => {
    if (hikePaused) void cancelNarration();
  }, [hikePaused, cancelNarration]);

  // UI-Status wird optimistisch sofort auf "spricht" gesetzt, statt auf das
  // native onStart-Event zu warten: auf manchen Geraeten (v. a. Android mit
  // QUEUE_ADD-Warteschlange) feuert onStart verzoegert oder gar nicht, wenn
  // stop() und speak() ohne await direkt hintereinander aufgerufen werden —
  // der Button wirkte dann wie "tot", obwohl die Sprachausgabe lief oder kurz
  // darauf startete. await stop() vor speak() vermeidet zudem, dass die
  // vorherige Aeusserung noch in der nativen Warteschlange haengt.
  //
  // KI-Erzaehlstimme (ElevenLabs oder explizit OpenAI, ueber den Server) —
  // online-only. Schlaegt sie fehl (offline, Serverfehler), gibt es keinen
  // Wechsel auf eine lokale Gerätestimme; stattdessen erscheint ein
  // sichtbarer "KI-Stimme nicht verfuegbar"-Hinweis.
  // onFinished feuert NUR bei natuerlichem Ende (onDone/didJustFinish), nie
  // bei manuellem Stopp oder wenn eine andere speak()-Aeusserung dazwischen-
  // funkt (stopNarration loest dann onStopped/onError aus). So kann man
  // z. B. nach einem POI-Einschub die unterbrochene Kapitel-Erzaehlung
  // automatisch fortsetzen, ohne dass die Wanderung dafuer eine Beruehrung
  // braucht — die App bleibt nach dem Start durchgehend freihaendig.
  const retryChapterAfterPlaybackFailure = useCallback(
    (chapterIndex: number, reason: string) => {
      if (
        storyCompleteRef.current ||
        currentIndexRef.current !== chapterIndex ||
        narratedThroughRef.current >= chapterIndex
      ) {
        return;
      }
      const retryCount =
        chapterAudioRetryCountRef.current.get(chapterIndex) ?? 0;
      if (retryCount >= 2) {
        storyAudioLog("chapter audio retry exhausted", {
          chapterIndex,
          reason,
          retryCount,
        });
        return;
      }
      const nextRetryCount = retryCount + 1;
      chapterAudioRetryCountRef.current.set(chapterIndex, nextRetryCount);
      lastNarratedRef.current = chapterIndex - 1;
      if (chapterAudioRetryTimerRef.current !== null) {
        clearTimeout(chapterAudioRetryTimerRef.current);
      }
      storyAudioLog("chapter audio retry scheduled", {
        chapterIndex,
        reason,
        retryCount: nextRetryCount,
      });
      chapterAudioRetryTimerRef.current = setTimeout(() => {
        chapterAudioRetryTimerRef.current = null;
        if (
          storyCompleteRef.current ||
          currentIndexRef.current !== chapterIndex ||
          narratedThroughRef.current >= chapterIndex
        ) {
          return;
        }
        setChapterNarrationRetry((retry) => retry + 1);
      }, 750);
    },
    [],
  );

  const speak = useCallback(
    async (text: string, onFinished?: () => void, opts?: SpeakOptions) => {
      const traceId =
        opts?.traceId ??
        `narration_${Date.now().toString(36)}_${++narrationTraceSequenceRef.current}`;
      const activeKind = opts?.kind ?? "chapter";
      const activeChapterIndex = opts?.chapterIndex;
      const audioRole = opts?.audioRole ?? null;
      const audioDetails = {
        traceId,
        audioRole,
        kind: activeKind,
        chapterIndex: activeChapterIndex ?? null,
        textLength: text.length,
        preFetched: Boolean(opts?.preFetchedUri),
        useOpenAI: Boolean(opts?.useOpenAI),
      };
      // Vor der Startbestätigung darf kein aktiver Trigger sprechen. Das
      // zusätzliche Audio-Flag schützt weiterhin den Story-Ladezustand.
      if (!startGateConfirmedRef.current || !startAudioReleasedRef.current) {
        storyAudioLog("narration_rejected", {
          ...audioDetails,
          reason: "start_gate_not_released",
        });
        return;
      }
      const enqueueNarration = () => {
        const entry: NarrationQueueItem = {
          text,
          onFinished,
          allowDuringStartup: opts?.allowDuringStartup,
          useOpenAI: opts?.useOpenAI,
          preFetchedUri: opts?.preFetchedUri,
          replaceQueuedCategory: opts?.replaceQueuedCategory,
          kind: opts?.kind,
          chapterIndex: opts?.chapterIndex,
          displayTitle: opts?.displayTitle,
          traceId,
          audioRole: opts?.audioRole,
        };
        enqueueNarrationItem(narrationQueueRef.current, entry);
        if (
          opts?.kind === "decisionPrompt" ||
          opts?.kind === "feedback" ||
          opts?.audioRole
        ) {
          storyAudioLog("narration_queued", {
            ...decisionDebugSnapshot(
              opts.chapterIndex ?? currentIndexRef.current,
            ),
            ...audioDetails,
            queueLength: narrationQueueRef.current.length,
            queueAfter: narrationQueueRef.current.map((item) => ({
              kind: item.kind ?? null,
              chapterIndex: item.chapterIndex ?? null,
              traceId: item.traceId ?? null,
              audioRole: item.audioRole ?? null,
            })),
          });
        }
      };
      const hasActiveAudio =
        speakingRef.current ||
        narrationSoundRef.current !== null ||
        turnSoundRef.current !== null ||
        navInterruptingRef.current;
      if (
        opts?.kind === "decisionPrompt" ||
        opts?.kind === "feedback" ||
        opts?.audioRole
      ) {
        storyAudioLog("narration_requested", {
          ...decisionDebugSnapshot(
            opts.chapterIndex ?? currentIndexRef.current,
          ),
          ...audioDetails,
          hasActiveAudio,
          speakingRef: speakingRef.current,
          narrationSoundActive: narrationSoundRef.current !== null,
          queueBefore: narrationQueueRef.current.map((item) => ({
            kind: item.kind ?? null,
            chapterIndex: item.chapterIndex ?? null,
            traceId: item.traceId ?? null,
            audioRole: item.audioRole ?? null,
          })),
        });
      }
      // NAV-INTERRUPT: Navigationsanweisung unterbricht sofort und setzt die
      // laufende Erzaehlung danach an derselben Stelle fort.
      if (opts?.navInterrupt) {
        const turnGen = ++turnGenRef.current;
        const narrationGen = narrationGenRef.current;
        // Zwei kurz nacheinander eintreffende Abbiegehinweise duerfen niemals
        // zwei Clip-Player gleichzeitig offen halten.
        await stopTurnAudio();
        if (
          turnGen !== turnGenRef.current ||
          narrationGen !== narrationGenRef.current
        )
          return;
        const soundToResume = narrationSoundRef.current;
        if (soundToResume && speakingRef.current) {
          // Sound pausieren statt stoppen — Abspielposition bleibt erhalten.
          navInterruptingRef.current = true;
          try {
            await soundToResume.pauseAsync();
          } catch {}
        }
        const previousNowPlaying = nowPlayingRef.current;
        updateNowPlaying({
          kind: "navigation",
          label: narrationLabel("navigation"),
          title: opts.displayTitle ?? text,
          text,
        });

        const playTurnSource = async (
          source: Parameters<typeof createAudioSound>[0],
        ) => {
          let turnSound: AudioSound | null = null;
          try {
            const { sound } = await createAudioSound(source);
            turnSound = sound;
            if (
              turnGen !== turnGenRef.current ||
              narrationGen !== narrationGenRef.current
            ) {
              await sound.unloadAsync().catch(() => {});
              return;
            }
            turnSoundRef.current = sound;
            const completion = new Promise<void>((resolve) => {
              let completed = false;
              const complete = () => {
                if (completed) return;
                completed = true;
                resolve();
              };
              turnCompletionRef.current = complete;
              sound.setOnPlaybackStatusUpdate((status) => {
                if (!status.isLoaded || status.didJustFinish) complete();
              });
            });
            await sound.playAsync();
            await completion;
          } finally {
            if (turnSoundRef.current === turnSound) {
              turnSoundRef.current = null;
              turnCompletionRef.current = null;
            }
            try {
              await turnSound?.unloadAsync();
            } catch {}
          }
        };

        // Audio-Session auf DuckOthers schalten, damit der Navigationsclip
        // hörbar ist, ohne die pausierte Erzählung zu verlieren.
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: "duckOthers",
        }).catch(() => {});

        try {
          const source = opts.turnAudio
            ? getTurnAudio(
                resolveLang((profile?.language ?? "de") as Lang),
                opts.turnAudio,
              )
            : {
                uri: await blobToTempFileUri(
                  await createNarration({
                    text,
                    language: profile?.language,
                    provider: "openai",
                  }),
                ),
              };
          await playTurnSource(source);
        } catch {
          // Wenn der vorbereitete Abbiegeclip fehlt, denselben Hinweis als
          // OpenAI-Audio erzeugen. Der Player bleibt dabei im separaten
          // Navigationskanal, damit die Erzählung danach fortgesetzt wird.
          if (
            opts.turnAudio &&
            turnGen === turnGenRef.current &&
            narrationGen === narrationGenRef.current
          ) {
            try {
              const fallbackUri = await blobToTempFileUri(
                await createNarration({
                  text,
                  language: profile?.language,
                  provider: "openai",
                }),
              );
              await playTurnSource({ uri: fallbackUri });
            } catch {
              // Der Navigationshinweis ist best-effort; die Erzählung wird
              // trotzdem an ihrer pausierten Position fortgesetzt.
            }
          }
        }

        // Audio-Session nach dem kurzen Abbiegeclip zurücksetzen.
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: "mixWithOthers",
        }).catch(() => {});

        // Nav-Ansage fertig: Narration fortsetzen, falls noch derselbe Sound aktiv.
        if (turnGen !== turnGenRef.current) return;
        navInterruptingRef.current = false;
        if (
          narrationGen === narrationGenRef.current &&
          soundToResume &&
          narrationSoundRef.current === soundToResume
        ) {
          try {
            await soundToResume.playAsync();
          } catch {}
          updateNowPlaying(previousNowPlaying);
        } else {
          updateNowPlaying(null);
          const next = narrationQueueRef.current.shift();
          if (next) {
            speakRef.current?.(next.text, next.onFinished, {
              useOpenAI: next.useOpenAI,
              allowDuringStartup: next.allowDuringStartup,
              preFetchedUri: next.preFetchedUri,
              replaceQueuedCategory: next.replaceQueuedCategory,
              kind: next.kind,
              chapterIndex: next.chapterIndex,
              displayTitle: next.displayTitle,
              traceId: next.traceId,
              audioRole: next.audioRole,
            });
          }
        }
        return;
      }

      // Die Startsequenz reserviert den ersten Platz für die Einleitung.
      // Navigation bleibt davon ausgenommen und darf auch in diesem Fenster
      // sofort abspielen.
      if (startupSequenceActiveRef.current && !opts?.allowDuringStartup) {
        if (opts?.audioRole) {
          storyAudioLog("narration_deferred", {
            ...decisionDebugSnapshot(
              activeChapterIndex ?? currentIndexRef.current,
            ),
            ...audioDetails,
            reason: "startup_sequence",
          });
        }
        enqueueNarration();
        return;
      }

      // Einzige automatische Ausnahme: navInterrupt darf die aktive
      // Wiedergabe pausieren. Alle anderen Audioquellen warten in der Queue.
      if (hasActiveAudio && !(opts?.interrupt && opts?.kind === "navigation")) {
        if (opts?.audioRole) {
          storyAudioLog("narration_deferred", {
            ...decisionDebugSnapshot(
              activeChapterIndex ?? currentIndexRef.current,
            ),
            ...audioDetails,
            reason: "active_audio",
            activeNarrationKind: narrationActiveKindRef.current,
            activeNarrationTraceId: narrationActiveTraceIdRef.current,
          });
        }
        enqueueNarration();
        return;
      }
      // Der TTS-Fallback eines Abbiegehinweises nutzt interrupt, weil der
      // vorbereitete Turn-Clip nicht verfügbar war. Auch hier bleibt der
      // Interrupt ausschließlich auf Navigation beschränkt.
      if (opts?.interrupt && opts?.kind === "navigation") {
        narrationQueueRef.current = [];
        navInterruptingRef.current = false;
      }
      // Neue Generation SOFORT beanspruchen, damit noch laufende speak()-
      // Aufrufe (z. B. nach schnellem Doppel-Tipp auf "Wiederholen") sich
      // nach ihren awaits als veraltet erkennen und nichts mehr abspielen.
      const gen = ++narrationGenRef.current;
      setNarrationUnavailable(false);
      setSpeaking(true);
      updateNowPlaying({
        kind: activeKind,
        label: narrationLabel(activeKind),
        title: opts?.displayTitle,
        text,
        chapterIndex: opts?.chapterIndex,
      });
      // Sofortige Synchronisation des Refs — setSpeaking ist asynchron (React
      // State), der Ref wird sonst erst beim naechsten Render gesetzt. Ohne
      // diese Zeile liegt zwischen setSpeaking(true) und dem naechsten Render
      // eine Luecke, in der ein Meilenstein-/POI-Aufruf speakingRef.current
      // noch als false sieht und nicht in die Warteschlange einreiht, sondern
      // sofort unterbricht.
      speakingRef.current = true;

      try {
        // TTS-Anfrage VOR dem Stopp des laufenden Audios: solange der
        // Netzwerk-Request laeuft, spielt das vorherige Audio weiter —
        // die iOS-Audiosession bleibt aktiv und der JS-Thread wird im
        // Hintergrund nicht suspendiert. Erst wenn das neue Audio bereit
        // ist, wird das alte gestoppt (Luecke < 100 ms statt 1-5 Sekunden).
        // Vorgeladene URI direkt nutzen (kein Netzwerk-Request noetig).
        storyAudioLog("narration_source_requested", {
          ...decisionDebugSnapshot(
            activeChapterIndex ?? currentIndexRef.current,
          ),
          traceId,
          audioRole,
          kind: activeKind,
          chapterIndex: activeChapterIndex ?? null,
          generation: gen,
          source: opts?.preFetchedUri ? "prefetched_uri" : "generated_audio",
        });
        const uri =
          opts?.preFetchedUri ??
          (await (async () => {
            // gsw: Heidi-Stimme via gsw-language-Key; Text ist bereits Hochdeutsch (storyGenerator)
            const narrationLang = profile?.language;
            const blob = await createNarration({
              text,
              language: narrationLang,
              ...(opts?.useOpenAI ? { provider: "openai" as const } : {}),
            });
            return blobToTempFileUri(blob);
          })());
        storyAudioLog("narration_source_ready", {
          ...decisionDebugSnapshot(
            activeChapterIndex ?? currentIndexRef.current,
          ),
          traceId,
          audioRole,
          kind: activeKind,
          chapterIndex: activeChapterIndex ?? null,
          generation: gen,
          source: opts?.preFetchedUri ? "prefetched_uri" : "generated_audio",
        });
        if (gen !== narrationGenRef.current) {
          storyAudioLog("narration_discarded", {
            ...decisionDebugSnapshot(
              activeChapterIndex ?? currentIndexRef.current,
            ),
            traceId,
            audioRole,
            kind: activeKind,
            chapterIndex: activeChapterIndex ?? null,
            generation: gen,
            currentGeneration: narrationGenRef.current,
            reason: "stale_after_source_ready",
          });
          return;
        }
        // Normale Narration und Abbiegeclip teilen denselben exklusiven
        // Ausgabekanal. Vor einem neuen Sprecher wird ein laufender Clip
        // vollstaendig gestoppt und entladen.
        turnGenRef.current++;
        await stopTurnAudio();
        navInterruptingRef.current = false;
        if (gen !== narrationGenRef.current) {
          storyAudioLog("narration_discarded", {
            ...decisionDebugSnapshot(
              activeChapterIndex ?? currentIndexRef.current,
            ),
            traceId,
            audioRole,
            kind: activeKind,
            chapterIndex: activeChapterIndex ?? null,
            generation: gen,
            currentGeneration: narrationGenRef.current,
            reason: "stale_after_turn_stop",
          });
          return;
        }
        // Vorheriges Audio direkt stoppen — kein setState, damit speaking=true
        // fuer den Ladeindikator erhalten bleibt.
        const prevSound = narrationSoundRef.current;
        narrationSoundRef.current = null;
        if (prevSound) {
          await teardownNarrationSound(prevSound);
        }
        // Auch ein vorheriger natural-end/error cleanup kann noch laufen,
        // nachdem der Ref bereits auf null gesetzt wurde. Vor dem Erzeugen
        // des naechsten Players muss diese native Teardown-Kette beendet sein.
        await narrationTeardownRef.current;
        if (gen !== narrationGenRef.current) {
          storyAudioLog("narration_discarded", {
            ...decisionDebugSnapshot(
              activeChapterIndex ?? currentIndexRef.current,
            ),
            traceId,
            audioRole,
            kind: activeKind,
            chapterIndex: activeChapterIndex ?? null,
            generation: gen,
            currentGeneration: narrationGenRef.current,
            reason: "stale_after_previous_teardown",
          });
          return;
        }
        // Vor dem Abspielen auf DuckOthers wechseln — nur waehrend aktiver Erzaehlung.
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: "duckOthers",
        }).catch(() => {});
        if (gen !== narrationGenRef.current) {
          storyAudioLog("narration_discarded", {
            ...decisionDebugSnapshot(
              activeChapterIndex ?? currentIndexRef.current,
            ),
            traceId,
            audioRole,
            kind: activeKind,
            chapterIndex: activeChapterIndex ?? null,
            generation: gen,
            currentGeneration: narrationGenRef.current,
            reason: "stale_before_player_create",
          });
          return;
        }
        const { sound } = await createAudioSound({ uri });
        if (gen !== narrationGenRef.current) {
          storyAudioLog("narration_discarded", {
            ...decisionDebugSnapshot(
              activeChapterIndex ?? currentIndexRef.current,
            ),
            traceId,
            audioRole,
            kind: activeKind,
            chapterIndex: activeChapterIndex ?? null,
            generation: gen,
            currentGeneration: narrationGenRef.current,
            reason: "stale_after_player_create",
          });
          await teardownNarrationSound(sound);
          return;
        }
        narrationSoundRef.current = sound;
        narrationActiveKindRef.current = activeKind;
        narrationActiveTraceIdRef.current = traceId;
        storyAudioLog("narration player started", {
          ...decisionDebugSnapshot(
            activeChapterIndex ?? currentIndexRef.current,
          ),
          traceId,
          audioRole,
          kind: activeKind,
          chapterIndex: activeChapterIndex ?? null,
          generation: gen,
        });
        let playbackFinished = false;
        let playbackStartedLogged = false;
        let playbackResumeInFlight = false;
        let playbackResumeAttempts = 0;
        // expo-audio emits an initial `isLoaded: false` status while the
        // native player is still loading the local file. That is not the
        // same as a player that was unloaded. Treating it as an error removes
        // every narration player a few milliseconds after creation.
        let sawLoadedStatus = false;
        const finishPlayback = (
          outcome: "finished" | "error",
          reason?: string,
        ) => {
          if (playbackFinished) return;
          playbackFinished = true;
          setSpeaking(false);
          speakingRef.current = false;
          if (narrationSoundRef.current === sound) {
            narrationSoundRef.current = null;
            narrationActiveKindRef.current = null;
            narrationActiveTraceIdRef.current = null;
          }
          void teardownNarrationSound(sound);
          storyAudioLog("narration player finished", {
            ...decisionDebugSnapshot(
              activeChapterIndex ?? currentIndexRef.current,
            ),
            traceId,
            audioRole,
            kind: activeKind,
            chapterIndex: activeChapterIndex ?? null,
            generation: gen,
            outcome,
            reason,
          });
          updateNowPlaying(null);
          if (outcome === "finished") {
            if (activeKind === "chapter" && activeChapterIndex != null) {
              chapterAudioRetryCountRef.current.delete(activeChapterIndex);
            }
            onFinished?.();
          } else if (activeKind === "chapter" && activeChapterIndex != null) {
            retryChapterAfterPlaybackFailure(
              activeChapterIndex,
              reason ?? "playback_error",
            );
          } else {
            // POI, partner, introduction and decision feedback use their
            // completion callback to release pending state or continue the
            // flow even when the native player reports an error.
            onFinished?.();
          }
          // Queue nur verarbeiten, wenn onFinished keinen neuen speak()-Aufruf
          // ausgeloest hat — sonst wuerde der Queue-Eintrag via Gen-Bump die
          // soeben gestartete Ausgabe abwuergen (Race-Condition: Meilenstein-
          // Fetch loest sich genau dann auf, wenn die Entscheidungs-Ack endet,
          // und liegt im Queue — ohne diesen Guard wuerde er die Feedback-
          // Erzaehlung mit einem Gen-Bump abwuergen).
          if (!speakingRef.current) {
            const next = narrationQueueRef.current.shift();
            if (next) {
              speakRef.current?.(next.text, next.onFinished, {
                useOpenAI: next.useOpenAI,
                allowDuringStartup: next.allowDuringStartup,
                preFetchedUri: next.preFetchedUri,
                replaceQueuedCategory: next.replaceQueuedCategory,
                kind: next.kind,
                chapterIndex: next.chapterIndex,
                displayTitle: next.displayTitle,
                traceId: next.traceId,
                audioRole: next.audioRole,
              });
            } else if (!awaitingDecisionRef.current) {
              // Queue leer — zurueck auf MixWithOthers damit andere Apps wieder normal spielen.
              // NICHT zuruecksetzen wenn Entscheidungspunkt aktiv: gleich danach
              // startet die Spracherkennung und benoetigt allowsRecording:true.
              // Der fire-and-forget-Reset koennte die Erkennung killen (Race-Condition).
              setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
                shouldPlayInBackground: true,
                interruptionMode: "mixWithOthers",
              }).catch(() => {});
            }
          }
        };
        sound.setOnPlaybackStatusUpdate((status) => {
          if (
            gen !== narrationGenRef.current ||
            narrationSoundRef.current !== sound
          )
            return;
          if (status.isPlaying && !playbackStartedLogged) {
            playbackStartedLogged = true;
            storyAudioLog("narration playback started", {
              ...decisionDebugSnapshot(
                activeChapterIndex ?? currentIndexRef.current,
              ),
              traceId,
              audioRole,
              kind: activeKind,
              chapterIndex: activeChapterIndex ?? null,
              generation: gen,
              positionMillis: status.positionMillis,
              durationMillis: status.durationMillis,
            });
          }
          // Playback errors must release the chapter/decision state too;
          // otherwise one broken clip blocks all later narration forever.
          if (status.error) {
            setNarrationUnavailable(true);
            finishPlayback("error", status.error);
            return;
          }
          if (status.isLoaded) {
            sawLoadedStatus = true;
          }
          if (!status.isLoaded) {
            if (!sawLoadedStatus) return;
            setNarrationUnavailable(true);
            finishPlayback("error", "playback_unloaded");
            return;
          }
          if (isAudioPlaybackFinished(status)) {
            finishPlayback("finished");
          } else if (
            !status.isPlaying &&
            !status.isBuffering &&
            status.positionMillis > 0
          ) {
            // Unerwarteter Stopp (z. B. Bluetooth-Verbindung unterbricht die
            // Audio-Session): iOS pausiert das Audio automatisch bei einer
            // RouteChange-Interruption. Wir starten neu, sobald wir merken
            // dass das Audio steht obwohl es nicht zu Ende gespielt hat.
            // AUSNAHME: absichtliche Pause wegen Nav-Interrupt — nicht sofort
            // neu starten, sondern auf das Ende der Nav-Ansage warten.
            if (navInterruptingRef.current) return;
            if (playbackResumeInFlight) return;
            if (playbackResumeAttempts >= 2) {
              setNarrationUnavailable(true);
              finishPlayback("error", "resume_attempts_exhausted");
              return;
            }
            playbackResumeAttempts += 1;
            playbackResumeInFlight = true;
            sound
              .playAsync()
              .catch(() => {
                setNarrationUnavailable(true);
                finishPlayback("error", "resume_failed");
              })
              .finally(() => {
                playbackResumeInFlight = false;
              });
          }
        });
        if (
          gen !== narrationGenRef.current ||
          narrationSoundRef.current !== sound
        ) {
          storyAudioLog("narration_discarded", {
            ...decisionDebugSnapshot(
              activeChapterIndex ?? currentIndexRef.current,
            ),
            traceId,
            audioRole,
            kind: activeKind,
            chapterIndex: activeChapterIndex ?? null,
            generation: gen,
            currentGeneration: narrationGenRef.current,
            reason: "stale_before_play_request",
          });
          await teardownNarrationSound(sound);
          return;
        }
        storyAudioLog("narration_play_requested", {
          ...decisionDebugSnapshot(
            activeChapterIndex ?? currentIndexRef.current,
          ),
          traceId,
          audioRole,
          kind: activeKind,
          chapterIndex: activeChapterIndex ?? null,
          generation: gen,
        });
        await sound.playAsync();
      } catch (err) {
        if (gen !== narrationGenRef.current) {
          storyAudioLog("narration_discarded", {
            ...decisionDebugSnapshot(
              activeChapterIndex ?? currentIndexRef.current,
            ),
            traceId,
            audioRole,
            kind: activeKind,
            chapterIndex: activeChapterIndex ?? null,
            generation: gen,
            currentGeneration: narrationGenRef.current,
            reason: "stale_in_error_handler",
            error: err instanceof Error ? err.message : String(err),
          });
          return;
        }
        // Bei jedem Fehler (Rate-Limit, Netzwerkfehler, Server-Fehler, Offline)
        // nicht auf die Gerätestimme wechseln. Der sichtbare Hinweis macht den
        // fehlenden KI-Clip nachvollziehbar; ein Feedback-Callback darf
        // trotzdem die Queue bzw. den nächsten Schritt fortsetzen.
        setNarrationUnavailable(true);
        setSpeaking(false);
        speakingRef.current = false;
        const failedSound = narrationSoundRef.current;
        narrationSoundRef.current = null;
        narrationActiveKindRef.current = null;
        narrationActiveTraceIdRef.current = null;
        if (failedSound) {
          void teardownNarrationSound(failedSound);
        }
        storyAudioLog("narration player failed", {
          traceId,
          audioRole,
          kind: activeKind,
          chapterIndex: activeChapterIndex ?? null,
          generation: gen,
          reason: err instanceof Error ? err.message : String(err),
        });
        updateNowPlaying(null);
        if (activeKind === "chapter" && activeChapterIndex != null) {
          retryChapterAfterPlaybackFailure(
            activeChapterIndex,
            err instanceof Error ? err.message : String(err),
          );
        } else {
          onFinished?.();
        }
        if (!speakingRef.current) {
          const next = narrationQueueRef.current.shift();
          if (next) {
            speakRef.current?.(next.text, next.onFinished, {
              useOpenAI: next.useOpenAI,
              allowDuringStartup: next.allowDuringStartup,
              preFetchedUri: next.preFetchedUri,
              replaceQueuedCategory: next.replaceQueuedCategory,
              kind: next.kind,
              chapterIndex: next.chapterIndex,
              displayTitle: next.displayTitle,
              traceId: next.traceId,
              audioRole: next.audioRole,
            });
          } else if (!awaitingDecisionRef.current) {
            setAudioModeAsync({
              allowsRecording: false,
              playsInSilentMode: true,
              shouldPlayInBackground: true,
              interruptionMode: "mixWithOthers",
            }).catch(() => {});
          }
        }
      }
    },
    [
      decisionDebugSnapshot,
      narrationLabel,
      profile?.language,
      retryChapterAfterPlaybackFailure,
      stopTurnAudio,
      teardownNarrationSound,
      updateNowPlaying,
    ],
  );
  speakRef.current = speak;

  // Entscheidungs-Ack ("Ich verstehe." etc.) vorausladen sobald die Wanderung
  // startet. Der Text ist je Sprache fix, wird genau einmal synthetisiert und
  // bleibt dauerhaft im Narrations-Cache. Das stellt sicher, dass bei der
  // Wahl (Kapitel 3/5) sofort OpenAI-Audio ertönt, ohne Netzwerk-Latenz.
  useEffect(() => {
    if (!startGateConfirmedRef.current || preparing) return;
    const lang = profile?.language;
    // Vorab-Laden in der Sprache, die beim Entscheidungspunkt TATSAECHLICH
    // abgespielt wird. Fuer gsw wird der cueLanguage-Pack ("de") verwendet
    // (OpenAI-Texte + Ack bleiben Hochdeutsch), also muss das Ack-Audio
    // auch in "de" vorgeladen werden — sonst wuerde die preFetchedUri ein
    // gsw-Audio ("Ich verstah.") spielen, obwohl der Text "Ich verstehe." lautet.
    const ackLang = lang === "gsw" ? "de" : (lang ?? "de");
    const pack = STORY_PACKS[resolveLang(ackLang as Lang)];
    const ackText = pack.decisionAck;
    let cancelled = false;
    (async () => {
      try {
        logDecisionFlow(
          "decision_ack_prefetch_started",
          currentIndexRef.current,
          {
            language: ackLang,
            textLength: ackText.length,
            source: "startup_prefetch",
          },
        );
        const blob = await createNarration({
          text: ackText,
          language: ackLang,
          provider: "openai",
        });
        if (cancelled) return;
        const uri = await blobToTempFileUri(blob);
        if (!cancelled) {
          ackAudioUriRef.current = uri;
          logDecisionFlow(
            "decision_ack_prefetch_ready",
            currentIndexRef.current,
            {
              language: ackLang,
              textLength: ackText.length,
              source: "startup_prefetch",
            },
          );
        }
      } catch (err) {
        logDecisionFlow(
          "decision_ack_prefetch_failed",
          currentIndexRef.current,
          {
            language: ackLang,
            textLength: ackText.length,
            source: "startup_prefetch",
            reason: err instanceof Error ? err.message : String(err),
          },
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preparing, profile?.language, startGateConfirmed]);

  // Kapitel automatisch erzaehlen, sobald es erscheint. Ein Ref verhindert,
  // dass eine Kapitel-Mutation (Entscheidung) dasselbe Kapitel erneut vorliest
  // oder den Entscheidungsmoment erneut sperrt.
  useEffect(() => {
    if (
      preparing ||
      !startGateConfirmedRef.current ||
      !startAudioReleasedRef.current ||
      chapters.length === 0
    )
      return;
    if (storyCompleteRef.current) return;
    const ch = chapters[currentIndex];
    if (!ch) return;
    if (lastNarratedRef.current !== currentIndex) {
      lastNarratedRef.current = currentIndex;
      storyAudioLog("chapter audio scheduled", {
        chapterIndex: currentIndex,
        chapterCount: chapters.length,
        retry: chapterNarrationRetry,
      });
      // Erstes Kapitel: Begruessung voranstellen, dann kurze Pause vor Kapitel 1.
      // Offline-Audio bevorzugen wenn vorhanden — kein Netzwerk noetig.
      // capturedIndex sichert den Index zum Zeitpunkt des Effect-Aufrufens.
      const capturedIndex = currentIndex;
      const isInitialChapter = capturedIndex === 0;
      if (isInitialChapter) {
        startupSequenceActiveRef.current = true;
      } else {
        startupSequenceActiveRef.current = false;
      }
      const startupSequenceGen = ++startupSequenceGenRef.current;
      let completionHandled = false;
      const finishChapter = () => {
        if (completionHandled) return;
        completionHandled = true;
        if (startupSequenceGen !== startupSequenceGenRef.current) return;
        if (currentIndexRef.current !== capturedIndex) return;
        narratedThroughRef.current = Math.max(
          narratedThroughRef.current,
          capturedIndex,
        );
        storyAudioLog("chapter audio finished", {
          chapterIndex: capturedIndex,
          chapterCount: chapters.length,
        });
        const latestChapter = decisionsRef.current[capturedIndex];
        if (
          latestChapter?.isDecisionPoint &&
          latestChapter.chosenOptionIndex == null
        ) {
          triggerDecision(capturedIndex, "chapter_audio_finished");
          return;
        }
        const pendingGroupDecisionAdvance =
          pendingGroupDecisionAdvanceRef.current;
        pendingGroupDecisionAdvanceRef.current = null;
        if (pendingGroupDecisionAdvance === capturedIndex) {
          advanceStoryChapter(capturedIndex);
          return;
        }
        advanceStoryChapter(capturedIndex);
      };
      if (startupSequenceTimerRef.current !== null) {
        clearTimeout(startupSequenceTimerRef.current);
        startupSequenceTimerRef.current = null;
      }
      (async () => {
        const offlineUri = saga?.id
          ? await getOfflineAudioUri(saga.id, capturedIndex).catch(() => null)
          : null;
        // Abbrechen wenn GPS oder Entscheidung diesen Kapitel-Index bereits
        // verlassen hat waehrend das Offline-Audio geladen wurde.
        if (
          startupSequenceGen !== startupSequenceGenRef.current ||
          currentIndexRef.current !== capturedIndex
        )
          return;
        if (capturedIndex === 0) {
          const packForCue = STORY_PACKS[resolveLang(cueLanguage)];
          speak(
            `${greetingPrefix} ${packForCue.hikeStartCue}`,
            () => {
              if (startupSequenceGen !== startupSequenceGenRef.current) return;
              startupSequenceTimerRef.current = setTimeout(() => {
                startupSequenceTimerRef.current = null;
                if (
                  startupSequenceGen !== startupSequenceGenRef.current ||
                  currentIndexRef.current !== capturedIndex
                )
                  return;
                startupSequenceActiveRef.current = false;
                speak(ch.text, finishChapter, {
                  preFetchedUri: offlineUri ?? undefined,
                  kind: "chapter",
                  chapterIndex: capturedIndex,
                  displayTitle: t.chapterMark(
                    capturedIndex + 1,
                    chapters.length,
                  ),
                });
              }, 1500);
            },
            {
              useOpenAI: true,
              kind: "introduction",
              allowDuringStartup: true,
              displayTitle: t.preparingText,
            },
          );
        } else {
          speak(ch.text, finishChapter, {
            preFetchedUri: offlineUri ?? undefined,
            kind: "chapter",
            chapterIndex: capturedIndex,
            displayTitle: t.chapterMark(capturedIndex + 1, chapters.length),
          });
        }
      })();
      // Kapitelwechsel als Mitteilung (Uhr-Spiegelung, wenn iPhone gesperrt).
      // Das erste Kapitel wird nicht gemeldet — der Start ist offensichtlich.
      if (
        currentIndex > 0 &&
        turnNotifsReady &&
        profile?.navAnnouncementsEnabled !== false
      ) {
        sendeAbbiegeMitteilung(
          t.chapterNotif(currentIndex + 1),
          route?.name ?? localizedSagaTitle,
        );
      }
    }
    if (ch.isDecisionPoint && ch.chosenOptionIndex == null) {
      triggerDecision(currentIndex, "chapter_effect");
    }
  }, [
    advanceStoryChapter,
    chapterNarrationRetry,
    currentIndex,
    preparing,
    startAudioReleased,
    startGateConfirmed,
    chapters,
    speak,
    turnNotifsReady,
    t,
    route?.name,
    localizedSagaTitle,
    greetingPrefix,
    storyLanguage,
    logDecisionFlow,
    triggerDecision,
  ]);

  // Unterbrochene Wanderung fuer die "Weiter wandern"-Karte auf dem Home-Tab
  // merken: bei jedem Kapitelwechsel wird der Fortschritt persistiert; beim
  // Abschluss (finishHike) wird der Eintrag wieder geloescht.
  useEffect(() => {
    if (
      !startGateConfirmedRef.current ||
      preparing ||
      finished ||
      chapters.length === 0 ||
      !saga
    )
      return;
    saveActiveHike({
      routeId: route?.id ?? "",
      sagaId: saga.id,
      clientHikeId: ensureClientHikeId(),
      routeName: route?.name ?? localizedSagaTitle,
      chapterIndex: currentIndex,
      chapterCount: chapters.length,
      updatedAt: Date.now(),
      // Route komplett mitspeichern, damit die Wanderung nach einem Absturz
      // auch ohne (erneut) geladenen Katalog fortgesetzt werden kann.
      route: route ?? undefined,
      activeGeometry: acceptedRouteGeometry ?? undefined,
    });
  }, [
    currentIndex,
    preparing,
    finished,
    chapters.length,
    saga,
    route,
    localizedSagaTitle,
    acceptedRouteGeometry,
    saveActiveHike,
    startGateConfirmed,
    ensureClientHikeId,
  ]);

  // Refs spiegeln den aktuellen Erzaehlzustand, damit der POI-Effekt unten
  // NICHT bei jeder Kapitel-/Sprechzustandsaenderung neu laeuft (und dabei
  // eine laufende POI-Erzaehlung abbrechen wuerde).
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;
  const chapterTextRef = useRef<string | undefined>(undefined);
  chapterTextRef.current = chapters[currentIndex]?.text;

  // Sobald unterwegs ein realer Ort in der Naehe entdeckt wird (nearbyPoi,
  // siehe oben), erzaehlt der Erzaehler kurz davon — mit dem bereits
  // Lazy Wiki-Anreicherung: wird ausgeloest wenn ein neuer nearbyPoi erscheint.
  // Die Karte zeigt sofort Name + Typ; Bild und Beschreibungstext folgen nach
  // ~1-2 s wenn der Server zurückmeldet (Wikipedia/Commons/AI).
  useEffect(() => {
    if (!nearbyPoi) {
      setNearbyPoiWiki(undefined);
      setNearbyPoiWikiPoiId(null);
      return;
    }
    setNearbyPoiWiki(undefined);
    setNearbyPoiWikiPoiId(null);
    let cancelled = false;
    (async () => {
      const cached = await getOfflinePoiDetail(nearbyPoi.id);
      if (cached !== undefined) {
        if (!cancelled) {
          setNearbyPoiWiki(cached);
          setNearbyPoiWikiPoiId(nearbyPoi.id);
        }
        return;
      }
      getPoiDetail({
        name: nearbyPoi.name,
        kind: nearbyPoi.kind,
        lat: nearbyPoi.lat,
        lng: nearbyPoi.lng,
        ...(nearbyPoi.wikipediaTag
          ? { wikipediaTag: nearbyPoi.wikipediaTag }
          : {}),
        ...(nearbyPoi.wikidataTag
          ? { wikidataTag: nearbyPoi.wikidataTag }
          : {}),
      })
        .then((r) => {
          if (!cancelled) {
            setNearbyPoiWiki(r.wiki ?? null);
            setNearbyPoiWikiPoiId(nearbyPoi.id);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setNearbyPoiWiki(null);
            setNearbyPoiWikiPoiId(nearbyPoi.id);
          }
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [nearbyPoi?.id]);

  // Erst nach Abschluss der POI-Anreicherung benachrichtigen. So kann die
  // iOS-Mitteilung das Bild als lokalen Anhang laden; bei fehlendem Inhalt
  // bleibt die Textmitteilung trotzdem garantiert erhalten.
  useEffect(() => {
    if (
      !nearbyPoi ||
      nearbyPoi.kind === "saga=heart" ||
      !turnNotifsReady ||
      nearbyPoiWikiPoiId !== nearbyPoi.id ||
      notifiedPoiIdsRef.current.has(nearbyPoi.id)
    ) {
      return;
    }

    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    const send = (wiki: WikiSummary | null) => {
      if (notifiedPoiIdsRef.current.has(nearbyPoi.id)) return;
      const radiusKm = nearbyPoi.kind === "saga=heart" ? 0.5 : 0.3;
      if (!isPoiStillRelevant(nearbyPoi, radiusKm)) {
        watchPoiLog("POI notification skipped after leaving radius", {
          poiId: nearbyPoi.id,
          kind: "poi",
          source: "nearby",
          radiusKm,
        });
        return;
      }
      notifiedPoiIdsRef.current.add(nearbyPoi.id);
      void sendePoiMitteilung(
        nearbyPoi.name,
        wiki?.extract ? trimForNarration(wiki.extract) : t.poiNotifBody,
        wiki?.image ?? null,
      );
    };

    if (nearbyPoiWiki !== undefined) {
      send(nearbyPoiWiki);
    } else {
      // Netzwerk-/Wiki-Ausfälle dürfen die Mitteilung nicht endlos blockieren.
      // Kommt die Anreicherung später, ist die bereits gesendete Textmitteilung
      // besser als eine doppelte Benachrichtigung.
      fallbackTimer = setTimeout(() => send(null), 5_000);
    }

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [
    isPoiStillRelevant,
    nearbyPoi,
    nearbyPoiWiki,
    nearbyPoiWikiPoiId,
    t.poiNotifBody,
    turnNotifsReady,
  ]);

  // geladenen Wikipedia-Auszug, in derselben Sprache/Stimme wie die Sage.
  // Das unterbricht kurz eine laufende Kapitel-Erzaehlung; sobald der
  // POI-Einschub natuerlich zu Ende ist, wird das aktuelle Kapitel
  // automatisch weitererzaehlt — ganz ohne Beruehrung, damit die Wanderung
  // ab dem Start durchgehend freihaendig bleibt.
  useEffect(() => {
    if (!nearbyPoi) return;
    if (narratedPoiIdRef.current === nearbyPoi.id) return;
    // Kulturelle/historische POIs mit spezifischem Namen werden durch den
    // progressiven Annaeherungs-Effekt erzaehlt (200 m Hinweis + 50 m Geschichte).
    if (
      POI_APPROACH_KINDS.has(nearbyPoi.kind ?? "") &&
      isPoiNameSpecific(nearbyPoi.name, nearbyPoi.kind)
    )
      return;
    const traceId = createPoiTrace(nearbyPoi.id, "poi", "nearby");
    if (!claimPoiStory(nearbyPoi, "nearby", traceId)) {
      narratedPoiIdRef.current = nearbyPoi.id;
      watchPoiLog("POI narration skipped after duplicate claim", {
        traceId,
        poiId: nearbyPoi.id,
        kind: "poi",
        source: "nearby",
      });
      return;
    }
    narratedPoiIdRef.current = nearbyPoi.id;
    watchPoiTraceRef.current = { poiId: nearbyPoi.id, traceId, kind: "poi" };
    // Kontext des vorherigen POI darf nicht an der neuen Karte kleben.
    setNearbyPoiKontext(null);
    // Spuerbarer Hinweis, dass gleich ein Ort erzaehlt wird — wer aufs
    // Panorama schaut statt aufs Handy, merkt es trotzdem.
    hapticHeavy();
    const isSagaHeart = nearbyPoi.kind === "saga=heart";
    const poiName = nearbyPoi.name;
    const releasePoiNarration = beginPoiNarration(traceId, "nearby");
    let poiAudioStarted = false;
    const finishPoiNarration = () => {
      watchPoiLog("POI narration audio finished", {
        traceId,
        poiId: nearbyPoi.id,
        kind: "poi",
        source: "nearby",
      });
      setWatchPoiStory(null);
      releasePoiNarration("audio_finished");
    };
    const pack = STORY_PACKS[resolveLang(cueLanguage)];
    const rawExtract = nearbyPoiWiki?.extract ?? null;
    let cancelled = false;
    const erzaehle = (text: string) => {
      if (cancelled) {
        watchPoiLog("POI narration result ignored after cancellation", {
          traceId,
          poiId: nearbyPoi.id,
          kind: "poi",
          source: "nearby",
          reason: "effect_cancelled",
        });
        releasePoiNarration("cancelled_before_audio");
        return;
      }
      const radiusKm = isSagaHeart ? 0.5 : 0.3;
      if (!isPoiStillRelevant(nearbyPoi, radiusKm)) {
        watchPoiLog("POI narration expired before audio", {
          traceId,
          poiId: nearbyPoi.id,
          kind: "poi",
          source: "nearby",
          radiusKm,
        });
        releasePoiNarration("left_radius_before_audio");
        return;
      }
      poiAudioStarted = true;
      watchPoiLog("POI story staged for phone and Watch state", {
        traceId,
        poiId: nearbyPoi.id,
        kind: "poi",
        source: "nearby",
        storyTextLength: text.length,
        imagePresent: Boolean(nearbyPoiWiki?.image),
      });
      setWatchPoiStory({
        id: nearbyPoi.id,
        name: nearbyPoi.name,
        imageUrl: nearbyPoiWiki?.image ?? null,
        text: text.slice(0, 8_000),
        kind: "poi",
      });
      if (!isSagaHeart) {
        raiseWatchDiscoveryAlert({
          text: `Sehenswürdigkeit in der Nähe: ${poiName}`,
          haptic: "notification",
          action: "openPoiStory",
        });
        watchPoiLog("Watch discovery alert staged", {
          traceId,
          poiId: nearbyPoi.id,
          kind: "poi",
          source: "nearby",
          action: "openPoiStory",
          storyPresent: true,
        });
      }
      speak(text, finishPoiNarration, {
        useOpenAI: true,
        kind: "poi",
        displayTitle: poiName,
      });
    };
    // Die Geschichte des Ortes wird gleich mit erzaehlt — per KI in denselben
    // Erzaehlton umgeschrieben wie die Sagen. Faellt die Umschreibung aus,
    // wird der rohe Wikipedia-Auszug erzaehlt; ohne Auszug erzeugt der Server
    // einen kurzen Kontext aus Name + OSM-Kategorie (Fallback: nur der Name).
    // Sagenmittelpunkt: kein "Unterbrechung der Sage"-Wrapper — der Text
    // fliesst direkt als nahtlose Fortsetzung der laufenden Erzaehlung.
    // Offline-Cache bevorzugen, sonst Netzwerk-Request.
    (async () => {
      const cached = await getOfflinePoiStory(nearbyPoi.id, cueLanguage);
      if (cached !== null) {
        if (!cancelled) {
          if (!nearbyPoiWiki?.extract) setNearbyPoiKontext(cached);
          erzaehle(
            isSagaHeart ? cached : pack.poiAside(nearbyPoi.name, cached),
          );
        }
        return;
      }
      getPoiStory({
        name: nearbyPoi.name,
        extract: rawExtract ?? undefined,
        kind: nearbyPoi.kind,
        lang: cueLanguage,
        osmContext: nearbyPoi.osmContext ?? undefined,
      })
        .then((r) => {
          if (!cancelled && !nearbyPoiWiki?.extract)
            setNearbyPoiKontext(r.text);
          erzaehle(
            isSagaHeart ? r.text : pack.poiAside(nearbyPoi.name, r.text),
          );
        })
        .catch(() => {
          if (!isSagaHeart)
            erzaehle(
              pack.poiAside(
                nearbyPoi.name,
                rawExtract ? trimForNarration(rawExtract) : null,
              ),
            );
        });
    })();
    return () => {
      cancelled = true;
      if (!poiAudioStarted) releasePoiNarration("effect_cleanup_before_audio");
    };
  }, [
    beginPoiNarration,
    claimPoiStory,
    createPoiTrace,
    isPoiStillRelevant,
    nearbyPoi,
    nearbyPoiWiki,
    raiseWatchDiscoveryAlert,
    storyLanguage,
    speak,
    t,
    startGateConfirmed,
  ]);

  // Stufenweise Annaeherung an kulturelle/historische POIs mit spezifischem Namen:
  // 200 m → einmaliger OpenAI-Richtungshinweis
  // 50 m  → volle Geschichte in Erzaehlstimme (identisch zum normalen POI-Flow)
  useEffect(() => {
    if (
      !startGateConfirmedRef.current ||
      !hasFreshGps ||
      !nearbyPoi ||
      !livePos
    )
      return;
    if (!POI_APPROACH_KINDS.has(nearbyPoi.kind ?? "")) return;
    if (!isPoiNameSpecific(nearbyPoi.name, nearbyPoi.kind)) return;
    // Pruefe ob spezifischer Inhalt vorhanden ist — reine KI-Generierung
    // aus Kategorie+Name wuerde generischen Text liefern ("eine Ruine ist ein
    // verfallendes Gebaeude"), nicht spezifische Informationen zu DIESEM Ort.
    // nearbyPoiWiki === undefined: Wiki wird noch geladen; Effekt laeuft
    // erneut wenn er ankommt. null: kein Artikel → weiter nur mit osmContext.
    const wikiLoading = nearbyPoiWiki === undefined;
    const hasSpecificContent =
      Boolean(nearbyPoi.osmContext && nearbyPoi.osmContext.trim().length > 0) ||
      Boolean(!wikiLoading && nearbyPoiWiki?.extract);
    if (wikiLoading && !nearbyPoi.osmContext) return; // noch am Laden, warten
    if (!hasSpecificContent) return; // kein spezifischer Inhalt, ueberspringen

    const distKm = haversineKm(livePos, {
      lat: nearbyPoi.lat,
      lng: nearbyPoi.lng,
    });

    // 200 m: Richtungshinweis (einmalig pro POI)
    if (distKm <= 0.2 && hintedPoiIdRef.current !== nearbyPoi.id) {
      hintedPoiIdRef.current = nearbyPoi.id;
      const pack = STORY_PACKS[resolveLang(cueLanguage)];
      const hintTraceId = createPoiTrace(nearbyPoi.id, "poi", "approach-200m");
      const releasePoiHint = beginPoiNarration(hintTraceId, "approach-200m");
      // Bewegungsrichtung aus zwei aufeinanderfolgenden GPS-Fixes ableiten
      let dir: "links" | "rechts" | "geradeaus" = "geradeaus";
      if (prevLivePosRef.current) {
        const heading = bearingDeg(prevLivePosRef.current, livePos);
        const bear = bearingDeg(livePos, {
          lat: nearbyPoi.lat,
          lng: nearbyPoi.lng,
        });
        const rel = (bear - heading + 360) % 360;
        dir =
          rel < 45 || rel > 315 ? "geradeaus" : rel <= 135 ? "rechts" : "links";
      }
      speak(pack.poiApproachHint(dir), releasePoiHint, {
        useOpenAI: true,
        kind: "poi",
        displayTitle: nearbyPoi.name,
      });
    }

    // 50 m: volle Geschichte (einmalig pro POI)
    if (distKm <= 0.05 && poiStoryToldRef.current !== nearbyPoi.id) {
      poiStoryToldRef.current = nearbyPoi.id;
      const traceId = createPoiTrace(nearbyPoi.id, "poi", "approach-50m");
      if (!claimPoiStory(nearbyPoi, "approach-50m", traceId)) {
        watchPoiLog("POI approach story skipped after duplicate claim", {
          traceId,
          poiId: nearbyPoi.id,
          kind: "poi",
          source: "approach-50m",
        });
        return;
      }
      watchPoiTraceRef.current = { poiId: nearbyPoi.id, traceId, kind: "poi" };
      const pack = STORY_PACKS[resolveLang(cueLanguage)];
      const rawExtract = nearbyPoiWiki?.extract ?? null;
      hapticHeavy();
      const capturedPoi = nearbyPoi;
      const releasePoiNarration = beginPoiNarration(traceId, "approach-50m");
      let poiAudioStarted = false;
      const finishPoiNarration = () => {
        watchPoiLog("POI narration audio finished", {
          traceId,
          poiId: capturedPoi.id,
          kind: "poi",
          source: "approach-50m",
        });
        setWatchPoiStory(null);
        releasePoiNarration("audio_finished");
      };
      const erzaehle = (text: string) => {
        if (!isPoiStillRelevant(capturedPoi, 0.1)) {
          watchPoiLog("POI narration expired before audio", {
            traceId,
            poiId: capturedPoi.id,
            kind: "poi",
            source: "approach-50m",
            radiusKm: 0.1,
          });
          releasePoiNarration("left_radius_before_audio");
          return;
        }
        poiAudioStarted = true;
        watchPoiLog("POI story staged for phone and Watch state", {
          traceId,
          poiId: capturedPoi.id,
          kind: "poi",
          source: "approach-50m",
          storyTextLength: text.length,
          imagePresent: Boolean(nearbyPoiWiki?.image),
        });
        setWatchPoiStory({
          id: capturedPoi.id,
          name: capturedPoi.name,
          imageUrl: nearbyPoiWiki?.image ?? null,
          text: text.slice(0, 8_000),
        });
        speak(text, finishPoiNarration, {
          useOpenAI: true,
          kind: "poi",
          displayTitle: capturedPoi.name,
        });
      };
      (async () => {
        const cached = await getOfflinePoiStory(capturedPoi.id, cueLanguage);
        if (cached !== null) {
          if (!nearbyPoiWiki?.extract) setNearbyPoiKontext(cached);
          erzaehle(pack.poiAside(capturedPoi.name, cached));
          return;
        }
        getPoiStory({
          name: capturedPoi.name,
          extract: rawExtract ?? undefined,
          kind: capturedPoi.kind,
          lang: cueLanguage,
          osmContext: capturedPoi.osmContext ?? undefined,
        })
          .then((r) => {
            if (!nearbyPoiWiki?.extract) setNearbyPoiKontext(r.text);
            erzaehle(pack.poiAside(capturedPoi.name, r.text));
          })
          .catch(() => {
            erzaehle(
              pack.poiAside(
                capturedPoi.name,
                rawExtract ? trimForNarration(rawExtract) : null,
              ),
            );
          });
      })();
      return () => {
        if (!poiAudioStarted)
          releasePoiNarration("effect_cleanup_before_audio");
      };
    }
  }, [
    beginPoiNarration,
    claimPoiStory,
    createPoiTrace,
    isPoiStillRelevant,
    livePos,
    nearbyPoi,
    nearbyPoiWiki,
    cueLanguage,
    speak,
    hasFreshGps,
    startGateConfirmed,
  ]);

  useEffect(() => {
    if (
      !watchPoiStory ||
      !nearbyPoi ||
      watchPoiStory.id !== nearbyPoi.id ||
      !nearbyPoiWiki?.image ||
      watchPoiStory.imageUrl === nearbyPoiWiki.image
    )
      return;
    setWatchPoiStory((current) =>
      current && current.id === nearbyPoi.id
        ? { ...current, imageUrl: nearbyPoiWiki.image ?? null }
        : current,
    );
  }, [nearbyPoi, nearbyPoiWiki?.image, watchPoiStory]);

  // Echte Position auf der Routen-Geometrie (0..1) fuer Navigation,
  // Terrainhinweise und die kontinuierliche Restzeit-Anzeige. Die
  // Kapitelverteilung verwendet bewusst nur die gelaufene Distanz darunter.
  const ROUTE_PROGRESS_MAX_ACCURACY_M = 30;
  const ROUTE_PROGRESS_MAX_DIST_KM = 1;
  const routeProgress = useMemo(() => {
    if (
      !hasFreshGps ||
      !livePos ||
      !navigationGeometry ||
      navigationGeometry.length < 2
    )
      return null;
    if (
      locState === "granted" &&
      locationNow - lastLocationAtRef.current > GPS_FRESHNESS_WINDOW_MS
    )
      return null;
    if (
      livePosAccuracy != null &&
      livePosAccuracy > ROUTE_PROGRESS_MAX_ACCURACY_M
    )
      return null;
    const match = fortschrittAufRoute(livePos, navigationGeometry);
    if (!match || match.distKm > ROUTE_PROGRESS_MAX_DIST_KM) return null;
    return match.fraction;
  }, [livePos, livePosAccuracy, navigationGeometry, locState, locationNow]);

  // Kapitel werden ausschließlich anhand der tatsächlich zurückgelegten
  // Distanz freigegeben. Die Position auf der geplanten Route spielt dafür
  // keine Rolle — Off-Route-Bewegung zählt weiterhin als Wanderfortschritt.
  const storyProgress = useMemo(() => {
    const candidate =
      totalKm > 0 ? Math.max(0, Math.min(1, distance / totalKm)) : 0;
    storyProgressMaxRef.current = Math.max(
      storyProgressMaxRef.current,
      candidate,
    );
    return storyProgressMaxRef.current;
  }, [distance, totalKm]);

  const storyEligibleChapter = useMemo(() => {
    const lastChapterIndex = Math.max(0, chapters.length - 1);
    if (lastChapterIndex === 0) return 0;
    // Das letzte Kapitel wird am Ende der Route auch bei kleinen GPS-
    // Abweichungen freigegeben; alle anderen Kapitel folgen gleichmässigen
    // Streckenintervallen. Das letzte Kapitel startet ab 95 %.
    const eligible =
      storyProgress >= STORY_FINAL_CHAPTER_PROGRESS
        ? lastChapterIndex
        : Math.floor(storyProgress * lastChapterIndex);
    return Math.max(0, Math.min(lastChapterIndex, eligible));
  }, [chapters.length, storyProgress]);
  storyEligibleChapterRef.current = storyEligibleChapter;

  // Wenn ein Kapitel vollständig gesprochen und das nächste Streckenintervall
  // erreicht ist, wird genau ein nächstes Kapitel freigegeben. Dadurch bleibt
  // die Reihenfolge erhalten, auch wenn GPS mehrere Kapitelziele überspringt.
  useEffect(() => {
    if (
      preparing ||
      !startGateConfirmedRef.current ||
      chapters.length === 0 ||
      storyCompleteRef.current ||
      awaitingDecisionRef.current ||
      decisionFeedbackPendingRef.current ||
      storyEligibleChapter <= currentIndex ||
      narratedThroughRef.current < currentIndex
    ) {
      return;
    }
    advanceStoryChapter(currentIndex);
  }, [
    advanceStoryChapter,
    awaitingDecision,
    chapters.length,
    currentIndex,
    decisionFeedbackPending,
    preparing,
    startGateConfirmed,
    storyEligibleChapter,
  ]);

  const panoramaPois = useMemo(() => {
    // Das Offline-Paket ist die versionierte Quelle. Live-/allgemeine POIs
    // dürfen denselben Gipfel nur ergänzen, nie dessen Höhe überschreiben.
    const merged = new Map<string, (typeof displayedPois)[number]>();
    for (const peak of offlinePanorama?.peaks ?? []) {
      merged.set(peak.id, {
        id: peak.id,
        name: peak.name,
        kind: "natural=peak",
        lat: peak.lat,
        lng: peak.lng,
        elevation: peak.elevationM,
      });
    }
    for (const poi of [...displayedPois, ...panoramaOnlinePois]) {
      if (!merged.has(poi.id)) merged.set(poi.id, poi);
    }
    return Array.from(merged.values());
  }, [displayedPois, panoramaOnlinePois, offlinePanorama]);
  const panoramaPeaks = useMemo(
    () =>
      selectPanoramaPeaks(
        erkenneGipfel(
          panoramaPois,
          hasFreshGps ? livePos : null,
          compassHeading,
          hasFreshGps ? liveAltitude : null,
          80,
        ),
        40,
      ),
    [panoramaPois, hasFreshGps, livePos, compassHeading, liveAltitude],
  );
  useEffect(() => {
    if (!startGateConfirmedRef.current || preparing || !hasFreshGps) return;
    const nearbyPeak = panoramaPeaks.find(
      (peak) =>
        peak.distanceKm <= 0.1 &&
        !announcedWatchPeakIdsRef.current.has(peak.id),
    );
    if (!nearbyPeak) return;
    announcedWatchPeakIdsRef.current.add(nearbyPeak.id);
    raiseWatchDiscoveryAlert({
      text: `Gipfel in der Nähe: ${nearbyPeak.name}`,
      haptic: "success",
    });
  }, [
    hasFreshGps,
    panoramaPeaks,
    preparing,
    raiseWatchDiscoveryAlert,
    startGateConfirmed,
  ]);
  const panoramaArCandidates = useMemo(
    () =>
      erkenneGipfel(
        panoramaPois,
        hasFreshGps ? livePos : null,
        null,
        hasFreshGps ? liveAltitude : null,
        40,
      ),
    [panoramaPois, hasFreshGps, livePos, liveAltitude],
  );
  // Das reguläre 72-Strahlen-Modell hat in 2 km Entfernung rund 175 m Abstand
  // zwischen zwei Strahlen. Deshalb werden die Richtungen echter Gipfel als
  // zusätzliche DTM-Strahlen aufgenommen. Nur so liegen sichtbarer Gipfel und
  // geografischer Marker auf derselben Mesh-Geometrie.
  const terrainFocusPeaks = useMemo(
    () =>
      panoramaArCandidates
        .slice()
        .sort((first, second) => first.distanceKm - second.distanceKm)
        .slice(0, 16),
    [panoramaArCandidates],
  );
  const terrainFocusBearings = terrainFocusPeaks.map((peak) => peak.bearingDeg);
  const terrainFocusBearingKey = terrainFocusPeaks
    .map((peak) => peak.id)
    .join(",");

  // Lokales Terrainmodell observer-zentriert nachladen. Ein Modell bleibt für
  // kurze GPS-Strecken bestehen; neue Gipfelrichtungen lösen jedoch eine
  // präzise Neuberechnung aus.
  useEffect(() => {
    if (!hasFreshGps || !livePos) return;
    const previous = terrainModelRequestRef.current;
    const needsDensePanoramaTerrain =
      terrainModel != null && terrainModel.rings < 96;
    if (
      previous &&
      previous.focusBearingKey === terrainFocusBearingKey &&
      !needsDensePanoramaTerrain &&
      Date.now() - previous.requestedAt < 120_000 &&
      haversineKm(previous, livePos) < 0.12
    ) {
      return;
    }
    const requestPosition = { lat: livePos.lat, lng: livePos.lng };
    terrainModelRequestRef.current = {
      ...requestPosition,
      requestedAt: Date.now(),
      focusBearingKey: terrainFocusBearingKey,
    };
    let cancelled = false;
    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = setTimeout(() => controller?.abort(), 90_000);

    fetch(`${getApiBaseUrl() ?? ""}/api/terrain-surface`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller?.signal,
      body: JSON.stringify({
        center: requestPosition,
        radiusM: 5000,
        sectors: 72,
        rings: 96,
        focusBearings: terrainFocusBearings,
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Lokales Terrain nicht verfügbar");
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (cancelled) return;
        if (isLocalTerrainModel(data)) {
          setTerrainModel(data);
          return;
        }
        throw new Error("Ungültiges lokales Terrainmodell");
      })
      .catch(() => {
        if (cancelled) return;
        const activeRequest = terrainModelRequestRef.current;
        if (
          activeRequest?.lat === requestPosition.lat &&
          activeRequest.lng === requestPosition.lng &&
          activeRequest.focusBearingKey === terrainFocusBearingKey
        ) {
          terrainModelRequestRef.current = null;
          terrainModelRetryTimerRef.current = setTimeout(() => {
            terrainModelRetryTimerRef.current = null;
            setTerrainModelRetryKey((key) => key + 1);
          }, 5_000);
        }
      })
      .finally(() => {
        clearTimeout(timeout);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller?.abort();
      if (terrainModelRetryTimerRef.current) {
        clearTimeout(terrainModelRetryTimerRef.current);
        terrainModelRetryTimerRef.current = null;
      }
    };
  }, [
    hasFreshGps,
    livePos?.lat,
    livePos?.lng,
    terrainModel?.rings,
    terrainFocusBearingKey,
    terrainModelRetryKey,
  ]);
  // Geländeansagen: 150 m vorher ankündigen, bei langen Abschnitten einmal
  // über den Rest informieren und 100 m vor dem Ende abschliessen. Abschnitte
  // ab 30 Prozent enthalten zusätzlich eine klare Sicherheitswarnung und
  // erhalten eine starke lokale Mitteilung für gesperrte Bildschirme/Uhren.
  useEffect(() => {
    if (
      preparing ||
      !startGateConfirmedRef.current ||
      finished ||
      terrainSections.length === 0 ||
      profile?.navAnnouncementsEnabled === false
    ) {
      return;
    }
    if (locState === "granted" && !hasFreshGps) return;
    const profileLengthKm = terrainProfile
      ? Math.max(
          0,
          terrainProfile[terrainProfile.length - 1].distanceKm -
            terrainProfile[0].distanceKm,
        )
      : 0;
    if (profileLengthKm <= 0) return;

    const fraction =
      routeProgress ??
      (totalKm > 0 ? Math.max(0, Math.min(1, distance / totalKm)) : 0);
    const currentKm = Math.max(
      0,
      Math.min(profileLengthKm, fraction * profileLengthKm),
    );

    for (const section of terrainSections) {
      const leadKm = Math.max(0, section.startKm - currentKm);
      const inOrBeforeSection =
        currentKm <= section.endKm + 0.05 &&
        currentKm >= section.startKm - 0.15;

      if (!terrainStartedRef.current.has(section.id) && inOrBeforeSection) {
        terrainStartedRef.current.add(section.id);
        const averageGrade = Math.max(
          1,
          Math.round(Math.abs(section.averageGradePct)),
        );
        const sectionDistance = formatSpokenDistance(
          section.lengthKm,
          cueLanguage,
        );
        const warningGrade = Math.max(30, Math.round(section.peakGradePct));
        const warning = section.isVerySteep
          ? t.terrainWarning(section.direction, warningGrade, sectionDistance)
          : null;
        const text =
          currentKm < section.startKm
            ? `${warning ? `${warning} ` : ""}${t.terrainAdvance(
                section.direction,
                formatSpokenDistance(leadKm, cueLanguage),
                sectionDistance,
                averageGrade,
              )}`
            : (warning ??
              t.terrainProgress(
                section.direction,
                formatSpokenDistance(
                  Math.max(0, section.endKm - currentKm),
                  cueLanguage,
                ),
                averageGrade,
              ));

        if (section.isVerySteep && turnNotifsReadyRef.current) {
          sendeAbbiegeMitteilung(t.terrainWarningTitle, warning ?? text);
        }
        speakRef.current?.(text, undefined, {
          useOpenAI: true,
          kind: "terrain",
          displayTitle: section.isVerySteep
            ? t.terrainWarningTitle
            : t.terrainAdvance(
                section.direction,
                formatSpokenDistance(leadKm, cueLanguage),
                sectionDistance,
                averageGrade,
              ),
          replaceQueuedCategory: "terrain",
        });
      }

      // Eine Zwischenansage gibt es nur bei wirklich langen Abschnitten, damit
      // normale Wanderungen nicht mit zu vielen Meldungen überladen werden.
      if (
        section.lengthKm >= 0.35 &&
        !section.isVerySteep &&
        !terrainProgressRef.current.has(section.id) &&
        currentKm >= section.startKm + section.lengthKm * 0.5 &&
        currentKm <= section.endKm + 0.05
      ) {
        terrainProgressRef.current.add(section.id);
        speakRef.current?.(
          t.terrainProgress(
            section.direction,
            formatSpokenDistance(
              Math.max(0, section.endKm - currentKm),
              cueLanguage,
            ),
            Math.max(1, Math.round(Math.abs(section.averageGradePct))),
          ),
          undefined,
          {
            useOpenAI: true,
            kind: "terrain",
            displayTitle: t.terrainWarningTitle,
            replaceQueuedCategory: "terrain",
          },
        );
      }

      if (
        section.lengthKm >= 0.25 &&
        !terrainEndedRef.current.has(section.id) &&
        currentKm >= section.endKm - 0.1 &&
        currentKm <= section.endKm + 0.08
      ) {
        terrainEndedRef.current.add(section.id);
        speakRef.current?.(t.terrainEnd(section.direction), undefined, {
          useOpenAI: true,
          kind: "terrain",
          displayTitle: t.terrainWarningTitle,
          replaceQueuedCategory: "terrain",
        });
      }
    }
  }, [
    livePos,
    distance,
    totalKm,
    routeProgress,
    terrainProfile,
    terrainSections,
    preparing,
    finished,
    profile?.navAnnouncementsEnabled,
    cueLanguage,
    t,
    locState,
    hasFreshGps,
    startGateConfirmed,
  ]);

  // Luftlinien-Hinweis zum Beginn der aktuell aktiven Geometrie. Nach dem
  // Uebernehmen eines Zubringers ist dessen Anfang der neue Wegstart; der
  // urspruengliche Katalog-Start darf dann nicht mehr angesagt werden.
  const walkToStart = useMemo(() => {
    if (!livePos || !navigationGeometry || navigationGeometry.length < 2)
      return null;
    const start: LatLng = {
      lat: navigationGeometry[0][0],
      lng: navigationGeometry[0][1],
    };
    const distKm = haversineKm(livePos, start);
    if (distKm <= START_NEARBY_KM) return null;
    const dir = t.compassDirections[compassIndex(bearingDeg(livePos, start))];
    const distText = formatSpokenDistance(distKm, storyLanguage);
    return { distKm, distText, dir };
  }, [livePos, navigationGeometry, storyLanguage, t, hasFreshGps]);

  // Sobald der User einmal innerhalb des Start-Radius war (walkToStart === null),
  // als "start reached" markieren — damit das Banner nach dem Passieren nicht
  // erneut erscheint, wenn der User sich von geometry[0] entfernt.
  useEffect(() => {
    if (!startGateConfirmedRef.current || preparing || startReached) return;
    if (!hasFreshGps) return;
    if (walkToStart === null) setStartReached(true);
  }, [walkToStart, preparing, startReached, hasFreshGps, startGateConfirmed]);

  const walkToStartAnnouncedRef = useRef(false);
  useEffect(() => {
    if (!startGateConfirmedRef.current || !walkToStart) return;
    if (startReached) return;
    if (walkToStartAnnouncedRef.current) return;
    if (preparing || locState !== "granted" || !hasFreshGps) return;
    walkToStartAnnouncedRef.current = true;
    speak(
      t.walkToStartSpoken(walkToStart.distText, walkToStart.dir),
      undefined,
      {
        useOpenAI: true,
        kind: "walkToStart",
        displayTitle: t.walkToStartTitle,
      },
    );
  }, [
    walkToStart,
    startReached,
    preparing,
    locState,
    speak,
    t,
    hasFreshGps,
    startGateConfirmed,
  ]);

  // Die Route gibt Kapitelziele frei, aber Audio bleibt die Reihenfolge:
  // kein Kapitel wird uebersprungen oder vor dem vorherigen gestartet.
  useEffect(() => {
    if (
      !startGateConfirmedRef.current ||
      preparing ||
      !hasFreshGps ||
      !navigationGeometry ||
      navigationGeometry.length < 2
    )
      return;
    if (routeProgress == null) return;
    if (routeProgress < 0.98) return;
    routeCompletedRef.current = true;
    if (storyCompleteRef.current) setFinished(true);
  }, [
    preparing,
    routeProgress,
    navigationGeometry,
    hasFreshGps,
    startGateConfirmed,
  ]);

  // Konsistente Haptik: jedes abgeschlossene Kapitel gibt ein leichtes
  // Vibrationsfeedback — nur nach echtem GPS-Fortschritt.
  const lastHapticIndexRef = useRef(0);
  useEffect(() => {
    if (preparing || currentIndex <= lastHapticIndexRef.current) return;
    lastHapticIndexRef.current = currentIndex;
    hapticHeavy();
  }, [currentIndex, preparing]);

  // Sprachausgabe beim Verlassen stoppen
  useEffect(() => {
    return () => {
      cancelNarration();
    };
  }, [cancelNarration]);

  // Schrittzaehler: laeuft parallel zur GPS-Distanz und liefert eine
  // zusaetzliche, vom Standort unabhaengige Kennzahl. Faellt still aus,
  // wenn der Sensor auf dem Geraet/in Expo Go nicht verfuegbar ist.
  useEffect(() => {
    if (preparing || finished) return;
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;
    Pedometer.isAvailableAsync()
      .then((available) => {
        if (!available || cancelled) return;
        // WICHTIG: result.steps ist die kumulierte Schrittzahl seit Beginn
        // dieses Abos (nicht das Delta seit dem letzten Event) — direkt
        // uebernehmen statt aufzuaddieren, sonst wird vielfach gezaehlt.
        subscription = Pedometer.watchStepCount((result) => {
          setSteps(result.steps);
        });
      })
      .catch(() => {
        // Kein Pedometer verfuegbar (z. B. Web/Emulator) — Schritte
        // bleiben dann einfach bei 0, ohne die Wanderung zu stoeren.
      });
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [preparing, finished]);

  // Wird vom Voice-Decision-Hook nach seiner Deklaration befuellt. Der Ref
  // erlaubt auch den Button-Pfad, die native Aufnahme-Session vor dem
  // Bestaetigungs-Audio abzuwarten.
  const stopVoiceDecisionRef = useRef<() => Promise<void>>(() =>
    Promise.resolve(),
  );

  const chooseOption = async (
    optionIndex: number,
    source: "button" | "voice" | "timeout" = "button",
  ) => {
    const decisionIndex = currentIndex;
    logDecisionFlow("choice_attempt", decisionIndex, {
      optionIndex,
      source,
    });
    // Mitglieder einer Gruppenwanderung entscheiden nicht selbst — sie
    // warten auf die Entscheidung der Gruppenleitung.
    if (folgtGruppenleitung) {
      logDecisionFlow("choice_blocked", decisionIndex, {
        optionIndex,
        source,
        blockReason: "follows_group_leader",
      });
      return;
    }
    // Eine Entscheidung darf nur einmal verarbeitet werden. Das Ref wird
    // synchron mit dem State aktualisiert, sodass ein schneller Tap parallel
    // zu einem Sprach-Treffer weder Ack noch Persoenlichkeits-Feedback doppelt
    // startet.
    if (
      decisionsRef.current[currentIndex]?.chosenOptionIndex != null ||
      resolvedDecisionIndexRef.current === currentIndex
    ) {
      logDecisionFlow("choice_blocked", decisionIndex, {
        optionIndex,
        source,
        blockReason: "already_resolved",
      });
      return;
    }
    // Antwort, Ack und persoenliches Feedback sind EIN atomarer
    // Entscheidungsabschluss. GPS-Fortschritt darf in diesem Fenster nicht
    // schon zum naechsten (moeglicherweise ebenfalls entscheidenden) Kapitel
    // springen und dort eine neue Frage samt Mikrofon starten.
    setDecisionFeedbackPendingNow(true);
    resolvedDecisionIndexRef.current = currentIndex;
    logDecisionFlow("choice_accepted", decisionIndex, {
      optionIndex,
      source,
    });
    // Nur ein bereits vorgemerkter Prompt für diese Entscheidung ist nach der
    // Antwort veraltet. Andere Erzählungen bleiben FIFO und dürfen nicht
    // durch die Entscheidungsbestätigung verloren gehen.
    narrationQueueRef.current = narrationQueueRef.current.filter(
      (item) =>
        !(
          item.kind === "decisionPrompt" && item.chapterIndex === decisionIndex
        ),
    );
    logDecisionFlow("decision_prompt_queue_filtered", decisionIndex, {
      queueAfter: narrationQueueRef.current.map((item) => ({
        kind: item.kind ?? null,
        chapterIndex: item.chapterIndex ?? null,
      })),
    });
    // Sofort synchronisieren: Die Sprach-Erkennung kann den Treffer melden,
    // bevor der React-State neu gerendert wurde. Ohne diesen Ref-Abschluss
    // kann der Entscheidungs-Prompt in diesem Zwischenfenster nochmals
    // starten und die Audio-Session bleibt im Aufnahme-Modus.
    awaitingDecisionRef.current = false;
    logDecisionFlow("feedback_wait_started", decisionIndex, {
      reason: "stop_voice_before_ack",
    });
    hapticMedium();
    const gewaehlt =
      chapters[decisionIndex]?.decision?.options[optionIndex]?.label;
    if (gewaehlt) {
      // Kurze sichtbare Bestaetigung der Wahl, bevor die Geschichte weitergeht
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      setChoiceFeedback(t.yourChoice(gewaehlt));
      feedbackTimerRef.current = setTimeout(
        () => setChoiceFeedback(null),
        2500,
      );
      // Watch-Mitteilung bei Interaktion — spiegelt die Wahrnehmungsentscheidung
      // ans Handgelenk, damit Wandernde mit gesperrtem iPhone trotzdem wissen,
      // welche Option fuer sie gewaehlt wurde (z. B. per Voice-Steuerung).
      if (turnNotifsReady && profile?.navAnnouncementsEnabled !== false) {
        sendeAbbiegeMitteilung(t.perception, gewaehlt);
      }
    }
    const nextChapters = [...chapters];
    nextChapters[decisionIndex] = {
      ...nextChapters[decisionIndex],
      chosenOptionIndex: optionIndex,
    };
    // Ebenfalls sofort aktualisieren, damit der Prompt-Effekt auch vor dem
    // nächsten React-Render sicher erkennt, dass die Frage beantwortet ist.
    decisionsRef.current = nextChapters;
    setChapters(nextChapters);
    setAwaitingDecision(false);
    // Wohlwollendes Persoenlichkeits-Feedback nach der Entscheidung sprechen.
    // Zweistufig: sofortige OpenAI-Bestaetigung aus dem Cache (kein Netz
    // waehrend der Wahl noetig), danach das vollstaendige KI-Feedback via OpenAI.
    const archetypeHint =
      chapters[decisionIndex]?.decision?.options[optionIndex]?.archetypeHint;
    if (archetypeHint) {
      const ackPack = STORY_PACKS[resolveLang(cueLanguage)];
      // feedbackPack: cueLanguage ist bereits gsw→de gemappt; DE-Template passt zu Hochdeutsch-Text
      const feedbackPack = STORY_PACKS[resolveLang(cueLanguage)];
      const feedbackText = feedbackPack.decisionFeedback(
        archetypeHint,
        gewaehlt ?? "",
      );
      // Vorgeladene URI verwenden (falls verfuegbar) — OpenAI-Stimme startet
      // sofort ohne Netzwerk-Latenz. Fallback: OpenAI-Aufruf zur Laufzeit
      // (ackAudioUriRef.current ist null, wenn Pre-fetch noch laeuft oder scheiterte).
      const ackUri = ackAudioUriRef.current ?? undefined;
      const ackTraceId = `decision_ack_${decisionIndex}_${++narrationTraceSequenceRef.current}`;
      const feedbackTraceId = `decision_feedback_${decisionIndex}_${++narrationTraceSequenceRef.current}`;
      const completeDecision = () => {
        setDecisionFeedbackPendingNow(false);
        logDecisionFlow("feedback_complete", decisionIndex, {
          optionIndex,
          ackTraceId,
          feedbackTraceId,
        });
        advanceStoryChapter(decisionIndex);
      };
      // Bei Button-Taps beendet die Hook-Cleanup-Funktion die Erkennung erst
      // nach diesem Render. Auch dieser Pfad muss die PlayAndRecord-Session
      // freigeben, sonst bleibt der folgende Text auf iOS dauerhaft leiser.
      await stopVoiceDecisionRef.current();
      logDecisionFlow("feedback_wait_completed", decisionIndex, {
        reason: "stop_voice_before_ack",
      });
      const speakDecisionFeedback = () => {
        const speaker = speakRef.current;
        if (!speaker) {
          logDecisionFlow("feedback_followup_unavailable", decisionIndex, {
            optionIndex,
            ackTraceId,
            feedbackTraceId,
            reason: "speaker_ref_missing",
          });
          completeDecision();
          return;
        }
        logDecisionFlow("feedback_followup_requested", decisionIndex, {
          optionIndex,
          ackTraceId,
          feedbackTraceId,
          textLength: feedbackText.length,
        });
        void speaker(feedbackText, completeDecision, {
          useOpenAI: true,
          kind: "feedback",
          displayTitle: t.perception,
          traceId: feedbackTraceId,
          audioRole: "decision-feedback",
        });
      };
      const speaker = speakRef.current;
      if (speaker) {
        logDecisionFlow("feedback_ack_requested", decisionIndex, {
          queueBefore: narrationQueueRef.current.map((item) => ({
            kind: item.kind ?? null,
            chapterIndex: item.chapterIndex ?? null,
            traceId: item.traceId ?? null,
            audioRole: item.audioRole ?? null,
          })),
          ackTraceId,
          feedbackTraceId,
          ackSource: ackUri ? "prefetched_uri" : "runtime_openai",
          ackTextLength: ackPack.decisionAck.length,
        });
        void speaker(ackPack.decisionAck, speakDecisionFeedback, {
          ...(ackUri ? { preFetchedUri: ackUri } : { useOpenAI: true }),
          kind: "feedback",
          displayTitle: t.perception,
          traceId: ackTraceId,
          audioRole: "decision-ack",
        });
      } else {
        logDecisionFlow("feedback_ack_unavailable", decisionIndex, {
          optionIndex,
          ackTraceId,
          feedbackTraceId,
          reason: "speaker_ref_missing",
        });
        completeDecision();
      }
    } else {
      setDecisionFeedbackPendingNow(false);
      logDecisionFlow("decision_complete", decisionIndex, {
        optionIndex,
        source,
      });
      advanceStoryChapter(decisionIndex);
    }
    // Leitung: Entscheidung an alle Mitglieder verteilen.
    if (istGruppenleitung) {
      sendGroupHikeEvent({
        kind: "decision",
        chapterIndex: decisionIndex,
        optionIndex,
      });
    }
  };

  // Gesprochene Aufforderung, sobald ein Entscheidungspunkt aktiv ist und
  // die Kapitel-Erzaehlung geendet hat: spricht einmalig den decisionVoicePrompt
  // vor, damit Wandernde auch ohne Blick aufs Display wissen, dass sie jetzt
  // sprechen koennen. Ein Ref verhindert, dass dieselbe Aufforderung mehrfach
  // abgespielt wird (z. B. bei kurzem speaking-Flackern).
  useEffect(() => {
    if (!awaitingDecision || speaking) return;
    if (resolvedDecisionIndexRef.current === currentIndex) {
      logDecisionFlow("prompt_blocked", currentIndex, {
        blockReason: "already_resolved",
      });
      return;
    }
    if (promptedDecisionRef.current === currentIndex) {
      logDecisionFlow("prompt_blocked", currentIndex, {
        blockReason: "already_prompted",
      });
      return;
    }
    promptedDecisionRef.current = currentIndex;
    const pack = STORY_PACKS[resolveLang(storyLanguage)];
    // Kapitel-Daten ueber Ref lesen, NICHT aus State-Dep — sonst loest jede
    // chapters-Aenderung (z. B. chosenOptionIndex nach Wahl, Group-Sync) den
    // Effekt erneut aus und die Frage wird ein zweites Mal vorgelesen.
    const decision = decisionsRef.current[currentIndex]?.decision;
    if (decisionsRef.current[currentIndex]?.chosenOptionIndex != null) {
      logDecisionFlow("prompt_blocked", currentIndex, {
        blockReason: "already_chosen",
      });
      return;
    }
    const opts = decision?.options?.map((o) => o.label) ?? [];
    const question = decision?.question;
    const previousPromptCount =
      decisionPromptCountRef.current.get(currentIndex) ?? 0;
    if (previousPromptCount > 0) {
      logDecisionFlow("duplicate_prompt_detected", currentIndex, {
        blockReason: "prompt_count_guard",
        previousPromptCount,
      });
      return;
    }
    const promptCount = previousPromptCount + 1;
    decisionPromptCountRef.current.set(currentIndex, promptCount);
    const promptTraceId = `decision_prompt_${currentIndex}_${++narrationTraceSequenceRef.current}`;
    logDecisionFlow("prompt_started", currentIndex, {
      promptCount,
      traceId: promptTraceId,
      storyLoadGeneration: storyLoadGenerationRef.current,
      promptState: decisionDebugSnapshot(currentIndex),
    });
    speakRef.current?.(pack.buildDecisionPrompt(opts, question), undefined, {
      kind: "decisionPrompt",
      chapterIndex: currentIndex,
      displayTitle: t.perception,
      traceId: promptTraceId,
      audioRole: "decision-prompt",
    });
  }, [
    awaitingDecision,
    speaking,
    currentIndex,
    storyLanguage,
    logDecisionFlow,
  ]);

  // 30-Sekunden-Countdown fuer Entscheidungspunkte: laeuft automatisch an,
  // sobald der Entscheidungspunkt aktiv und die Erzaehlung fertig ist.
  // Bei Ablauf wird automatisch die erste mit isTimeoutDefault markierte
  // Option gewaehlt — oder mangels Markierung Option 0 (die mutigste).
  const chooseOptionRef = useRef(chooseOption);
  chooseOptionRef.current = chooseOption;
  useEffect(() => {
    if (!awaitingDecision || speaking) {
      setDecisionCountdown(null);
      return;
    }
    setDecisionCountdown(30);
    const iv = setInterval(() => {
      setDecisionCountdown((n) => {
        if (n === null || n <= 1) {
          clearInterval(iv);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [awaitingDecision, speaking]);

  useEffect(() => {
    if (decisionCountdown !== 0 || !awaitingDecision) return;
    const opts = chapters[currentIndex]?.decision?.options ?? [];
    const defaultIdx = opts.findIndex((o) => o.isTimeoutDefault);
    chooseOptionRef.current(defaultIdx >= 0 ? defaultIdx : 0, "timeout");
  }, [decisionCountdown, awaitingDecision, chapters, currentIndex]);

  // Freihaendige Sprachsteuerung: sobald ein Entscheidungspunkt aktiv ist,
  // hoert die App automatisch zu und waehlt bei einem klaren Treffer die
  // passende Option — ganz ohne Tastendruck. Erst NACH der Vorlesung von
  // Frage + Optionen (speaking === false), sonst wuerde die eigene
  // Erzaehlstimme das Mikrofon stoeren. Faellt still auf die Buttons zurueck,
  // wenn Spracherkennung nicht verfuegbar/erlaubt ist (z. B. Expo Go, Web).
  const decisionOptions = chapters[currentIndex]?.decision?.options ?? [];
  const {
    listening: voiceListening,
    supported: voiceSupported,
    lastTranscript: voiceTranscript,
    stopListening: stopVoiceDecision,
  } = useVoiceDecision(
    awaitingDecision &&
      resolvedDecisionIndexRef.current !== currentIndex &&
      !speaking &&
      decisionOptions.length > 0 &&
      !folgtGruppenleitung,
    resolveLang(storyLanguage),
    decisionOptions,
    (optionIndex) => chooseOption(optionIndex, "voice"),
    (event, details) => {
      logDecisionFlow(`voice_${event}`, currentIndexRef.current, details);
    },
  );
  stopVoiceDecisionRef.current = stopVoiceDecision;

  // Wenn die Spracherkennung endet (voiceListening: true → false), stellt
  // dieser Effekt die Audio-Session explizit zurueck. expo-speech-recognition
  // setzt intern allowsRecording (iOS Audio-Session wechselt auf
  // PlayAndRecord), was den Lautsprecherausgang stark reduziert — iOS dreht
  // ihn zum Schutz vor Rueckkopplung runter. Ohne diesen Reset bleibt die
  // Session im Record-Modus und jede nachfolgende Erzaehlung klingt
  // wesentlich leiser.
  //
  // Nur echte Zustandswechsel dürfen die Session zurücksetzen. Während einer
  // laufenden Erkennung bleibt voiceListening normalerweise true; nach einem
  // Treffer wird jedoch gleichzeitig die Bestätigungsansage gestartet. Der
  // synchrone Ref-Guard verhindert, dass der alte Erkennungs-Callback danach
  // die neue Ansage wieder auf PlayAndRecord/MixWithOthers zurücksetzt.
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (voiceListening) return;
    if (awaitingDecisionRef.current || speakingRef.current) return;
    // Nach Spracherkennung (expo-speech-recognition wechselt intern auf
    // PlayAndRecord): Session zurueck auf MixWithOthers/Playback.
    // DuckOthers wird erst wieder gesetzt wenn die naechste Erzaehlung startet.
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "mixWithOthers",
    }).catch(() => {});
  }, [voiceListening, awaitingDecision, speaking]);

  async function submitConditionHike() {
    if (!selectedCondition || !id) return;
    setConditionSubmitting(true);
    setConditionSubmitResult(null);
    try {
      await reportRouteCondition(id, {
        condition: selectedCondition,
        note: conditionNote.trim() || null,
      });
      setConditionSubmitResult("ok");
      setShowConditionForm(false);
      setSelectedCondition(null);
      setConditionNote("");
      refetchConditions();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      setConditionSubmitResult(status === 429 ? "ratelimit" : "error");
    } finally {
      setConditionSubmitting(false);
    }
  }

  // Nach einer akzeptierten Umleitung den neuen aktiven Gesamtkorridor sofort
  // zusätzlich durchsuchen. Der allgemeine POI-Effekt lädt denselben Korridor
  // mit den typabhängigen Reichweiten nach.
  const searchDetourPois = useCallback(
    (geometry: number[][]) => {
      if (isOffline || geometry.length < 2) return;
      const first = geometry[0];
      const last = geometry[geometry.length - 1];
      const searchKey = `${geometry.length}:${first[0].toFixed(6)},${first[1].toFixed(6)}:${last[0].toFixed(6)},${last[1].toFixed(6)}`;
      if (detourPoiSearchKeyRef.current === searchKey) return;
      detourPoiSearchKeyRef.current = searchKey;

      const bbox = bboxAroundGeometry(
        geometry,
        { lat: first[0], lng: first[1] },
        1.0,
      );
      let attempt = 0;
      const tryLoad = () => {
        getPois(bbox)
          .then((result) => {
            if (detourPoiSearchKeyRef.current !== searchKey) return;
            setDetourPois(filterByRouteCorridor(result, geometry, 0.75));
            if (result.length === 0 && attempt < 4) {
              attempt += 1;
              setTimeout(tryLoad, 35_000);
            }
          })
          .catch(() => {
            if (detourPoiSearchKeyRef.current !== searchKey || attempt >= 4)
              return;
            attempt += 1;
            setTimeout(tryLoad, 35_000);
          });
      };
      tryLoad();
    },
    [isOffline],
  );

  // Die akzeptierte Valhalla-Route wird zur neuen aktiven Wanderroute:
  // Zubringer bis zum gewählten Wiedereinstiegspunkt plus der verbleibende
  // Teil der bisherigen Route. Die Sage bleibt dabei an ihrem aktuellen
  // Kapitel — eine Routenumleitung darf sie weder zuruecksetzen noch beenden.
  const followRecalculatedRoute = useCallback(async () => {
    if (
      !recalcGeom ||
      recalcGeom.length < 2 ||
      !navigationGeometry ||
      navigationGeometry.length < 2
    ) {
      return;
    }

    const rejoinIndex =
      recalcRejoinFraction == null
        ? null
        : Math.max(
            0,
            Math.min(
              navigationGeometry.length - 1,
              Math.round(
                recalcRejoinFraction * (navigationGeometry.length - 1),
              ),
            ),
          );
    const originalTail =
      rejoinIndex == null ? [] : navigationGeometry.slice(rejoinIndex);
    const combinedGeometry = [...recalcGeom];
    if (originalTail.length > 0) {
      const lastDetourPoint = combinedGeometry[combinedGeometry.length - 1];
      const firstTailPoint = originalTail[0];
      const tailStartsAtDetourEnd =
        haversineKm(
          { lat: lastDetourPoint[0], lng: lastDetourPoint[1] },
          { lat: firstTailPoint[0], lng: firstTailPoint[1] },
        ) < 0.02;
      combinedGeometry.push(
        ...(tailStartsAtDetourEnd ? originalTail.slice(1) : originalTail),
      );
    }
    if (combinedGeometry.length < 2) return;
    detourPoiSearchKeyRef.current = null;
    if (!isOffline) searchDetourPois(combinedGeometry);

    setPreparing(true);
    setAcceptedRouteGeometry(combinedGeometry);
    setRecalcGeom(combinedGeometry);
    setRecalcRejoinFraction(null);
    followingRecalcRef.current = true;
    setFollowingRecalc(true);
    if (startTimeRef.current === 0) startTimeRef.current = Date.now();
    startGateConfirmedRef.current = true;
    startGateShownRef.current = true;
    setStartGateConfirmed(true);
    setStartReached(true);
    releaseStartAudio();
    startChoicePendingRef.current = false;
    setStartChoicePending(false);
    routeCompletedRef.current = false;
    pendingGroupDecisionAdvanceRef.current = null;
    setFinished(false);
    setOffRoutePos(null);
    if (!storyCompleteRef.current) {
      setAwaitingDecision(false);
      awaitingDecisionRef.current = false;
    }
    notifiedTurnsRef.current.clear();
    terrainStartedRef.current.clear();
    terrainProgressRef.current.clear();
    terrainEndedRef.current.clear();

    // Die Story bleibt unveraendert; nur die aktive Geometrie wird ersetzt.
    setPreparing(false);
  }, [
    navigationGeometry,
    releaseStartAudio,
    recalcGeom,
    recalcRejoinFraction,
    searchDetourPois,
    isOffline,
  ]);

  const commitRouteChange = useCallback(
    (geometry: number[][]) => {
      if (geometry.length < 2) return;
      detourPoiSearchKeyRef.current = null;
      if (!isOffline) searchDetourPois(geometry);
      turnGenRef.current++;
      void stopTurnAudio();
      notifiedTurnsRef.current.clear();
      terrainStartedRef.current.clear();
      terrainProgressRef.current.clear();
      terrainEndedRef.current.clear();
      setAcceptedRouteGeometry(geometry);
      setRecalcGeom(null);
      setRecalcRejoinFraction(null);
      setFollowingRecalc(false);
      followingRecalcRef.current = false;
      setOffRoutePos(null);
      isOffRouteRef.current = false;
      offRouteCountRef.current = 0;
      routeCompletedRef.current = false;
      setFinished(false);
      if (startTimeRef.current === 0) startTimeRef.current = Date.now();
      startGateConfirmedRef.current = true;
      startGateShownRef.current = true;
      setStartGateConfirmed(true);
      setStartReached(true);
      releaseStartAudio();
      startChoicePendingRef.current = false;
      setStartChoicePending(false);
      setRouteChangeError(false);
      setRouteChangeLoading(false);
      setRouteChangePickerOpen(false);
      setRouteChangeOpen(false);
      setKarteVollbild(false);
      setKarteCloseSignal((signal) => signal + 1);
    },
    [isOffline, releaseStartAudio, searchDetourPois, stopTurnAudio],
  );

  const routeToTarget = useCallback(
    async (target: LatLng, label: string) => {
      if (!hasFreshGps || !livePos || isOffline || finished) {
        setRouteChangeError(true);
        return;
      }
      routeChangeAbortRef.current?.abort();
      const controller = new AbortController();
      routeChangeAbortRef.current = controller;
      setRouteChangeLoading(true);
      setRouteChangeError(false);
      setRouteChangeOpen(false);
      setRouteChangePickerOpen(false);
      await stopTurnAudio();
      try {
        const geometry = await requestWalkingRoute(
          livePos,
          target,
          controller.signal,
        );
        if (controller.signal.aborted || geometry.length < 2) return;
        commitRouteChange(geometry);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setRouteChangeError(true);
          setRouteChangeLoading(false);
        }
      } finally {
        if (routeChangeAbortRef.current === controller) {
          routeChangeAbortRef.current = null;
        }
      }
    },
    [
      commitRouteChange,
      finished,
      hasFreshGps,
      isOffline,
      livePos,
      stopTurnAudio,
    ],
  );

  const routeToNearestTransport = useCallback(async () => {
    if (!hasFreshGps || !livePos || isOffline || finished) {
      setRouteChangeError(true);
      return;
    }
    routeChangeAbortRef.current?.abort();
    const controller = new AbortController();
    routeChangeAbortRef.current = controller;
    setRouteChangeLoading(true);
    setRouteChangeError(false);
    setRouteChangeOpen(false);
    await stopTurnAudio();

    try {
      const transportBox = bboxAroundGeometry(null, livePos, 8);
      const [stationResult, aerialwayResult] = await Promise.allSettled([
        getTransportNearby(
          { lat: livePos.lat, lng: livePos.lng },
          { signal: controller.signal },
        ),
        getAerialways(transportBox, { signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;

      const candidates: Array<{ target: LatLng; label: string }> = [];
      if (stationResult.status === "fulfilled" && stationResult.value.station) {
        candidates.push({
          target: {
            lat: stationResult.value.station.lat,
            lng: stationResult.value.station.lng,
          },
          label: stationResult.value.station.name,
        });
      }
      if (aerialwayResult.status === "fulfilled") {
        const seen = new Set<string>();
        const aerialwayCandidates = aerialwayResult.value
          .map((aerialway) => ({
            aerialway,
            target: nearestAerialwayEndpoint(livePos, aerialway),
          }))
          .filter((entry) => entry.target !== null)
          .sort(
            (a, b) =>
              haversineKm(livePos, a.target!) - haversineKm(livePos, b.target!),
          )
          .slice(0, 8);
        for (const entry of aerialwayCandidates) {
          const target = entry.target;
          if (!target) continue;
          const key = `${target.lat.toFixed(5)},${target.lng.toFixed(5)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          candidates.push({
            target,
            label: t.routeChangeCableCarLabel,
          });
        }
      }
      if (candidates.length === 0) throw new Error("no transport target");

      const routed = await Promise.allSettled(
        candidates.map(async (candidate) => ({
          ...candidate,
          geometry: await requestWalkingRoute(
            livePos,
            candidate.target,
            controller.signal,
          ),
        })),
      );
      if (controller.signal.aborted) return;
      const successful = routed
        .filter(
          (
            result,
          ): result is PromiseFulfilledResult<{
            target: LatLng;
            label: string;
            geometry: number[][];
          }> =>
            result.status === "fulfilled" && result.value.geometry.length >= 2,
        )
        .map((result) => result.value)
        .sort(
          (a, b) => geometryLengthKm(a.geometry) - geometryLengthKm(b.geometry),
        );
      const best = successful[0];
      if (!best) throw new Error("no walkable transport target");
      commitRouteChange(best.geometry);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setRouteChangeError(true);
        setRouteChangeLoading(false);
      }
    } finally {
      if (routeChangeAbortRef.current === controller) {
        routeChangeAbortRef.current = null;
      }
    }
  }, [
    commitRouteChange,
    finished,
    hasFreshGps,
    isOffline,
    livePos,
    stopTurnAudio,
    t.routeChangeCableCarLabel,
  ]);

  useEffect(() => {
    return () => {
      routeChangeAbortRef.current?.abort();
    };
  }, []);

  // Eine Neuberechnung, die direkt aus der Startauswahl stammt, wird nach
  // erfolgreicher Routenantwort automatisch übernommen. Der manuelle
  // "Dieser Route folgen"-Schritt bleibt für spätere Off-Route-Fälle bestehen.
  useEffect(() => {
    if (
      !startChoicePending ||
      !startChoicePendingRef.current ||
      isRecalculating ||
      followingRecalc ||
      !recalcGeom ||
      recalcGeom.length < 2 ||
      autoFollowRecalcStartedRef.current
    ) {
      return;
    }
    autoFollowRecalcStartedRef.current = true;
    void followRecalculatedRoute();
  }, [
    followRecalculatedRoute,
    followingRecalc,
    isRecalculating,
    recalcGeom,
    startChoicePending,
  ]);

  const finishHike = useCallback(async () => {
    await cancelNarration();
    hapticSuccess();
    if (!saga) return;
    if (
      groupHikeStartedRef.current &&
      groupSession?.isLeader &&
      !groupHikeFinishedRef.current
    ) {
      groupHikeFinishedRef.current = true;
      sendGroupHikeEvent({
        kind: "finish",
        clientHikeId: ensureClientHikeId(),
      });
    }
    const session: HikeSession = {
      id: `h_${Date.now()}`,
      sagaId: saga.id,
      routeId: route?.id,
      routeName: route?.name ?? localizedSagaTitle,
      distanceKm: Number(distance.toFixed(1)),
      ascentM,
      sacScale: sac,
      startedAt: startTimeRef.current,
      chapters: decisionsRef.current,
      visitedPlaceIds: [saga.id],
      steps,
      durationMin: Math.round((Date.now() - startTimeRef.current) / 60000),
      geometry: (() => {
        // Echten GPS-Track bevorzugen; RDP ausdünnen für kompakte Speicherung.
        // Fallback auf geplante Routen-Geometrie nur wenn praktisch kein Track
        // existiert (z. B. Web-Vorschau/Simulation ohne GPS).
        const raw = posLogRef.current;
        if (raw.length >= MIN_TRACK_POINTS) {
          return rdpThin(raw, RDP_EPSILON);
        }
        return navigationGeometry;
      })(),
      photoUris: hikePhotos.length > 0 ? hikePhotos : undefined,
      visitedPois:
        visitedPoisRef.current.size > 0
          ? Array.from(visitedPoisRef.current.values())
          : undefined,
      recognitionEntries:
        recognitionEntries.length > 0 ? recognitionEntries : undefined,
    };
    await Promise.all([
      saveHike(session),
      addAchievement(localizedSagaTitle, saga.id),
      clearActiveHike(),
    ]);
    router.replace("/summary");
    // App-Store-Bewertung nach jeder abgeschlossenen Route anfragen.
    // StoreKit/Google Play entscheiden selbst, ob der native Dialog wegen
    // eigener Plattformlimits tatsächlich angezeigt wird.
    setTimeout(async () => {
      try {
        if (await StoreReview.isAvailableAsync()) {
          await StoreReview.requestReview();
        }
      } catch {
        // Review-Anfrage ist best-effort — Fehler still ignorieren
      }
    }, 1500);
  }, [
    saga,
    route,
    localizedSagaTitle,
    navigationGeometry,
    distance,
    ascentM,
    sac,
    steps,
    hikePhotos,
    recognitionEntries,
    saveHike,
    addAchievement,
    clearActiveHike,
    router,
    cancelNarration,
    groupSession?.isLeader,
    sendGroupHikeEvent,
    ensureClientHikeId,
  ]);

  // Erlaubt den Abschluss, auch wenn die Route noch nicht ganz zurueckgelegt
  // wurde — damit Nutzer trotzdem zum Album und zum Social-Media-Posting
  // gelangen, ohne die Wanderung komplett zu Ende laufen zu muessen.
  const finishHikeEarly = useCallback(() => {
    alert(t.finishEarlyConfirmTitle, t.finishEarlyConfirmMessage, [
      { text: t.finishEarlyCancelAction, style: "cancel" },
      {
        text: t.finishEarlyConfirmAction,
        style: "destructive",
        onPress: finishHike,
      },
    ]);
  }, [t, finishHike]);

  const openUrlSafely = async (url: string, fallback: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        alert(t.notAvailable, fallback);
      }
    } catch {
      alert(t.notAvailable, fallback);
    }
  };

  const callNumber = (num: string) => {
    hapticHeavy();
    openUrlSafely(`tel:${num}`, t.callSosManually(num));
  };

  // Waehrend einer akzeptierten Umleitung ("Dieser Route folgen") wird der
  // Fortschritt entlang der NEUEN Route gemessen: Restdistanz = Rest auf der
  // Umleitung + Rest der Originalroute ab dem Wiedereinstiegspunkt. Ohne diese
  // Rechnung friert die Projektion auf die Originalroute ein und
  // Restkilometer/Restzeit bewegen sich nicht mehr.
  // WICHTIG: dieser Hook muss VOR dem "!saga || !profile"-Early-Return stehen,
  // sonst aendert sich die Hook-Reihenfolge zwischen Renders (React-Crash).
  const recalcProgress = useMemo(() => {
    if (
      !hasFreshGps ||
      !followingRecalc ||
      !recalcGeom ||
      recalcGeom.length < 2 ||
      !livePos
    )
      return null;
    if (recalcRejoinFraction == null || totalKm <= 0) return null;
    const match = fortschrittAufRoute(livePos, recalcGeom);
    if (!match || match.distKm > ROUTE_PROGRESS_MAX_DIST_KM) return null;
    let recalcLenKm = 0;
    for (let i = 1; i < recalcGeom.length; i++) {
      recalcLenKm += haversineKm(
        { lat: recalcGeom[i - 1][0], lng: recalcGeom[i - 1][1] },
        { lat: recalcGeom[i][0], lng: recalcGeom[i][1] },
      );
    }
    const restUmleitungKm = recalcLenKm * (1 - match.fraction);
    const restOriginalKm = totalKm * (1 - recalcRejoinFraction);
    const remainingKm = restUmleitungKm + restOriginalKm;
    return Math.max(0, Math.min(1, 1 - remainingKm / totalKm));
  }, [
    followingRecalc,
    recalcGeom,
    recalcRejoinFraction,
    livePos,
    totalKm,
    hasFreshGps,
  ]);

  if (!saga || !profile) {
    return (
      <Background>
        <View style={styles.center}>
          <Text
            style={{ color: colors.foreground, fontFamily: fonts.titleBold }}
          >
            {t.hikeNotFound}
          </Text>
          <PrimaryButton
            label={t.back}
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
      </Background>
    );
  }

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;
  const progress =
    chapters.length > 1 ? currentIndex / (chapters.length - 1) : 0;
  // Fuer die Restzeit-Anzeige den kontinuierlichen Routen-Fortschritt nutzen
  // (echte GPS-Position projiziert auf die Route), statt den groben, nur an
  // Kapitelgrenzen springenden Story-Fortschritt — sonst zeigt die Restzeit
  // direkt nach einem Start mitten auf der Route faelschlich die volle
  // Wanderdauer an, bis das erste Kapitel erreicht ist.
  const timeProgress = hasFreshGps
    ? (recalcProgress ?? routeProgress ?? 0)
    : locState === "granted"
      ? 0
      : totalKm > 0
        ? Math.min(1, distance / totalKm)
        : progress;
  const currentChapter = chapters[currentIndex];

  // Eine simulierte Position darf niemals wie ein echter Live-Standort
  // aussehen. Ohne gültigen Fix bleibt der Positionsmarker daher leer.
  const shownPos = hasFreshGps ? livePos : null;
  const gpsAgeSec =
    lastLocationAtRef.current > 0
      ? Math.max(
          0,
          Math.round((locationNow - lastLocationAtRef.current) / 1000),
        )
      : null;
  const observerRouteDistanceM = useMemo(() => {
    if (
      !livePos ||
      !navigationGeometry ||
      navigationGeometry.length < 2 ||
      !hasFreshGps
    ) {
      return null;
    }
    const match = fortschrittAufRoute(livePos, navigationGeometry);
    return match && Number.isFinite(match.distKm)
      ? Math.round(match.distKm * 1000)
      : null;
  }, [hasFreshGps, livePos, navigationGeometry]);

  return (
    <Background>
      {/* Standort-Banner */}
      {locState === "denied" && (
        <View
          style={[styles.banner, { top: topPad, backgroundColor: colors.card }]}
        >
          <View style={styles.bannerHead}>
            <Feather name="map-pin" size={16} color={colors.accent} />
            <Text style={[styles.bannerText, { color: colors.foreground }]}>
              {t.noLocationAccess}
            </Text>
          </View>
          <Text style={[styles.bannerHint, { color: colors.mutedForeground }]}>
            {t.locationDeniedHint}
          </Text>
          <Pressable
            onPress={() => void requestLocationAccess()}
            accessibilityRole="button"
            accessibilityLabel={t.allow}
            style={[styles.bannerBtn, { borderColor: colors.glassBorder }]}
          >
            <Feather name="settings" size={14} color={colors.accent} />
            <Text style={[styles.bannerAction, { color: colors.accent }]}>
              {t.allow}
            </Text>
          </Pressable>
        </View>
      )}

      {!startReached && locState !== "denied" && walkToStart && !preparing && (
        <Animated.View
          entering={FadeIn}
          style={[
            styles.banner,
            { top: topPad, backgroundColor: colors.card, paddingVertical: 12 },
          ]}
        >
          <View style={styles.bannerHead}>
            <Feather name="navigation" size={16} color={colors.accent} />
            <Text style={[styles.bannerText, { color: colors.foreground }]}>
              {t.walkToStartTitle}
            </Text>
          </View>
          <Text style={[styles.bannerHint, { color: colors.mutedForeground }]}>
            {t.walkToStartHint(walkToStart.distText, walkToStart.dir)}
          </Text>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={{
          paddingTop:
            locState === "denied"
              ? topPad + 148
              : !startReached && walkToStart && !preparing
                ? topPad + 92
                : topPad,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isOffline && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            style={[
              styles.offlineBannerInline,
              { backgroundColor: colors.card, borderColor: colors.destructive },
            ]}
          >
            <Feather name="wifi-off" size={15} color={colors.destructive} />
            <Text style={[styles.bannerText, { color: colors.foreground }]}>
              {t.offlineHikeBanner}
            </Text>
          </Animated.View>
        )}

        {/* Off-Route-Warnung mit Neuberechnung */}
        {offRoutePos && (
          <Animated.View
            entering={FadeInUp}
            exiting={FadeOut}
            style={[
              styles.offRouteBanner,
              { backgroundColor: colors.card, borderColor: "#E8A800" },
            ]}
          >
            <View style={styles.offRouteBannerRow}>
              <Feather name="alert-triangle" size={16} color="#E8A800" />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.offRouteBannerTitle,
                    { color: colors.foreground },
                  ]}
                >
                  {t.offRouteTitle}
                </Text>
                <Text
                  style={[
                    styles.offRouteBannerHint,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {isRecalculating
                    ? t.offRouteRecalculating
                    : recalcFailed
                      ? t.offRouteRecalcFailed
                      : recalcGeom
                        ? t.offRouteRecalcDone
                        : t.offRouteHint}
                </Text>
              </View>
              {isRecalculating && (
                <ActivityIndicator size="small" color="#E8A800" />
              )}
              <CloseButton
                accessibilityLabel={t.close}
                onPress={() => {
                  isOffRouteRef.current = false;
                  offRouteCountRef.current = 0;
                  if (startChoicePendingRef.current) {
                    startChoicePendingRef.current = false;
                    setStartChoicePending(false);
                  }
                  setOffRoutePos(null);
                }}
              />
            </View>
            {recalcGeom &&
              !startChoicePending &&
              !isRecalculating &&
              !followingRecalc && (
                <Pressable
                  onPress={() => {
                    isOffRouteRef.current = false;
                    offRouteCountRef.current = 0;
                    void followRecalculatedRoute();
                  }}
                  style={[
                    styles.offRouteFollowBtn,
                    { backgroundColor: "#E8A800" },
                  ]}
                >
                  <Feather name="navigation" size={14} color="#10181A" />
                  <Text
                    style={[styles.offRouteFollowText, { color: "#10181A" }]}
                  >
                    {t.offRouteFollow}
                  </Text>
                </Pressable>
              )}
          </Animated.View>
        )}
        <View style={styles.headRow}>
          <BackButton
            accessibilityLabel={t.back}
            onPress={confirmInterruptHike}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>
              {saga.canton.toUpperCase()} · {t.live}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {localizedSagaTitle}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          <KarteVollbild
            height={200}
            onVollbildChange={setKarteVollbild}
            closeSignal={karteCloseSignal}
            renderKarte={(hoehe, safeAreaTop) =>
              mapCenter ? (
                <SwisstopoMap
                  center={mapCenter}
                  position={shownPos}
                  label={localizedSagaTitle}
                  height={hoehe}
                  geometry={
                    followingRecalc
                      ? (acceptedRouteGeometry ??
                        recalcGeom ??
                        navigationGeometry)
                      : navigationGeometry
                  }
                  elevationProfile={!followingRecalc ? terrainProfile : null}
                  altGeometry={!followingRecalc ? recalcGeom : null}
                  offlineTiles={offlineTiles}
                  aerialways={aerialways}
                  pois={displayedPois}
                  waterSources={waterSources.length > 0 ? waterSources : null}
                  parkingSpots={parkingSpots.length > 0 ? parkingSpots : null}
                  safetyPois={
                    visibleSafetyPois.length > 0 ? visibleSafetyPois : null
                  }
                  pickerMode={routeChangePickerOpen}
                  onMapClick={(lat, lng) => {
                    if (!routeChangePickerOpen) return;
                    void routeToTarget({ lat, lng }, t.routeChangeWaypoint);
                  }}
                  safeAreaInsetTop={safeAreaTop}
                  sagaPin={
                    saga?.coordinates
                      ? {
                          lat: saga.coordinates.lat,
                          lng: saga.coordinates.lng,
                          name: localizedSagaTitle,
                        }
                      : null
                  }
                  onPoiPress={(id) => {
                    const poi = displayedPois.find((p) => p.id === id);
                    if (!poi) return;
                    if (karteVollbild) {
                      // Vollbild: erst schliessen, dann nach Fade-Ende oeffnen.
                      pendingKarteActionRef.current = () => setSelectedPoi(poi);
                      setKarteVollbild(false);
                      setKarteCloseSignal((n) => n + 1);
                    } else {
                      // Kleine Karte: karteVollbild ist bereits false,
                      // useEffect wuerde nie feuern → direkt oeffnen.
                      setSelectedPoi(poi);
                    }
                  }}
                  partners={partners}
                  onPartnerPress={(id) => {
                    const partner = partners.find((p) => p.id === id);
                    if (!partner) return;
                    setPartnerAnnouncementText(null);
                    if (karteVollbild) {
                      pendingKarteActionRef.current = () =>
                        setSelectedPartner(partner);
                      setKarteVollbild(false);
                      setKarteCloseSignal((n) => n + 1);
                    } else {
                      setSelectedPartner(partner);
                    }
                  }}
                />
              ) : (
                <RouteMap progress={progress} height={hoehe} />
              )
            }
          />
        </View>
        <RouteTerrain3D
          visible={routeTerrain3dOpen}
          onClose={() => setRouteTerrain3dOpen(false)}
          geometry={navigationGeometry}
          terrainProfile={terrainProfile}
        />

        {/* Breite Statistik-Kachel direkt unter der Karte */}
        <Glass style={{ marginTop: 14 }}>
          <View style={styles.statBar}>
            <Metric
              label={t.metricDistance}
              value={distance.toFixed(1)}
              unit={t.unitKm}
            />
            <Metric
              label={t.metricHeight}
              value={`${Math.round(timeProgress * ascentM)}`}
              unit={t.unitHm}
            />
            <Metric
              label={t.metricTimeLeft}
              value={`${Math.max(0, Math.round((1 - timeProgress) * totalMin))}`}
              unit={t.unitMin}
            />
            <Metric label={t.metricSac} value={sac} unit="" />
            <Metric
              label={t.metricRemaining}
              value={Math.max(0, totalKm * (1 - timeProgress)).toFixed(1)}
              unit={t.unitKm}
            />
            {steps > 0 && (
              <Metric label={t.metricSteps} value={`${steps}`} unit="" />
            )}
          </View>
        </Glass>

        <FeatureTileDeck
          closeLabel={t.close}
          closeSignal={panoramaTileCloseSignal}
          columns={4}
          tileOrder={[
            "compass",
            "watch",
            "gps-live",
            "safety-checkin",
            "panorama",
            "route-3d",
            "object-recognition",
            "condition-report",
          ]}
          onTileOpen={(tileId) => {
            if (tileId === "panorama") {
              panoramaPeakRequestRef.current = null;
              setPanoramaTileOpen(true);
            }
            if (tileId === "route-3d") {
              setRouteTerrain3dOpen(true);
            }
            if (tileId === "safety-checkin") {
              safetyCheckinRef.current?.open();
            }
            if (tileId === "condition-report") {
              setConditionSubmitResult(null);
              setSelectedCondition(null);
              setConditionNote("");
              setConditionSubmitting(false);
              setShowConditionForm(true);
            }
          }}
          tiles={[
            {
              id: "compass",
              title: t.compass,
              subtitle:
                compassHeading == null
                  ? "—°"
                  : `${Math.round(compassHeading)}°`,
              highlightSubtitle: true,
              icon: "compass",
              content: (
                <CompassCard
                  heading={compassHeading}
                  sagaBearing={
                    livePos && saga?.coordinates
                      ? bearingDeg(livePos, saga.coordinates)
                      : null
                  }
                  sagaName={localizedSagaTitle}
                  available={compassAvailable}
                  direction={
                    compassHeading == null
                      ? null
                      : t.compassDirections[compassIndex(compassHeading)]
                  }
                  coordinates={
                    livePos
                      ? `${livePos.lat.toFixed(5)}, ${livePos.lng.toFixed(5)}`
                      : null
                  }
                  place={livePlace}
                  altitude={liveAltitude}
                  title={t.compass}
                  unavailable={t.compassUnavailable}
                  coordinatesLabel={t.coordinates}
                  placeLabel={t.place}
                  altitudeLabel={t.altitude}
                  altitudeUnit={t.altitudeUnit}
                />
              ),
            },
            {
              id: "panorama",
              title: "Panorama",
              subtitle: `${
                panoramaOnlinePois.length > 0
                  ? panoramaOnlinePois.length
                  : (offlinePanorama?.peaks.length ?? panoramaPeaks.length)
              } Gipfel`,
              highlightSubtitle: true,
              icon: "triangle",
              modalSize: "large",
              content: (
                <PeakPanorama
                  peaks={panoramaPeaks}
                  terrainProfile={terrainProfile}
                  terrainModel={terrainModel}
                  observerPosition={hasFreshGps ? livePos : null}
                  heading={compassHeading}
                  observerElevationM={hasFreshGps ? liveAltitude : null}
                  hasGps={hasFreshGps}
                  strings={{
                    title: t.panorama,
                    hint: t.panoramaHint,
                    needCompass: t.panoramaNeedCompass,
                    noGps: t.panoramaNoGps,
                    noPeaks: t.panoramaNoPeaks,
                    detected: t.panoramaDetected,
                    distance: t.panoramaDistance,
                    camera: t.camera,
                    cameraOff: t.cameraOff,
                    capture: t.camera,
                    cameraPermission: t.cameraPermission,
                    arUnavailable: t.arUnavailable,
                    arTrackingStarting: t.arTrackingStarting,
                    arTrackingLimited: t.arTrackingLimited,
                    arTrackingPaused: t.arTrackingPaused,
                    heightUnknown: t.panoramaHeightUnknown,
                    terrainModel: t.panoramaTerrainModel,
                    terrainModelDetail: t.panoramaTerrainModelDetail,
                  }}
                  onCameraOpen={() => {
                    setPanoramaTileOpen(false);
                    panoramaPeakRequestRef.current = null;
                    setPanoramaTileCloseSignal((signal) => signal + 1);
                    if (panoramaCameraTimerRef.current) {
                      clearTimeout(panoramaCameraTimerRef.current);
                    }
                    panoramaCameraTimerRef.current = setTimeout(() => {
                      setPanoramaCameraOpen(true);
                      panoramaCameraTimerRef.current = null;
                    }, 350);
                  }}
                  onCaptured={addRecognitionEntry}
                />
              ),
            },
            {
              id: "route-3d",
              title: "3D ROUTE",
              subtitle: "Gelände & Flug",
              icon: "box",
              action: true,
              content: null,
            },
            {
              id: "object-recognition",
              title: objectRecognitionT.title,
              subtitle: "Premium",
              icon: "camera",
              modalSize: "large",
              content: (
                <ObjectRecognition
                  premium={premium}
                  strings={objectRecognitionT}
                  getToken={() => getTokenRef.current()}
                  language={profile?.language ?? "de"}
                  lat={hasFreshGps ? livePos?.lat : null}
                  lng={hasFreshGps ? livePos?.lng : null}
                  heading={compassHeading}
                  nearbyContext={[livePlace, nearbyPoiKontext]
                    .filter((value): value is string => Boolean(value?.trim()))
                    .join("\n")}
                  onAnalyzed={addRecognitionEntry}
                />
              ),
            },
            ...(Platform.OS !== "web"
              ? [
                  {
                    id: "watch",
                    title: t.watchPulseTitle,
                    highlightSubtitle: true,
                    icon: "watch" as const,
                    modalSize: "large" as const,
                    preview: (
                      <Text
                        style={[
                          styles.watchTilePulse,
                          { color: colors.destructive },
                        ]}
                      >
                        {heartRate
                          ? `${Math.round(heartRate.bpm)} BPM`
                          : t.watchPulseWaiting}
                      </Text>
                    ),
                    content: (
                      <WatchCompanionCard
                        ready={watchReady}
                        direction={
                          compassHeading == null
                            ? null
                            : t.compassDirections[compassIndex(compassHeading)]
                        }
                        remainingKm={Math.max(0, totalKm * (1 - timeProgress))}
                        onEnable={() => {
                          void prepareWatchCompanion().then(setWatchReady);
                        }}
                      />
                    ),
                  },
                ]
              : []),
            {
              id: "gps-live",
              title: "GPS LIVE",
              icon: "map-pin",
              preview: (
                <View
                  style={[
                    styles.gpsTileDot,
                    {
                      backgroundColor: hasFreshGps
                        ? GPS_LIVE_COLOR
                        : colors.destructive,
                    },
                  ]}
                />
              ),
              content: (
                <GpsLiveCard
                  hasFreshGps={hasFreshGps}
                  gpsAgeSec={gpsAgeSec}
                  accuracyM={livePosAccuracy}
                  place={livePlace}
                  coordinates={
                    livePos
                      ? `${livePos.lat.toFixed(5)}, ${livePos.lng.toFixed(5)}`
                      : null
                  }
                  altitude={liveAltitude}
                  liveLabel={`GPS · ${t.live}`}
                  noLocationLabel={t.noLocationAccess}
                  locationHint={t.locationDeniedHint}
                  altitudeUnit={t.altitudeUnit}
                  coordinatesLabel={t.coordinates}
                  placeLabel={t.place}
                  altitudeLabel={t.altitude}
                />
              ),
            },
            {
              id: "safety-checkin",
              title: t.safetyCheckinTitle,
              subtitle: safetyCheckinState
                ? safetyCheckinState.status === "active"
                  ? formatCountdown(safetyCheckinState.remainingSec)
                  : safetyCheckinState.status === "overdue"
                    ? t.safetyCheckinOverdue
                    : t.safetyCheckinStart
                : t.safetyCheckinButton,
              highlightSubtitle: true,
              icon: "clock",
              action: true,
              content: null,
            },
            {
              id: "condition-report",
              title: t.communityConditions,
              subtitle: t.reportCondition,
              icon: "alert-circle",
              content: (
                <View style={styles.conditionTileContent}>
                  {conditionSubmitResult === "ok" && (
                    <Text
                      style={[
                        styles.conditionSuccess,
                        { color: colors.accent },
                      ]}
                    >
                      {t.conditionSubmitted}
                    </Text>
                  )}
                  {(conditionSubmitResult === "ratelimit" ||
                    conditionSubmitResult === "error") && (
                    <Text
                      style={[
                        styles.conditionError,
                        { color: colors.destructive },
                      ]}
                    >
                      {conditionSubmitResult === "ratelimit"
                        ? t.conditionRateLimit
                        : t.conditionError}
                    </Text>
                  )}
                  {showConditionForm ? (
                    <Animated.View entering={FadeIn.duration(200)}>
                      <View style={styles.conditionChips}>
                        {(
                          [
                            "excellent",
                            "clear",
                            "muddy",
                            "snow",
                            "icy",
                            "blocked",
                          ] as const
                        ).map((lvl) => (
                          <Pressable
                            key={lvl}
                            onPress={() => setSelectedCondition(lvl)}
                            style={[
                              styles.conditionChip,
                              {
                                borderColor:
                                  selectedCondition === lvl
                                    ? colors.accent
                                    : colors.glassBorder,
                                backgroundColor:
                                  selectedCondition === lvl
                                    ? colors.accent + "22"
                                    : colors.glassBg,
                              },
                            ]}
                          >
                            <Text style={styles.conditionEmojiText}>
                              {t.conditionEmoji[lvl]}
                            </Text>
                            <Text
                              style={[
                                styles.conditionChipLabel,
                                {
                                  color:
                                    selectedCondition === lvl
                                      ? colors.accent
                                      : colors.mutedForeground,
                                },
                              ]}
                            >
                              {t.conditions[lvl]}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                      <TextInput
                        style={[
                          styles.conditionInput,
                          {
                            color: colors.foreground,
                            borderColor: colors.glassBorder,
                            backgroundColor: colors.glassBg,
                          },
                        ]}
                        placeholder={t.conditionNotePlaceholder}
                        placeholderTextColor={colors.mutedForeground}
                        value={conditionNote}
                        onChangeText={setConditionNote}
                        maxLength={200}
                        multiline
                      />
                      <View
                        style={{ flexDirection: "row", gap: 8, marginTop: 10 }}
                      >
                        <PrimaryButton
                          label={
                            conditionSubmitting
                              ? t.conditionSubmitting
                              : t.conditionSubmit
                          }
                          onPress={submitConditionHike}
                          disabled={conditionSubmitting || !selectedCondition}
                          style={{ flex: 1 }}
                        />
                        <PrimaryButton
                          label="✕"
                          variant="secondary"
                          onPress={() => {
                            setShowConditionForm(false);
                            setSelectedCondition(null);
                            setConditionNote("");
                            setConditionSubmitResult(null);
                          }}
                          style={{ flex: 1 }}
                        />
                      </View>
                    </Animated.View>
                  ) : (
                    <PrimaryButton
                      label={t.reportCondition}
                      variant="secondary"
                      onPress={() => {
                        setConditionSubmitResult(null);
                        setShowConditionForm(true);
                      }}
                      style={styles.hikeActionButton}
                    />
                  )}
                </View>
              ),
            },
          ]}
        />

        <PeakCameraOverlay
          visible={panoramaCameraOpen}
          peaks={panoramaPeaks}
          arCandidates={panoramaArCandidates}
          terrainProfile={terrainProfile}
          terrainModel={terrainModel}
          // AR muss dieselbe aktive Geometrie wie Karte, Navigation und
          // Fortschritt verwenden — nach einer Start-Umleitung ist das die
          // kombinierte navigationGeometry und nicht mehr route.geometry.
          routeGeometry={navigationGeometry}
          observerPosition={hasFreshGps ? livePos : null}
          observerAccuracyM={livePosAccuracy}
          observerFixAgeMs={gpsAgeSec != null ? gpsAgeSec * 1000 : null}
          observerRouteDistanceM={observerRouteDistanceM}
          heading={compassHeading}
          nextTurn={nextArTurn}
          observerElevationM={hasFreshGps ? liveAltitude : null}
          strings={{
            title: t.panorama,
            hint: t.panoramaHint,
            needCompass: t.panoramaNeedCompass,
            noGps: t.panoramaNoGps,
            noPeaks: t.panoramaNoPeaks,
            detected: t.panoramaDetected,
            distance: t.panoramaDistance,
            camera: t.camera,
            cameraOff: t.cameraOff,
            capture: t.camera,
            cameraPermission: t.cameraPermission,
            arUnavailable: t.arUnavailable,
            arTrackingStarting: t.arTrackingStarting,
            arTrackingLimited: t.arTrackingLimited,
            arTrackingPaused: t.arTrackingPaused,
            heightUnknown: t.panoramaHeightUnknown,
            terrainModel: t.panoramaTerrainModel,
            terrainModelDetail: t.panoramaTerrainModelDetail,
          }}
          onClose={() => setPanoramaCameraOpen(false)}
          onCaptured={addRecognitionEntry}
        />

        {/* Live entdeckter Ort in der Naehe (Wikipedia/OSM) */}
        {nearbyPoi && (
          <Animated.View entering={FadeIn}>
            <Glass style={{ marginTop: 14 }} overlayColor={poiOverlay}>
              {/* Ladeindikator solange Wiki noch nicht da; Bild sobald fertig */}
              {nearbyPoiWiki === undefined ? (
                <View
                  style={[
                    styles.poiCardImage,
                    { alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : nearbyPoiWiki?.image ? (
                <Image
                  source={{ uri: nearbyPoiWiki.image }}
                  style={styles.poiCardImage}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.poiCardHeader}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  {!nearbyPoiWiki?.image && nearbyPoiWiki !== undefined && (
                    <Feather name="map-pin" size={22} color={colors.accent} />
                  )}
                  <Text style={[styles.poiEyebrow, { color: colors.accent }]}>
                    {t.discoveredNearby}
                  </Text>
                </View>
                <CloseButton
                  accessibilityLabel={t.close}
                  onPress={() => setNearbyPoi(null)}
                />
              </View>
              <Text style={[styles.poiTitle, { color: colors.foreground }]}>
                {poiDisplayName(nearbyPoi.name, nearbyPoi.kind)}
              </Text>
              {(nearbyPoiWiki?.extract || nearbyPoiKontext) && (
                <Text
                  style={[styles.poiSummary, { color: colors.foreground }]}
                  numberOfLines={10}
                >
                  {nearbyPoiWiki?.extract ?? nearbyPoiKontext}
                </Text>
              )}
            </Glass>
          </Animated.View>
        )}

        {/* Story-Bereich */}
        <Glass
          style={{ marginTop: 14, overflow: "hidden" }}
          overlayColor={poiOverlay}
        >
          <View style={styles.storyTileHeader}>
            <Pressable
              onPress={() => setStoryTileOpen((open) => !open)}
              style={styles.storyTileHeaderMain}
              accessibilityRole="button"
              accessibilityLabel="Sagentext öffnen"
              accessibilityState={{ expanded: storyTileOpen }}
            >
              <View style={styles.storyTileHeaderText}>
                <Feather name="book-open" size={18} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.storyTileTitle,
                      { color: colors.foreground },
                    ]}
                  >
                    Sagentext
                  </Text>
                  <Text
                    style={[
                      styles.storyTileSubtitle,
                      { color: colors.destructive },
                    ]}
                  >
                    {nowPlayingVisible
                      ? nowPlaying.label
                      : preparing
                        ? t.preparingText
                        : t.chapterMark(currentIndex + 1, chapters.length)}
                  </Text>
                </View>
              </View>
              {!storyTileOpen && (
                <Feather
                  name="chevron-down"
                  size={18}
                  color={colors.mutedForeground}
                />
              )}
            </Pressable>
            {storyTileOpen && (
              <CloseButton
                accessibilityLabel={t.close}
                onPress={() => setStoryTileOpen(false)}
              />
            )}
          </View>

          {storyTileOpen &&
            (preparing ? (
              <View style={styles.preparing}>
                <SparkMountain size={90} pulsing />
                <Text
                  style={[
                    styles.preparingText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {t.preparingText}
                </Text>
                <LoadingBar width={160} height={4} />
              </View>
            ) : (
              <Animated.View entering={FadeIn} style={styles.storyWrap}>
                <View style={styles.chapterHead}>
                  <Text style={[styles.chapterMark, { color: colors.accent }]}>
                    {t.chapterMark(currentIndex + 1, chapters.length)}
                  </Text>
                  <View style={styles.chapterActions}>
                    <Pressable
                      onPress={() => {
                        if (currentChapter) {
                          speak(currentChapter.text, undefined, {
                            kind: "chapter",
                            displayTitle: t.chapterMark(
                              currentIndex + 1,
                              chapters.length,
                            ),
                          });
                        }
                      }}
                      style={[
                        styles.playBtn,
                        { borderColor: colors.glassBorder },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={t.repeatChapter}
                    >
                      <Feather
                        name="rotate-ccw"
                        size={16}
                        color={colors.foreground}
                      />
                      <Text
                        style={[styles.playText, { color: colors.foreground }]}
                      >
                        {t.repeatChapter}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (speaking) {
                          cancelNarration();
                        } else if (currentChapter) {
                          speak(currentChapter.text, undefined, {
                            kind: "chapter",
                            displayTitle: t.chapterMark(
                              currentIndex + 1,
                              chapters.length,
                            ),
                          });
                        }
                      }}
                      style={[
                        styles.playBtn,
                        { borderColor: colors.glassBorder },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={speaking ? t.pause : t.readAloud}
                    >
                      <Feather
                        name={speaking ? "pause" : "play"}
                        size={16}
                        color={colors.foreground}
                      />
                      <Text
                        style={[styles.playText, { color: colors.foreground }]}
                      >
                        {speaking ? t.pause : t.readAloud}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {nowPlayingVisible && nowPlaying && (
                  <Animated.View
                    entering={FadeInUp}
                    style={[
                      styles.nowPlayingCard,
                      {
                        borderColor: colors.accent,
                        backgroundColor: colors.glassBgStrong,
                      },
                    ]}
                    accessibilityLabel={`${nowPlaying.label}: ${nowPlaying.text}`}
                  >
                    <View style={styles.nowPlayingTop}>
                      <View style={styles.nowPlayingMeta}>
                        <Feather
                          name="volume-2"
                          size={16}
                          color={colors.accent}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.nowPlayingLabel,
                              { color: colors.accent },
                            ]}
                          >
                            {nowPlaying.label}
                          </Text>
                          {nowPlaying.title &&
                            nowPlaying.title !== nowPlaying.label && (
                              <Text
                                style={[
                                  styles.nowPlayingTitle,
                                  { color: colors.foreground },
                                ]}
                                numberOfLines={1}
                              >
                                {nowPlaying.title}
                              </Text>
                            )}
                        </View>
                      </View>
                      <AudioWaveform color={colors.accent} />
                    </View>
                    <Text
                      style={[
                        styles.nowPlayingText,
                        { color: colors.mutedForeground },
                      ]}
                      numberOfLines={2}
                    >
                      {nowPlaying.text}
                    </Text>
                  </Animated.View>
                )}

                <Text style={[styles.storyText, { color: colors.foreground }]}>
                  {currentChapter?.text}
                </Text>

                {narrationUnavailable && (
                  <Text
                    style={[
                      styles.narrationUnavailable,
                      { color: colors.accent },
                    ]}
                  >
                    {t.narrationUnavailable}
                  </Text>
                )}

                {/* Entscheidungspanel */}
                {awaitingDecision && currentChapter?.decision && (
                  <Animated.View
                    entering={FadeInUp}
                    style={styles.decisionWrap}
                  >
                    <View
                      style={[
                        styles.decisionPanel,
                        {
                          borderColor: colors.primary,
                          backgroundColor: colors.glassBgStrong,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.decisionLabel,
                          { color: colors.primary },
                        ]}
                      >
                        {t.perception}
                      </Text>
                      <Text
                        style={[
                          styles.decisionQuestion,
                          { color: colors.foreground },
                        ]}
                      >
                        {currentChapter.decision.question}
                      </Text>
                      {/* Countdown-Balken */}
                      {decisionCountdown !== null && !folgtGruppenleitung && (
                        <View style={styles.countdownRow}>
                          <View
                            style={[
                              styles.countdownBar,
                              { backgroundColor: colors.glassBorder },
                            ]}
                          >
                            <View
                              style={[
                                styles.countdownFill,
                                {
                                  backgroundColor:
                                    decisionCountdown <= 5
                                      ? colors.destructive
                                      : colors.primary,
                                  width: `${(decisionCountdown / 30) * 100}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              styles.countdownNum,
                              {
                                color:
                                  decisionCountdown <= 5
                                    ? colors.destructive
                                    : colors.mutedForeground,
                              },
                            ]}
                          >
                            {decisionCountdown}
                          </Text>
                        </View>
                      )}
                      {folgtGruppenleitung && (
                        <View style={styles.voiceHintRow}>
                          <Feather
                            name="users"
                            size={14}
                            color={colors.accent}
                          />
                          <Text
                            style={[
                              styles.voiceHintText,
                              { color: colors.accent },
                            ]}
                          >
                            {t.leaderDecides}
                          </Text>
                        </View>
                      )}
                      {!folgtGruppenleitung && voiceSupported && (
                        <View style={styles.voiceHintRow}>
                          <Feather
                            name="mic"
                            size={14}
                            color={
                              voiceListening ? colors.primary : colors.accent
                            }
                          />
                          <Text
                            style={[
                              styles.voiceHintText,
                              { color: colors.accent },
                            ]}
                          >
                            {voiceListening ? t.voiceListening : t.voiceOrTap}
                          </Text>
                        </View>
                      )}
                      {!folgtGruppenleitung &&
                      voiceSupported &&
                      voiceTranscript ? (
                        <Text
                          style={[
                            styles.voiceHintText,
                            { color: colors.mutedForeground, marginBottom: 8 },
                          ]}
                          numberOfLines={1}
                        >
                          «{voiceTranscript}»
                        </Text>
                      ) : null}
                      {currentChapter.decision.options.map((opt, i) => (
                        <Pressable
                          key={i}
                          onPress={() => chooseOption(i)}
                          disabled={folgtGruppenleitung}
                          accessibilityRole="button"
                          accessibilityLabel={opt.label}
                          accessibilityHint={opt.archetypeHint}
                          style={[
                            styles.optionBtn,
                            { borderColor: colors.glassBorder },
                            folgtGruppenleitung && { opacity: 0.45 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionLabel,
                              { color: colors.foreground },
                            ]}
                          >
                            {opt.label}
                          </Text>
                          <Text
                            style={[
                              styles.optionHint,
                              { color: colors.accent },
                            ]}
                          >
                            {opt.archetypeHint}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </Animated.View>
                )}

                {choiceFeedback && (
                  <Animated.View
                    entering={FadeInUp}
                    style={styles.choiceFeedbackWrap}
                  >
                    <View
                      style={[
                        styles.choiceFeedbackPanel,
                        {
                          borderColor: colors.primary,
                          backgroundColor: colors.glassBgStrong,
                        },
                      ]}
                    >
                      <Feather
                        name="check-circle"
                        size={16}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.choiceFeedbackText,
                          { color: colors.foreground },
                        ]}
                      >
                        {choiceFeedback}
                      </Text>
                    </View>
                  </Animated.View>
                )}
              </Animated.View>
            ))}
        </Glass>

        {/* Vollbreite Aktionen unterhalb der Sagentext-Kachel */}
        <View style={styles.storyActionArea}>
          <View style={styles.photoRow}>
            <PrimaryButton
              variant="secondary"
              style={styles.hikeActionButton}
              label={
                photoUploading
                  ? t.photoUploading
                  : photoUploadFeedback === "ok"
                    ? t.photoUploaded
                    : photoUploadFeedback === "error"
                      ? t.photoUploadError
                      : t.photoAddBtn
              }
              onPress={takePhoto}
              disabled={photoUploading}
              loading={photoUploading}
            />

            {hikePhotos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photoStrip}
                contentContainerStyle={styles.photoStripContent}
              >
                {hikePhotos.map((uri, idx) => (
                  <View key={idx} style={styles.photoThumbWrap}>
                    <Image source={{ uri }} style={styles.photoThumb} />
                    {idx >= hikePhotos.length - photoObjectPaths.length && (
                      <View
                        style={[
                          styles.photoThumbBadge,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Feather name="check" size={8} color="#fff" />
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {showPhotoChallenge && (
            <Animated.View
              entering={FadeInUp}
              exiting={FadeOut}
              style={styles.photoChallengeWrap}
            >
              <View
                style={[
                  styles.photoChallengePanel,
                  {
                    borderColor: colors.accent,
                    backgroundColor: colors.glassBgStrong,
                  },
                ]}
              >
                <View style={styles.photoChallengeHeader}>
                  <Feather name="camera" size={18} color={colors.accent} />
                  <Text
                    style={[
                      styles.photoChallengeTitel,
                      { color: colors.accent },
                    ]}
                  >
                    {
                      STORY_PACKS[resolveLang(storyLanguage)]
                        .photoChallengePrompt
                    }
                  </Text>
                </View>
                <View style={styles.photoChallengeActions}>
                  <Pressable
                    onPress={takePhoto}
                    style={[
                      styles.photoChallengeBtn,
                      {
                        borderColor: colors.accent,
                        backgroundColor: colors.accent,
                      },
                    ]}
                    accessibilityRole="button"
                  >
                    <Feather name="camera" size={15} color="#fff" />
                    <Text
                      style={[styles.photoChallengeBtnText, { color: "#fff" }]}
                    >
                      {t.photoTake}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowPhotoChallenge(false)}
                    style={[
                      styles.photoChallengeBtn,
                      { borderColor: colors.glassBorder },
                    ]}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.photoChallengeBtnText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {t.photoSkip}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          )}

          {finished && (
            <PrimaryButton
              label={t.finishHike}
              variant="secondary"
              onPress={finishHike}
              style={styles.hikeActionButton}
            />
          )}

          {!finished && !preparing && (
            <PrimaryButton
              label={t.finishEarlyButton}
              variant="secondary"
              onPress={finishHikeEarly}
              style={styles.hikeActionButton}
            />
          )}

          {!finished && !preparing && (
            <View style={styles.routeChangeArea}>
              <PrimaryButton
                label={
                  routeChangeLoading ? t.routeChangeCalculating : t.routeChange
                }
                variant="secondary"
                onPress={() => {
                  if (routeChangeLoading) return;
                  setRouteChangeError(false);
                  setRouteChangeOpen((open) => !open);
                }}
                disabled={routeChangeLoading}
                style={styles.hikeActionButton}
              />
              {routeChangeError && (
                <Text
                  style={[
                    styles.routeChangeError,
                    { color: colors.destructive },
                  ]}
                >
                  {isOffline ? t.offlineHikeBanner : t.routeChangeError}
                </Text>
              )}
              {routeChangeOpen && (
                <View
                  style={[
                    styles.routeChangePanel,
                    {
                      backgroundColor: colors.glassBgStrong,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.routeChangeTitle,
                      { color: colors.foreground },
                    ]}
                  >
                    {t.routeChange}
                  </Text>
                  <Text
                    style={[
                      styles.routeChangeHint,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {t.routeChangePickHint}
                  </Text>
                  <Pressable
                    style={[
                      styles.routeChangeOption,
                      { borderColor: colors.glassBorder },
                    ]}
                    onPress={() => {
                      const start = navigationGeometry?.[0];
                      if (!start) return;
                      void routeToTarget(
                        { lat: start[0], lng: start[1] },
                        t.routeChangeStart,
                      );
                    }}
                    accessibilityRole="button"
                  >
                    <Feather
                      name="corner-left-up"
                      size={18}
                      color={colors.accent}
                    />
                    <Text
                      style={[
                        styles.routeChangeOptionText,
                        { color: colors.foreground },
                      ]}
                    >
                      {t.routeChangeStart}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.routeChangeOption,
                      { borderColor: colors.glassBorder },
                    ]}
                    onPress={() => {
                      setRouteChangeError(false);
                      setRouteChangeOpen(false);
                      setRouteChangePickerOpen(true);
                      setKarteVollbild(true);
                    }}
                    accessibilityRole="button"
                  >
                    <Feather name="map-pin" size={18} color={colors.accent} />
                    <Text
                      style={[
                        styles.routeChangeOptionText,
                        { color: colors.foreground },
                      ]}
                    >
                      {t.routeChangeWaypoint}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.routeChangeOption,
                      { borderColor: colors.glassBorder },
                    ]}
                    onPress={() => void routeToNearestTransport()}
                    accessibilityRole="button"
                  >
                    <Feather
                      name="navigation"
                      size={18}
                      color={colors.accent}
                    />
                    <Text
                      style={[
                        styles.routeChangeOptionText,
                        { color: colors.foreground },
                      ]}
                    >
                      {t.routeChangeTransport}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Sicherheits-POIs filtern ───────────────────────────────── */}
        <View
          style={[
            styles.safetyFilterTile,
            {
              borderColor: colors.glassBorder,
              backgroundColor: poiOverlay ?? colors.glassBgStrong,
            },
          ]}
        >
          <View style={styles.safetyFilterHeader}>
            <Pressable
              onPress={() => setSafetyPoiFiltersOpen((open) => !open)}
              style={styles.safetyFilterHeaderMain}
              accessibilityRole="button"
              accessibilityLabel={mapT.safetyPoiFilterTitle}
              accessibilityState={{ expanded: safetyPoiFiltersOpen }}
            >
              <View style={styles.safetyFilterHeaderText}>
                <Feather name="shield" size={18} color={colors.destructive} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.safetyFilterTitle,
                      { color: colors.foreground },
                    ]}
                  >
                    {mapT.safetyPoiFilterTitle}
                  </Text>
                  <Text
                    style={[
                      styles.safetyFilterCount,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {enabledSafetyPoiCount}/{SAFETY_POI_CATEGORIES.length}
                  </Text>
                </View>
              </View>
              {!safetyPoiFiltersOpen && (
                <Feather
                  name="chevron-down"
                  size={18}
                  color={colors.mutedForeground}
                />
              )}
            </Pressable>
            {safetyPoiFiltersOpen && (
              <CloseButton
                accessibilityLabel={t.close}
                onPress={() => setSafetyPoiFiltersOpen(false)}
              />
            )}
          </View>

          {safetyPoiFiltersOpen && (
            <Animated.View
              entering={FadeIn.duration(180)}
              style={[
                styles.safetyFilterBody,
                { borderTopColor: colors.glassBorder },
              ]}
            >
              <Text
                style={[
                  styles.safetyFilterHint,
                  { color: colors.mutedForeground },
                ]}
              >
                {mapT.safetyPoiFilterHint}
              </Text>
              <View style={styles.safetyFilterGrid}>
                {safetyPoiFilterLabels.map(({ category, code, label }) => {
                  const enabled = enabledSafetyPoiCategories[category];
                  return (
                    <Pressable
                      key={category}
                      onPress={() =>
                        setEnabledSafetyPoiCategories((current) => ({
                          ...current,
                          [category]: !current[category],
                        }))
                      }
                      style={[
                        styles.safetyFilterOption,
                        {
                          borderColor: enabled
                            ? colors.destructive
                            : colors.glassBorder,
                          backgroundColor: enabled
                            ? `${colors.destructive}18`
                            : colors.glassBg,
                        },
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: enabled }}
                      accessibilityLabel={`${code} ${label}`}
                    >
                      <View
                        style={[
                          styles.safetyFilterCode,
                          {
                            backgroundColor: colors.destructive,
                            borderColor: colors.primaryForeground,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.safetyFilterCodeText,
                            { color: colors.primaryForeground },
                          ]}
                        >
                          {code}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.safetyFilterLabel,
                          { color: colors.foreground },
                        ]}
                      >
                        {label}
                      </Text>
                      <Feather
                        name={enabled ? "check-circle" : "circle"}
                        size={15}
                        color={
                          enabled ? colors.destructive : colors.mutedForeground
                        }
                      />
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={() =>
                  setEnabledSafetyPoiCategories(
                    allSafetyPoiCategoriesEnabled
                      ? (Object.fromEntries(
                          SAFETY_POI_CATEGORIES.map(({ category }) => [
                            category,
                            false,
                          ]),
                        ) as Record<SafetyPoiCategory, boolean>)
                      : DEFAULT_SAFETY_POI_FILTERS,
                  )
                }
                style={[
                  styles.safetyFilterAll,
                  { borderTopColor: colors.glassBorder },
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: allSafetyPoiCategoriesEnabled }}
              >
                <Feather
                  name={
                    allSafetyPoiCategoriesEnabled ? "check-square" : "square"
                  }
                  size={16}
                  color={colors.accent}
                />
                <Text
                  style={[styles.safetyFilterAllText, { color: colors.accent }]}
                >
                  {mapT.safetyPoiFilterAll}
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* POI-Detail — ausserhalb ScrollView damit absoluteFill den ganzen Screen abdeckt */}
      {!!selectedPoi && (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.poiModalBackdrop]}
          onPress={() => setSelectedPoi(null)}
        >
          <Pressable
            style={{ width: "100%" }}
            onPress={(e) => e.stopPropagation()}
          >
            <Glass overlayColor={poiOverlay}>
              {selectedPoiWiki === undefined ? (
                <View
                  style={[
                    styles.poiModalImage,
                    { alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : selectedPoiWiki?.image ? (
                <Image
                  source={{ uri: selectedPoiWiki.image }}
                  style={styles.poiModalImage}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.poiRow}>
                <Feather name="map-pin" size={18} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.poiEyebrow, { color: colors.accent }]}>
                    {t.poiDetailEyebrow}
                  </Text>
                  <Text style={[styles.poiTitle, { color: colors.foreground }]}>
                    {poiDisplayName(selectedPoi.name, selectedPoi.kind)}
                  </Text>
                </View>
                <CloseButton
                  accessibilityLabel={t.close}
                  onPress={() => setSelectedPoi(null)}
                />
              </View>
              <Text
                style={[
                  styles.poiSummary,
                  { color: colors.foreground, marginTop: 10 },
                ]}
              >
                {poiStoryLoading && !poiStory
                  ? t.poiStoryLoading
                  : (poiStory ?? selectedPoi.wiki?.extract ?? t.notAvailable)}
              </Text>
            </Glass>
          </Pressable>
        </Pressable>
      )}

      {/* Partner-Detail — tier-spezifisch (Basic / Standard / Premium) */}
      {!!selectedPartner && (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.poiModalBackdrop]}
          onPress={() => setSelectedPartner(null)}
        >
          <Pressable
            style={{ width: "100%" }}
            onPress={(e) => e.stopPropagation()}
          >
            <Glass overlayColor={poiOverlay}>
              {/* Titelbild — identisch mit POI-Karte (Standard + Premium mit Foto) */}
              {!!selectedPartner.fotoUrl &&
                selectedPartner.paket !== "basic" && (
                  <Image
                    source={{ uri: selectedPartner.fotoUrl }}
                    style={styles.poiCardImage}
                    resizeMode="cover"
                  />
                )}

              {/* Header — Kategorie-Icon + Label */}
              <View style={styles.poiCardHeader}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 7,
                    flex: 1,
                  }}
                >
                  <Feather
                    name={
                      (
                        PARTNER_KATEGORIE[selectedPartner.kategorie ?? ""] ??
                        PARTNER_KAT_DEFAULT
                      ).icon
                    }
                    size={15}
                    color={colors.accent}
                  />
                  <Text style={[styles.poiEyebrow, { color: colors.accent }]}>
                    {
                      (
                        PARTNER_KATEGORIE[selectedPartner.kategorie ?? ""] ??
                        PARTNER_KAT_DEFAULT
                      ).label
                    }
                  </Text>
                </View>
                <CloseButton
                  accessibilityLabel={t.close}
                  onPress={() => setSelectedPartner(null)}
                />
              </View>

              {/* Titel — identisch mit POI-Karte */}
              <Text style={[styles.poiTitle, { color: colors.foreground }]}>
                {selectedPartner.name}
              </Text>

              {/* Offen / Geschlossen Badge + nächste Änderung */}
              {selectedPartner.istOffen != null ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 10,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: selectedPartner.istOffen
                        ? "#22C55E"
                        : "#EF4444",
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      color: selectedPartner.istOffen ? "#22C55E" : "#EF4444",
                      fontFamily: fonts.bodyBold,
                    }}
                  >
                    {selectedPartner.istOffen
                      ? t.partnerOffen
                      : t.partnerGeschlossen}
                  </Text>
                  {(() => {
                    const info = formatPartnerOeffnungsInfo(
                      selectedPartner,
                      t,
                      storyLanguage,
                    );
                    return info ? (
                      <Text
                        style={{ fontSize: 12, color: colors.mutedForeground }}
                      >
                        {"· "}
                        {info}
                      </Text>
                    ) : null;
                  })()}
                </View>
              ) : null}

              {/* Beschreibung — nicht für Basic */}
              {!!(partnerAnnouncementText?.partnerId ===
              String(selectedPartner.id)
                ? partnerAnnouncementText.text
                : (partnerTranslation?.beschreibung ??
                  selectedPartner.beschreibung)) &&
                selectedPartner.paket !== "basic" && (
                  <Text
                    style={[styles.poiSummary, { color: colors.foreground }]}
                  >
                    {partnerAnnouncementText?.partnerId ===
                    String(selectedPartner.id)
                      ? partnerAnnouncementText.text
                      : (partnerTranslation?.beschreibung ??
                        selectedPartner.beschreibung)}
                  </Text>
                )}

              {/* Standard + Premium: Telefon, Reservierung, Website */}
              {(selectedPartner.paket === "premium" ||
                selectedPartner.paket === "standard") && (
                <>
                  {!!selectedPartner.telefon && (
                    <Pressable
                      onPress={() =>
                        Linking.openURL(`tel:${selectedPartner.telefon}`)
                      }
                      style={{ marginTop: 12 }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Feather name="phone" size={16} color={colors.accent} />
                        <Text style={{ color: colors.accent, fontSize: 16 }}>
                          {selectedPartner.telefon}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                  {(!!selectedPartner.reservierungUrl ||
                    !!selectedPartner.websiteUrl) && (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        marginTop: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      {!!selectedPartner.reservierungUrl && (
                        <Pressable
                          onPress={() =>
                            Linking.openURL(selectedPartner.reservierungUrl!)
                          }
                          style={{
                            backgroundColor: colors.accent,
                            borderRadius: 8,
                            paddingHorizontal: 16,
                            paddingVertical: 9,
                          }}
                        >
                          <Text
                            style={{
                              color: "#fff",
                              fontSize: 14,
                              fontFamily: fonts.bodyBold,
                            }}
                          >
                            {t.partnerReservierung}
                          </Text>
                        </Pressable>
                      )}
                      {!!selectedPartner.websiteUrl && (
                        <Pressable
                          onPress={() =>
                            Linking.openURL(selectedPartner.websiteUrl!)
                          }
                          style={{
                            borderWidth: 1.5,
                            borderColor: colors.accent,
                            borderRadius: 8,
                            paddingHorizontal: 16,
                            paddingVertical: 9,
                          }}
                        >
                          <Text style={{ color: colors.accent, fontSize: 14 }}>
                            {t.partnerWebsite}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </>
              )}

              {/* SagaTrail-Angebot — alle Tiers */}
              {!!(partnerTranslation?.angebot ?? selectedPartner.angebot) && (
                <Pressable
                  onPress={() => {
                    if (selectedPartner.id) {
                      const base = getApiBaseUrl() ?? "";
                      fetch(`${base}/partners/${selectedPartner.id}/tap`, {
                        method: "POST",
                      }).catch(() => {});
                    }
                  }}
                >
                  <View
                    style={{
                      backgroundColor: colors.accent + "20",
                      borderRadius: 8,
                      padding: 12,
                      marginTop: 14,
                      borderLeftWidth: 3,
                      borderLeftColor: colors.accent,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.accent,
                        fontFamily: fonts.bodyBold,
                        marginBottom: 3,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {t.partnerOffer}
                    </Text>
                    <Text
                      style={[
                        styles.poiSummary,
                        { color: colors.foreground, marginTop: 0 },
                      ]}
                    >
                      {partnerTranslation?.angebot ?? selectedPartner.angebot}
                    </Text>
                  </View>
                </Pressable>
              )}
            </Glass>
          </Pressable>
        </Pressable>
      )}

      {/* SOS — bewusst KEIN Glas, immer sichtbar und deckend */}
      <Pressable
        onPress={() => {
          requestPhoneSideSos();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${t.sos} — ${t.emergency}`}
        style={[
          styles.sosBtn,
          { bottom: insets.bottom + 20, backgroundColor: colors.primary },
        ]}
      >
        <Text style={styles.sosText}>{t.sos}</Text>
      </Pressable>

      {sosOpen && (
        <View style={styles.sosOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSosOpen(false)}
          />
          <Animated.View
            entering={FadeInUp}
            style={[
              styles.sosSheet,
              {
                paddingBottom: insets.bottom + 20,
                backgroundColor: colors.card,
              },
            ]}
          >
            <View
              style={[
                styles.sosHandle,
                { backgroundColor: colors.glassBorder },
              ]}
            />
            <Text style={[styles.sosTitle, { color: colors.foreground }]}>
              {t.emergency}
            </Text>
            <Text style={[styles.sosSub, { color: colors.mutedForeground }]}>
              {t.emergencySub}
            </Text>

            <Pressable
              onPress={() => callNumber("1414")}
              accessibilityRole="button"
              accessibilityLabel={`${t.regaTitle} — ${t.regaSub}`}
              style={[styles.sosCall, { backgroundColor: colors.primary }]}
            >
              <Feather
                name="phone"
                size={20}
                color={colors.primaryForeground}
              />
              <View>
                <Text style={styles.sosCallTitle}>{t.regaTitle}</Text>
                <Text style={styles.sosCallSub}>{t.regaSub}</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => callNumber("112")}
              accessibilityRole="button"
              accessibilityLabel={`${t.euroEmergencyTitle} — ${t.euroEmergencySub}`}
              style={[styles.sosCall, { backgroundColor: colors.primary }]}
            >
              <Feather
                name="phone"
                size={20}
                color={colors.primaryForeground}
              />
              <View>
                <Text style={styles.sosCallTitle}>{t.euroEmergencyTitle}</Text>
                <Text style={styles.sosCallSub}>{t.euroEmergencySub}</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!hasFreshGps || !livePos) {
                  alert(
                    t.emergency,
                    "Eine aktuelle GPS-Position ist erforderlich, bevor dein Standort geteilt werden kann.",
                  );
                  return;
                }
                if (!emergencyContact?.phone?.trim()) {
                  alert(
                    t.emergency,
                    "Bitte hinterlege zuerst einen Notfallkontakt.",
                  );
                  return;
                }
                const coords = `${livePos.lat.toFixed(5)}, ${livePos.lng.toFixed(5)}`;
                const senderName = profile?.name?.trim() || undefined;
                const body = t.emergencySmsBody(coords, senderName);
                const phone = emergencyContact.phone.replace(/\s+/g, "");
                openUrlSafely(
                  `sms:${phone}&body=${encodeURIComponent(body)}`,
                  t.smsNotAvailable,
                );
              }}
              style={[styles.sosSecondary, { borderColor: colors.glassBorder }]}
              accessibilityRole="button"
              accessibilityLabel={t.sendLocationToContact}
            >
              <Feather name="share-2" size={18} color={colors.foreground} />
              <Text
                style={[styles.sosSecondaryText, { color: colors.foreground }]}
              >
                {t.sendLocationToContact}
              </Text>
            </Pressable>

            <View style={styles.sosClose}>
              <CloseButton
                accessibilityLabel={t.close}
                onPress={() => setSosOpen(false)}
              />
            </View>
          </Animated.View>
        </View>
      )}
      <SafetyCheckin
        ref={safetyCheckinRef}
        hideTrigger
        routeId={routeId ?? id}
        routeName={route?.name ?? t.unknown}
        emergencyContact={emergencyContact}
        livePosition={livePos}
        hasFreshGps={hasFreshGps}
        getAuthToken={getSafetyAuthToken}
        onStatusChange={handleSafetyCheckinStatus}
        labels={{
          button: t.safetyCheckinButton,
          title: t.safetyCheckinTitle,
          explanation: t.safetyCheckinExplanation,
          chooseDuration: t.safetyCheckinChooseDuration,
          minutes: t.safetyCheckinMinutes,
          start: t.safetyCheckinStart,
          cancel: t.close,
          confirm: t.safetyCheckinConfirm,
          active: t.safetyCheckinActive,
          overdue: t.safetyCheckinOverdue,
          share: t.sendLocationToContact,
          noGps: t.safetyCheckinNoGps,
          noContact: t.safetyCheckinNoContact,
          shareUnavailable: t.smsNotAvailable,
          safeMessage: t.safetyCheckinMessage,
          externalShare: t.safetyCheckinExternalShare,
          externalShareActive: t.safetyCheckinExternalShareActive,
          shareFailed: t.safetyCheckinShareFailed,
          loadFailed: t.safetyCheckinLoadFailed,
          endFailed: t.safetyCheckinEndFailed,
          startFailed: t.safetyCheckinStartFailed,
          localOnly: t.safetyCheckinLocalOnly,
          shareWhatsApp: t.safetyCheckinShareWhatsApp,
          shareSms: t.safetyCheckinShareSms,
          whatsappUnavailable: t.safetyCheckinWhatsappUnavailable,
        }}
      />
    </Background>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <View style={styles.metricValRow}>
        <Text style={[styles.metricVal, { color: colors.destructive }]}>
          {value}
        </Text>
        {unit ? (
          <Text style={[styles.metricUnit, { color: colors.accent }]}>
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function formatCountdown(seconds: number) {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.max(0, seconds) % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function GpsLiveCard({
  hasFreshGps,
  gpsAgeSec,
  accuracyM,
  place,
  coordinates,
  altitude,
  liveLabel,
  noLocationLabel,
  locationHint,
  altitudeUnit,
  coordinatesLabel,
  placeLabel,
  altitudeLabel,
}: {
  hasFreshGps: boolean;
  gpsAgeSec: number | null;
  accuracyM: number | null;
  place: string | null;
  coordinates: string | null;
  altitude: number | null;
  liveLabel: string;
  noLocationLabel: string;
  locationHint: string;
  altitudeUnit: string;
  coordinatesLabel: string;
  placeLabel: string;
  altitudeLabel: string;
}) {
  const colors = useColors();
  const values = [
    {
      label: "Signalalter",
      value: hasFreshGps && gpsAgeSec != null ? `${gpsAgeSec} s` : "—",
    },
    {
      label: "Genauigkeit",
      value: accuracyM != null ? `±${Math.round(accuracyM)} m` : "—",
    },
    { label: placeLabel, value: hasFreshGps ? (place ?? "—") : "—" },
    { label: coordinatesLabel, value: coordinates ?? "—" },
    {
      label: altitudeLabel,
      value: altitude != null ? `${Math.round(altitude)} ${altitudeUnit}` : "—",
    },
  ];

  return (
    <View style={styles.gpsCard}>
      <View style={styles.gpsCardStatus}>
        <View
          style={[
            styles.gpsCardDot,
            {
              backgroundColor: hasFreshGps
                ? GPS_LIVE_COLOR
                : colors.destructive,
            },
          ]}
        />
        <Text style={[styles.gpsCardTitle, { color: colors.foreground }]}>
          {hasFreshGps ? liveLabel : noLocationLabel}
        </Text>
      </View>
      <View
        style={[styles.gpsValueList, { borderTopColor: colors.glassBorder }]}
      >
        {values.map(({ label, value }) => (
          <View key={label} style={styles.gpsValueRow}>
            <Text
              style={[styles.gpsValueLabel, { color: colors.mutedForeground }]}
            >
              {label}
            </Text>
            <Text
              style={[styles.gpsValue, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {value}
            </Text>
          </View>
        ))}
      </View>
      {!hasFreshGps && (
        <Text style={[styles.gpsCardHint, { color: colors.mutedForeground }]}>
          {locationHint}
        </Text>
      )}
    </View>
  );
}

function WatchCompanionCard({
  ready,
  direction,
  remainingKm,
  onEnable,
}: {
  ready: boolean | null;
  direction: string | null;
  remainingKm: number;
  onEnable: () => void;
}) {
  const colors = useColors();
  const enabled = ready === true;
  const status = enabled
    ? "Watch-Verbindung aktiv"
    : ready === false
      ? "Watch-Mitteilungen nicht erlaubt"
      : "Watch-Begleitung wird geprüft";
  return (
    <Glass style={{ marginTop: 14 }}>
      <View style={styles.watchCardHead}>
        <View
          style={[
            styles.watchIcon,
            {
              backgroundColor: enabled ? colors.accent + "22" : colors.glassBg,
            },
          ]}
        >
          <Feather
            name="watch"
            size={18}
            color={enabled ? colors.accent : colors.mutedForeground}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.watchTitle, { color: colors.foreground }]}>
            Watch-Begleitung
          </Text>
          <Text
            style={[
              styles.watchStatus,
              { color: enabled ? colors.accent : colors.mutedForeground },
            ]}
          >
            {status}
          </Text>
        </View>
        {ready === false && (
          <Pressable
            onPress={() => {
              hapticRigid();
              onEnable();
            }}
            accessibilityRole="button"
            accessibilityLabel="Watch-Mitteilungen erlauben"
            style={[styles.watchEnable, { borderColor: colors.glassBorder }]}
          >
            <Text
              style={[styles.watchEnableText, { color: colors.foreground }]}
            >
              Erlauben
            </Text>
          </Pressable>
        )}
      </View>
      <View
        style={[styles.watchMetrics, { borderTopColor: colors.glassBorder }]}
      >
        <View style={styles.watchMetric}>
          <Feather name="navigation" size={14} color={colors.accent} />
          <Text
            style={[styles.watchMetricLabel, { color: colors.mutedForeground }]}
          >
            Richtung
          </Text>
          <Text style={[styles.watchMetricValue, { color: colors.foreground }]}>
            {direction ?? "—"}
          </Text>
        </View>
        <View style={styles.watchMetric}>
          <Feather name="map-pin" size={14} color={colors.accent} />
          <Text
            style={[styles.watchMetricLabel, { color: colors.mutedForeground }]}
          >
            Rest
          </Text>
          <Text style={[styles.watchMetricValue, { color: colors.foreground }]}>
            {remainingKm.toFixed(1)} km
          </Text>
        </View>
      </View>
      <Text style={[styles.watchHint, { color: colors.mutedForeground }]}>
        Nur Abbiegehinweise und SOS werden als native Mitteilungen auf die
        gekoppelte Watch gespiegelt. Regelmässige Status-Pushes mit Richtung
        oder Distanz sind deaktiviert.
      </Text>
    </Glass>
  );
}

function CompassCard({
  heading,
  sagaBearing,
  sagaName,
  available,
  direction,
  coordinates,
  place,
  altitude,
  title,
  unavailable,
  coordinatesLabel,
  placeLabel,
  altitudeLabel,
  altitudeUnit,
}: {
  heading: number | null;
  sagaBearing: number | null;
  sagaName: string;
  available: boolean | null;
  direction: string | null;
  coordinates: string | null;
  place: string | null;
  altitude: number | null;
  title: string;
  unavailable: string;
  coordinatesLabel: string;
  placeLabel: string;
  altitudeLabel: string;
  altitudeUnit: string;
}) {
  const colors = useColors();
  const ready = available === true && heading != null && direction != null;
  const northNeedleRotation = heading == null ? 0 : -heading;
  const sagaNeedleRotation =
    heading == null || sagaBearing == null
      ? 0
      : ((sagaBearing - heading + 540) % 360) - 180;
  const altitudeText =
    altitude == null
      ? "—"
      : `${Math.round(altitude).toLocaleString()} ${altitudeUnit}`;

  return (
    <View
      style={[styles.compassCard, { borderColor: "#8A5C34" }]}
      accessibilityLabel={
        ready
          ? `${title}: ${direction}, ${Math.round(heading!)}°, ${placeLabel} ${place ?? "—"}, ${coordinatesLabel} ${coordinates ?? "—"}, ${altitudeLabel} ${altitudeText}`
          : unavailable
      }
    >
      <Image
        source={require("../../assets/images/antique-compass-card-wood.jpg")}
        style={styles.compassCardWood}
        resizeMode="cover"
      />
      <View style={styles.compassCardShade} />
      <View style={styles.compassHeader}>
        {ready && (
          <Text style={[styles.compassDegrees, { color: COMPASS_GOLD }]}>
            {Math.round(heading!)}°
          </Text>
        )}
      </View>

      {ready ? (
        <View style={styles.compassBody}>
          <Text style={styles.compassTopValue}>{direction}</Text>
          <View style={styles.compassPhotoStage}>
            <Image
              source={require("../../assets/images/antique-saga-compass-full-wood.jpg")}
              style={styles.compassPhoto}
              resizeMode="contain"
            />
            <Text style={styles.photoNorth}>N</Text>
            <Text style={styles.photoEast}>E</Text>
            <Text style={styles.photoSouth}>S</Text>
            <Text style={styles.photoWest}>W</Text>

            <View
              style={[
                styles.needleLayer,
                { transform: [{ rotate: `${northNeedleRotation}deg` }] },
              ]}
            >
              <View style={styles.northNeedleTip} />
              <View style={styles.northNeedleShaft} />
              <View style={styles.northNeedleTail} />
            </View>

            {sagaBearing != null && (
              <View
                style={[
                  styles.needleLayer,
                  { transform: [{ rotate: `${sagaNeedleRotation}deg` }] },
                ]}
              >
                <View style={styles.sagaNeedleShaft} />
                <View style={styles.sagaNeedleIcon}>
                  <Image
                    source={require("../../assets/images/compass-saga-pointer.png")}
                    style={styles.sagaNeedleImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            )}

            <View style={styles.compassCenterOuter}>
              <View style={styles.compassCenterInner} />
            </View>
          </View>
          <View style={styles.compassReadout}>
            <Text style={styles.compassBottomValue}>{altitudeText}</Text>
            <View style={styles.compassLegend}>
              <View style={styles.compassLegendItem}>
                <View style={styles.northLegendMark} />
                <Text style={styles.compassLegendText}>N</Text>
              </View>
              {sagaName ? (
                <View style={[styles.compassLegendItem, { flex: 1 }]}>
                  <Image
                    source={require("../../assets/images/compass-saga-pointer.png")}
                    style={styles.compassSagaLegendIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.compassSagaName} numberOfLines={1}>
                    {sagaName}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : available === null ? (
        <View style={styles.compassUnavailableRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.compassHint, { color: COMPASS_GOLD }]}>…</Text>
        </View>
      ) : (
        <Text style={[styles.compassHint, { color: COMPASS_GOLD }]}>
          {unavailable}
        </Text>
      )}

      <View style={[styles.compassLocationData, { borderTopColor: "#704725" }]}>
        <View style={styles.compassLocationRow}>
          <Text style={[styles.compassDataLabel, { color: COMPASS_GOLD }]}>
            {placeLabel}
          </Text>
          <Text
            style={[styles.compassDataValue, { color: COMPASS_GOLD }]}
            numberOfLines={1}
          >
            {place ?? "—"}
          </Text>
        </View>
        <View style={styles.compassLocationRow}>
          <Text style={[styles.compassDataLabel, { color: COMPASS_GOLD }]}>
            {coordinatesLabel}
          </Text>
          <Text
            style={[styles.compassDataValue, { color: COMPASS_GOLD }]}
            numberOfLines={1}
          >
            {coordinates ?? "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  gpsTileDot: { width: 11, height: 11, borderRadius: 6, marginTop: 3 },
  gpsCard: { paddingHorizontal: 12, paddingVertical: 12 },
  gpsCardStatus: { flexDirection: "row", alignItems: "center", gap: 9 },
  gpsCardDot: { width: 11, height: 11, borderRadius: 6 },
  gpsCardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, flex: 1 },
  gpsValueList: { borderTopWidth: 1, marginTop: 13, paddingTop: 8 },
  gpsValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  gpsValueLabel: { fontFamily: fonts.body, fontSize: 12 },
  gpsValue: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    flexShrink: 1,
    textAlign: "right",
  },
  gpsCardHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  bannerText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13 },
  bannerHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  offlineBannerInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  offRouteBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  offRouteBannerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  offRouteBannerTitle: { fontFamily: fonts.bodyBold, fontSize: 13 },
  offRouteBannerHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  offRouteFollowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  offRouteFollowText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  routeChangeArea: { marginTop: 12 },
  routeChangePanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    gap: 9,
  },
  routeChangeTitle: { fontFamily: fonts.titleBold, fontSize: 18 },
  routeChangeHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  routeChangeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  routeChangeOptionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    flex: 1,
  },
  routeChangeError: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  bannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 10,
  },
  bannerAction: { fontFamily: fonts.bodyBold, fontSize: 13 },
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  eyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  title: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 2 },
  statBar: { flexDirection: "row", justifyContent: "space-between" },
  watchCardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  watchIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  watchTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  watchStatus: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  watchEnable: {
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  watchEnableText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  watchMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  watchMetric: { alignItems: "center", gap: 3, flex: 1 },
  watchMetricLabel: { fontFamily: fonts.body, fontSize: 11 },
  watchMetricValue: { fontFamily: fonts.monoBold, fontSize: 14, marginTop: 1 },
  watchHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
  },
  watchTilePulse: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    lineHeight: 12,
    marginTop: 2,
  },
  metric: { alignItems: "flex-start" },
  metricLabel: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1 },
  metricValRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    marginTop: 3,
  },
  metricVal: { fontFamily: fonts.monoBold, fontSize: 20 },
  metricUnit: { fontFamily: fonts.mono, fontSize: 11 },
  compassCard: {
    position: "relative",
    marginTop: 12,
    borderWidth: 2,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#351B10",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.42,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4,
  },
  compassCardWood: {
    ...StyleSheet.absoluteFill,
    opacity: 0.9,
  },
  compassCardShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(38,18,11,0.48)",
  },
  compassHeader: {
    position: "relative",
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  compassDegrees: { fontFamily: COMPASS_ANTIQUE_FONT, fontSize: 14 },
  compassBody: {
    position: "relative",
    zIndex: 1,
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  compassTopValue: {
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 30,
    lineHeight: 34,
    textAlign: "center",
  },
  compassPhotoStage: {
    position: "relative",
    width: "100%",
    maxWidth: 330,
    aspectRatio: 1,
    alignSelf: "center",
  },
  compassPhoto: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  photoNorth: {
    position: "absolute",
    left: "50%",
    top: "17.5%",
    marginLeft: -7,
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 17,
    textShadowColor: "rgba(42,22,9,0.9)",
    textShadowRadius: 1,
    textShadowOffset: { width: 0, height: 1 },
  },
  photoEast: {
    position: "absolute",
    right: "16%",
    top: "48%",
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 15,
    textShadowColor: "rgba(42,22,9,0.9)",
    textShadowRadius: 1,
    textShadowOffset: { width: 0, height: 1 },
  },
  photoSouth: {
    position: "absolute",
    left: "50%",
    top: "78%",
    marginLeft: -6,
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 15,
    textShadowColor: "rgba(42,22,9,0.9)",
    textShadowRadius: 1,
    textShadowOffset: { width: 0, height: 1 },
  },
  photoWest: {
    position: "absolute",
    left: "17%",
    top: "48%",
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 15,
    textShadowColor: "rgba(42,22,9,0.9)",
    textShadowRadius: 1,
    textShadowOffset: { width: 0, height: 1 },
  },
  needleLayer: {
    position: "absolute",
    left: "50%",
    top: "50.2%",
    marginLeft: -78,
    marginTop: -78,
    width: 156,
    height: 156,
    alignItems: "center",
    justifyContent: "center",
  },
  northNeedleTip: {
    position: "absolute",
    top: 13,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 17,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#B22A2E",
  },
  northNeedleShaft: {
    position: "absolute",
    top: 28,
    width: 4,
    height: 51,
    backgroundColor: "#B22A2E",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  northNeedleTail: {
    position: "absolute",
    top: 78,
    width: 4,
    height: 46,
    backgroundColor: "#E7D8B8",
    borderWidth: 1,
    borderColor: "#5C4938",
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  sagaNeedleShaft: {
    position: "absolute",
    top: 35,
    width: 3,
    height: 45,
    backgroundColor: "#D8A84E",
    shadowColor: "#6B4316",
    shadowOpacity: 0.7,
    shadowRadius: 3,
  },
  sagaNeedleIcon: {
    position: "absolute",
    top: 0,
    width: 23,
    height: 41,
    alignItems: "center",
    justifyContent: "center",
  },
  sagaNeedleImage: {
    width: "100%",
    height: "100%",
  },
  compassCenterOuter: {
    position: "absolute",
    left: "50%",
    top: "50.2%",
    marginLeft: -11,
    marginTop: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: "#6B4316",
    backgroundColor: "#D8A84E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2A1609",
    shadowOpacity: 0.6,
    shadowRadius: 3,
  },
  compassCenterInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2A1B11",
  },
  compassReadout: { width: "100%", alignItems: "center", gap: 8 },
  compassBottomValue: {
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 24,
  },
  compassLegend: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  compassLegendItem: {
    minWidth: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  northLegendMark: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#B22A2E",
  },
  compassLegendText: {
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 10,
  },
  compassSagaLegendIcon: {
    width: 12,
    height: 22,
  },
  compassSagaName: {
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 13,
    flexShrink: 1,
  },
  compassHint: {
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 13,
    lineHeight: 18,
  },
  compassUnavailableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  compassLocationData: {
    position: "relative",
    zIndex: 1,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
    gap: 7,
  },
  compassLocationRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  compassDataLabel: {
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 9,
    letterSpacing: 1,
  },
  compassDataValue: {
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 12,
    flexShrink: 1,
    textAlign: "right",
  },
  preparing: { alignItems: "center", paddingVertical: 50, gap: 16 },
  preparingText: { fontFamily: fonts.story, fontSize: 16 },
  poiRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  poiThumb: { width: 40, height: 40, borderRadius: 8 },
  poiCardImage: {
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 14,
    height: 220,
  },
  poiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  poiEyebrow: { fontFamily: fonts.mono, fontSize: 13, letterSpacing: 1.2 },
  poiTitle: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 2 },
  poiSummary: {
    fontFamily: fonts.story,
    fontSize: 18,
    marginTop: 8,
    lineHeight: 28,
  },
  poiModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16,24,26,0.7)",
    justifyContent: "center",
    padding: 16,
  },
  poiModalImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 12,
  },
  storyWrap: { marginTop: 24 },
  storyTileHeader: {
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  storyTileHeaderMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  storyTileHeaderText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  storyTileTitle: { fontFamily: fonts.bodyBold, fontSize: 14 },
  storyTileSubtitle: { fontFamily: fonts.mono, fontSize: 11, marginTop: 3 },
  chapterActions: { flexDirection: "row", gap: 8 },
  chapterHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  chapterMark: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  nowPlayingCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  nowPlayingTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  nowPlayingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
  },
  nowPlayingLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  nowPlayingTitle: { fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: 3 },
  nowPlayingText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  audioWaveform: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  audioWaveBar: { width: 3, minHeight: 5, borderRadius: 3 },
  playBtn: {
    ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  playText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  storyText: { fontFamily: fonts.story, fontSize: 20, lineHeight: 32 },
  narrationUnavailable: { fontFamily: fonts.body, fontSize: 13, marginTop: 8 },
  decisionWrap: { marginTop: 24 },
  conditionSection: { paddingTop: 8, paddingBottom: 20 },
  conditionTileContent: { paddingVertical: 8 },
  conditionDivider: { height: 1, marginVertical: 16 },
  conditionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  conditionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  conditionEmojiText: { fontSize: 18, lineHeight: 22 },
  conditionChipLabel: { fontFamily: fonts.body, fontSize: 13 },
  conditionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontFamily: fonts.body,
    fontSize: 13,
    minHeight: 72,
    textAlignVertical: "top",
    marginTop: 4,
  },
  conditionSuccess: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  conditionError: { fontFamily: fonts.body, fontSize: 12, marginTop: 8 },
  safetyFilterTile: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  safetyFilterHeader: {
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  safetyFilterHeaderMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  safetyFilterHeaderText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  safetyFilterTitle: { fontFamily: fonts.bodyBold, fontSize: 14 },
  safetyFilterCount: { fontFamily: fonts.mono, fontSize: 11, marginTop: 2 },
  safetyFilterBody: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  safetyFilterHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  safetyFilterGrid: { gap: 8, marginTop: 12 },
  safetyFilterOption: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  safetyFilterCode: {
    minWidth: 32,
    height: 26,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  safetyFilterCodeText: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    lineHeight: 14,
    textAlign: "center",
  },
  safetyFilterLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, flex: 1 },
  safetyFilterAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  safetyFilterAllText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  choiceFeedbackWrap: { marginTop: 16 },
  choiceFeedbackPanel: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  choiceFeedbackText: { fontFamily: fonts.bodyMedium, fontSize: 14, flex: 1 },
  decisionPanel: { ...GLAS_3D, borderWidth: 1, borderRadius: 16, padding: 18 },
  decisionLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2 },
  decisionQuestion: {
    fontFamily: fonts.titleBold,
    fontSize: 20,
    marginTop: 6,
    marginBottom: 14,
  },
  voiceHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  voiceHintText: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1 },
  optionBtn: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  optionLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21 },
  optionHint: { fontFamily: fonts.mono, fontSize: 11, marginTop: 5 },
  storyActionArea: { width: "100%", gap: 10 },
  photoRow: { alignItems: "stretch", marginTop: 20, gap: 8 },
  hikeActionButton: { width: "100%", minHeight: 56 },
  photoFab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  photoFabText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  photoStrip: { width: "100%", flexGrow: 0, maxHeight: 52 },
  photoStripContent: { gap: 6 },
  photoThumbWrap: { position: "relative", width: 48, height: 48 },
  photoThumb: { width: 48, height: 48, borderRadius: 8 },
  photoThumbBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  photoChallengeWrap: { marginTop: 24 },
  photoChallengePanel: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  photoChallengeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
  },
  photoChallengeTitel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  photoChallengeActions: { flexDirection: "row", gap: 10 },
  photoChallengeBtn: {
    ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  photoChallengeBtnText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  countdownBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  countdownFill: { height: 4, borderRadius: 2 },
  countdownNum: {
    fontFamily: fonts.monoBold,
    fontSize: 14,
    minWidth: 22,
    textAlign: "right",
  },
  sosBtn: {
    position: "absolute",
    right: 18,
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  sosText: {
    fontFamily: fonts.titleBlack,
    fontSize: 18,
    color: "#F5F3EC",
    letterSpacing: 1,
  },
  sosOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    zIndex: 50,
  },
  sosSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
  },
  sosHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  sosTitle: { fontFamily: fonts.titleBlack, fontSize: 26 },
  sosSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
    marginBottom: 18,
  },
  sosCall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sosCallTitle: { fontFamily: fonts.titleBold, fontSize: 18, color: "#F5F3EC" },
  sosCallSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(245,243,236,0.8)",
  },
  sosSecondary: {
    ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
  },
  sosSecondaryText: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  sosClose: { alignItems: "center", paddingVertical: 16 },
});
