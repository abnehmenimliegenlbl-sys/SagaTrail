import { Feather } from "@expo/vector-icons";
import {
  createNarration,
  getAerialways,
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
import type { Partner, Poi, RouteSurfacePoint, TrailConditionReport, WeatherReport, WikiSummary } from "@workspace/api-client-react";
import type { MapPoi } from "@/components/brand/swisstopoMapHtml";
import type { RecognitionJournalEntry } from "@/types";
import { getApiBaseUrl } from "../../lib/apiConfig";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { hapticDoublePulse, hapticHeavy, hapticMedium, hapticSuccess } from "@/lib/haptics";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Magnetometer, Pedometer } from "expo-sensors";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import Animated, { FadeIn, FadeInUp, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLAS_3D } from "@/constants/depth";
import type { HikingRoute } from "@/constants/routes";
import { Background } from "@/components/brand/Background";
import { Glass } from "@/components/brand/Glass";
import { KarteVollbild } from "@/components/brand/KarteVollbild";
import { LoadingBar } from "@/components/brand/LoadingBar";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { RouteMap } from "@/components/brand/RouteMap";
import { PeakPanorama } from "@/components/brand/PeakPanorama";
import { ObjectRecognition } from "@/components/brand/ObjectRecognition";
import { FeatureTileDeck } from "@/components/brand/FeatureTileDeck";
import { SparkMountain } from "@/components/brand/SparkMountain";
import { SwisstopoMap } from "@/components/brand/SwisstopoMap";
import { fonts } from "@/constants/typography";
import { useApp, useThemeModeSafe } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useDownloads } from "@/contexts/DownloadContext";
import { useColors } from "@/hooks/useColors";
import { useHikeStrings } from "@/lib/i18n/screens/hike";
import { useObjectRecognitionStrings } from "@/lib/i18n/objectRecognition";
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  subscribeToBackgroundLocation,
} from "@/lib/backgroundLocation";
import { bboxAroundGeometry, bearingDeg, compassIndex, decodePolyline6, distanzZuSegmentKm, fortschrittAufRoute, haversineKm } from "@/lib/geo";
import { computeRouteWaypoints, type RouteWaypoint } from "@/lib/routeWaypoints";
import {
  effectiveStoryLanguage,
  formatSpokenDistance,
  resolveLang,
  STORY_PACKS,
  trimForNarration,
  type Lang,
  type WetterKlasse,
} from "@/lib/storyContent";
import { blobToTempFileUri, getOfflineAudioUri } from "@/lib/narrationAudio";
import { getTurnAudio } from "@/lib/turnAudio";
import { getOfflinePoiDetail, getOfflinePoiStory } from "@/lib/offlinePois";
import * as FileSystem from "expo-file-system/legacy";
import { detectNavigationCues, NavigationCue } from "@/lib/navigationCues";
import {
  buildTerrainSections,
  limitTerrainSectionsForSpeech,
  type TerrainProfilePoint,
} from "@/lib/terrainCues";
import {
  bereiteAbbiegeMitteilungenVor,
  sendeAbbiegeMitteilung,
  sendePoiMitteilung,
} from "@/lib/turnNotifications";
import { useVoiceDecision } from "@/lib/useVoiceDecision";
import { poiDisplayName, isPoiNameSpecific, POI_APPROACH_KINDS } from "@/lib/poiDisplay";
import { erkenneGipfel } from "@/lib/panorama";
import * as ImagePicker from "expo-image-picker";
import * as StoreReview from "expo-store-review";
import { useAuth } from "@clerk/expo";
import { uploadWaypointPhoto, waypointPhotoUrl } from "@/lib/waypointPhotoUpload";
import { HikeSession, LatLng, StoryChapter } from "@/types";

const WEB_TOP = 67;
const COMPASS_GOLD = "#D8A84E";
const COMPASS_ANTIQUE_FONT = Platform.select({
  web: "Georgia, Times New Roman, serif",
  ios: "Georgia",
  android: "serif",
  default: "serif",
});

// Lokalisierte Wochentagnamen für die Partner-Öffnungszeiten-Anzeige.
const PARTNER_WOCHENTAGE: Record<string, Record<string, string>> = {
  de:  { montag: "Montag", dienstag: "Dienstag", mittwoch: "Mittwoch", donnerstag: "Donnerstag", freitag: "Freitag", samstag: "Samstag", sonntag: "Sonntag" },
  gsw: { montag: "Mäntig", dienstag: "Zischtig", mittwoch: "Mittwuch", donnerstag: "Dunschtig", freitag: "Friitig", samstag: "Samschtig", sonntag: "Sunntig" },
  en:  { montag: "Monday", dienstag: "Tuesday", mittwoch: "Wednesday", donnerstag: "Thursday", freitag: "Friday", samstag: "Saturday", sonntag: "Sunday" },
  fr:  { montag: "lundi", dienstag: "mardi", mittwoch: "mercredi", donnerstag: "jeudi", freitag: "vendredi", samstag: "samedi", sonntag: "dimanche" },
  it:  { montag: "lunedì", dienstag: "martedì", mittwoch: "mercoledì", donnerstag: "giovedì", freitag: "venerdì", samstag: "sabato", sonntag: "domenica" },
  es:  { montag: "lunes", dienstag: "martes", mittwoch: "miércoles", donnerstag: "jueves", freitag: "viernes", samstag: "sábado", sonntag: "domingo" },
  pt:  { montag: "segunda", dienstag: "terça", mittwoch: "quarta", donnerstag: "quinta", freitag: "sexta", samstag: "sábado", sonntag: "domingo" },
  zh:  { montag: "周一", dienstag: "周二", mittwoch: "周三", donnerstag: "周四", freitag: "周五", samstag: "周六", sonntag: "周日" },
  ru:  { montag: "понедельник", dienstag: "вторник", mittwoch: "среда", donnerstag: "четверг", freitag: "пятница", samstag: "суббота", sonntag: "воскресенье" },
};

type HikeOeffnungsStrings = {
  partnerSchliesstUm: string; partnerOeffnetUm: string; partnerOeffnetAm: string;
  partnerHeute: string; partnerMorgen: string; partnerUhr: string;
};

function formatPartnerOeffnungsInfo(
  partner: { istOffen?: boolean | null; schliesstUm?: string | null; oeffnetAmTag?: string | null; oeffnetUm?: string | null },
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
    if (tag === "heute")  return `${t.partnerOeffnetUm} ${t.partnerHeute} ${uhr}${uhrSuffix}`;
    if (tag === "morgen") return `${t.partnerOeffnetUm} ${t.partnerMorgen} ${uhr}${uhrSuffix}`;
    const tagName =
      PARTNER_WOCHENTAGE[lang]?.[tag] ??
      PARTNER_WOCHENTAGE["de"]?.[tag] ??
      tag;
    return `${t.partnerOeffnetAm} ${tagName} ${uhr}${uhrSuffix}`;
  }
  return null;
}

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];
const PARTNER_KATEGORIE: Record<string, { icon: FeatherIconName; label: string }> = {
  restaurant:    { icon: "coffee",       label: "Restaurant" },
  cafe:          { icon: "coffee",       label: "Café" },
  bar:           { icon: "music",        label: "Bar" },
  hotel:         { icon: "home",         label: "Hotel" },
  uebernachtung: { icon: "home",         label: "Hotel" },
  shop:          { icon: "shopping-bag", label: "Shop" },
};
const PARTNER_KAT_DEFAULT: { icon: FeatherIconName; label: string } = { icon: "coffee", label: "Partnerbetrieb" };

/** Minimaler Zeitabstand zwischen zwei geloggten Track-Punkten (ms). */
const TRACK_LOG_INTERVAL_MS = 8000;

/** Abstand in km ab dem eine Warnung "vom Weg abgekommen" ausgeloest wird. */
const OFF_ROUTE_THRESHOLD_KM = 0.08;
/** Abstand in km ab dem die Warnung automatisch wieder erlischt. */
const OFF_ROUTE_RECOVER_KM = 0.04;
/** Anzahl aufeinanderfolgender GPS-Fixes, die ueberschritten sein muessen, bevor gewarnt wird. */
const OFF_ROUTE_CONFIRM_FIXES = 3;
/** Valhalla-Fussweg-Routing (FOSSGIS, kein API-Key noetig). */
const VALHALLA_URL = "https://valhalla1.openstreetmap.de/route";
/** RDP-Epsilon in Grad (≈ 8 m bei Schweizer Breitengraden). */
const RDP_EPSILON = 0.00007;
/** Mindestanzahl Punkte damit der Live-Track statt der Routen-Geometrie verwendet wird.
 *  Bewusst niedrig: auch bei vorzeitigem Abbruch oder Routenaenderung soll die
 *  Share-Karte die TATSAECHLICH gelaufene Strecke zeigen, nicht die geplante. */
const MIN_TRACK_POINTS = 2;

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
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/** Ramer-Douglas-Peucker — iterativ um Stack-Overflow bei langen Tracks zu vermeiden. */
function rdpThin(points: [number, number][], epsilon: number): [number, number][] {
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
      if (d > maxDist) { maxDist = d; maxIdx = i; }
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
    buf[off] = v & 0xff; buf[off + 1] = (v >> 8) & 0xff;
  };
  const u32 = (off: number, v: number) => {
    buf[off] = v & 0xff; buf[off + 1] = (v >> 8) & 0xff;
    buf[off + 2] = (v >> 16) & 0xff; buf[off + 3] = (v >> 24) & 0xff;
  };
  buf.set([82, 73, 70, 70]); u32(4, 36 + dataSize); buf.set([87, 65, 86, 69], 8);
  buf.set([102, 109, 116, 32], 12); u32(16, 16);
  u16(20, 1); u16(22, 1); u32(24, sampleRate); u32(28, sampleRate);
  u16(32, 1); u16(34, 8);
  buf.set([100, 97, 116, 97], 36); u32(40, dataSize);
  // 80-Hz-Sinus: Period = 100 Samples bei 8 kHz.
  // Amplitude 12 (von max. 127) → mit volume:0.015 ergibt das < 0.1 %
  // des Vollausschlags — absolut unhoerbar, aber der Bluetooth-SBC-Encoder
  // sieht nicht-triviale PCM-Werte und haelt den A2DP-Stream aktiv.
  const freq = 80; // Hz — SBC-Codec-sicher (10 Hz wurde von manchen Encodern gefiltert)
  const amp = 12;  // 0..127 — bei volume:0.015 absolut unhoerbar, aber nicht-stille PCM-Werte
  for (let i = 0; i < numSamples; i++) {
    buf[44 + i] = 128 + Math.round(amp * Math.sin(2 * Math.PI * freq * i / sampleRate));
  }
  let s = '';
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(buf).toString('base64');
}

type LocState = "idle" | "granted" | "denied";

function smoothCompassHeading(previous: number | null, next: number, factor = 0.2): number {
  if (previous == null) return next;
  // Den kürzesten Weg über den 0°/360°-Übergang nehmen, damit die Anzeige
  // nicht einmal quer über das Zifferblatt springt.
  const delta = ((next - previous + 540) % 360) - 180;
  return (previous + delta * factor + 360) % 360;
}

export default function LiveHike() {
  const colors = useColors();
  const themeMode = useThemeModeSafe();
  // POI-Infokacheln liegen ueber duesteren Karten/Bildern — im Hellmodus
  // fast deckendes Weiss statt Milchglas, sonst wirken sie zu dunkel.
  const poiOverlay = themeMode === "hell" ? "rgba(255,255,255,0.94)" : undefined;
  const t = useHikeStrings();
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
    isResume && activeHike && activeHike.sagaId === id ? activeHike.chapterIndex : null,
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
    isResume && activeHike && activeHike.sagaId === id ? (activeHike.route ?? null) : null,
  );
  const { getSaga, getRoute, getRouteBySaga, loadCantonRoutes } = useCatalog();
  const { resolveStory, loadOfflineTiles, loadOfflinePois, isDownloaded } = useDownloads();

  const saga = getSaga(id);
  // Die konkret gewaehlte Route (mit Wegverlauf) hat Vorrang; nur wenn keine
  // Route-Id durchgereicht wurde (z. B. Start aus der Sammlung), wird ueber die
  // Sage die naechste bekannte Route gesucht. Als letzter Rueckhalt dient die
  // im unterbrochenen Wanderstand mitgespeicherte Route.
  const route = getRoute(routeId) ?? getRouteBySaga(id) ?? resumeRouteRef.current ?? undefined;

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

  // Kennwerte der Route (mit sinnvollen Rueckfallwerten)
  const totalKm = route?.distanceKm ?? 6.4;
  const ascentM = route?.ascentM ?? 480;
  const totalMin = route?.minutes ?? 165;
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
  const [awaitingDecision, setAwaitingDecision] = useState(false);
  /** Ref-Spiegel fuer awaitingDecision — erlaubt Zugriff aus asynchronen
   *  Audio-Callbacks (speak/didJustFinish, Meilenstein-Fetch) ohne Closure-
   *  Veraltung. Wird unmittelbar nach dem useState-Setter auf dem Render-Pfad
   *  gesetzt, sodass er immer den aktuellen Wert traegt. */
  const awaitingDecisionRef = useRef(false);
  awaitingDecisionRef.current = awaitingDecision;
  const [isOffline, setIsOffline] = useState<boolean>(false);
  /** GPS-Position zum Zeitpunkt der Off-Route-Erkennung — treibt die Neuberechnung. */
  const [offRoutePos, setOffRoutePos] = useState<LatLng | null>(null);
  /** Neuberechnete Alternativroute von Valhalla (gestrichelte Linie auf der Karte). */
  const [recalcGeom, setRecalcGeom] = useState<number[][] | null>(null);
  /** true waehrend die Valhalla-Anfrage laeuft. */
  const [isRecalculating, setIsRecalculating] = useState(false);
  /** true wenn Valhalla nicht erreichbar war. */
  const [recalcFailed, setRecalcFailed] = useState(false);
  /** true wenn der Nutzer "Dieser Route folgen" getippt hat. */
  const [followingRecalc, setFollowingRecalc] = useState(false);
  /** Anteil (0..1) der Originalroute, an dem die Neuberechnung wieder einmuendet. */
  const [recalcRejoinFraction, setRecalcRejoinFraction] = useState<number | null>(null);
  // Einmalig true sobald der User den Streckenstart passiert hat —
  // verhindert, dass das "Zum Start laufen"-Banner nach dem Passieren
  // wieder auftaucht (User ist dann einfach weiter von geometry[0] weg).
  const [startReached, setStartReached] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
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
    const dest = geom[destIdx];
    setIsRecalculating(true);
    setRecalcFailed(false);
    setRecalcGeom(null);
    setRecalcRejoinFraction(null);
    setFollowingRecalc(false);
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(VALHALLA_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locations: [
              { lon: offRoutePos.lng, lat: offRoutePos.lat },
              { lon: dest[1], lat: dest[0] },
            ],
            costing: "pedestrian",
            shape_format: "polyline6",
          }),
          signal: controller.signal,
        });
        const data = await res.json() as { trip?: { legs?: { shape?: string }[] } };
        const shape = data?.trip?.legs?.[0]?.shape;
        if (shape) {
          setRecalcGeom(decodePolyline6(shape));
          // Merken, wo die Alternativroute wieder auf die Originalroute trifft —
          // noetig, um Restkilometer/Restzeit waehrend der Umleitung zu berechnen.
          setRecalcRejoinFraction(geom.length > 1 ? destIdx / (geom.length - 1) : null);
        } else {
          setRecalcFailed(true);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setRecalcFailed(true);
        }
      } finally {
        setIsRecalculating(false);
      }
    })();
    return () => controller.abort();
  }, [offRoutePos]);
  const [speaking, setSpeaking] = useState(false);
  const [locState, setLocState] = useState<LocState>("idle");
  const [sosOpen, setSosOpen] = useState(false);
  const [showConditionForm, setShowConditionForm] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState<TrailConditionReport["condition"] | null>(null);
  const [conditionNote, setConditionNote] = useState("");
  const [conditionSubmitting, setConditionSubmitting] = useState(false);
  const [conditionSubmitResult, setConditionSubmitResult] = useState<"ok" | "ratelimit" | "error" | null>(null);
  const { refetch: refetchConditions } = useGetRouteConditions(id ?? "");
  const [choiceFeedback, setChoiceFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rollen in einer Gruppenwanderung: die Leitung sendet Kapitel- und
  // Entscheidungs-Ereignisse, Mitglieder folgen ihnen und entscheiden nicht
  // selbst.
  const inGruppe = !!groupSession;
  const istGruppenleitung = groupSession?.isLeader ?? false;
  const folgtGruppenleitung = inGruppe && !istGruppenleitung;
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);
  const [distance, setDistance] = useState(0);
  const [steps, setSteps] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [livePos, setLivePos] = useState<LatLng | null>(null);
  const [livePosAccuracy, setLivePosAccuracy] = useState<number | null>(null);
  const [liveAltitude, setLiveAltitude] = useState<number | null>(null);
  const [livePlace, setLivePlace] = useState<string | null>(null);
  // Tickt regelmässig weiter, damit ein ausbleibendes GPS-Signal auch ohne
  // neuen Fix sichtbar wird und Fortschritt/Navigationslogik pausieren können.
  const [locationNow, setLocationNow] = useState(() => Date.now());
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [compassAvailable, setCompassAvailable] = useState<boolean | null>(null);
  const [terrainProfile, setTerrainProfile] = useState<TerrainProfilePoint[] | null>(null);
  const [finished, setFinished] = useState(false);
  const [offlineTiles, setOfflineTiles] = useState<Record<string, string> | null>(null);
  const [aerialways, setAerialways] = useState<
    { id: string; geometry: number[][] }[] | null
  >(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [liveRecognitionPois, setLiveRecognitionPois] = useState<Poi[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [waterSources, setWaterSources] = useState<MapPoi[]>([]);
  const [parkingSpots, setParkingSpots] = useState<MapPoi[]>([]);
  const [routeWaypoints, setRouteWaypoints] = useState<RouteWaypoint[]>([]);
  const [reachedWaypointIds, setReachedWaypointIds] = useState<ReadonlySet<string>>(new Set());
  const waypointAnnouncedRef = useRef<Set<string>>(new Set());
  const announcedPremiumPartnerIdsRef = useRef<Set<string>>(new Set());
  /** Partner mit laufender Anpreisungs-Anfrage — verhindert Doppelrequests,
   * ohne einen fehlgeschlagenen Aufruf dauerhaft als erledigt zu markieren. */
  const announcingPremiumPartnerIdsRef = useRef<Set<string>>(new Set());
  const [nearbyPoi, setNearbyPoi] = useState<Poi | null>(null);
  const nearbyPoiDistanceRef = useRef<{
    id: string;
    distanceKm: number;
    increasingReadings: number;
  } | null>(null);
  // undefined = noch am Laden, null = geladen aber nichts gefunden, WikiSummary = fertig
  const [nearbyPoiWiki, setNearbyPoiWiki] = useState<WikiSummary | null | undefined>(undefined);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  // undefined = noch am Laden, null = geladen aber nichts gefunden, WikiSummary = fertig
  const [selectedPoiWiki, setSelectedPoiWiki] = useState<WikiSummary | null | undefined>(undefined);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerTranslation, setPartnerTranslation] = useState<{ beschreibung: string | null; angebot: string | null } | null>(null);
  const [karteVollbild, setKarteVollbild] = useState(false);
  const [karteCloseSignal, setKarteCloseSignal] = useState(0);
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
  const visitedPoisRef = useRef<Map<string, { id: string; name: string; extract?: string; photoUrl?: string }>>(new Map());
  // KI-Kontext fuer die "Entdeckt"-Karte, wenn der POI keinen
  // Wikipedia-Auszug hat (wird im Erzaehl-Effekt mitbefuellt).
  const [nearbyPoiKontext, setNearbyPoiKontext] = useState<string | null>(null);
  const [narrationUnavailable, setNarrationUnavailable] = useState(false);
  // Feature: Foto-Challenge + Waypoint-Fotos
  const [hikePhotos, setHikePhotos] = useState<string[]>([]);
  const [photoObjectPaths, setPhotoObjectPaths] = useState<string[]>([]);
  const [recognitionEntries, setRecognitionEntries] = useState<RecognitionJournalEntry[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadFeedback, setPhotoUploadFeedback] = useState<"ok" | "error" | null>(null);
  const [showPhotoChallenge, setShowPhotoChallenge] = useState(false);
  const photoChallengeShownRef = useRef(false);
  const sagaArrivalSpokenRef   = useRef(false);
  const [rawSurfacePoints, setRawSurfacePoints] = useState<RouteSurfacePoint[]>([]);
  const notifiedSurfaceFractionsRef = useRef<Set<number>>(new Set());
  const notifiedMilestonesRef = useRef<Set<number>>(new Set());
  // Feature: Entscheidungs-Countdown
  const [decisionCountdown, setDecisionCountdown] = useState<number | null>(null);
  // Live-Wetter am Wanderungsstart — wird einmalig geladen, sobald Route-Koordinaten bekannt sind.
  const [hikeWeather, setHikeWeather] = useState<WeatherReport | null>(null);

  const addRecognitionEntry = useCallback((entry: RecognitionJournalEntry) => {
    setRecognitionEntries((current) => {
      if (current.some((existing) => existing.id === entry.id)) return current;
      return [...current, entry];
    });
  }, []);

  const decisionsRef = useRef<StoryChapter[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const lastFixRef = useRef<LatLng | null>(null);
  /** Vorherige GPS-Position vor dem letzten signifikanten Schritt — fuer Himmelsrichtungsberechnung zum POI. */
  const prevLivePosRef = useRef<LatLng | null>(null);
  /** Aufgezeichneter GPS-Track: [lat, lng]-Paare im zeitlichen Abstand >= TRACK_LOG_INTERVAL_MS */
  const posLogRef = useRef<[number, number][]>([]);
  const lastTrackLogTimeRef = useRef<number>(0);
  /** Zeitpunkt des letzten akzeptierten GPS-Fixes fuer die Watcher-Wiederherstellung. */
  const lastLocationAtRef = useRef<number>(0);
  const compassHeadingRef = useRef<number | null>(null);
  const livePlaceLookupRef = useRef<{ lat: number; lng: number; requestedAt: number } | null>(null);
  const livePlaceLookupGenerationRef = useRef(0);
  const liveRecognitionPoiLookupRef = useRef<{ lat: number; lng: number; requestedAt: number } | null>(null);
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
    locationNow - lastLocationAtRef.current <= 45_000;
  const lastNarratedRef = useRef<number>(-1);
  /** Verhindert, dass setAwaitingDecision(true) mehrfach fuer denselben
   *  Kapitel-Index aufgerufen wird, wenn chapters-Mutationen (Group-Sync,
   *  async Enrichment) den Kapitel-Effekt erneut ausloesen. */
  const lastDecisionTriggeredRef = useRef<number>(-1);
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
  /** Terrain-Abschnitte werden pro Wanderung jeweils nur einmal angesagt. */
  const terrainStartedRef = useRef<Set<string>>(new Set());
  const terrainProgressRef = useRef<Set<string>>(new Set());
  const terrainEndedRef = useRef<Set<string>>(new Set());
  const narrationSoundRef = useRef<Audio.Sound | null>(null);
  const keepaliveSoundRef = useRef<Audio.Sound | null>(null);
  // Generationszaehler gegen ueberlappende Sprecher: jeder speak()-Aufruf
  // erhoeht ihn; nach jedem await prueft der Aufruf, ob er noch die aktuelle
  // Generation ist. Ein schneller Doppel-Tipp auf "Wiederholen" startet sonst
  // zwei parallele KI-Anfragen, die BEIDE abspielen (die erste hatte beim
  // stopNarration() der zweiten noch keinen Sound zum Stoppen).
  const narrationGenRef = useRef(0);
  // Warteschlange fuer Sprachausgaben: POI, Navigation, Wegoberflaech,
  // Meilenstein etc. unterbrechen keine laufende Erzaehlung, sondern reihen
  // sich ein und spielen ab, sobald das aktuelle Audio zu Ende ist.
  const narrationQueueRef = useRef<Array<{ text: string; onFinished?: () => void; useOpenAI?: boolean; preFetchedUri?: string }>>([]);
  // Vorgeladene OpenAI-URI fuer den Entscheidungs-Ack ("Ich verstehe.").
  // Wird beim Hike-Start im Hintergrund erzeugt, damit bei der Wahl zero
  // Netzwerk-Latenz anfaellt und das OpenAI-Audio sofort ertönt.
  const ackAudioUriRef = useRef<string | null>(null);

  // OSM-Relation-ID aus Route-ID extrahieren (Format: "osm-NNNN")
  const osmId = route?.id?.startsWith("osm-") ? parseInt(route.id.slice(4), 10) : null;

  // Wegoberflaechenkategorie normalisieren (OSM-surface-Tag → 5 Klassen)
  function normalizeSurface(s: string): string {
    const v = s.toLowerCase();
    if (/^(asphalt|paved|concrete|paving_stones|cobblestone|sett)/.test(v)) return "asphalt";
    if (/^(gravel|compacted|fine_gravel|pebblestone|crushed_limestone)/.test(v)) return "kies";
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
      .then((r) => { if (!cancelled) setHikeWeather(r); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [route?.coordinates?.lat, route?.coordinates?.lng]);

  // Höhenprofil einmalig pro Route laden. Die Profilpunkte werden nicht nur
  // gezeichnet: terrainCues.ts verdichtet sie für die gesprochenen
  // Aufstiegs-/Gefällehinweise und die Sicherheitswarnung ab 30 Prozent.
  useEffect(() => {
    const geometry = route?.geometry;
    terrainStartedRef.current.clear();
    terrainProgressRef.current.clear();
    terrainEndedRef.current.clear();
    if (!geometry || geometry.length < 2) {
      setTerrainProfile(null);
      return;
    }
    let cancelled = false;
    setTerrainProfile(null);
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
        if (!cancelled && Array.isArray(data.profile)) setTerrainProfile(data.profile);
      })
      .catch(() => {
        // Ohne Profil bleibt die Wanderung unverändert nutzbar; es gibt dann
        // lediglich keine Terrain-Ansagen.
      });
    return () => {
      cancelled = true;
    };
  }, [route?.id, route?.geometry]);

  // Wegoberflaechenpunkte einmalig laden, sobald die OSM-Relation-ID bekannt ist.
  // Schlaegt die Anfrage fehl, bleibt rawSurfacePoints leer — kein Fehlerfall.
  useEffect(() => {
    if (!osmId) return;
    let cancelled = false;
    getRouteSurfaces({ osmId })
      .then((r) => { if (!cancelled) setRawSurfacePoints(r.points); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [osmId]);

  // Wegoberflaechenpunkte → fraktionsbasierte Abschnitte (0–1) entlang der Route.
  // Dedupliziert konsekutive gleiche Kategorien, filtert Startbereich heraus.
  const surfacePoints = useMemo(() => {
    if (!route?.geometry || route.geometry.length < 2 || rawSurfacePoints.length === 0) return [];
    return rawSurfacePoints
      .map((p) => {
        const match = fortschrittAufRoute({ lat: p.lat, lng: p.lng }, route.geometry!);
        if (!match || match.distKm > 0.5) return null;
        return { fraction: match.fraction, surface: normalizeSurface(p.surface) };
      })
      .filter((x): x is { fraction: number; surface: string } => x !== null)
      .sort((a, b) => a.fraction - b.fraction)
      .filter((p, i, arr) => i === 0 || p.surface !== arr[i - 1].surface);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSurfacePoints, route?.geometry]);

  // Begruessung (Wetter + Solo-Name + Tageszeit + Routen-Einleitung),
  // die dem ersten Kapitel vorangestellt wird.
  // gsw → de: OpenAI TTS kann kein Schweizerdeutsch; der Begrüssungstext
  // bleibt deshalb immer Hochdeutsch — nur die Sage selbst ist Mundart.
  const greetingPrefix = useMemo(() => {
    const greetingLang = storyLanguage === "gsw" ? "de" : storyLanguage;
    const pack = STORY_PACKS[resolveLang(greetingLang)];
    const wetterSatz = hikeWeather ? pack.weatherPhrase(classifyWetter(hikeWeather)) : "";
    const tod = pack.timeOfDayGreeting(timeOfDay);
    const personal = !inGruppe && profile?.name?.trim()
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
    const mainSurfaces = [...new Set(surfacePoints.map((sp) => sp.surface))].slice(0, 2);
    const poiNamesList = pois
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
  }, [storyLanguage, timeOfDay, hikeWeather, surfacePoints, pois, totalKm, totalMin, sac, ascentM, route, inGruppe]);

  // Audiosession so konfigurieren, dass die Sprachausgabe auch bei
  // aktiviertem Stummschalter (iOS) hoerbar ist.
  // staysActiveInBackground: true ist die eigentliche Voraussetzung dafuer,
  // dass die KI-Erzaehlung via expo-av weiterlaeuft, wenn die App in den
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
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: false,
    }).catch(() => {});
  }, []);

  // Stiller Audio-Keepalive — haelt die iOS-Audiosession zwischen zwei Kapiteln
  // aktiv. Ohne laufendes Audio suspendiert iOS den JS-Thread, selbst wenn
  // staysActiveInBackground:true gesetzt ist; der naechste GPS-Event aus dem
  // Background-Task weckt den Thread dann nicht zuverlaessig genug, um das
  // naechste Kapitel zu starten. Ein unhoerabarer (volume:0) WAV-Loop
  // signalisiert iOS, dass die App Audio "spielt", und haelt den Thread wach.
  // Wird gestoppt, sobald die Wanderung endet oder die Komponente ausgehaengt.
  useEffect(() => {
    // Keepalive startet sofort beim Mount — kein preparing-Gate mehr.
    // Grund: zwischen Screen-Oeffnen und Story-Loading (mehrere Sekunden)
    // laeuft kein Audio; iOS kann den JS-Thread in dieser Zeit suspendieren
    // und sperrt den Bildschirm den Benutzer, bevor der Keepalive startet.
    if (Platform.OS === "web") return;
    let mounted = true;
    let sound: Audio.Sound | null = null;
    (async () => {
      try {
        const base64 = buildKeepaliveWavBase64();
        const uri = (FileSystem.cacheDirectory ?? "") + "sagatrail_keepalive.wav";
        await FileSystem.writeAsStringAsync(uri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (!mounted) return;
        const result = await Audio.Sound.createAsync(
          { uri },
          // volume: 0.015 — 80-Hz-Ton bei ~0.1 % Amplitude (absolut unhoerbar).
          // Hoeher als zuvor (0.008) damit SBC-Encoder des Auto-Radios den
          // Datenstrom zuverlaessig als "aktiv" einordnet und nicht abbricht.
          { shouldPlay: true, isLooping: true, volume: 0.015 }
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
  }, []);

  // Story vorbereiten: Offline-First (lokal -> Server -> Seed) ueber resolveStory.
  // resolveStory wendet effectiveStoryLanguage intern selbst an — hier wird
  // bewusst das UNveraenderte Profil uebergeben, storyProfile dient nur dazu,
  // die tatsaechlich verwendete Sprache lokal (z. B. fuer weaveNavigationCues)
  // zu kennen.
  useEffect(() => {
    if (!saga || !profile) return;
    let cancelled = false;
    setPreparing(true);
    (async () => {
      const { chapters: story } = await resolveStory(saga, profile, premium);
      if (cancelled) return;
      setChapters(story);
      decisionsRef.current = story;
      const resumeAt = resumeIndexRef.current;
      resumeIndexRef.current = null;
      if (resumeAt != null && resumeAt > 0 && resumeAt < story.length) {
        setCurrentIndex(resumeAt);
      }
      setPreparing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [saga, profile, premium, storyLanguage, resolveStory, route]);

  // Die einmalige kostenlose Wanderung wird genau dann verbraucht, wenn ein
  // nicht-Premium-Nutzer hier tatsaechlich eine Wanderung startet (Story ist
  // bereit). markFreeHikeUsed ist selbst ein No-op, falls bereits verbraucht.
  useEffect(() => {
    if (preparing || premium || freeHikeUsed) return;
    markFreeHikeUsed().catch(() => {
      // Best effort — schlaegt der Serveraufruf fehl, bleibt die Wanderung
      // trotzdem nutzbar; ein erneuter Versuch erfolgt bei der naechsten
      // Wanderung.
    });
  }, [preparing, premium, freeHikeUsed, markFreeHikeUsed]);

  // Meldet den Wander-Status an eine aktive Gruppensitzung, damit andere
  // Mitglieder live sehen, wenn jemand die gemeinsame Wanderung startet.
  useEffect(() => {
    if (!groupSession || !saga || preparing) return;
    setGroupActivity({
      type: "wandert",
      sagaTitle: saga.title,
      startedAt: Date.now(),
      sagaId: saga.id,
      ...(route ? { routeId: route.id } : {}),
    });
    // Die Leitung kuendigt den Start der gemeinsamen Wanderung an, damit
    // Mitglieder direkt auf dieselbe Route einsteigen koennen.
    if (groupSession.isLeader && route) {
      sendGroupHikeEvent({
        kind: "start",
        sagaId: saga.id,
        routeId: route.id,
        routeName: route.name,
      });
    }
    return () => {
      setGroupActivity({ type: "idle" });
    };
  }, [groupSession?.code, groupSession?.isLeader, saga, route, preparing, setGroupActivity, sendGroupHikeEvent]);

  // Leitung: Kapitelwechsel an die Gruppe senden, damit Mitglieder synchron
  // dieselbe Stelle der Sage hoeren. Aendert sich die Mitgliederliste
  // (spaeter Beitritt), wird der aktuelle Stand erneut gesendet, damit auch
  // Nachzuegler sofort auf dem richtigen Kapitel stehen.
  const mitgliederAnzahl = groupSession?.members.length ?? 0;
  useEffect(() => {
    if (!istGruppenleitung || preparing || chapters.length === 0) return;
    sendGroupHikeEvent({ kind: "chapter", index: currentIndex });
  }, [istGruppenleitung, preparing, chapters.length, currentIndex, mitgliederAnzahl, sendGroupHikeEvent]);

  // Mitglied: Ereignissen der Gruppenleitung folgen (Kapitel und
  // Entscheidungen). Entscheidungen trifft ausschliesslich die Leitung.
  // Jedes Ereignis wird genau einmal verarbeitet (receivedAt als Marke).
  const verarbeitetesEreignisRef = useRef<number>(0);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
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
      const gewaehlt =
        chapters[event.chapterIndex]?.decision?.options[event.optionIndex]?.label;
      if (!gewaehlt) return;
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      setChoiceFeedback(t.leaderChose(gewaehlt));
      feedbackTimerRef.current = setTimeout(() => setChoiceFeedback(null), 3000);
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
        setAwaitingDecision(false);
      }
    }
  }, [folgtGruppenleitung, groupHikeEvent, preparing, chapters, t]);

  // Seilbahnen/Standseilbahnen im Kartenausschnitt laden (typisches alpines
  // Wander-Verkehrsmittel) — nur mit Kartenmittelpunkt sinnvoll, best effort.
  useEffect(() => {
    // mapCenter ist ein einmalig beim Mount gesetzter Snapshot. Falls die Route
    // beim Mount noch nicht im Cache war (Direktstart), ist mapCenter null —
    // dann auf die nachgeladen Routen-/Sagen-Koordinaten zurueckfallen.
    const center = route?.coordinates ?? saga?.coordinates ?? mapCenter;
    if (!center) return;
    let cancelled = false;
    const bbox = bboxAroundGeometry(route?.geometry, center);
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
  }, [route?.id, route?.geometry, route?.coordinates, saga?.coordinates, mapCenter?.lat, mapCenter?.lng]);

  // Historische/touristische Orte im Kartenausschnitt laden, live mit
  // Wikipedia-Zusammenfassungen angereichert — best effort, kein Blocker.
  useEffect(() => {
    const center = route?.coordinates ?? saga?.coordinates ?? mapCenter;
    if (!center) return;
    let cancelled = false;
    // Enger Rand (0.5 km statt 3 km): behalten werden ohnehin nur POIs im
    // 300-m-Korridor, und eine grosse Box macht die Overpass-Abfrage in
    // dichten Staedten (z. B. Basel) so teuer, dass sie in ein Timeout laeuft.
    // 2 km Rand damit alpine Gipfel/Pässe auch dann gefetcht werden wenn sie
    // etwas abseits der Route liegen.
    const bbox = bboxAroundGeometry(route?.geometry, center, 2.0);
    // Gipfel, Pässe, Gletscher, Schluchten und geologische Merkmale dürfen
    // bis 2 km vom Routenverlauf entfernt sein.
    // Ruinen/archäologische Fundstätten: 1 km (oft etwas abseits des Weges).
    // Alle anderen POIs (Kreuze, Kapellen, Brunnen, …): 0.5 km.
    const ALPINE_KINDS = new Set([
      "natural=peak", "natural=saddle", "natural=glacier",
      "natural=rock", "natural=arch", "natural=gorge",
      "geological=erratic", "geological=moraine",
    ]);
    const RUIN_KINDS = new Set([
      "historic=ruins", "historic=archaeological_site",
      "historic=fort", "historic=roman_road", "historic=roman_villa",
      "historic=roman_building", "historic=battlefield",
    ]);
    const korridorKm = (kind: string): number => {
      if (ALPINE_KINDS.has(kind)) return 2.0;
      if (RUIN_KINDS.has(kind)) return 1.0;
      return 0.5;
    };
    const geo = route?.geometry;

    const filterAndSet = (result: Awaited<ReturnType<typeof getPois>>) => {
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
                    { lat: geo[i + 1][0], lng: geo[i + 1][1] }
                  ) <= maxKm
                ) {
                  return true;
                }
              }
              return false;
            })
          : result;
      // Sagenmittelpunkt als synthetischen POI einfügen — nur wenn die
      // Koordinaten als "exakt" klassifiziert sind (99 von 236 Sagen).
      // "ungefaehr"-Koordinaten liegen nur grob im Gemeindegebiet und
      // würden den POI an der falschen Stelle auslösen.
      const sagaHeartPoi: Poi | null =
        saga?.coordinates && saga?.title && saga?.id &&
        saga?.koordinatenSicherheit === "exakt"
          ? {
              id: `saga-heart-${saga.id}`,
              name: saga.title,
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
      if (route?.id) {
        try {
          const offlinePois = await loadOfflinePois(route.id);
          if (offlinePois && !cancelled) {
            filterAndSet(offlinePois as Awaited<ReturnType<typeof getPois>>);
            return;
          }
        } catch {}
      }
      // Immer laden — cancelled-Check ist in filterAndSet/retry enthalten.
      tryLoad();
    })();

    return () => {
      cancelled = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
    };
  }, [route?.id, route?.geometry, route?.coordinates, saga?.coordinates, mapCenter?.lat, mapCenter?.lng, loadOfflinePois]);

  // Aktive Partnerbetriebe (Restaurants, Souvenirlaeden, ...) im Kartenausschnitt
  // laden — gleiche Bounding Box wie die Seilbahnen, kein Korridorfilter noetig,
  // da Partner ohnehin nur vereinzelt gepflegt werden.
  useEffect(() => {
    const center = route?.coordinates ?? saga?.coordinates ?? mapCenter;
    if (!center) return;
    let cancelled = false;
    const bbox = bboxAroundGeometry(route?.geometry, center, 5.0);
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
  }, [route?.id, route?.geometry, route?.coordinates, saga?.coordinates, mapCenter?.lat, mapCenter?.lng]);

  // Trinkwasser im Umkreis der Route laden (Mittelpunkt, 8 km Radius).
  useEffect(() => {
    const center = route?.coordinates ?? saga?.coordinates ?? mapCenter;
    if (!center) return;
    let cancelled = false;
    const base = getApiBaseUrl() ?? "";
    fetch(`${base}/api/trinkwasser?lat=${center.lat}&lng=${center.lng}&radius=8000`)
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return;
        const mapped: MapPoi[] = (data as { osmId: string; lat: number; lng: number; name: string | null }[])
          .filter((w) => w?.osmId)
          .map((w) => ({ id: w.osmId, name: w.name ?? "Trinkwasser", lat: w.lat, lng: w.lng, description: null }));
        setWaterSources(mapped);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [route?.id, route?.coordinates, saga?.coordinates, mapCenter?.lat, mapCenter?.lng]);

  // Parkplätze am Start- und Endpunkt der Route laden (je 800 m Radius).
  useEffect(() => {
    const geom = route?.geometry;
    if (!geom || geom.length < 2) return;
    let cancelled = false;
    const base = getApiBaseUrl() ?? "";
    const startPt = { lat: geom[0][0], lng: geom[0][1] };
    const endPt   = { lat: geom[geom.length - 1][0], lng: geom[geom.length - 1][1] };
    type ParkingItem = { osmId: string; lat: number; lng: number; name: string | null; address: string | null; parkingType: string | null; capacity: number | null };
    const fetchOne = (lat: number, lng: number) =>
      fetch(`${base}/api/parking?lat=${lat}&lng=${lng}&radius=800`)
        .then((r) => r.json() as Promise<ParkingItem[]>)
        .catch(() => [] as ParkingItem[]);
    Promise.all([fetchOne(startPt.lat, startPt.lng), fetchOne(endPt.lat, endPt.lng)])
      .then(([fromStart, fromEnd]) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const merged: MapPoi[] = [];
        for (const item of [...(Array.isArray(fromStart) ? fromStart : []), ...(Array.isArray(fromEnd) ? fromEnd : [])]) {
          if (!item?.osmId || seen.has(item.osmId)) continue;
          seen.add(item.osmId);
          const descParts: string[] = [];
          if (item.parkingType) descParts.push(item.parkingType);
          if (item.address) descParts.push(item.address);
          if (item.capacity) descParts.push(`${item.capacity} Plätze`);
          merged.push({ id: item.osmId, name: item.name ?? item.parkingType ?? "Parkplatz", lat: item.lat, lng: item.lng, description: descParts.length > 0 ? descParts.join(" · ") : null });
        }
        setParkingSpots(merged);
      });
    return () => { cancelled = true; };
  }, [route?.id, route?.geometry]);

  // Zwischenziele entlang der Route berechnen: Partner (Prio) + POIs,
  // max. 3, innerhalb 100 m Routenabstand.
  useEffect(() => {
    const geom = route?.geometry;
    if (!geom || geom.length < 2) return;
    if (pois.length === 0 && partners.length === 0) return;
    const wps = computeRouteWaypoints(geom, partners, pois);
    setRouteWaypoints(wps);
    waypointAnnouncedRef.current = new Set();
    announcedPremiumPartnerIdsRef.current = new Set();
    announcingPremiumPartnerIdsRef.current = new Set();
    setReachedWaypointIds(new Set());
  }, [route?.geometry, partners, pois]);

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

  // routeGeomRef wird synchron gehalten damit handleFix (leere Deps)
  // die aktuelle Geometrie immer per Ref lesen kann.
  useEffect(() => {
    routeGeomRef.current = route?.geometry;
  });

  // Neue GPS-Position verarbeiten: real zurueckgelegte Strecke aufaddieren,
  // Track-Punkt loggen und Off-Route-Status ueberpruefen.
  const handleFix = useCallback((
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
    if (altitude != null && Number.isFinite(altitude)) {
      setLiveAltitude(altitude);
    }
    const prev = lastFixRef.current;
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
    if (geom && geom.length >= 2) {
      const proj = fortschrittAufRoute(cur, geom);
      const distKm = proj?.distKm ?? 0;
      if (distKm > OFF_ROUTE_THRESHOLD_KM) {
        offRouteCountRef.current += 1;
        if (offRouteCountRef.current >= OFF_ROUTE_CONFIRM_FIXES && !isOffRouteRef.current) {
          isOffRouteRef.current = true;
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
  }, []);

  // Den naechsten Ort nicht bei jedem GPS-Fix abfragen: Nominatim erlaubt nur
  // eine Anfrage pro Sekunde, und beim Wandern reicht ein Update alle 100 m
  // bzw. spaetestens nach einer Minute.
  useEffect(() => {
    if (!livePos) return;
    const previous = livePlaceLookupRef.current;
    const movedKm = previous ? haversineKm(previous, livePos) : Number.POSITIVE_INFINITY;
    const elapsedMs = previous ? Date.now() - previous.requestedAt : Number.POSITIVE_INFINITY;
    if (previous && movedKm < 0.1 && elapsedMs < 60_000) return;

    livePlaceLookupRef.current = { ...livePos, requestedAt: Date.now() };
    const requestGeneration = ++livePlaceLookupGenerationRef.current;
    const base = getApiBaseUrl() ?? "";
    fetch(`${base}/api/routes/reverse-geocode?lat=${livePos.lat}&lng=${livePos.lng}`)
      .then((response) => {
        if (!response.ok) throw new Error("Ortsbestimmung nicht verfügbar");
        return response.json() as Promise<{ place?: string | null }>;
      })
      .then((data) => {
        if (requestGeneration !== livePlaceLookupGenerationRef.current) return;
        const place = typeof data.place === "string" && data.place.trim()
          ? data.place.trim()
          : null;
        setLivePlace(place);
      })
      .catch(() => {
        // Der letzte bekannte Ort bleibt bei einem kurzen Netzfehler erhalten.
      });
  }, [livePos?.lat, livePos?.lng]);

  // Fuer die Fotoanalyse werden POIs direkt um die echte Telefonposition
  // nachgeladen. Die normale POI-Liste folgt dem Routen-Korridor und kann
  // deshalb bei einem Start abseits der Route falsche, weit entfernte Berge
  // enthalten. Ein Abruf pro 400 m bzw. spaetestens pro Minute reicht aus.
  useEffect(() => {
    if (!livePos) return;
    const position = livePos;
    const previous = liveRecognitionPoiLookupRef.current;
    const movedKm = previous ? haversineKm(previous, position) : Number.POSITIVE_INFINITY;
    const elapsedMs = previous ? Date.now() - previous.requestedAt : Number.POSITIVE_INFINITY;
    if (previous && movedKm < 0.4 && elapsedMs < 60_000) return;

    liveRecognitionPoiLookupRef.current = { ...position, requestedAt: Date.now() };
    const bbox = bboxAroundGeometry(null, position, 0.5);
    let cancelled = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const tryLoad = () => {
      getPois(bbox)
        .then((result) => {
          if (cancelled) return;
          setLiveRecognitionPois(result);
          // Bei einer kalten Server-Cache-Abfrage kommt zunächst [] zurück,
          // während Overpass im Hintergrund lädt.
          if (result.length === 0 && attempt < 4 && !cancelled) {
            attempt++;
            retryTimer = setTimeout(tryLoad, 8_000);
          }
        })
        .catch(() => {
          if (attempt < 4 && !cancelled) {
            attempt++;
            retryTimer = setTimeout(tryLoad, 8_000);
          }
        });
    };

    tryLoad();
    return () => {
      cancelled = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
    };
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
        ...(selectedPoi.wikipediaTag ? { wikipediaTag: selectedPoi.wikipediaTag } : {}),
        ...(selectedPoi.wikidataTag ? { wikidataTag: selectedPoi.wikidataTag } : {}),
      })
        .then((r) => { if (!cancelled) setSelectedPoiWiki(r.wiki ?? null); })
        .catch(() => { if (!cancelled) setSelectedPoiWiki(null); });
    })();
    return () => { cancelled = true; };
  }, [selectedPoi?.id]);

  // Automatisch vorbeigelaufene POIs fuer das Wandertagebuch aufzeichnen.
  // Laeuft wenn nearbyPoi erkannt wird und wenn das Wiki nachlaedt.
  useEffect(() => {
    if (!nearbyPoi) return;
    const existing = visitedPoisRef.current.get(nearbyPoi.id) ?? { id: nearbyPoi.id, name: nearbyPoi.name };
    visitedPoisRef.current.set(nearbyPoi.id, {
      ...existing,
      ...(nearbyPoiWiki?.extract ? { extract: nearbyPoiWiki.extract } : {}),
      ...(nearbyPoiWiki?.image   ? { photoUrl: nearbyPoiWiki.image }  : {}),
    });
  }, [nearbyPoi?.id, nearbyPoiWiki]);

  // Partner-View-Tracking: sobald das Overlay erscheint, einmal fire-and-forget.
  useEffect(() => {
    if (!selectedPartner?.id) return;
    const base = getApiBaseUrl() ?? "";
    fetch(`${base}/partners/${selectedPartner.id}/view`, { method: "POST" }).catch(() => {});
  }, [selectedPartner?.id]);

  // Partner-Übersetzung: beschreibung + angebot in Nutzersprache laden (on-demand, gecacht am Server).
  // Für DE/GSW übersprungen — Texte sind primär Deutsch.
  useEffect(() => {
    if (!selectedPartner?.id || storyLanguage === "de" || storyLanguage === "gsw") {
      setPartnerTranslation(null);
      return;
    }
    let cancelled = false;
    const base = getApiBaseUrl() ?? "";
    const lang = storyLanguage === "gsw" ? "de" : storyLanguage;
    fetch(`${base}/partners/${selectedPartner.id}/translate?lang=${lang}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setPartnerTranslation(data); })
      .catch(() => { if (!cancelled) setPartnerTranslation(null); });
    return () => { cancelled = true; };
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
    const dist = haversineKm(livePos, { lat: nearbyPoi.lat, lng: nearbyPoi.lng });
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
    () => detectNavigationCues(route?.geometry, 50),
    [route?.geometry]
  );
  const notifiedTurnsRef = useRef<Set<number>>(new Set());
  const [turnNotifsReady, setTurnNotifsReady] = useState(false);
  // Ref-Spiegel fuer turnNotifsReady: erlaubt Mitteilungs-Effekten (Surface,
  // Meilenstein, POI) den aktuellen Berechtigungsstatus zu lesen, ohne in
  // ihren deps-Arrays auf den State angewiesen zu sein.
  const turnNotifsReadyRef = useRef(false);
  // Forward-Ref fuer speak() — wird nach der speak-useCallback-Deklaration
  // befuellt, damit der Turn-Proximity-Effekt (der vor speak liegt) es nutzen kann.
  const speakRef = useRef<((text: string, onFinished?: () => void, opts?: { interrupt?: boolean; sagaInterrupt?: boolean; useOpenAI?: boolean; preFetchedUri?: string; navInterrupt?: boolean; turnAudio?: "links" | "rechts" }) => Promise<void>) | null>(null);
  // Mitteilungs-Berechtigung beim Start EINMALIG anfragen — unabhaengig davon,
  // ob die Route Navigation-Cues hat. Bisher war die Abfrage hinter
  // `turnCues.length > 0` versteckt: auf einfachen Routen ohne erkannte
  // Abzweigungen wurde sie nie aufgerufen, turnNotifsReady blieb false,
  // und weder Kapitel- noch Interaktions-Mitteilungen kamen je an der Watch an.
  useEffect(() => {
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
  }, []);
  useEffect(() => {
    const interval = setInterval(() => setLocationNow(Date.now()), 5_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!turnNotifsReady || turnCues.length === 0) return;
    if (!hasFreshGps) return;
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
    const TURN_NEARBY_KM = 0.1; // ~100 m vor der Abzweigung ans Handgelenk tippen
    // Hoechstens EINE Mitteilung pro Positionsupdate (die naechstgelegene) —
    // in engen Serpentinen koennen sonst mehrere Cues gleichzeitig ausloesen.
    let bester: { index: number; cue: NavigationCue; distKm: number } | null = null;
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
          treffer.cue.direction === "links" ? t.turnNotifLeft : t.turnNotifRight
        );
      }
      // Doppelimpuls fuer Navigationsanweisungen — staerker und deutlich
      // unterscheidbar vom einfachen Kapitel-/POI-Start-Feedback.
      hapticDoublePulse();
      // Sprachansage kurz vor der Abbiegung — unterbricht sofortig und setzt
      // eine laufende Erzaehlung danach an derselben Stelle fort.
      const pack = STORY_PACKS[resolveLang(storyLanguage)];
      speakRef.current?.(pack.turnVoice(treffer.cue.direction), undefined, { navInterrupt: true, turnAudio: treffer.cue.direction });
    }
  }, [livePos, distance, totalKm, route?.geometry, turnCues, turnNotifsReady, t, storyLanguage, locState, hasFreshGps]);

  // Erkennt, ob die aktuelle Position (echtes GPS oder entlang des Weges
  // interpoliert) nahe an einem geladenen POI liegt, und zeigt ihn genau
  // einmal je Wanderung als Karte an ("live entlang der Route entdeckt").
  useEffect(() => {
    if (pois.length === 0) return;
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
    // Doppel-Schutz: (1) per ID, (2) per Koordinaten (derselbe Ort kann als
    // node-NNN und als way-MMM in Overpass auftauchen — gleicher Ort, zwei IDs).
    const DEDUP_KM = 0.1;
    const hit = pois.find(
      (poi) => {
        // Sagenmittelpunkt: 500 m Radius (Herzort der laufenden Sage ist
        // immer relevant, auch auf dem Land). Normale POIs: 300 m.
        const radiusKm = poi.kind === "saga=heart" ? 0.5 : 0.3;
        return (
          !announcedPoiIdsRef.current.has(poi.id) &&
          !announcedPoiLocsRef.current.some(
            (loc) => haversineKm({ lat: poi.lat, lng: poi.lng }, loc) <= DEDUP_KM
          ) &&
          haversineKm(current, { lat: poi.lat, lng: poi.lng }) <= radiusKm
        );
      }
    );
    if (hit) {
      announcedPoiIdsRef.current.add(hit.id);
      announcedPoiLocsRef.current.push({ lat: hit.lat, lng: hit.lng });
      setNearbyPoi(hit);
    }
  }, [livePos, distance, totalKm, route?.geometry, pois, nearbyPoi, nearbyPoiWiki, locState, hasFreshGps]);

  // Zwischenziel-Erkennung: 50-m-Radius um den POI/Partner-Standort.
  useEffect(() => {
    if (routeWaypoints.length === 0 || !livePos) return;
    for (const wp of routeWaypoints) {
      if (waypointAnnouncedRef.current.has(wp.id)) continue;
      if (haversineKm(livePos, { lat: wp.lat, lng: wp.lng }) <= 0.05) {
        waypointAnnouncedRef.current.add(wp.id);
        setReachedWaypointIds((prev) => new Set([...prev, wp.id]));
        sendeAbbiegeMitteilung(t.waypointReached, wp.name);
      }
    }
  }, [livePos, routeWaypoints, t]);

  // Premium-Partner-Anpreisung: sobald der Wanderer auf 500 m an einen
  // Premium-Partner herankommt, wird einmalig ein KI-generierter Text
  // abgespielt, der den Betrieb in den Kontext der laufenden Sage einwebt.
  // Nur aktive Partner, nur einmal pro Hike, nur wenn nicht gerade am Vorbereiten.
  useEffect(() => {
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
      ) continue;
      if (haversineKm(current, { lat: partner.lat, lng: partner.lng }) > PARTNER_NEARBY_KM) continue;
      announcingPremiumPartnerIdsRef.current.add(partnerId);
      const base = getApiBaseUrl() ?? "";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      fetch(`${base}/api/partners/${partner.id}/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sagaTitle: saga.title,
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
            speakRef.current?.(text, undefined, { useOpenAI: true });
          }
        })
        .catch(() => {
          clearTimeout(timeout);
          // Fehler/Timeouts sind nicht endgültig: der nächste GPS-Fix im
          // Radius darf die Anfrage erneut auslösen.
          announcingPremiumPartnerIdsRef.current.delete(partnerId);
        });
    }
  }, [livePos, distance, totalKm, route?.geometry, partners, saga, storyLanguage, preparing, awaitingDecision, locState, hasFreshGps]);

  // GPS-Foto-Challenge: sobald der Wanderer den Herzort der Sage betritt
  // (150-m-Radius um die Sagen-Koordinate), erscheint einmalig eine
  // Aufforderung, diesen besonderen Ort zu fotografieren.
  useEffect(() => {
    if (!hasFreshGps || !livePos || !saga?.coordinates || photoChallengeShownRef.current) return;
    const dist = haversineKm(livePos, saga.coordinates);
    if (dist <= 0.15) {
      photoChallengeShownRef.current = true;
      setShowPhotoChallenge(true);
      const pack = STORY_PACKS[resolveLang(storyLanguage)];
      speakRef.current?.(pack.photoChallengePrompt);
    }
  }, [livePos, saga?.coordinates, storyLanguage, hasFreshGps]);

  // Sagenmittelpunkt-Ankunft: einmalige kurze Ansage wenn GPS < 10 m entfernt (GPS-bestätigt,
  // daher darf die Phrase "du stehst hier" sagen). Nur für Sagen mit exakten Koordinaten —
  // der saga=heart-POI wurde dort bereits auf koordinatenSicherheit='exakt' beschränkt.
  useEffect(() => {
    if (!hasFreshGps || !livePos || !saga?.coordinates || saga.koordinatenSicherheit !== "exakt") return;
    if (sagaArrivalSpokenRef.current) return;
    const dist = haversineKm(livePos, saga.coordinates);
    if (dist <= 0.01) {
      sagaArrivalSpokenRef.current = true;
      const pack = STORY_PACKS[resolveLang(storyLanguage)];
      speakRef.current?.(pack.sagaHeartArrival, undefined, { sagaInterrupt: true });
    }
  }, [livePos, saga?.coordinates, saga?.koordinatenSicherheit, storyLanguage, hasFreshGps]);

  // Wegoberflaechenansage: sobald der Wanderer einen neuen Oberflaechenabschnitt betritt,
  // wird ein saga-atmosphaerischer Satz gesprochen (und optional als Push-Notif gesendet).
  useEffect(() => {
    // Erst nach dem ersten Meter ansagen — GPS gibt sonst sofort eine Route-Position
    // zurueck (z. B. Fraction 0.15) und loest alle Wechsel davor auf einmal aus.
    if (!hasFreshGps || surfacePoints.length === 0 || preparing || distance === 0) return;
    const currentFraction = (() => {
      if (livePos && route?.geometry && route.geometry.length >= 2) {
        const match = fortschrittAufRoute(livePos, route.geometry);
        if (match && match.distKm <= 1) return match.fraction;
      }
      return totalKm > 0 ? distance / totalKm : 0;
    })();
    for (const sp of surfacePoints) {
      if (sp.fraction < 0.05) continue; // Startbereich ueberspringen
      const key = Math.round(sp.fraction * 100);
      if (notifiedSurfaceFractionsRef.current.has(key)) continue;
      if (currentFraction >= sp.fraction - 0.02) {
        notifiedSurfaceFractionsRef.current.add(key);
        const pack = STORY_PACKS[resolveLang(cueLanguage)];
        const text = pack.surfaceTransitionPhrase(sp.surface);
        if (turnNotifsReadyRef.current && profile?.navAnnouncementsEnabled !== false) {
          sendeAbbiegeMitteilung(t.surfaceChangeTitle, text);
        }
        if (!awaitingDecisionRef.current) {
          speakRef.current?.(text, undefined, { useOpenAI: true });
        }
      }
    }
  }, [livePos, distance, totalKm, surfacePoints, storyLanguage, profile?.navAnnouncementsEnabled, preparing, t, route?.geometry, hasFreshGps]);

  // Verstrichene Zeit: alle 15 Sekunden aktualisieren (fuer ETA-Berechnung).
  useEffect(() => {
    if (preparing || finished) return;
    const id = setInterval(() => {
      setElapsedSec(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 15_000);
    return () => clearInterval(id);
  }, [preparing, finished]);

  // Meilenstein-Ansage bei 25/50/75 % der Wanderung — per KI im Sagen-Stil,
  // Fallback auf atmosphaerische Standardphrase aus STORY_PACKS.
  useEffect(() => {
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
              sagaTitle: saga.title,
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
              if (turnNotifsReadyRef.current && profile?.navAnnouncementsEnabled !== false) {
                sendeAbbiegeMitteilung(t.milestoneTitle, text);
              }
              // Keine Sprachausgabe waehrend Entscheidungspunkt: Meilenstein wuerde
              // speaking=true setzen → Spracherkennung stoppt → Audio-Session-Reset
              // → Mikrofon tot. Uhr-Mitteilung (oben) wird immer gesendet.
              if (!awaitingDecisionRef.current) {
                speakRef.current?.(text, undefined, { useOpenAI: true });
              }
            })
            .catch(() => {
              clearTimeout(timeout);
              if (turnNotifsReadyRef.current && profile?.navAnnouncementsEnabled !== false) {
                sendeAbbiegeMitteilung(t.milestoneTitle, fallback);
              }
              if (!awaitingDecisionRef.current) {
                speakRef.current?.(fallback, undefined, { useOpenAI: true });
              }
            });
        } else {
          if (turnNotifsReadyRef.current && profile?.navAnnouncementsEnabled !== false) {
            sendeAbbiegeMitteilung(t.milestoneTitle, fallback);
          }
          if (!awaitingDecisionRef.current) {
            speakRef.current?.(fallback, undefined, { useOpenAI: true });
          }
        }
      }
    }
  }, [distance, totalKm, storyLanguage, saga, profile?.name, profile?.navAnnouncementsEnabled, preparing, t, hasFreshGps]);

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
            () => getTokenRef.current()
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
    let sub: Location.LocationSubscription | null = null;
    let webId: number | null = null;
    let unsubscribeBackground: (() => void) | null = null;
    let watchdog: ReturnType<typeof setInterval> | null = null;
    let restartingForegroundWatch = false;
    let cancelled = false;

    (async () => {
      if (Platform.OS === "web") {
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
            { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
          );
        } else {
          setLocState("denied");
        }
        return;
      }
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== "granted") {
          setLocState("denied");
          return;
        }
        setLocState("granted");
        // Energiesparmodus: groebere GPS-Genauigkeit und seltenere Fixes
        // schonen den Akku spuerbar auf langen Touren.
        const trackingOptions: Location.LocationOptions = energiesparmodus
          ? { accuracy: Location.Accuracy.Low, distanceInterval: 20, timeInterval: 10000 }
          : { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 };

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
              }
            );
            if (cancelled) {
              nextSub.remove();
            } else {
              sub = nextSub;
            }
          } catch {
            // Der Watchdog versucht den Vordergrund-Watcher spaeter erneut.
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
          const bg = await Location.requestBackgroundPermissionsAsync();
          if (!cancelled && bg.status === "granted") {
            backgroundStarted = await startBackgroundLocationTracking(trackingOptions, {
              title: t.backgroundNotificationTitle,
              body: t.backgroundNotificationBody,
            });
          }
        } catch {
          // Best effort — z. B. auf Web/Expo Go nicht unterstuetzt.
        }

        if (cancelled) return;

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
      } catch {
        if (!cancelled) setLocState("denied");
      }
    })();

    return () => {
      cancelled = true;
      if (watchdog) clearInterval(watchdog);
      sub?.remove();
      unsubscribeBackground?.();
      stopBackgroundLocationTracking();
      if (webId != null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(webId);
      }
    };
  }, [handleFix, energiesparmodus, t.backgroundNotificationTitle, t.backgroundNotificationBody]);

  // Gerätekompass: auf iOS/Android aus dem Magnetometer lesen. Web und Geräte
  // ohne Sensor zeigen später nur den deaktivierten Zustand; die GPS-basierte
  // Richtung zum Wegstart bleibt davon unabhängig.
  useEffect(() => {
    let cancelled = false;
    let subscription: ReturnType<typeof Magnetometer.addListener> | null = null;

    if (Platform.OS === "web") {
      setCompassAvailable(false);
      return () => {
        cancelled = true;
      };
    }

    void Magnetometer.isAvailableAsync()
      .then((available) => {
        if (cancelled) return;
        setCompassAvailable(available);
        if (!available) return;

        Magnetometer.setUpdateInterval(200);
        subscription = Magnetometer.addListener(({ x, y }) => {
          if (cancelled || !Number.isFinite(x) || !Number.isFinite(y)) return;
          // In Portraitausrichtung zeigt atan2(-x, y) bei x=0/y>0 nach Norden.
          // Das Minus auf X gleicht die Spiegelung der Magnetometer-Achse aus:
          // Eine Drehung des Telefons nach rechts muss den Kurs ebenfalls
          // im Uhrzeigersinn von Norden nach Osten bewegen.
          const rawHeading = (Math.atan2(-x, y) * 180) / Math.PI;
          const normalized = (rawHeading + 360) % 360;
          const smoothed = smoothCompassHeading(compassHeadingRef.current, normalized);
          compassHeadingRef.current = smoothed;
          setCompassHeading(smoothed);
        });
      })
      .catch(() => {
        if (!cancelled) setCompassAvailable(false);
      });

    return () => {
      cancelled = true;
      subscription?.remove();
      subscription = null;
    };
  }, []);

  const stopNarration = useCallback(async () => {
    const sound = narrationSoundRef.current;
    narrationSoundRef.current = null;
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch {
        // Best effort — Sound koennte bereits entladen sein.
      }
    }
    // Zurueck auf MixWithOthers — andere Apps duerfen wieder ungedimmt spielen.
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: false,
    }).catch(() => {});
    setSpeaking(false);
  }, []);

  // Manueller Stopp (Pause-Button, Abschluss, Verlassen des Screens):
  // erhoeht zusaetzlich die Generation, damit auch noch in-flight laufende
  // speak()-Aufrufe (z. B. eine KI-Anfrage, die gerade laedt) verfallen und
  // nach dem Stopp nicht doch noch zu sprechen beginnen.
  const cancelNarration = useCallback(async () => {
    narrationQueueRef.current = [];
    narrationGenRef.current++;
    await stopNarration();
  }, [stopNarration]);

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
  const speak = useCallback(
    async (text: string, onFinished?: () => void, opts?: { interrupt?: boolean; sagaInterrupt?: boolean; useOpenAI?: boolean; preFetchedUri?: string; navInterrupt?: boolean; turnAudio?: "links" | "rechts" }) => {
      // NAV-INTERRUPT: Navigationsanweisung unterbricht sofort und setzt die
      // laufende Erzaehlung danach an derselben Stelle fort.
      if (opts?.navInterrupt) {
        const soundToResume = narrationSoundRef.current;
        if (soundToResume && speakingRef.current) {
          // Sound pausieren statt stoppen — Abspielposition bleibt erhalten.
          navInterruptingRef.current = true;
          try { await soundToResume.pauseAsync(); } catch {}
        }

        // Vorab gerenderten Clip abspielen (kein Netzwerk, kein Geraete-TTS).
        if (opts.turnAudio) {
          const lang = resolveLang((profile?.language ?? "de") as Lang);
          const source = getTurnAudio(lang, opts.turnAudio);
          let turnSound: import("expo-av").Audio.Sound | null = null;
          try {
            // Audio-Session auf DuckOthers schalten, damit Clip hörbar ist.
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              interruptionModeIOS: InterruptionModeIOS.DuckOthers,
              interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
              shouldDuckAndroid: true,
            }).catch(() => {});
            const { sound } = await Audio.Sound.createAsync(source);
            turnSound = sound;
            await sound.playAsync();
            await new Promise<void>((resolve) => {
              sound.setOnPlaybackStatusUpdate((status) => {
                if (!status.isLoaded || status.didJustFinish) resolve();
              });
            });
          } catch {
            // Wenn der vorbereitete Abbiegeclip fehlt, denselben Hinweis als
            // OpenAI-Audio erzeugen. Es gibt bewusst keinen Gerätestimmen-
            // Fallback mehr.
            navInterruptingRef.current = false;
            await speakRef.current?.(text, undefined, { interrupt: true, useOpenAI: true });
            return;
          } finally {
            try { await turnSound?.unloadAsync(); } catch {}
          }
          // Audio-Session nach dem kurzen Abbiegeclip zurücksetzen.
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
            shouldDuckAndroid: false,
          }).catch(() => {});
        }

        // Nav-Ansage fertig: Narration fortsetzen, falls noch derselbe Sound aktiv.
        navInterruptingRef.current = false;
        if (soundToResume && narrationSoundRef.current === soundToResume) {
          try { await soundToResume.playAsync(); } catch {}
        }
        return;
      }

      // PRIO 2 — SAGA-INTERRUPT: unterbricht alles ausser einem laufenden navInterrupt.
      // Eingesetzt fuer die 10-m-Sagenmittelpunkt-Ansage.
      if (opts?.sagaInterrupt) {
        if (navInterruptingRef.current) {
          // Abbiegehinweis laeuft gerade — dahinter einreihen, nicht unterbrechen.
          narrationQueueRef.current.push({ text, onFinished, useOpenAI: opts?.useOpenAI, preFetchedUri: opts?.preFetchedUri });
          return;
        }
        // Alles andere (Kapitel, POI, Meilenstein): Queue leeren, sofort starten.
        narrationQueueRef.current = [];
        // Laufenden Sound stoppen — wird im normalen Pfad neu gestartet.
        const prev = narrationSoundRef.current;
        narrationSoundRef.current = null;
        if (prev) { try { await prev.stopAsync(); await prev.unloadAsync(); } catch {} }
      }

      // PRIO 3 — ohne interrupt: in die Warteschlange einreihen, wenn gerade
      // gesprochen wird — so unterbrechen POI, Meilenstein etc. keine laufende
      // Kapitel-Erzaehlung, sondern warten auf deren natuerliches Ende.
      if (!opts?.interrupt && !opts?.sagaInterrupt && speakingRef.current) {
        narrationQueueRef.current.push({ text, onFinished, useOpenAI: opts?.useOpenAI, preFetchedUri: opts?.preFetchedUri });
        return;
      }
      // Expliziter Interrupt (Kapitel-Wechsel, Wiederholen-Button): Queue leeren
      // und laufenden Nav-Interrupt abbrechen.
      if (opts?.interrupt) {
        narrationQueueRef.current = [];
        navInterruptingRef.current = false;
      }
      // Neue Generation SOFORT beanspruchen, damit noch laufende speak()-
      // Aufrufe (z. B. nach schnellem Doppel-Tipp auf "Wiederholen") sich
      // nach ihren awaits als veraltet erkennen und nichts mehr abspielen.
      const gen = ++narrationGenRef.current;
      setNarrationUnavailable(false);
      setSpeaking(true);
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
        const uri = opts?.preFetchedUri ?? await (async () => {
          // gsw: Heidi-Stimme via gsw-language-Key; Text ist bereits Hochdeutsch (storyGenerator)
          const narrationLang = profile?.language;
          const blob = await createNarration({ text, language: narrationLang, ...(opts?.useOpenAI ? { provider: "openai" as const } : {}) });
          return blobToTempFileUri(blob);
        })();
        if (gen !== narrationGenRef.current) return;
        // Vorheriges Audio direkt stoppen — kein setState, damit speaking=true
        // fuer den Ladeindikator erhalten bleibt.
        const prevSound = narrationSoundRef.current;
        narrationSoundRef.current = null;
        if (prevSound) {
          try { await prevSound.stopAsync(); await prevSound.unloadAsync(); } catch {}
        }
        if (gen !== narrationGenRef.current) return;
        // Vor dem Abspielen auf DuckOthers wechseln — nur waehrend aktiver Erzaehlung.
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: true,
        }).catch(() => {});
        const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
        if (gen !== narrationGenRef.current) {
          sound.unloadAsync().catch(() => {});
          return;
        }
        narrationSoundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            setSpeaking(false);
            speakingRef.current = false;
            onFinished?.();
            // Queue nur verarbeiten, wenn onFinished keinen neuen speak()-Aufruf
            // ausgeloest hat — sonst wuerde der Queue-Eintrag via Gen-Bump die
            // soeben gestartete Ausgabe abwuergen (Race-Condition: Meilenstein-
            // Fetch loest sich genau dann auf, wenn die Entscheidungs-Ack endet,
            // und liegt im Queue — ohne diesen Guard wuerde er die Feedback-
            // Erzaehlung mit einem Gen-Bump abwuergen).
            if (!speakingRef.current) {
              const next = narrationQueueRef.current.shift();
              if (next) {
                speakRef.current?.(next.text, next.onFinished, { useOpenAI: next.useOpenAI, preFetchedUri: next.preFetchedUri });
              } else if (!awaitingDecisionRef.current) {
                // Queue leer — zurueck auf MixWithOthers damit andere Apps wieder normal spielen.
                // NICHT zuruecksetzen wenn Entscheidungspunkt aktiv: gleich danach
                // startet die Spracherkennung und benoetigt allowsRecordingIOS:true.
                // Der fire-and-forget-Reset koennte die Erkennung killen (Race-Condition).
                Audio.setAudioModeAsync({
                  allowsRecordingIOS: false,
                  playsInSilentModeIOS: true,
                  staysActiveInBackground: true,
                  interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
                  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
                  shouldDuckAndroid: false,
                }).catch(() => {});
              }
            }
          } else if (!status.isPlaying && !status.isBuffering && status.positionMillis > 0) {
            // Unerwarteter Stopp (z. B. Bluetooth-Verbindung unterbricht die
            // Audio-Session): iOS pausiert das Audio automatisch bei einer
            // RouteChange-Interruption. Wir starten neu, sobald wir merken
            // dass das Audio steht obwohl es nicht zu Ende gespielt hat.
            // AUSNAHME: absichtliche Pause wegen Nav-Interrupt — nicht sofort
            // neu starten, sondern auf das Ende der Nav-Ansage warten.
            if (navInterruptingRef.current) return;
            sound.playAsync().catch(() => {});
          }
        });
      } catch (err) {
        if (gen !== narrationGenRef.current) return;
        // Bei jedem Fehler (Rate-Limit, Netzwerkfehler, Server-Fehler, Offline)
        // nicht auf die Gerätestimme wechseln. Der sichtbare Hinweis macht den
        // fehlenden KI-Clip nachvollziehbar; ein Feedback-Callback darf
        // trotzdem die Queue bzw. den nächsten Schritt fortsetzen.
        setNarrationUnavailable(true);
        setSpeaking(false);
        speakingRef.current = false;
        onFinished?.();
        if (!speakingRef.current) {
          const next = narrationQueueRef.current.shift();
          if (next) {
            speakRef.current?.(next.text, next.onFinished, {
              useOpenAI: next.useOpenAI,
              preFetchedUri: next.preFetchedUri,
            });
          } else if (!awaitingDecisionRef.current) {
            Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
              interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
              shouldDuckAndroid: false,
            }).catch(() => {});
          }
        }
      }
    },
    [profile?.language]
  );
  speakRef.current = speak;

  // Entscheidungs-Ack ("Ich verstehe." etc.) vorausladen sobald die Wanderung
  // startet. Der Text ist je Sprache fix, wird genau einmal synthetisiert und
  // bleibt dauerhaft im Narrations-Cache. Das stellt sicher, dass bei der
  // Wahl (Kapitel 3/5) sofort OpenAI-Audio ertönt, ohne Netzwerk-Latenz.
  useEffect(() => {
    if (preparing) return;
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
        const blob = await createNarration({ text: ackText, language: ackLang, provider: "openai" });
        if (cancelled) return;
        const uri = await blobToTempFileUri(blob);
        if (!cancelled) ackAudioUriRef.current = uri;
      } catch {
        // Stummes Scheitern — bei der Wahl erfolgt ein OpenAI-Aufruf zur Laufzeit.
      }
    })();
    return () => { cancelled = true; };
  }, [preparing, profile?.language]);

  // Kapitel automatisch erzaehlen, sobald es erscheint. Ein Ref verhindert,
  // dass eine Kapitel-Mutation (Entscheidung) dasselbe Kapitel erneut vorliest
  // oder den Entscheidungsmoment erneut sperrt.
  useEffect(() => {
    if (preparing || chapters.length === 0) return;
    const ch = chapters[currentIndex];
    if (!ch) return;
    if (lastNarratedRef.current !== currentIndex) {
      lastNarratedRef.current = currentIndex;
      // Erstes Kapitel: Begruessung voranstellen, dann kurze Pause vor Kapitel 1.
      // interrupt: true — Kapitelwechsel unterbricht immer (inkl. Queue leeren).
      // Offline-Audio bevorzugen wenn vorhanden — kein Netzwerk noetig.
      // capturedIndex sichert den Index zum Zeitpunkt des Effect-Aufrufens.
      // Nach dem async getOfflineAudioUri-Await kann der User bereits eine
      // Entscheidung getroffen haben (chooseOption → Ack laeuft). Ohne
      // diese Pruefung wuerde speak(..., {interrupt:true}) den Ack unterbrechen
      // und den Kapiteltext erneut abspielen — das ist Bug "Frage zweimal gestellt".
      const capturedIndex = currentIndex;
      (async () => {
        const offlineUri = saga?.id
          ? await getOfflineAudioUri(saga.id, capturedIndex).catch(() => null)
          : null;
        // Abbrechen wenn GPS oder Entscheidung diesen Kapitel-Index bereits
        // verlassen hat waehrend das Offline-Audio geladen wurde.
        if (currentIndexRef.current !== capturedIndex) return;
        if (capturedIndex === 0) {
          const packForCue = STORY_PACKS[resolveLang(cueLanguage)];
          speak(
            `${greetingPrefix} ${packForCue.hikeStartCue}`,
            () => { setTimeout(() => speak(ch.text, undefined, { preFetchedUri: offlineUri ?? undefined }), 1500); },
            { interrupt: true, useOpenAI: true }
          );
        } else {
          speak(ch.text, undefined, { interrupt: true, preFetchedUri: offlineUri ?? undefined });
        }
      })();
      // Kapitelwechsel als Mitteilung (Uhr-Spiegelung, wenn iPhone gesperrt).
      // Das erste Kapitel wird nicht gemeldet — der Start ist offensichtlich.
      if (currentIndex > 0 && turnNotifsReady && profile?.navAnnouncementsEnabled !== false) {
        sendeAbbiegeMitteilung(
          t.chapterNotif(currentIndex + 1),
          route?.name ?? saga?.title ?? ""
        );
      }
    }
    if (ch.isDecisionPoint && ch.chosenOptionIndex == null &&
        lastDecisionTriggeredRef.current !== currentIndex) {
      lastDecisionTriggeredRef.current = currentIndex;
      setAwaitingDecision(true);
    }
  }, [currentIndex, preparing, chapters, speak, turnNotifsReady, t, route?.name, saga?.title, greetingPrefix, storyLanguage]);

  // Unterbrochene Wanderung fuer die "Weiter wandern"-Karte auf dem Home-Tab
  // merken: bei jedem Kapitelwechsel wird der Fortschritt persistiert; beim
  // Abschluss (finishHike) wird der Eintrag wieder geloescht.
  useEffect(() => {
    if (preparing || finished || chapters.length === 0 || !saga) return;
    saveActiveHike({
      routeId: route?.id ?? "",
      sagaId: saga.id,
      routeName: route?.name ?? saga.title,
      chapterIndex: currentIndex,
      chapterCount: chapters.length,
      updatedAt: Date.now(),
      // Route komplett mitspeichern, damit die Wanderung nach einem Absturz
      // auch ohne (erneut) geladenen Katalog fortgesetzt werden kann.
      route: route ?? undefined,
    });
  }, [currentIndex, preparing, finished, chapters.length, saga, route, saveActiveHike]);

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
      return;
    }
    setNearbyPoiWiki(undefined);
    let cancelled = false;
    (async () => {
      const cached = await getOfflinePoiDetail(nearbyPoi.id);
      if (cached !== undefined) {
        if (!cancelled) setNearbyPoiWiki(cached);
        return;
      }
      getPoiDetail({
        name: nearbyPoi.name,
        kind: nearbyPoi.kind,
        lat: nearbyPoi.lat,
        lng: nearbyPoi.lng,
        ...(nearbyPoi.wikipediaTag ? { wikipediaTag: nearbyPoi.wikipediaTag } : {}),
        ...(nearbyPoi.wikidataTag ? { wikidataTag: nearbyPoi.wikidataTag } : {}),
      })
        .then((r) => { if (!cancelled) setNearbyPoiWiki(r.wiki ?? null); })
        .catch(() => { if (!cancelled) setNearbyPoiWiki(null); });
    })();
    return () => { cancelled = true; };
  }, [nearbyPoi?.id]);

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
    if (POI_APPROACH_KINDS.has(nearbyPoi.kind ?? "") && isPoiNameSpecific(nearbyPoi.name, nearbyPoi.kind)) return;
    narratedPoiIdRef.current = nearbyPoi.id;
    // Kontext des vorherigen POI darf nicht an der neuen Karte kleben.
    setNearbyPoiKontext(null);
    // Spuerbarer Hinweis, dass gleich ein Ort erzaehlt wird — wer aufs
    // Panorama schaut statt aufs Handy, merkt es trotzdem.
    hapticHeavy();
    // Parallel zur Erzaehlung eine Mitteilung mit dem Wikipedia-Bild des Ortes
    // senden — iOS spiegelt sie samt Bild auf eine gekoppelte Watch. Best
    // effort: ohne Berechtigung oder Bild passiert einfach nichts Stoerendes.
    const isSagaHeart = nearbyPoi.kind === "saga=heart";
    const poiName = nearbyPoi.name;
    // Wiki ist bei GPS-Trigger noch nicht geladen (lazy) — Notif ohne Bild
    // ist besser als warten; das Bild erscheint spaeter im Modal.
    // Sagenmittelpunkt: keine Push-Mitteilung (ist kein "Unterbrechungs"-POI).
    if (!isSagaHeart && turnNotifsReadyRef.current) {
      const poiBild = nearbyPoiWiki?.image ?? null;
      const poiText = nearbyPoiWiki?.extract
        ? trimForNarration(nearbyPoiWiki.extract)
        : t.poiNotifBody;
      sendePoiMitteilung(poiName, poiText, poiBild);
    }
    const pack = STORY_PACKS[resolveLang(cueLanguage)];
    const rawExtract = nearbyPoiWiki?.extract ?? null;
    let cancelled = false;
    const erzaehle = (text: string) => {
      if (!cancelled) speak(text, undefined, { useOpenAI: true });
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
          erzaehle(isSagaHeart ? cached : pack.poiAside(nearbyPoi.name, cached));
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
          if (!cancelled && !nearbyPoiWiki?.extract) setNearbyPoiKontext(r.text);
          erzaehle(isSagaHeart ? r.text : pack.poiAside(nearbyPoi.name, r.text));
        })
        .catch(() => {
          if (!isSagaHeart)
            erzaehle(pack.poiAside(nearbyPoi.name, rawExtract ? trimForNarration(rawExtract) : null));
        });
    })();
    return () => {
      cancelled = true;
    };
  }, [nearbyPoi, nearbyPoiWiki, storyLanguage, speak, t]);

  // Stufenweise Annaeherung an kulturelle/historische POIs mit spezifischem Namen:
  // 200 m → einmaliger OpenAI-Richtungshinweis
  // 50 m  → volle Geschichte in Erzaehlstimme (identisch zum normalen POI-Flow)
  useEffect(() => {
    if (!hasFreshGps || !nearbyPoi || !livePos) return;
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

    const distKm = haversineKm(livePos, { lat: nearbyPoi.lat, lng: nearbyPoi.lng });

    // 200 m: Richtungshinweis (einmalig pro POI)
    if (distKm <= 0.2 && hintedPoiIdRef.current !== nearbyPoi.id) {
      hintedPoiIdRef.current = nearbyPoi.id;
      const pack = STORY_PACKS[resolveLang(cueLanguage)];
      // Bewegungsrichtung aus zwei aufeinanderfolgenden GPS-Fixes ableiten
      let dir: "links" | "rechts" | "geradeaus" = "geradeaus";
      if (prevLivePosRef.current) {
        const heading = bearingDeg(prevLivePosRef.current, livePos);
        const bear = bearingDeg(livePos, { lat: nearbyPoi.lat, lng: nearbyPoi.lng });
        const rel = ((bear - heading) + 360) % 360;
        dir = rel < 45 || rel > 315 ? "geradeaus" : rel <= 135 ? "rechts" : "links";
      }
      speak(pack.poiApproachHint(dir), undefined, { useOpenAI: true });
    }

    // 50 m: volle Geschichte (einmalig pro POI)
    if (distKm <= 0.05 && poiStoryToldRef.current !== nearbyPoi.id) {
      poiStoryToldRef.current = nearbyPoi.id;
      const pack = STORY_PACKS[resolveLang(cueLanguage)];
      const rawExtract = nearbyPoiWiki?.extract ?? null;
      hapticHeavy();
      const capturedPoi = nearbyPoi;
      (async () => {
        const cached = await getOfflinePoiStory(capturedPoi.id, cueLanguage);
        if (cached !== null) {
          if (!nearbyPoiWiki?.extract) setNearbyPoiKontext(cached);
          speak(pack.poiAside(capturedPoi.name, cached), undefined, { useOpenAI: true });
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
            speak(pack.poiAside(capturedPoi.name, r.text), undefined, { useOpenAI: true });
          })
          .catch(() => {
            speak(pack.poiAside(capturedPoi.name, rawExtract ? trimForNarration(rawExtract) : null), undefined, { useOpenAI: true });
          });
      })();
    }
  }, [livePos, nearbyPoi, nearbyPoiWiki, cueLanguage, speak, hasFreshGps]);

  // Echte Position auf der Routen-Geometrie (0..1), statt nur die seit dem
  // Start zurueckgelegte Luftlinie zu betrachten. Das sorgt dafuer, dass der
  // Story-Fortschritt auch dann stimmt, wenn die Wanderung abseits des
  // offiziellen Startpunkts oder mitten auf der Route begonnen wird.
  // Ein ungenauer erster Fix (z. B. Balanced-Genauigkeit direkt beim Start,
  // oder ein grober Hintergrund-Fix) kann faelschlich auf einen weit
  // entfernten Punkt der Route projiziert werden und so Kapitel ueber-
  // springen. Deshalb wird die Routen-Projektion erst ab einer
  // Mindestgenauigkeit vertraut; ohne verlaessliche Genauigkeit faellt der
  // Fortschritt auf die reine zurueckgelegte Distanz zurueck (startet bei 0).
  // Zusaetzlich: Ist man weit von der Route entfernt (z. B. Anreise ueber
  // 100 km), liefert die naechstgelegene Stelle auf der gesamten Route
  // faktisch einen Zufallswert entlang der Strecke — auch das wuerde
  // Kapitel ueberspringen. Deshalb nur vertrauen, wenn man tatsaechlich
  // in der Naehe der Route ist.
  const ROUTE_PROGRESS_MAX_ACCURACY_M = 30;
  const ROUTE_PROGRESS_MAX_DIST_KM = 1;
  const routeProgress = useMemo(() => {
    if (!hasFreshGps || !livePos || !route?.geometry || route.geometry.length < 2) return null;
    if (locState === "granted" && locationNow - lastLocationAtRef.current > 45_000) return null;
    if (livePosAccuracy != null && livePosAccuracy > ROUTE_PROGRESS_MAX_ACCURACY_M) return null;
    const match = fortschrittAufRoute(livePos, route.geometry);
    if (!match || match.distKm > ROUTE_PROGRESS_MAX_DIST_KM) return null;
    return match.fraction;
  }, [livePos, livePosAccuracy, route?.geometry, locState, locationNow]);

  const panoramaPeaks = useMemo(
    () => erkenneGipfel(pois, livePos, compassHeading),
    [pois, livePos, compassHeading],
  );
  const objectRecognitionContext = useMemo(() => {
    if (!livePos) return "";

    const nearby = [...liveRecognitionPois, ...pois]
      .filter((poi) => poi.name.trim().length > 0)
      .map((poi) => {
        const target = { lat: poi.lat, lng: poi.lng };
        return {
          poi,
          distanceKm: haversineKm(livePos, target),
          bearing: bearingDeg(livePos, target),
        };
      })
      .filter((entry) => entry.distanceKm <= 0.5)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const seen = new Set<string>();
    const context: string[] = [];
    if (livePlace) {
      context.push(`Aktueller GPS-Ort (ungefähr): ${livePlace}`);
    }
    for (const entry of nearby) {
      const key = `${entry.poi.name.trim().toLocaleLowerCase()}|${entry.poi.kind}`;
      if (seen.has(key)) continue;
      seen.add(key);
      context.push(
        `OSM-Objekt in ${entry.distanceKm.toFixed(2)} km Entfernung, Peilung ${Math.round(entry.bearing)}°: ${entry.poi.name.trim()} (${entry.poi.kind})`,
      );
      if (context.length >= 8) break;
    }

    // nearbyPoi stammt aus der routenbezogenen Liste. Es darf nur als
    // Foto-Kontext dienen, wenn es ebenfalls innerhalb der 500-m-Grenze liegt.
    if (nearbyPoi) {
      const nearbyPoiDistance = haversineKm(livePos, {
        lat: nearbyPoi.lat,
        lng: nearbyPoi.lng,
      });
      const key = `${nearbyPoi.name.trim().toLocaleLowerCase()}|${nearbyPoi.kind}`;
      if (nearbyPoiDistance <= 0.5 && !seen.has(key)) {
        context.push(
          `OSM-POI in ${nearbyPoiDistance.toFixed(2)} km Entfernung: ${nearbyPoi.name.trim()} (${nearbyPoi.kind})`,
        );
      }
    }

    return context.join("; ");
  }, [livePlace, livePos, liveRecognitionPois, nearbyPoi, pois]);
  const terrainSections = useMemo(
    () => limitTerrainSectionsForSpeech(buildTerrainSections(terrainProfile)),
    [terrainProfile],
  );

  // Geländeansagen: 150 m vorher ankündigen, bei langen Abschnitten einmal
  // über den Rest informieren und 100 m vor dem Ende abschliessen. Abschnitte
  // ab 30 Prozent enthalten zusätzlich eine klare Sicherheitswarnung und
  // erhalten eine starke lokale Mitteilung für gesperrte Bildschirme/Uhren.
  useEffect(() => {
    if (
      preparing ||
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
    const currentKm = Math.max(0, Math.min(profileLengthKm, fraction * profileLengthKm));

    for (const section of terrainSections) {
      const leadKm = Math.max(0, section.startKm - currentKm);
      const inOrBeforeSection =
        currentKm <= section.endKm + 0.05 && currentKm >= section.startKm - 0.15;

      if (!terrainStartedRef.current.has(section.id) && inOrBeforeSection) {
        terrainStartedRef.current.add(section.id);
        const averageGrade = Math.max(1, Math.round(Math.abs(section.averageGradePct)));
        const sectionDistance = formatSpokenDistance(section.lengthKm, cueLanguage);
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
            : warning ??
              t.terrainProgress(
                section.direction,
                formatSpokenDistance(Math.max(0, section.endKm - currentKm), cueLanguage),
                averageGrade,
              );

        if (section.isVerySteep && turnNotifsReadyRef.current) {
          sendeAbbiegeMitteilung(t.terrainWarningTitle, warning ?? text);
        }
        speakRef.current?.(text, undefined, {
          useOpenAI: true,
          ...(section.isVerySteep ? { sagaInterrupt: true } : {}),
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
            formatSpokenDistance(Math.max(0, section.endKm - currentKm), cueLanguage),
            Math.max(1, Math.round(Math.abs(section.averageGradePct))),
          ),
          undefined,
          { useOpenAI: true },
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
  ]);

  // Luftlinien-Hinweis zum offiziellen Wegstart, solange man noch nicht in
  // dessen Naehe ist (z. B. beim Start ab Bahnhof/Parkplatz statt direkt am
  // Trailhead). Bewusst einfach: keine echte Fusswegroute dorthin, nur
  // Distanz + grobe Himmelsrichtung als Orientierung.
  const START_NEARBY_KM = 0.05;
  const walkToStart = useMemo(() => {
    if (!livePos || !route?.geometry || route.geometry.length < 2) return null;
    const start: LatLng = { lat: route.geometry[0][0], lng: route.geometry[0][1] };
    const distKm = haversineKm(livePos, start);
    if (distKm <= START_NEARBY_KM) return null;
    const dir = t.compassDirections[compassIndex(bearingDeg(livePos, start))];
    const distText = formatSpokenDistance(distKm, storyLanguage);
    return { distKm, distText, dir };
  }, [livePos, route?.geometry, storyLanguage, t, hasFreshGps]);

  // Sobald der User einmal innerhalb des Start-Radius war (walkToStart === null),
  // als "start reached" markieren — damit das Banner nach dem Passieren nicht
  // erneut erscheint, wenn der User sich von geometry[0] entfernt.
  useEffect(() => {
    if (preparing || startReached) return;
    if (!hasFreshGps) return;
    if (walkToStart === null) setStartReached(true);
  }, [walkToStart, preparing, startReached, hasFreshGps]);

  const walkToStartAnnouncedRef = useRef(false);
  useEffect(() => {
    if (!walkToStart) return;
    if (walkToStartAnnouncedRef.current) return;
    if (preparing || locState !== "granted" || !hasFreshGps) return;
    walkToStartAnnouncedRef.current = true;
    speak(t.walkToStartSpoken(walkToStart.distText, walkToStart.dir), undefined, { useOpenAI: true });
  }, [walkToStart, preparing, locState, speak, t, hasFreshGps]);

  // Kapitelfortschritt entlang der Route: bevorzugt die echte Position
  // (routeProgress); ohne verlaesslichen GPS-Fix oder Geometrie faellt es
  // auf die reine zurueckgelegte Distanz zurueck. Die Projektion ist am
  // Ziel robuster als die aufsummierten GPS-Abstaende, weil einzelne Fixes
  // fehlen oder die offizielle Routenlaenge leicht von der tatsaechlich
  // gelaufenen Strecke abweichen kann.
  // Kapitelfortschritt laeuft unabhaengig davon, ob gerade eine Entscheidung
  // offen ist. Entscheidungen sind freiwillig — wer nicht antwortet, gehoert
  // trotzdem das naechste Kapitel, sobald GPS oder Distanz es vorgibt.
  // Wird ein Entscheidungs-Kapitel durch den Fortschritt verlassen, schliesst
  // sich das Panel automatisch (setAwaitingDecision(false)). Das darf aber
  // nicht passieren, solange die Entscheidung noch offen ist: Bei einer
  // schnellen Autofahrt kann die GPS-Distanz mehrere Kapitelgrenzen in einem
  // einzigen Update überschreiten. Dann würde der Entscheidungs-Prompt
  // parallel zur noch laufenden Antwort-/Bestätigungslogik weiterlaufen.
  useEffect(() => {
    if (locState !== "granted") return;
    if (preparing || finished || chapters.length === 0) return;
    if (!hasFreshGps) return;
    // Die bereits gefahrene Strecke bleibt in `distance` erhalten. Sobald
    // chooseOption (oder der Timeout) die Entscheidung schließt, läuft dieser
    // Effekt erneut und holt den Kapitelindex kontrolliert nach.
    if (awaitingDecisionRef.current) return;
    const steps = chapters.length - 1;
    if (steps <= 0) {
      setFinished(true);
      return;
    }
    // Mit verlaesslicher GPS-Position den Fortschritt direkt auf der
    // Routen-Geometrie bestimmen. Die kumulierte Distanz bleibt der Rueckfall
    // fuer fehlendes GPS oder eine Position ausserhalb der Route.
    const ratio = routeProgress ?? 0;
    // Letztes Kapitel schon ab ~70 % des letzten Streckenabschnitts ausloesen:
    // GPS-Distanz bleibt in der Praxis meistens etwas unter der offiziellen
    // Routenlaenge (Drift, abweichendes Routenende), weshalb ratio selten
    // exakt 1.0 erreicht und das letzte Kapitel sonst nie gefeuert wird.
    const reached = ratio >= (steps - 0.3) / steps
      ? steps
      : Math.min(steps - 1, Math.floor(ratio * steps + 1e-6));
    if (reached > currentIndex) {
      // Immer nur einen Schritt weiter — nie springen. So wird jedes Kapitel
      // (auch Entscheidungskapitel) mindestens einmal als currentIndex gesetzt
      // und der Narrations-Effect bekommt die Chance, die Frage zu stellen.
      // Der Effect laeuft erneut sobald currentIndex sich aendert, sodass
      // schnell aufeinanderfolgende GPS-Updates trotzdem zueegig durch alle
      // Kapitel durchlaufen — nur eben Schritt fuer Schritt statt mit Sprung.
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setAwaitingDecision(false);
      if (next >= steps) setFinished(true);
    }
  }, [
    distance,
    locState,
    preparing,
    finished,
    chapters.length,
    currentIndex,
    awaitingDecision,
    totalKm,
    routeProgress,
    hasFreshGps,
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
  const stopVoiceDecisionRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const chooseOption = async (optionIndex: number) => {
    // Mitglieder einer Gruppenwanderung entscheiden nicht selbst — sie
    // warten auf die Entscheidung der Gruppenleitung.
    if (folgtGruppenleitung) return;
    // Eine Entscheidung darf nur einmal verarbeitet werden. Das Ref wird
    // synchron mit dem State aktualisiert, sodass ein schneller Tap parallel
    // zu einem Sprach-Treffer weder Ack noch Persoenlichkeits-Feedback doppelt
    // startet.
    if (chapters[currentIndex]?.chosenOptionIndex != null) return;
    // Sofort synchronisieren: Die Sprach-Erkennung kann den Treffer melden,
    // bevor der React-State neu gerendert wurde. Ohne diesen Ref-Abschluss
    // kann der Entscheidungs-Prompt in diesem Zwischenfenster nochmals
    // starten und die Audio-Session bleibt im Aufnahme-Modus.
    awaitingDecisionRef.current = false;
    hapticMedium();
    const gewaehlt = chapters[currentIndex]?.decision?.options[optionIndex]?.label;
    if (gewaehlt) {
      // Kurze sichtbare Bestaetigung der Wahl, bevor die Geschichte weitergeht
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      setChoiceFeedback(t.yourChoice(gewaehlt));
      feedbackTimerRef.current = setTimeout(() => setChoiceFeedback(null), 2500);
      // Watch-Mitteilung bei Interaktion — spiegelt die Wahrnehmungsentscheidung
      // ans Handgelenk, damit Wandernde mit gesperrtem iPhone trotzdem wissen,
      // welche Option fuer sie gewaehlt wurde (z. B. per Voice-Steuerung).
      if (turnNotifsReady && profile?.navAnnouncementsEnabled !== false) {
        sendeAbbiegeMitteilung(t.perception, gewaehlt);
      }
    }
    const nextChapters = [...chapters];
    nextChapters[currentIndex] = {
      ...nextChapters[currentIndex],
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
    const archetypeHint = chapters[currentIndex]?.decision?.options[optionIndex]?.archetypeHint;
    if (archetypeHint) {
      const ackPack = STORY_PACKS[resolveLang(cueLanguage)];
      // feedbackPack: cueLanguage ist bereits gsw→de gemappt; DE-Template passt zu Hochdeutsch-Text
      const feedbackPack = STORY_PACKS[resolveLang(cueLanguage)];
      const feedbackText = feedbackPack.decisionFeedback(archetypeHint, gewaehlt ?? "");
      // Vorgeladene URI verwenden (falls verfuegbar) — OpenAI-Stimme startet
      // sofort ohne Netzwerk-Latenz. Fallback: OpenAI-Aufruf zur Laufzeit
      // (ackAudioUriRef.current ist null, wenn Pre-fetch noch laeuft oder scheiterte).
      const ackUri = ackAudioUriRef.current ?? undefined;
      // Bei Button-Taps beendet die Hook-Cleanup-Funktion die Erkennung erst
      // nach diesem Render. Auch dieser Pfad muss die PlayAndRecord-Session
      // freigeben, sonst bleibt der folgende Text auf iOS dauerhaft leiser.
      await stopVoiceDecisionRef.current();
      speakRef.current?.(
        ackPack.decisionAck,
        () => { speakRef.current?.(feedbackText, undefined, { useOpenAI: true }); },
        { interrupt: true, ...(ackUri ? { preFetchedUri: ackUri } : { useOpenAI: true }) },
      );
    }
    // Leitung: Entscheidung an alle Mitglieder verteilen.
    if (istGruppenleitung) {
      sendGroupHikeEvent({
        kind: "decision",
        chapterIndex: currentIndex,
        optionIndex,
      });
    }
  };

  // Gesprochene Aufforderung, sobald ein Entscheidungspunkt aktiv ist und
  // die Kapitel-Erzaehlung geendet hat: spricht einmalig den decisionVoicePrompt
  // vor, damit Wandernde auch ohne Blick aufs Display wissen, dass sie jetzt
  // sprechen koennen. Ein Ref verhindert, dass dieselbe Aufforderung mehrfach
  // abgespielt wird (z. B. bei kurzem speaking-Flackern).
  const promptedDecisionRef = useRef<number>(-1);
  useEffect(() => {
    if (!awaitingDecision || speaking) return;
    if (promptedDecisionRef.current === currentIndex) return;
    promptedDecisionRef.current = currentIndex;
    const pack = STORY_PACKS[resolveLang(storyLanguage)];
    // Kapitel-Daten ueber Ref lesen, NICHT aus State-Dep — sonst loest jede
    // chapters-Aenderung (z. B. chosenOptionIndex nach Wahl, Group-Sync) den
    // Effekt erneut aus und die Frage wird ein zweites Mal vorgelesen.
    const decision = decisionsRef.current[currentIndex]?.decision;
    if (decisionsRef.current[currentIndex]?.chosenOptionIndex != null) return;
    const opts = decision?.options?.map((o) => o.label) ?? [];
    const question = decision?.question;
    speakRef.current?.(pack.buildDecisionPrompt(opts, question));
  }, [awaitingDecision, speaking, currentIndex, storyLanguage]);

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
        if (n === null || n <= 1) { clearInterval(iv); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [awaitingDecision, speaking]);

  useEffect(() => {
    if (decisionCountdown !== 0 || !awaitingDecision) return;
    const opts = chapters[currentIndex]?.decision?.options ?? [];
    const defaultIdx = opts.findIndex((o) => o.isTimeoutDefault);
    chooseOptionRef.current(defaultIdx >= 0 ? defaultIdx : 0);
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
    awaitingDecision && !speaking && decisionOptions.length > 0 && !folgtGruppenleitung,
    resolveLang(storyLanguage),
    decisionOptions,
    chooseOption
  );
  stopVoiceDecisionRef.current = stopVoiceDecision;

  // Wenn die Spracherkennung endet (voiceListening: true → false), stellt
  // dieser Effekt die Audio-Session explizit zurueck. expo-speech-recognition
  // setzt intern allowsRecordingIOS (iOS Audio-Session wechselt auf
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
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: false,
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

  const finishHike = useCallback(async () => {
    await cancelNarration();
    hapticSuccess();
    if (!saga) return;
    const session: HikeSession = {
      id: `h_${Date.now()}`,
      sagaId: saga.id,
      routeId: route?.id,
      routeName: route?.name ?? saga.title,
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
        return route?.geometry;
      })(),
      photoUris: hikePhotos.length > 0 ? hikePhotos : undefined,
      visitedPois: visitedPoisRef.current.size > 0
        ? Array.from(visitedPoisRef.current.values())
        : undefined,
      recognitionEntries: recognitionEntries.length > 0 ? recognitionEntries : undefined,
    };
    await Promise.all([
      saveHike(session),
      addAchievement(saga.title, saga.id),
      clearActiveHike(),
    ]);
    router.replace("/summary");
    // App-Store-Bewertung: nach der 1. abgeschlossenen Route, dann jede 3. (1, 4, 7, …)
    const newCount = hikeHistory.length + 1;
    if (newCount % 3 === 1) {
      setTimeout(async () => {
        try {
          if (await StoreReview.isAvailableAsync()) {
            await StoreReview.requestReview();
          }
        } catch {
          // Review-Anfrage ist best-effort — Fehler still ignorieren
        }
      }, 1500);
    }
  }, [saga, route, distance, ascentM, sac, steps, hikePhotos, recognitionEntries, hikeHistory, saveHike, addAchievement, clearActiveHike, router, cancelNarration]);

  // Erlaubt den Abschluss, auch wenn die Route noch nicht ganz zurueckgelegt
  // wurde — damit Nutzer trotzdem zum Album und zum Social-Media-Posting
  // gelangen, ohne die Wanderung komplett zu Ende laufen zu muessen.
  const finishHikeEarly = useCallback(() => {
    alert(t.finishEarlyConfirmTitle, t.finishEarlyConfirmMessage, [
      { text: t.finishEarlyCancelAction, style: "cancel" },
      { text: t.finishEarlyConfirmAction, style: "destructive", onPress: finishHike },
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
    if (!hasFreshGps || !followingRecalc || !recalcGeom || recalcGeom.length < 2 || !livePos) return null;
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
  }, [followingRecalc, recalcGeom, recalcRejoinFraction, livePos, totalKm, hasFreshGps]);

  if (!saga || !profile) {
    return (
      <Background>
        <View style={styles.center}>
          <Text style={{ color: colors.foreground, fontFamily: fonts.titleBold }}>
            {t.hikeNotFound}
          </Text>
          <PrimaryButton label={t.back} variant="ghost" onPress={() => router.back()} />
        </View>
      </Background>
    );
  }

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;
  const progress = chapters.length > 1 ? currentIndex / (chapters.length - 1) : 0;
  // Fuer die Restzeit-Anzeige den kontinuierlichen Routen-Fortschritt nutzen
  // (echte GPS-Position projiziert auf die Route), statt den groben, nur an
  // Kapitelgrenzen springenden Story-Fortschritt — sonst zeigt die Restzeit
  // direkt nach einem Start mitten auf der Route faelschlich die volle
  // Wanderdauer an, bis das erste Kapitel erreicht ist.
  const timeProgress =
    hasFreshGps
      ? (recalcProgress ?? routeProgress ?? 0)
      : locState === "granted"
        ? 0
        : (totalKm > 0 ? Math.min(1, distance / totalKm) : progress);
  const currentChapter = chapters[currentIndex];

  // Eine simulierte Position darf niemals wie ein echter Live-Standort
  // aussehen. Ohne gültigen Fix bleibt der Positionsmarker daher leer.
  const shownPos = hasFreshGps ? livePos : null;
  const hudTop =
    topPad +
    (locState === "denied" ? 154 : !startReached && walkToStart && !preparing ? 98 : 4);
  const gpsAgeSec = lastLocationAtRef.current > 0
    ? Math.max(0, Math.round((locationNow - lastLocationAtRef.current) / 1000))
    : null;

  return (
    <Background>
      {/* Standort-Banner */}
      {locState === "denied" && (
        <View style={[styles.banner, { top: topPad, backgroundColor: colors.card }]}>
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
            onPress={() => Linking.openSettings?.()}
            accessibilityRole="button"
            accessibilityLabel={t.allow}
            style={[styles.bannerBtn, { borderColor: colors.glassBorder }]}
          >
            <Feather name="settings" size={14} color={colors.accent} />
            <Text style={[styles.bannerAction, { color: colors.accent }]}>{t.allow}</Text>
          </Pressable>
        </View>
      )}

      {!startReached && locState !== "denied" && walkToStart && !preparing && (
        <Animated.View
          entering={FadeIn}
          style={[styles.banner, { top: topPad, backgroundColor: colors.card, paddingVertical: 12 }]}
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
            locState === "denied" ? topPad + 148 : !startReached && walkToStart && !preparing ? topPad + 92 : topPad,
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
                <Text style={[styles.offRouteBannerTitle, { color: colors.foreground }]}>
                  {t.offRouteTitle}
                </Text>
                <Text style={[styles.offRouteBannerHint, { color: colors.mutedForeground }]}>
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
              <Pressable
                onPress={() => {
                  isOffRouteRef.current = false;
                  offRouteCountRef.current = 0;
                  setOffRoutePos(null);
                }}
                hitSlop={10}
              >
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {recalcGeom && !isRecalculating && (
              <Pressable
                onPress={() => {
                  followingRecalcRef.current = true;
                  setFollowingRecalc(true);
                  isOffRouteRef.current = false;
                  offRouteCountRef.current = 0;
                  setOffRoutePos(null);
                }}
                style={[
                  styles.offRouteFollowBtn,
                  { backgroundColor: "#E8A800" },
                ]}
              >
                <Feather name="navigation" size={14} color="#10181A" />
                <Text style={[styles.offRouteFollowText, { color: "#10181A" }]}>
                  {t.offRouteFollow}
                </Text>
              </Pressable>
            )}
          </Animated.View>
        )}
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>
              {saga.canton.toUpperCase()} · {t.live}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {saga.summaries?.[(profile?.language ?? 'de') as string]?.title ?? saga.title}
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t.back}
          >
            <Feather name="minimize-2" size={22} color={colors.mutedForeground} />
          </Pressable>
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
                  label={saga.title}
                  height={hoehe}
                  geometry={followingRecalc ? (recalcGeom ?? route?.geometry) : route?.geometry}
                  elevationProfile={!followingRecalc ? terrainProfile : null}
                  altGeometry={!followingRecalc ? recalcGeom : null}
                  offlineTiles={offlineTiles}
                  aerialways={aerialways}
                  pois={pois}
                  waterSources={waterSources.length > 0 ? waterSources : null}
                  parkingSpots={parkingSpots.length > 0 ? parkingSpots : null}
                  safeAreaInsetTop={safeAreaTop}
                  sagaPin={saga?.coordinates ? { lat: saga.coordinates.lat, lng: saga.coordinates.lng, name: saga.title } : null}
                  onPoiPress={(id) => {
                    const poi = pois.find((p) => p.id === id);
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
                    if (karteVollbild) {
                      pendingKarteActionRef.current = () => setSelectedPartner(partner);
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

        <FeatureTileDeck
          closeLabel={t.close}
          tiles={[
            {
              id: "compass",
              title: t.compass,
              icon: "compass",
              content: (
                <CompassCard
                  heading={compassHeading}
                  sagaBearing={
                    livePos && saga?.coordinates
                      ? bearingDeg(livePos, saga.coordinates)
                      : null
                  }
                  sagaName={saga?.title ?? ""}
                  available={compassAvailable}
                  direction={compassHeading == null ? null : t.compassDirections[compassIndex(compassHeading)]}
                  coordinates={livePos ? `${livePos.lat.toFixed(5)}, ${livePos.lng.toFixed(5)}` : null}
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
              title: t.panorama,
              icon: "triangle",
              content: (
                <PeakPanorama
                  peaks={panoramaPeaks}
                  heading={compassHeading}
                  hasGps={livePos !== null}
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
                  }}
                   onCaptured={addRecognitionEntry}
                />
              ),
            },
            {
              id: "object-recognition",
              title: objectRecognitionT.title,
              icon: "maximize",
              modalSize: "large",
              content: (
                <ObjectRecognition
                  premium={premium}
                  strings={objectRecognitionT}
                  getToken={() => getTokenRef.current()}
                  language={storyLanguage}
                  lat={livePos?.lat}
                  lng={livePos?.lng}
                  heading={compassHeading}
                  nearbyContext={objectRecognitionContext}
                   onAnalyzed={addRecognitionEntry}
                />
              ),
            },
          ]}
        />

        {/* Live entdeckter Ort in der Naehe (Wikipedia/OSM) */}
        {nearbyPoi && (
          <Animated.View entering={FadeIn}>
            <Glass style={{ marginTop: 14 }} overlayColor={poiOverlay}>
              {/* Ladeindikator solange Wiki noch nicht da; Bild sobald fertig */}
              {nearbyPoiWiki === undefined ? (
                <View style={[styles.poiCardImage, { alignItems: "center", justifyContent: "center" }]}>
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  {!nearbyPoiWiki?.image && nearbyPoiWiki !== undefined && (
                    <Feather name="map-pin" size={22} color={colors.accent} />
                  )}
                  <Text style={[styles.poiEyebrow, { color: colors.accent }]}>
                    {t.discoveredNearby}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setNearbyPoi(null)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t.close}
                >
                  <Feather name="x" size={22} color={colors.mutedForeground} />
                </Pressable>
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



        {/* Statusleiste in Frozen Glass */}
        <Glass style={{ marginTop: 14 }}>
          <View style={styles.statBar}>
            <Metric label={t.metricDistance} value={distance.toFixed(1)} unit={t.unitKm} />
            <Metric label={t.metricHeight} value={`${Math.round(timeProgress * ascentM)}`} unit={t.unitHm} />
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

          {routeWaypoints.length > 0 && (
            <View style={[styles.waypointsRow, { borderTopColor: colors.glassBorder }]}>
              {routeWaypoints.map((wp) => {
                const reached = reachedWaypointIds.has(wp.id);
                return (
                  <View key={wp.id} style={styles.waypointChip}>
                    <Feather
                      name={wp.type === "partner" ? "coffee" : "map-pin"}
                      size={11}
                      color={reached ? colors.accent : colors.mutedForeground}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.waypointName, { color: reached ? colors.accent : colors.mutedForeground }]}
                    >
                      {wp.name}
                    </Text>
                    {reached && <Feather name="check" size={11} color={colors.accent} />}
                  </View>
                );
              })}
            </View>
          )}

        </Glass>

        {/* Story-Bereich */}
        {preparing ? (
          <View style={styles.preparing}>
            <SparkMountain size={90} pulsing />
            <Text style={[styles.preparingText, { color: colors.mutedForeground }]}>
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
                      speak(currentChapter.text, undefined, { interrupt: true });
                    }
                  }}
                  style={[styles.playBtn, { borderColor: colors.glassBorder }]}
                  accessibilityRole="button"
                  accessibilityLabel={t.repeatChapter}
                >
                  <Feather name="rotate-ccw" size={16} color={colors.foreground} />
                  <Text style={[styles.playText, { color: colors.foreground }]}>
                    {t.repeatChapter}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (speaking) {
                      cancelNarration();
                    } else if (currentChapter) {
                      speak(currentChapter.text, undefined, { interrupt: true });
                    }
                  }}
                  style={[styles.playBtn, { borderColor: colors.glassBorder }]}
                  accessibilityRole="button"
                  accessibilityLabel={speaking ? t.pause : t.readAloud}
                >
                  <Feather
                    name={speaking ? "pause" : "play"}
                    size={16}
                    color={colors.foreground}
                  />
                  <Text style={[styles.playText, { color: colors.foreground }]}>
                    {speaking ? t.pause : t.readAloud}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Text style={[styles.storyText, { color: colors.foreground }]}>
              {currentChapter?.text}
            </Text>

            {narrationUnavailable && (
              <Text style={[styles.narrationUnavailable, { color: colors.accent }]}>
                {t.narrationUnavailable}
              </Text>
            )}

            {/* Waypoint-Foto-Button — immer sichtbar */}
            <View style={styles.photoRow}>
              <PrimaryButton
                variant="secondary"
                style={{ flex: 1 }}
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

              {/* Thumbnail-Strip der aufgenommenen Fotos */}
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
                        <View style={[styles.photoThumbBadge, { backgroundColor: colors.primary }]}>
                          <Feather name="check" size={8} color="#fff" />
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* GPS-Foto-Challenge */}
            {showPhotoChallenge && (
              <Animated.View entering={FadeInUp} exiting={FadeOut} style={styles.photoChallengeWrap}>
                <View style={[styles.photoChallengePanel, { borderColor: colors.accent, backgroundColor: colors.glassBgStrong }]}>
                  <View style={styles.photoChallengeHeader}>
                    <Feather name="camera" size={18} color={colors.accent} />
                    <Text style={[styles.photoChallengeTitel, { color: colors.accent }]}>
                      {STORY_PACKS[resolveLang(storyLanguage)].photoChallengePrompt}
                    </Text>
                  </View>
                  <View style={styles.photoChallengeActions}>
                    <Pressable
                      onPress={takePhoto}
                      style={[styles.photoChallengeBtn, { borderColor: colors.accent, backgroundColor: colors.accent }]}
                      accessibilityRole="button"
                    >
                      <Feather name="camera" size={15} color="#fff" />
                      <Text style={[styles.photoChallengeBtnText, { color: "#fff" }]}>
                        {t.photoTake}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowPhotoChallenge(false)}
                      style={[styles.photoChallengeBtn, { borderColor: colors.glassBorder }]}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.photoChallengeBtnText, { color: colors.mutedForeground }]}>
                        {t.photoSkip}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Entscheidungspanel */}
            {awaitingDecision && currentChapter?.decision && (
              <Animated.View entering={FadeInUp} style={styles.decisionWrap}>
                <View
                  style={[
                    styles.decisionPanel,
                    { borderColor: colors.primary, backgroundColor: colors.glassBgStrong },
                  ]}
                >
                  <Text style={[styles.decisionLabel, { color: colors.primary }]}>
                    {t.perception}
                  </Text>
                  <Text style={[styles.decisionQuestion, { color: colors.foreground }]}>
                    {currentChapter.decision.question}
                  </Text>
                  {/* Countdown-Balken */}
                  {decisionCountdown !== null && !folgtGruppenleitung && (
                    <View style={styles.countdownRow}>
                      <View style={[styles.countdownBar, { backgroundColor: colors.glassBorder }]}>
                        <View
                          style={[
                            styles.countdownFill,
                            {
                              backgroundColor: decisionCountdown <= 5 ? colors.destructive : colors.primary,
                              width: `${(decisionCountdown / 30) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.countdownNum, { color: decisionCountdown <= 5 ? colors.destructive : colors.mutedForeground }]}>
                        {decisionCountdown}
                      </Text>
                    </View>
                  )}
                  {folgtGruppenleitung && (
                    <View style={styles.voiceHintRow}>
                      <Feather name="users" size={14} color={colors.accent} />
                      <Text style={[styles.voiceHintText, { color: colors.accent }]}>
                        {t.leaderDecides}
                      </Text>
                    </View>
                  )}
                  {!folgtGruppenleitung && voiceSupported && (
                    <View style={styles.voiceHintRow}>
                      <Feather
                        name="mic"
                        size={14}
                        color={voiceListening ? colors.primary : colors.accent}
                      />
                      <Text style={[styles.voiceHintText, { color: colors.accent }]}>
                        {voiceListening ? t.voiceListening : t.voiceOrTap}
                      </Text>
                    </View>
                  )}
                  {!folgtGruppenleitung && voiceSupported && voiceTranscript ? (
                    <Text style={[styles.voiceHintText, { color: colors.mutedForeground, marginBottom: 8 }]} numberOfLines={1}>
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
                      <Text style={[styles.optionLabel, { color: colors.foreground }]}>
                        {opt.label}
                      </Text>
                      <Text style={[styles.optionHint, { color: colors.accent }]}>
                        {opt.archetypeHint}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            )}

            {choiceFeedback && (
              <Animated.View entering={FadeInUp} style={styles.choiceFeedbackWrap}>
                <View
                  style={[
                    styles.choiceFeedbackPanel,
                    { borderColor: colors.primary, backgroundColor: colors.glassBgStrong },
                  ]}
                >
                  <Feather name="check-circle" size={16} color={colors.primary} />
                  <Text style={[styles.choiceFeedbackText, { color: colors.foreground }]}>
                    {choiceFeedback}
                  </Text>
                </View>
              </Animated.View>
            )}

            {finished && (
              <PrimaryButton
                label={t.finishHike}
                onPress={finishHike}
                style={{ marginTop: 24 }}
              />
            )}

            {!finished && !preparing && (
              <PrimaryButton
                label={t.finishEarlyButton}
                variant="ghost"
                onPress={finishHikeEarly}
                style={{ marginTop: 12 }}
              />
            )}
          </Animated.View>
        )}

        {/* ── Wegbedingungen melden ─────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>
          <View style={[styles.conditionDivider, { backgroundColor: colors.glassBorder }]} />
          {conditionSubmitResult === "ok" && (
            <Text style={[styles.conditionSuccess, { color: colors.accent }]}>
              {t.conditionSubmitted}
            </Text>
          )}
          {(conditionSubmitResult === "ratelimit" || conditionSubmitResult === "error") && (
            <Text style={[styles.conditionError, { color: colors.destructive }]}>
              {conditionSubmitResult === "ratelimit" ? t.conditionRateLimit : t.conditionError}
            </Text>
          )}
          {showConditionForm ? (
            <Animated.View entering={FadeIn.duration(200)}>
              <View style={styles.conditionChips}>
                {(["excellent", "clear", "muddy", "snow", "icy", "blocked"] as const).map((lvl) => (
                  <Pressable
                    key={lvl}
                    onPress={() => setSelectedCondition(lvl)}
                    style={[
                      styles.conditionChip,
                      {
                        borderColor: selectedCondition === lvl ? colors.accent : colors.glassBorder,
                        backgroundColor: selectedCondition === lvl ? colors.accent + "22" : colors.glassBg,
                      },
                    ]}
                  >
                    <Text style={styles.conditionEmojiText}>{t.conditionEmoji[lvl]}</Text>
                    <Text style={[styles.conditionChipLabel, { color: selectedCondition === lvl ? colors.accent : colors.mutedForeground }]}>
                      {t.conditions[lvl]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={[styles.conditionInput, { color: colors.foreground, borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}
                placeholder={t.conditionNotePlaceholder}
                placeholderTextColor={colors.mutedForeground}
                value={conditionNote}
                onChangeText={setConditionNote}
                maxLength={200}
                multiline
              />
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <PrimaryButton
                  label={conditionSubmitting ? t.conditionSubmitting : t.conditionSubmit}
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
              style={{ marginTop: 8 }}
            />
          )}
        </View>
      </ScrollView>

      {/* Permanenter Navigations-HUD: GPS-Zustand bleibt sichtbar, auch wenn
          der Nutzer im Story-/Kartenbereich scrollt. */}
      <View
        style={[
          styles.hikeHud,
          { top: hudTop, backgroundColor: colors.card, borderColor: colors.glassBorder },
        ]}
      >
        <View style={styles.hikeHudStatus}>
          <View
            style={[
              styles.gpsDot,
              { backgroundColor: hasFreshGps ? colors.accent : colors.destructive },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.hikeHudTitle, { color: colors.foreground }]}>
              {hasFreshGps ? `GPS · ${t.live}` : t.noLocationAccess}
            </Text>
            <Text style={[styles.hikeHudMeta, { color: colors.mutedForeground }]}>
              {hasFreshGps
                ? `${gpsAgeSec ?? 0}s · ±${Math.round(livePosAccuracy ?? 0)} m`
                : t.locationDeniedHint}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              if (speaking) cancelNarration();
              else if (currentChapter) speak(currentChapter.text, undefined, { interrupt: true });
            }}
            accessibilityRole="button"
            accessibilityLabel={speaking ? t.pause : t.readAloud}
            style={[styles.hikeHudAction, { borderColor: colors.glassBorder }]}
          >
            <Feather name={speaking ? "pause" : "play"} size={15} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => setSosOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t.sos} — ${t.emergency}`}
            style={[styles.hikeHudSos, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.hikeHudSosText, { color: colors.primaryForeground }]}>{t.sos}</Text>
          </Pressable>
        </View>
        {hasFreshGps && livePlace ? (
          <Text style={[styles.hikeHudPlace, { color: colors.mutedForeground }]} numberOfLines={1}>
            {livePlace}
          </Text>
        ) : null}
      </View>

      {/* POI-Detail — ausserhalb ScrollView damit absoluteFill den ganzen Screen abdeckt */}
      {!!selectedPoi && (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.poiModalBackdrop]}
          onPress={() => setSelectedPoi(null)}
        >
          <Pressable style={{ width: "100%" }} onPress={(e) => e.stopPropagation()}>
            <Glass overlayColor={poiOverlay}>
              {selectedPoiWiki === undefined ? (
                <View style={[styles.poiModalImage, { alignItems: "center", justifyContent: "center" }]}>
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
                <Pressable
                  onPress={() => setSelectedPoi(null)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t.close}
                >
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </Pressable>
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
          <Pressable style={{ width: "100%" }} onPress={(e) => e.stopPropagation()}>
            <Glass overlayColor={poiOverlay}>
              {/* Titelbild — identisch mit POI-Karte (Standard + Premium mit Foto) */}
              {!!selectedPartner.fotoUrl && selectedPartner.paket !== "basic" && (
                <Image
                  source={{ uri: selectedPartner.fotoUrl }}
                  style={styles.poiCardImage}
                  resizeMode="cover"
                />
              )}

              {/* Header — Kategorie-Icon + Label */}
              <View style={styles.poiCardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flex: 1 }}>
                  <Feather
                    name={(PARTNER_KATEGORIE[selectedPartner.kategorie ?? ""] ?? PARTNER_KAT_DEFAULT).icon}
                    size={15}
                    color={colors.accent}
                  />
                  <Text style={[styles.poiEyebrow, { color: colors.accent }]}>
                    {(PARTNER_KATEGORIE[selectedPartner.kategorie ?? ""] ?? PARTNER_KAT_DEFAULT).label}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedPartner(null)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t.close}
                >
                  <Feather name="x" size={22} color={colors.mutedForeground} />
                </Pressable>
              </View>

              {/* Titel — identisch mit POI-Karte */}
              <Text style={[styles.poiTitle, { color: colors.foreground }]}>
                {selectedPartner.name}
              </Text>

              {/* Offen / Geschlossen Badge + nächste Änderung */}
              {selectedPartner.istOffen != null ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: selectedPartner.istOffen ? "#22C55E" : "#EF4444",
                  }} />
                  <Text style={{
                    fontSize: 13,
                    color: selectedPartner.istOffen ? "#22C55E" : "#EF4444",
                    fontFamily: fonts.bodyBold,
                  }}>
                    {selectedPartner.istOffen ? t.partnerOffen : t.partnerGeschlossen}
                  </Text>
                  {(() => {
                    const info = formatPartnerOeffnungsInfo(selectedPartner, t, storyLanguage);
                    return info ? (
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                        {"· "}{info}
                      </Text>
                    ) : null;
                  })()}
                </View>
              ) : null}

              {/* Beschreibung — nicht für Basic */}
              {!!(partnerTranslation?.beschreibung ?? selectedPartner.beschreibung) && selectedPartner.paket !== "basic" && (
                <Text style={[styles.poiSummary, { color: colors.foreground }]}>
                  {partnerTranslation?.beschreibung ?? selectedPartner.beschreibung}
                </Text>
              )}

              {/* Standard + Premium: Telefon, Reservierung, Website */}
              {(selectedPartner.paket === "premium" || selectedPartner.paket === "standard") && (
                <>
                  {!!selectedPartner.telefon && (
                    <Pressable
                      onPress={() => Linking.openURL(`tel:${selectedPartner.telefon}`)}
                      style={{ marginTop: 12 }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Feather name="phone" size={16} color={colors.accent} />
                        <Text style={{ color: colors.accent, fontSize: 16 }}>
                          {selectedPartner.telefon}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                  {(!!selectedPartner.reservierungUrl || !!selectedPartner.websiteUrl) && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      {!!selectedPartner.reservierungUrl && (
                        <Pressable
                          onPress={() => Linking.openURL(selectedPartner.reservierungUrl!)}
                          style={{
                            backgroundColor: colors.accent,
                            borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9,
                          }}
                        >
                          <Text style={{ color: "#fff", fontSize: 14, fontFamily: fonts.bodyBold }}>
                            {t.partnerReservierung}
                          </Text>
                        </Pressable>
                      )}
                      {!!selectedPartner.websiteUrl && (
                        <Pressable
                          onPress={() => Linking.openURL(selectedPartner.websiteUrl!)}
                          style={{
                            borderWidth: 1.5, borderColor: colors.accent,
                            borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9,
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
                      fetch(`${base}/partners/${selectedPartner.id}/tap`, { method: "POST" }).catch(() => {});
                    }
                  }}
                >
                  <View style={{
                    backgroundColor: colors.accent + "20",
                    borderRadius: 8, padding: 12, marginTop: 14,
                    borderLeftWidth: 3, borderLeftColor: colors.accent,
                  }}>
                    <Text style={{
                      fontSize: 11, color: colors.accent, fontFamily: fonts.bodyBold,
                      marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5,
                    }}>
                      {t.partnerOffer}
                    </Text>
                    <Text style={[styles.poiSummary, { color: colors.foreground, marginTop: 0 }]}>
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
        onPress={() => setSosOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t.sos} — ${t.emergency}`}
        style={[styles.sosBtn, { bottom: insets.bottom + 20, backgroundColor: colors.primary }]}
      >
        <Text style={styles.sosText}>{t.sos}</Text>
      </Pressable>

      {sosOpen && (
        <View style={styles.sosOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSosOpen(false)} />
          <Animated.View
            entering={FadeInUp}
            style={[
              styles.sosSheet,
              { paddingBottom: insets.bottom + 20, backgroundColor: colors.card },
            ]}
          >
            <View style={[styles.sosHandle, { backgroundColor: colors.glassBorder }]} />
            <Text style={[styles.sosTitle, { color: colors.foreground }]}>{t.emergency}</Text>
            <Text style={[styles.sosSub, { color: colors.mutedForeground }]}>
              {t.emergencySub}
            </Text>

            <Pressable
              onPress={() => callNumber("1414")}
              accessibilityRole="button"
              accessibilityLabel={`${t.regaTitle} — ${t.regaSub}`}
              style={[styles.sosCall, { backgroundColor: colors.primary }]}
            >
              <Feather name="phone" size={20} color={colors.primaryForeground} />
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
              <Feather name="phone" size={20} color={colors.primaryForeground} />
              <View>
                <Text style={styles.sosCallTitle}>{t.euroEmergencyTitle}</Text>
                <Text style={styles.sosCallSub}>{t.euroEmergencySub}</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                const point = (hasFreshGps ? livePos : null) ?? route?.coordinates ?? saga.coordinates;
                const coords = point
                  ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`
                  : t.unknown;
                const senderName = profile?.name?.trim() || undefined;
                const body = t.emergencySmsBody(coords, senderName);
                const phone = emergencyContact?.phone?.replace(/\s+/g, "") ?? "";
                openUrlSafely(
                  `sms:${phone}&body=${encodeURIComponent(body)}`,
                  t.smsNotAvailable
                );
              }}
              style={[styles.sosSecondary, { borderColor: colors.glassBorder }]}
              accessibilityRole="button"
              accessibilityLabel={t.sendLocationToContact}
            >
              <Feather name="share-2" size={18} color={colors.foreground} />
              <Text style={[styles.sosSecondaryText, { color: colors.foreground }]}>
                {t.sendLocationToContact}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setSosOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={t.close}
              style={styles.sosClose}
            >
              <Text style={[styles.sosCloseText, { color: colors.mutedForeground }]}>
                {t.close}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </Background>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  const colors = useColors();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.metricValRow}>
        <Text style={[styles.metricVal, { color: colors.foreground }]}>{value}</Text>
        {unit ? (
          <Text style={[styles.metricUnit, { color: colors.accent }]}>{unit}</Text>
        ) : null}
      </View>
    </View>
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
  const altitudeText = altitude == null
    ? "—"
    : `${Math.round(altitude).toLocaleString()} ${altitudeUnit}`;

  return (
    <View
      style={[
        styles.compassCard,
        { borderColor: "#8A5C34" },
      ]}
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
        <Text style={[styles.compassHint, { color: COMPASS_GOLD }]}>{unavailable}</Text>
      )}

      <View style={[styles.compassLocationData, { borderTopColor: "#704725" }]}>
        <View style={styles.compassLocationRow}>
          <Text style={[styles.compassDataLabel, { color: COMPASS_GOLD }]}>
            {placeLabel}
          </Text>
          <Text style={[styles.compassDataValue, { color: COMPASS_GOLD }]} numberOfLines={1}>
            {place ?? "—"}
          </Text>
        </View>
        <View style={styles.compassLocationRow}>
          <Text style={[styles.compassDataLabel, { color: COMPASS_GOLD }]}>
            {coordinatesLabel}
          </Text>
          <Text style={[styles.compassDataValue, { color: COMPASS_GOLD }]} numberOfLines={1}>
            {coordinates ?? "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  hikeHud: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 18,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  hikeHudStatus: { flexDirection: "row", alignItems: "center", gap: 8 },
  gpsDot: { width: 9, height: 9, borderRadius: 5 },
  hikeHudTitle: { fontFamily: fonts.bodyBold, fontSize: 12 },
  hikeHudMeta: { fontFamily: fonts.mono, fontSize: 10, marginTop: 2 },
  hikeHudPlace: { fontFamily: fonts.body, fontSize: 11, marginTop: 5, marginLeft: 17 },
  hikeHudAction: {
    width: 34,
    height: 30,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  hikeHudSos: {
    minWidth: 42,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  hikeHudSosText: { fontFamily: fonts.bodyBold, fontSize: 11 },
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
  bannerHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 6 },
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
  offRouteBannerHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
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
  headRow: { flexDirection: "row", alignItems: "flex-start" },
  eyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  title: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 2 },
  statBar: { flexDirection: "row", justifyContent: "space-between" },
  waypointsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  waypointChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "48%",
  },
  waypointName: {
    fontFamily: fonts.body,
    fontSize: 11,
    flex: 1,
  },
  metric: { alignItems: "flex-start" },
  metricLabel: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1 },
  metricValRow: { flexDirection: "row", alignItems: "baseline", gap: 3, marginTop: 3 },
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
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  compassCardShade: {
    ...StyleSheet.absoluteFillObject,
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
    ...StyleSheet.absoluteFillObject,
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
  compassLegendText: { color: COMPASS_GOLD, fontFamily: COMPASS_ANTIQUE_FONT, fontSize: 10 },
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
  compassHint: { fontFamily: COMPASS_ANTIQUE_FONT, fontSize: 13, lineHeight: 18 },
  compassUnavailableRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
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
  compassDataLabel: { fontFamily: COMPASS_ANTIQUE_FONT, fontSize: 9, letterSpacing: 1 },
  compassDataValue: { fontFamily: COMPASS_ANTIQUE_FONT, fontSize: 12, flexShrink: 1, textAlign: "right" },
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
  poiSummary: { fontFamily: fonts.story, fontSize: 18, marginTop: 8, lineHeight: 28 },
  poiModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16,24,26,0.7)",
    justifyContent: "center",
    padding: 16,
  },
  poiModalImage: { width: "100%", height: 200, borderRadius: 10, marginBottom: 12 },
  storyWrap: { marginTop: 24 },
  chapterActions: { flexDirection: "row", gap: 8 },
  chapterHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  chapterMark: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  playBtn: { ...GLAS_3D,
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
  conditionDivider: { height: 1, marginVertical: 16 },
  conditionChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  conditionChip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  conditionEmojiText: { fontSize: 18, lineHeight: 22 },
  conditionChipLabel: { fontFamily: fonts.body, fontSize: 13 },
  conditionInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontFamily: fonts.body, fontSize: 13, minHeight: 72, textAlignVertical: "top", marginTop: 4 },
  conditionSuccess: { fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: 8, textAlign: "center" },
  conditionError: { fontFamily: fonts.body, fontSize: 12, marginTop: 8 },
  choiceFeedbackWrap: { marginTop: 16 },
  choiceFeedbackPanel: { ...GLAS_3D,
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
  decisionQuestion: { fontFamily: fonts.titleBold, fontSize: 20, marginTop: 6, marginBottom: 14 },
  voiceHintRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  voiceHintText: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1 },
  optionBtn: { ...GLAS_3D, borderWidth: 1, borderRadius: 12, padding: 15, marginBottom: 10 },
  optionLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21 },
  optionHint: { fontFamily: fonts.mono, fontSize: 11, marginTop: 5 },
  photoRow: { flexDirection: "row", alignItems: "center", marginTop: 20, gap: 10, flexWrap: "wrap" },
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
  photoStrip: { flex: 1, maxHeight: 52 },
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
  photoChallengePanel: { ...GLAS_3D, borderWidth: 1, borderRadius: 16, padding: 18 },
  photoChallengeHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 14 },
  photoChallengeTitel: { fontFamily: fonts.bodyMedium, fontSize: 15, flex: 1, lineHeight: 22 },
  photoChallengeActions: { flexDirection: "row", gap: 10 },
  photoChallengeBtn: { ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  photoChallengeBtnText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  countdownBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  countdownFill: { height: 4, borderRadius: 2 },
  countdownNum: { fontFamily: fonts.monoBold, fontSize: 14, minWidth: 22, textAlign: "right" },
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
    ...StyleSheet.absoluteFillObject,
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
  sosSub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 4, marginBottom: 18 },
  sosCall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sosCallTitle: { fontFamily: fonts.titleBold, fontSize: 18, color: "#F5F3EC" },
  sosCallSub: { fontFamily: fonts.body, fontSize: 12, color: "rgba(245,243,236,0.8)" },
  sosSecondary: { ...GLAS_3D,
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
  sosCloseText: { fontFamily: fonts.bodyMedium, fontSize: 15 },
});
