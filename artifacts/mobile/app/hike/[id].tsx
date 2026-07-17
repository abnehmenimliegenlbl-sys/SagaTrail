import { Feather } from "@expo/vector-icons";
import {
  createNarration,
  getAerialways,
  getPartners,
  getPois,
  getPoiStory,
  getRouteSurfaces,
  getWeather,
  useGetRouteConditions,
  reportRouteCondition,
} from "@workspace/api-client-react";
import type { Partner, Poi, RouteSurfacePoint, TrailConditionReport, WeatherReport } from "@workspace/api-client-react";
import { getApiBaseUrl } from "../../lib/apiConfig";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { hapticDoublePulse, hapticHeavy, hapticMedium, hapticSuccess } from "@/lib/haptics";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pedometer } from "expo-sensors";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { SparkMountain } from "@/components/brand/SparkMountain";
import { SwisstopoMap } from "@/components/brand/SwisstopoMap";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useDownloads } from "@/contexts/DownloadContext";
import { useColors } from "@/hooks/useColors";
import { useHikeStrings } from "@/lib/i18n/screens/hike";
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
  subscribeToBackgroundLocation,
} from "@/lib/backgroundLocation";
import { bboxAroundGeometry, bearingDeg, compassIndex, decodePolyline6, distanzZuSegmentKm, fortschrittAufRoute, haversineKm } from "@/lib/geo";
import { computeRouteWaypoints, type RouteWaypoint } from "@/lib/routeWaypoints";
import {
  effectiveStoryLanguage,
  resolveLang,
  STORY_PACKS,
  trimForNarration,
  type WetterKlasse,
} from "@/lib/storyContent";
import { blobToTempFileUri } from "@/lib/narrationAudio";
import * as FileSystem from "expo-file-system/legacy";
import { detectNavigationCues, NavigationCue } from "@/lib/navigationCues";
import {
  bereiteAbbiegeMitteilungenVor,
  sendeAbbiegeMitteilung,
  sendePoiMitteilung,
} from "@/lib/turnNotifications";
import { useVoiceDecision } from "@/lib/useVoiceDecision";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@clerk/expo";
import { uploadWaypointPhoto, waypointPhotoUrl } from "@/lib/waypointPhotoUpload";
import { HikeSession, LatLng, StoryChapter } from "@/types";

const WEB_TOP = 67;
const TICK_MS = 4500; // Simulierter Fortschritt pro Wegpunkt (nur ohne echtes GPS)

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
/** Mindestanzahl Punkte damit der Live-Track statt der Routen-Geometrie verwendet wird. */
const MIN_TRACK_POINTS = 5;

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
 * mit einem 10-Hz-Infraschall-Sinus. Der Ton ist fuer Menschen voellig
 * unhoerbar (Hoerschwelle ~20 Hz), aber liefert echte, nicht-stille PCM-Werte
 * an den Bluetooth-Codec. Viele Auto-Radios (A2DP) erkennen digitale Stille
 * (alle Samples = 128) als "nichts spielt" und deaktivieren den Stream; der
 * naechste Ton kommt dann nicht mehr durch die Autolautsprecher. Ein echtes
 * (wenn auch unhoerabares) Audiosignal haelt den A2DP-Stream aktiv.
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
  // 10-Hz-Infraschall-Sinus: Period = 800 Samples bei 8 kHz.
  // Amplitude 30 (von max. 127) → mit volume:0.008 ergibt das ~0.2 %
  // des Vollausschlags — fuer jeden Lautsprecher und jeden Kopfhoerer
  // absolut unhoorbar, aber der Bluetooth-Encoder sieht nichttriviale Werte.
  const freq = 10; // Hz
  const amp = 30;  // 0..127
  for (let i = 0; i < numSamples; i++) {
    buf[44 + i] = 128 + Math.round(amp * Math.sin(2 * Math.PI * freq * i / sampleRate));
  }
  let s = '';
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(buf).toString('base64');
}

type LocState = "idle" | "granted" | "denied" | "simulated";

export default function LiveHike() {
  const colors = useColors();
  const t = useHikeStrings();
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
  const { resolveStory, loadOfflineTiles, isDownloaded } = useDownloads();

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
  const [finished, setFinished] = useState(false);
  const [offlineTiles, setOfflineTiles] = useState<Record<string, string> | null>(null);
  const [aerialways, setAerialways] = useState<
    { id: string; geometry: number[][] }[] | null
  >(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [routeWaypoints, setRouteWaypoints] = useState<RouteWaypoint[]>([]);
  const [reachedWaypointIds, setReachedWaypointIds] = useState<ReadonlySet<string>>(new Set());
  const waypointAnnouncedRef = useRef<Set<string>>(new Set());
  const [nearbyPoi, setNearbyPoi] = useState<Poi | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [, setKarteVollbild] = useState(false);
  const [karteCloseSignal, setKarteCloseSignal] = useState(0);
  // Aktion, die nach vollstaendigem Schliessen der Vollbild-Karte ausgefuehrt
  // werden soll (z. B. POI- oder Partner-Detail oeffnen). Wird in onFullyClosed
  // des KarteVollbild-Modals konsumiert — nie direkt nach closeSignal, da der
  // Karten-Modal waehrend seiner Fade-Animation noch Touches abfaengt und der
  // X-Button des Detail-Modals sonst nicht reagiert.
  const pendingKarteActionRef = React.useRef<(() => void) | null>(null);
  const [poiStory, setPoiStory] = useState<string | null>(null);
  const [poiStoryLoading, setPoiStoryLoading] = useState(false);
  // KI-Kontext fuer die "Entdeckt"-Karte, wenn der POI keinen
  // Wikipedia-Auszug hat (wird im Erzaehl-Effekt mitbefuellt).
  const [nearbyPoiKontext, setNearbyPoiKontext] = useState<string | null>(null);
  const [narrationUnavailable, setNarrationUnavailable] = useState(false);
  // Feature: Foto-Challenge + Waypoint-Fotos
  const [hikePhotos, setHikePhotos] = useState<string[]>([]);
  const [photoObjectPaths, setPhotoObjectPaths] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUploadFeedback, setPhotoUploadFeedback] = useState<"ok" | "error" | null>(null);
  const [showPhotoChallenge, setShowPhotoChallenge] = useState(false);
  const photoChallengeShownRef = useRef(false);
  const [rawSurfacePoints, setRawSurfacePoints] = useState<RouteSurfacePoint[]>([]);
  const notifiedSurfaceFractionsRef = useRef<Set<number>>(new Set());
  const notifiedMilestonesRef = useRef<Set<number>>(new Set());
  // Feature: Entscheidungs-Countdown
  const [decisionCountdown, setDecisionCountdown] = useState<number | null>(null);
  // Live-Wetter am Wanderungsstart — wird einmalig geladen, sobald Route-Koordinaten bekannt sind.
  const [hikeWeather, setHikeWeather] = useState<WeatherReport | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decisionsRef = useRef<StoryChapter[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const lastFixRef = useRef<LatLng | null>(null);
  /** Aufgezeichneter GPS-Track: [lat, lng]-Paare im zeitlichen Abstand >= TRACK_LOG_INTERVAL_MS */
  const posLogRef = useRef<[number, number][]>([]);
  const lastTrackLogTimeRef = useRef<number>(0);
  /** Ref auf die aktuelle Routen-Geometrie — ermoeglicht Zugriff aus handleFix (leere Deps). */
  const routeGeomRef = useRef<number[][] | null | undefined>(null);
  /** true waehrend der Nutzer als "vom Weg" gilt — verhindert doppeltes Ausloesen. */
  const isOffRouteRef = useRef(false);
  /** Synchrones Flag: User hat die neu berechnete Route akzeptiert —
   *  verhindert dass setOffRoutePos(null) den recalcGeom-State loescht. */
  const followingRecalcRef = useRef(false);
  /** Zaehler aufeinanderfolgender GPS-Fixes ausserhalb der Route. */
  const offRouteCountRef = useRef(0);
  const lastNarratedRef = useRef<number>(-1);
  const announcedPoiIdsRef = useRef<Set<string>>(new Set());
  const narratedPoiIdRef = useRef<string | null>(null);
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
  const narrationQueueRef = useRef<Array<{ text: string; onFinished?: () => void }>>([]);

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
  const greetingPrefix = useMemo(() => {
    const pack = STORY_PACKS[resolveLang(storyLanguage)];
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
  // aktiviertem Stummschalter (iOS) hoerbar ist. Ohne diese Einstellung
  // bleibt AVSpeechSynthesizer auf manchen Geraeten komplett lautlos, obwohl
  // die Wiedergabe technisch laeuft (Button/Status wirken dann funktionslos).
  // staysActiveInBackground: true ist die eigentliche Voraussetzung dafuer,
  // dass die Erzaehlung (KI-Stimme via expo-av UND die on-device Stimme via
  // expo-speech, die dieselbe iOS-Audiosession nutzt) weiterlaeuft, wenn die
  // App in den Hintergrund geht oder das Display gesperrt wird — zusammen
  // mit UIBackgroundModes "audio" (app.json) und, fuer echte GPS-Fortschritte
  // im Hintergrund, dem Standort-Foreground-Service (siehe unten).
  // DuckOthers statt MixWithOthers: laeuft im Hintergrund z. B. Musik/ein
  // Podcast, wird diese waehrend der Erzaehlung leiser gedreht statt in
  // voller Lautstaerke weiterzulaufen, und danach wieder normal laut.
  useEffect(() => {
    // MixWithOthers als Standard: zwischen Kapiteln laeuft nur der stille
    // Keepalive-Loop, der Musik anderer Apps NICHT dauerhaft ducken soll.
    // Waehrend einer Erzaehlung (speak()) wird dynamisch auf DuckOthers
    // gewechselt und danach wieder zurueck — so bleibt Musik im Hintergrund
    // normal laut, ausser wenn gerade wirklich gesprochen wird.
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
    if (Platform.OS === "web" || preparing) return;
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
          // volume: 0.008 statt 0 — der 10-Hz-Infraschall-Sinus wird mit
          // ~0.2 % Amplitude wiedergegeben (absolut unhoorbar), aber der
          // Bluetooth-A2DP-Encoder sieht echte, nicht-stille PCM-Werte und
          // haelt den Datenstrom zum Auto-Radio aktiv. volume:0 erzeugt
          // digitale Stille (alle Samples × 0 = 0), was viele Car-Radios
          // als "nichts spielt" werten und den A2DP-Stream pausieren.
          { shouldPlay: true, isLooping: true, volume: 0.008 }
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
  }, [preparing]);

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
    const bbox = bboxAroundGeometry(route?.geometry, center, 0.5);
    // Nur POIs im 300-m-Korridor um die Strecke behalten — Orte weiter weg
    // liegen nicht am Weg und wuerden die Karte und Ansagen verwaessern.
    // (100 m erwies sich im Feldtest als zu eng: auf 7 km nur 2 POIs.)
    // Gemessen wird gegen die Liniensegmente (nicht nur Stuetzpunkte), da die
    // gespeicherte Geometrie ausgeduennt ist und Segmente >100 m lang sein koennen.
    const KORRIDOR_KM = 0.5;
    const geo = route?.geometry;

    const filterAndSet = (result: Awaited<ReturnType<typeof getPois>>) => {
      const gefiltert =
        geo && geo.length > 1
          ? result.filter((p) => {
              const punkt = { lat: p.lat, lng: p.lng };
              for (let i = 0; i < geo.length - 1; i++) {
                if (
                  distanzZuSegmentKm(
                    punkt,
                    { lat: geo[i][0], lng: geo[i][1] },
                    { lat: geo[i + 1][0], lng: geo[i + 1][1] }
                  ) <= KORRIDOR_KM
                ) {
                  return true;
                }
              }
              return false;
            })
          : result;
      if (!cancelled) setPois(gefiltert);
    };

    // Bei Netzfehler ODER leerem Ergebnis (transienter Overpass-Timeout-Cache)
    // wird automatisch nachgeladen: sofort, dann alle 60 s — max. 10 Versuche.
    // 60 s > 30 s Server-Error-Cache, damit der naechste Versuch echte Daten
    // bekommt und nicht wieder den abgelaufenen Cache trifft.
    const MAX_RETRIES = 10;
    const RETRY_INTERVAL_MS = 60_000;
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

    tryLoad();

    return () => {
      cancelled = true;
      if (retryTimer !== null) clearTimeout(retryTimer);
    };
  }, [route?.id, route?.geometry, route?.coordinates, saga?.coordinates, mapCenter?.lat, mapCenter?.lng]);

  // Aktive Partnerbetriebe (Restaurants, Souvenirlaeden, ...) im Kartenausschnitt
  // laden — gleiche Bounding Box wie die Seilbahnen, kein Korridorfilter noetig,
  // da Partner ohnehin nur vereinzelt gepflegt werden.
  useEffect(() => {
    const center = route?.coordinates ?? saga?.coordinates ?? mapCenter;
    if (!center) return;
    let cancelled = false;
    const bbox = bboxAroundGeometry(route?.geometry, center);
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

  // Zwischenziele entlang der Route berechnen: Partner (Prio) + POIs,
  // max. 3, innerhalb 100 m Routenabstand.
  useEffect(() => {
    const geom = route?.geometry;
    if (!geom || geom.length < 2) return;
    if (pois.length === 0 && partners.length === 0) return;
    const wps = computeRouteWaypoints(geom, partners, pois);
    setRouteWaypoints(wps);
    waypointAnnouncedRef.current = new Set();
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
  const handleFix = useCallback((lat: number, lng: number, accuracy: number | null = null) => {
    const cur: LatLng = { lat, lng };
    setLivePos(cur);
    setLivePosAccuracy(accuracy);
    const prev = lastFixRef.current;
    if (prev) {
      const d = haversineKm(prev, cur);
      // GPS-Rauschen (<3 m) und unrealistische Spruenge (>500 m) ignorieren
      if (d > 0.003 && d < 0.5) {
        setDistance((x) => x + d);
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
    getPoiStory({
      name: selectedPoi.name,
      extract: selectedPoi.wiki?.extract,
      kind: selectedPoi.kind,
      lang: storyLanguage,
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
    return () => {
      cancelled = true;
    };
  }, [selectedPoi, storyLanguage]);

  // Partner-View-Tracking: sobald das Overlay erscheint, einmal fire-and-forget.
  useEffect(() => {
    if (!selectedPartner?.id) return;
    const base = getApiBaseUrl() ?? "";
    fetch(`${base}/partners/${selectedPartner.id}/view`, { method: "POST" }).catch(() => {});
  }, [selectedPartner?.id]);

  // POI-Panel automatisch schliessen, wenn der Nutzer mindestens 500 m vom
  // gewaehlten POI entfernt ist, oder wenn ein neuer POI in der Naehe auftaucht.
  const POI_AUTO_CLOSE_KM = 0.5; // manuell angetipptes Detail-Panel
  useEffect(() => {
    if (!selectedPoi) return;
    // Neuer nearby-POI erschienen (nicht derselbe) → Panel schliessen
    if (nearbyPoi && nearbyPoi.id !== selectedPoi.id) {
      setSelectedPoi(null);
      return;
    }
    // Nutzer ist 500 m+ vom gewaehlten POI entfernt → Panel schliessen
    if (livePos) {
      const dist = haversineKm(livePos, { lat: selectedPoi.lat, lng: selectedPoi.lng });
      if (dist >= POI_AUTO_CLOSE_KM) {
        setSelectedPoi(null);
      }
    }
  }, [livePos, nearbyPoi, selectedPoi]);

  // nearbyPoi automatisch ausblenden, sobald der Nutzer sich mehr als 200 m
  // vom entdeckten POI entfernt hat (doppelte Hysterese zur 100-m-Erkennungs-
  // zone). Ohne diesen Effekt bleibt die Karte permanent stehen und blockiert
  // das Erscheinen des naechsten POI, weil narratedPoiIdRef nie zurueckgesetzt
  // werden kann.
  const NEARBY_POI_HIDE_KM = 0.5;
  useEffect(() => {
    if (!nearbyPoi || !livePos) return;
    const dist = haversineKm(livePos, { lat: nearbyPoi.lat, lng: nearbyPoi.lng });
    if (dist >= NEARBY_POI_HIDE_KM) {
      setNearbyPoi(null);
    }
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
  const speakRef = useRef<((text: string, onFinished?: () => void, opts?: { interrupt?: boolean }) => Promise<void>) | null>(null);
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
    if (!turnNotifsReady || turnCues.length === 0) return;
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
      // Sprachansage kurz vor der Abbiegung — reiht sich in die Warteschlange
      // ein, damit eine laufende Kapitel-Erzaehlung nicht unterbrochen wird.
      const pack = STORY_PACKS[resolveLang(storyLanguage)];
      speakRef.current?.(pack.turnVoice(treffer.cue.direction));
    }
  }, [livePos, distance, totalKm, route?.geometry, turnCues, turnNotifsReady, t, storyLanguage]);

  // Erkennt, ob die aktuelle Position (echtes GPS oder entlang des Weges
  // interpoliert) nahe an einem geladenen POI liegt, und zeigt ihn genau
  // einmal je Wanderung als Karte an ("live entlang der Route entdeckt").
  useEffect(() => {
    if (pois.length === 0) return;
    // Solange ein POI aktiv angezeigt/erzaehlt wird, keinen neuen suchen:
    // mehrere POIs in 300-m-Naehe wuerden sonst die laufende Ansage
    // unterbrechen und den POI mehrfach vorgelesen klingen lassen.
    if (nearbyPoi) return;
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
    const NEARBY_KM = 0.3;
    const hit = pois.find(
      (poi) =>
        !announcedPoiIdsRef.current.has(poi.id) &&
        haversineKm(current, { lat: poi.lat, lng: poi.lng }) <= NEARBY_KM
    );
    if (hit) {
      announcedPoiIdsRef.current.add(hit.id);
      setNearbyPoi(hit);
    }
  }, [livePos, distance, totalKm, route?.geometry, pois, nearbyPoi]);

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

  // GPS-Foto-Challenge: sobald der Wanderer den Herzort der Sage betritt
  // (150-m-Radius um die Sagen-Koordinate), erscheint einmalig eine
  // Aufforderung, diesen besonderen Ort zu fotografieren.
  useEffect(() => {
    if (!livePos || !saga?.coordinates || photoChallengeShownRef.current) return;
    const dist = haversineKm(livePos, saga.coordinates);
    if (dist <= 0.15) {
      photoChallengeShownRef.current = true;
      setShowPhotoChallenge(true);
      const pack = STORY_PACKS[resolveLang(storyLanguage)];
      speakRef.current?.(pack.photoChallengePrompt);
    }
  }, [livePos, saga?.coordinates, storyLanguage]);

  // Wegoberflaechenansage: sobald der Wanderer einen neuen Oberflaechenabschnitt betritt,
  // wird ein saga-atmosphaerischer Satz gesprochen (und optional als Push-Notif gesendet).
  useEffect(() => {
    if (surfacePoints.length === 0 || preparing) return;
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
        const pack = STORY_PACKS[resolveLang(storyLanguage)];
        const text = pack.surfaceTransitionPhrase(sp.surface);
        if (turnNotifsReadyRef.current && profile?.navAnnouncementsEnabled !== false) {
          sendeAbbiegeMitteilung(t.surfaceChangeTitle, text);
        }
        speakRef.current?.(text);
      }
    }
  }, [livePos, distance, totalKm, surfacePoints, storyLanguage, profile?.navAnnouncementsEnabled, preparing, t, route?.geometry]);

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
    if (preparing || totalKm <= 0) return;
    const fraction = Math.min(1, distance / totalKm);
    const milestones = [25, 50, 75] as const;
    for (const pct of milestones) {
      if (fraction * 100 >= pct && !notifiedMilestonesRef.current.has(pct)) {
        notifiedMilestonesRef.current.add(pct);
        const pack = STORY_PACKS[resolveLang(storyLanguage)];
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
              lang: storyLanguage,
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
              speakRef.current?.(text);
            })
            .catch(() => {
              clearTimeout(timeout);
              if (turnNotifsReadyRef.current && profile?.navAnnouncementsEnabled !== false) {
                sendeAbbiegeMitteilung(t.milestoneTitle, fallback);
              }
              speakRef.current?.(fallback);
            });
        } else {
          if (turnNotifsReadyRef.current && profile?.navAnnouncementsEnabled !== false) {
            sendeAbbiegeMitteilung(t.milestoneTitle, fallback);
          }
          speakRef.current?.(fallback);
        }
      }
    }
  }, [distance, totalKm, storyLanguage, saga, profile?.name, profile?.navAnnouncementsEnabled, preparing, t]);

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
          setPhotoObjectPaths((prev) => [...prev, uploaded.objectPath]);
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
    let cancelled = false;

    (async () => {
      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          webId = navigator.geolocation.watchPosition(
            (p) => {
              if (cancelled) return;
              setLocState("granted");
              handleFix(p.coords.latitude, p.coords.longitude, p.coords.accuracy ?? null);
            },
            () => {
              if (!cancelled) setLocState("simulated");
            },
            { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
          );
        } else {
          setLocState("simulated");
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
        // Sofort einen ersten Fix holen, damit auch ein stillstehendes Geraet
        // (z. B. zuhause beim Testen) direkt einen Positionsmarker zeigt — der
        // watchPositionAsync-distanceInterval liefert sonst erst nach Bewegung.
        try {
          const first = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (!cancelled)
            handleFix(first.coords.latitude, first.coords.longitude, first.coords.accuracy ?? null);
        } catch {
          // Kein Sofort-Fix moeglich — watchPositionAsync uebernimmt.
        }
        if (cancelled) return;

        // Energiesparmodus: groebere GPS-Genauigkeit und seltenere Fixes
        // schonen den Akku spuerbar auf langen Touren.
        const trackingOptions: Location.LocationOptions = energiesparmodus
          ? { accuracy: Location.Accuracy.Low, distanceInterval: 20, timeInterval: 10000 }
          : { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 };

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
          unsubscribeBackground = subscribeToBackgroundLocation(handleFix);
        } else {
          // Rueckfall: normale Vordergrund-Verfolgung (stoppt beim
          // Backgrounding, aber besser als gar kein Live-Tracking).
          sub = await Location.watchPositionAsync(trackingOptions, (p) =>
            handleFix(p.coords.latitude, p.coords.longitude, p.coords.accuracy ?? null)
          );
        }
      } catch {
        if (!cancelled) setLocState("denied");
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
      unsubscribeBackground?.();
      stopBackgroundLocationTracking();
      if (webId != null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(webId);
      }
    };
  }, [handleFix, energiesparmodus, t.backgroundNotificationTitle, t.backgroundNotificationBody]);

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
    // Zurueck auf MixWithOthers: manueller Stopp soll Musik sofort
    // wieder normal laut werden lassen.
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
  // Premium: KI-Erzaehlstimme (ElevenLabs, ueber den Server) — online-only.
  // Schlaegt sie fehl (offline, Serverfehler), uebernimmt die on-device
  // Stimme (expo-speech), damit die Erzaehlung unterwegs nie verstummt;
  // zusaetzlich erscheint ein sichtbarer "KI-Stimme nicht verfuegbar"-Hinweis
  // (kein stiller Ersatz). Die kostenlose erste Wanderung nutzt bewusst
  // weiterhin ausschliesslich die on-device Stimme und ruft die KI-Stimme
  // nie auf.
  // onFinished feuert NUR bei natuerlichem Ende (onDone/didJustFinish), nie
  // bei manuellem Stopp oder wenn eine andere speak()-Aeusserung dazwischen-
  // funkt (stopNarration loest dann onStopped/onError aus). So kann man
  // z. B. nach einem POI-Einschub die unterbrochene Kapitel-Erzaehlung
  // automatisch fortsetzen, ohne dass die Wanderung dafuer eine Beruehrung
  // braucht — die App bleibt nach dem Start durchgehend freihaendig.
  const speak = useCallback(
    async (text: string, onFinished?: () => void, opts?: { interrupt?: boolean }) => {
      // Ohne interrupt: in die Warteschlange einreihen, wenn gerade gesprochen
      // wird — so unterbrechen POI, Navigation, Meilenstein etc. keine laufende
      // Kapitel-Erzaehlung, sondern warten auf deren natuerliches Ende.
      if (!opts?.interrupt && speakingRef.current) {
        narrationQueueRef.current.push({ text, onFinished });
        return;
      }
      // Expliziter Interrupt (Kapitel-Wechsel, Wiederholen-Button): Queue leeren.
      if (opts?.interrupt) {
        narrationQueueRef.current = [];
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
        const blob = await createNarration({ text, language: profile?.language });
        const uri = await blobToTempFileUri(blob);
        if (gen !== narrationGenRef.current) return;
        // Vorheriges Audio direkt stoppen — kein setState, damit speaking=true
        // fuer den Ladeindikator erhalten bleibt.
        const prevSound = narrationSoundRef.current;
        narrationSoundRef.current = null;
        if (prevSound) {
          try { await prevSound.stopAsync(); await prevSound.unloadAsync(); } catch {}
        }
        if (gen !== narrationGenRef.current) return;
        // Vor dem Abspielen auf DuckOthers wechseln, damit die Erzaehlung
        // Musik/Podcasts waehrend des Sprechens leiser zieht.
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: true,
        }).catch(() => {});
        if (gen !== narrationGenRef.current) return;
        const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
        if (gen !== narrationGenRef.current) {
          sound.unloadAsync().catch(() => {});
          return;
        }
        narrationSoundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            // Zurueck auf MixWithOthers: zwischen Kapiteln soll Musik wieder
            // normal laut laufen (nur der stille Keepalive ist noch aktiv).
            Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
              interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
              interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
              shouldDuckAndroid: false,
            }).catch(() => {});
            setSpeaking(false);
            speakingRef.current = false; // sofort synchronisieren fuer Queue-Check
            onFinished?.();
            // Naechstes Element aus der Warteschlange abspielen.
            const next = narrationQueueRef.current.shift();
            if (next) speakRef.current?.(next.text, next.onFinished);
          }
        });
      } catch {
        if (gen !== narrationGenRef.current) return;
        setNarrationUnavailable(true);
        setSpeaking(false);
        speakingRef.current = false;
        onFinished?.();
        const next = narrationQueueRef.current.shift();
        if (next) speakRef.current?.(next.text, next.onFinished);
      }
    },
    [profile?.language]
  );
  speakRef.current = speak;

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
      if (currentIndex === 0) {
        const packForCue = STORY_PACKS[resolveLang(storyLanguage)];
        speak(
          `${greetingPrefix} ${packForCue.hikeStartCue}`,
          () => { setTimeout(() => speak(ch.text), 1500); },
          { interrupt: true }
        );
      } else {
        speak(ch.text, undefined, { interrupt: true });
      }
      // Kapitelwechsel als Mitteilung (Uhr-Spiegelung, wenn iPhone gesperrt).
      // Das erste Kapitel wird nicht gemeldet — der Start ist offensichtlich.
      if (currentIndex > 0 && turnNotifsReady && profile?.navAnnouncementsEnabled !== false) {
        sendeAbbiegeMitteilung(
          t.chapterNotif(currentIndex + 1),
          route?.name ?? saga?.title ?? ""
        );
      }
    }
    if (ch.isDecisionPoint && ch.chosenOptionIndex == null) {
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
  // geladenen Wikipedia-Auszug, in derselben Sprache/Stimme wie die Sage.
  // Das unterbricht kurz eine laufende Kapitel-Erzaehlung; sobald der
  // POI-Einschub natuerlich zu Ende ist, wird das aktuelle Kapitel
  // automatisch weitererzaehlt — ganz ohne Beruehrung, damit die Wanderung
  // ab dem Start durchgehend freihaendig bleibt.
  useEffect(() => {
    if (!nearbyPoi) return;
    if (narratedPoiIdRef.current === nearbyPoi.id) return;
    narratedPoiIdRef.current = nearbyPoi.id;
    // Kontext des vorherigen POI darf nicht an der neuen Karte kleben.
    setNearbyPoiKontext(null);
    // Spuerbarer Hinweis, dass gleich ein Ort erzaehlt wird — wer aufs
    // Panorama schaut statt aufs Handy, merkt es trotzdem.
    hapticHeavy();
    // Parallel zur Erzaehlung eine Mitteilung mit dem Wikipedia-Bild des Ortes
    // senden — iOS spiegelt sie samt Bild auf eine gekoppelte Watch. Best
    // effort: ohne Berechtigung oder Bild passiert einfach nichts Stoerendes.
    const poiName = nearbyPoi.name;
    const poiBild = nearbyPoi.wiki?.image ?? null;
    const poiText = nearbyPoi.wiki?.extract
      ? trimForNarration(nearbyPoi.wiki.extract)
      : t.poiNotifBody;
    if (turnNotifsReadyRef.current) {
      sendePoiMitteilung(poiName, poiText, poiBild);
    }
    // POI-Erzaehlung reiht sich in die Warteschlange ein — unterbricht kein
    // laufendes Kapitel, spielt automatisch danach ab.
    const pack = STORY_PACKS[resolveLang(storyLanguage)];
    const rawExtract = nearbyPoi.wiki?.extract ?? null;
    let cancelled = false;
    const erzaehle = (text: string) => {
      if (!cancelled) speak(text);
    };
    // Die Geschichte des Ortes wird gleich mit erzaehlt — per KI in denselben
    // Erzaehlton umgeschrieben wie die Sagen. Faellt die Umschreibung aus,
    // wird der rohe Wikipedia-Auszug erzaehlt; ohne Auszug erzeugt der Server
    // einen kurzen Kontext aus Name + OSM-Kategorie (Fallback: nur der Name).
    getPoiStory({
      name: nearbyPoi.name,
      extract: rawExtract ?? undefined,
      kind: nearbyPoi.kind,
      lang: storyLanguage,
    })
      .then((r) => {
        if (!cancelled && !nearbyPoi.wiki?.extract) setNearbyPoiKontext(r.text);
        erzaehle(pack.poiAside(nearbyPoi.name, r.text));
      })
      .catch(() =>
        erzaehle(
          pack.poiAside(
            nearbyPoi.name,
            rawExtract ? trimForNarration(rawExtract) : null,
          ),
        ),
      );
    return () => {
      cancelled = true;
    };
  }, [nearbyPoi, storyLanguage, speak, t]);

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
    if (!livePos || !route?.geometry || route.geometry.length < 2) return null;
    if (livePosAccuracy != null && livePosAccuracy > ROUTE_PROGRESS_MAX_ACCURACY_M) return null;
    const match = fortschrittAufRoute(livePos, route.geometry);
    if (!match || match.distKm > ROUTE_PROGRESS_MAX_DIST_KM) return null;
    return match.fraction;
  }, [livePos, livePosAccuracy, route?.geometry]);

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
    const distText =
      distKm < 1 ? `${Math.round(distKm * 1000)} m` : `${distKm.toFixed(1)} ${t.unitKm}`;
    return { distKm, distText, dir };
  }, [livePos, route?.geometry, t]);

  // Sobald der User einmal innerhalb des Start-Radius war (walkToStart === null),
  // als "start reached" markieren — damit das Banner nach dem Passieren nicht
  // erneut erscheint, wenn der User sich von geometry[0] entfernt.
  useEffect(() => {
    if (preparing || startReached) return;
    if (walkToStart === null) setStartReached(true);
  }, [walkToStart, preparing, startReached]);

  const walkToStartAnnouncedRef = useRef(false);
  useEffect(() => {
    if (!walkToStart) return;
    if (walkToStartAnnouncedRef.current) return;
    if (preparing || locState !== "granted") return;
    walkToStartAnnouncedRef.current = true;
    speak(t.walkToStartSpoken(walkToStart.distText, walkToStart.dir));
  }, [walkToStart, preparing, locState, speak, t]);

  // Kapitelfortschritt entlang der Route: bevorzugt die echte Position
  // (routeProgress); ohne GPS-Fix oder Geometrie faellt es auf die reine
  // zurueckgelegte Distanz zurueck (bisheriges Verhalten).
  // Kapitelfortschritt laeuft unabhaengig davon, ob gerade eine Entscheidung
  // offen ist. Entscheidungen sind freiwillig — wer nicht antwortet, gehoert
  // trotzdem das naechste Kapitel, sobald GPS oder Distanz es vorgibt.
  // Wird ein Entscheidungs-Kapitel durch den Fortschritt verlassen, schliesst
  // sich das Panel automatisch (setAwaitingDecision(false)).
  useEffect(() => {
    if (locState !== "granted") return;
    if (preparing || finished || chapters.length === 0) return;
    const steps = chapters.length - 1;
    if (steps <= 0) {
      setFinished(true);
      return;
    }
    // Kapitelfortschritt immer ueber zurueckgelegte Strecke (nie ueber GPS-
    // Projektion), damit man unabhaengig vom Startpunkt immer bei Kapitel 0
    // beginnt — auch wenn man mitten auf der Route einsteigt.
    const ratio = totalKm > 0 ? distance / totalKm : 0;
    const reached = Math.min(steps, Math.floor(ratio * steps + 1e-6));
    if (reached > currentIndex) {
      setCurrentIndex(reached);
      setAwaitingDecision(false);
      if (reached >= steps) setFinished(true);
    }
  }, [
    distance,
    locState,
    preparing,
    finished,
    chapters.length,
    currentIndex,
    totalKm,
  ]);

  // Simulierter Fortschritt als Rueckfall — nur in den ausdruecklichen
  // Ersatzzustaenden, damit die Erlaubnisabfrage keinen Fortschritt vortaeuscht.
  useEffect(() => {
    if (locState !== "denied" && locState !== "simulated") return;
    if (preparing || finished) return;
    timerRef.current = setTimeout(() => {
      setAwaitingDecision(false);
      setDistance((d) => Math.min(totalKm, d + totalKm / Math.max(1, chapters.length)));
      setCurrentIndex((i) => {
        if (i + 1 >= chapters.length) {
          setFinished(true);
          return i;
        }
        return i + 1;
      });
    }, TICK_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, preparing, finished, chapters.length, locState, totalKm]);

  // Konsistente Haptik: jedes abgeschlossene Kapitel gibt ein leichtes
  // Vibrationsfeedback — unabhaengig davon, ob GPS oder Simulation den
  // Fortschritt treibt.
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

  const chooseOption = (optionIndex: number) => {
    // Mitglieder einer Gruppenwanderung entscheiden nicht selbst — sie
    // warten auf die Entscheidung der Gruppenleitung.
    if (folgtGruppenleitung) return;
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
    setChapters((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], chosenOptionIndex: optionIndex };
      decisionsRef.current = next;
      return next;
    });
    setAwaitingDecision(false);
    // Wohlwollendes Persoenlichkeits-Feedback nach der Entscheidung sprechen.
    const archetypeHint = chapters[currentIndex]?.decision?.options[optionIndex]?.archetypeHint;
    if (archetypeHint) {
      const pack = STORY_PACKS[resolveLang(storyLanguage)];
      speakRef.current?.(pack.decisionFeedback(archetypeHint));
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
    const decision = chapters[currentIndex]?.decision;
    const opts = decision?.options?.map((o) => o.label) ?? [];
    const question = decision?.question;
    speakRef.current?.(pack.buildDecisionPrompt(opts, question));
  }, [awaitingDecision, speaking, currentIndex, storyLanguage, chapters]);

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
  const { listening: voiceListening, supported: voiceSupported } = useVoiceDecision(
    awaitingDecision && !speaking && decisionOptions.length > 0 && !folgtGruppenleitung,
    resolveLang(storyLanguage),
    decisionOptions,
    chooseOption
  );

  // Wenn die Spracherkennung endet (voiceListening: true → false), stellt
  // dieser Effekt die Audio-Session explizit zurueck. expo-speech-recognition
  // setzt intern allowsRecordingIOS (iOS Audio-Session wechselt auf
  // PlayAndRecord), was den Lautsprecherausgang stark reduziert — iOS dreht
  // ihn zum Schutz vor Rueckkopplung runter. Ohne diesen Reset bleibt die
  // Session im Record-Modus und jede nachfolgende Erzaehlung klingt
  // wesentlich leiser.
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (voiceListening) return;
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: false,
    }).catch(() => {});
  }, [voiceListening]);

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
        // Fallback auf geplante Routen-Geometrie wenn Track zu kurz (z. B. kurze Demo-Wanderung).
        const raw = posLogRef.current;
        if (raw.length >= MIN_TRACK_POINTS) {
          return rdpThin(raw, RDP_EPSILON);
        }
        return route?.geometry;
      })(),
      photoUris: hikePhotos.length > 0 ? hikePhotos : undefined,
    };
    await Promise.all([
      saveHike(session),
      addAchievement(saga.title, saga.id),
      clearActiveHike(),
    ]);
    router.replace("/summary");
  }, [saga, route, distance, ascentM, sac, steps, hikePhotos, saveHike, addAchievement, clearActiveHike, router, cancelNarration]);

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
  const timeProgress = routeProgress ?? (totalKm > 0 ? Math.min(1, distance / totalKm) : progress);
  const currentChapter = chapters[currentIndex];

  // Angezeigte Position auf der Karte: bei echtem GPS die Live-Position, sonst
  // (Simulation/kein Zugriff, z. B. Web-Vorschau) ein entlang des Wegverlaufs
  // interpolierter Punkt, damit der Fortschritt sichtbar wird.
  const geo = route?.geometry;
  const simPos: LatLng | null =
    geo && geo.length > 1
      ? (() => {
          const f = totalKm > 0 ? Math.max(0, Math.min(1, distance / totalKm)) : 0;
          const p = geo[Math.round(f * (geo.length - 1))];
          return { lat: p[0], lng: p[1] };
        })()
      : null;
  // Es soll immer ein Positionsmarker sichtbar sein: bevorzugt die echte
  // GPS-Position; solange noch kein Fix vorliegt (oder GPS nicht verfuegbar
  // ist, z. B. Web-Vorschau) der entlang des Weges interpolierte Punkt.
  const shownPos = livePos ?? simPos;

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
            onFullyClosed={() => {
              // Karten-Modal ist jetzt vollstaendig weg (Fade-Animation
              // abgeschlossen) — erst jetzt das Detail-Modal oeffnen, damit
              // keine zwei Modals gleichzeitig offen sind und der X-Button
              // des Details nicht vom noch-fading Karten-Modal blockiert wird.
              pendingKarteActionRef.current?.();
              pendingKarteActionRef.current = null;
            }}
            renderKarte={(hoehe, safeAreaTop) =>
              mapCenter ? (
                <SwisstopoMap
                  center={mapCenter}
                  position={shownPos}
                  label={saga.title}
                  height={hoehe}
                  geometry={followingRecalc ? (recalcGeom ?? route?.geometry) : route?.geometry}
                  altGeometry={!followingRecalc ? recalcGeom : null}
                  offlineTiles={offlineTiles}
                  aerialways={aerialways}
                  pois={pois}
                  safeAreaInsetTop={safeAreaTop}
                  onPoiPress={(id) => {
                    const poi = pois.find((p) => p.id === id);
                    if (poi) {
                      // Aktion merken, Vollbild schliessen. Das Detail-Modal
                      // wird erst in onFullyClosed geoeffnet — nach Abschluss
                      // der Fade-Animation, nicht schon waehrenddessen.
                      pendingKarteActionRef.current = () => setSelectedPoi(poi);
                      setKarteVollbild(false);
                      setKarteCloseSignal((n) => n + 1);
                    }
                  }}
                  partners={partners}
                  onPartnerPress={(id) => {
                    const partner = partners.find((p) => p.id === id);
                    if (partner) {
                      pendingKarteActionRef.current = () => setSelectedPartner(partner);
                      setKarteVollbild(false);
                      setKarteCloseSignal((n) => n + 1);
                    }
                  }}
                />
              ) : (
                <RouteMap progress={progress} height={hoehe} />
              )
            }
          />
        </View>

        {/* Live entdeckter Ort in der Naehe (Wikipedia/OSM) */}
        {nearbyPoi && (
          <Animated.View entering={FadeIn}>
            <Glass style={{ marginTop: 14 }}>
              {/* Vollbild-Bild: negative Margins brechen aus dem Glass-Padding (16px) heraus */}
              {nearbyPoi.wiki?.image && (
                <Image
                  source={{ uri: nearbyPoi.wiki.image }}
                  style={styles.poiCardImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.poiCardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  {!nearbyPoi.wiki?.image && (
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
                {nearbyPoi.name}
              </Text>
              {(nearbyPoi.wiki?.extract || nearbyPoiKontext) && (
                <Text
                  style={[styles.poiSummary, { color: colors.foreground }]}
                  numberOfLines={10}
                >
                  {nearbyPoi.wiki?.extract ?? nearbyPoiKontext}
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

      {/* POI-Detail — ausserhalb ScrollView damit absoluteFill den ganzen Screen abdeckt */}
      {!!selectedPoi && (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.poiModalBackdrop]}
          onPress={() => setSelectedPoi(null)}
        >
          <Pressable style={{ width: "100%" }} onPress={(e) => e.stopPropagation()}>
            <Glass>
              {selectedPoi.wiki?.image && (
                <Image
                  source={{ uri: selectedPoi.wiki.image }}
                  style={styles.poiModalImage}
                  resizeMode="cover"
                />
              )}
              <View style={styles.poiRow}>
                <Feather name="map-pin" size={18} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.poiEyebrow, { color: colors.accent }]}>
                    {t.poiDetailEyebrow}
                  </Text>
                  <Text style={[styles.poiTitle, { color: colors.foreground }]}>
                    {selectedPoi.name}
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

      {/* Partner-Detail — ebenfalls ausserhalb ScrollView */}
      {!!selectedPartner && (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.poiModalBackdrop]}
          onPress={() => setSelectedPartner(null)}
        >
          <Pressable style={{ width: "100%" }} onPress={(e) => e.stopPropagation()}>
            <Glass>
              <View style={styles.poiRow}>
                <Feather name="coffee" size={18} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.poiEyebrow, { color: colors.accent }]}>
                    {t.partnerDetailEyebrow}
                  </Text>
                  <Text style={[styles.poiTitle, { color: colors.foreground }]}>
                    {selectedPartner.name}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSelectedPartner(null)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t.close}
                >
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
              {selectedPartner.beschreibung && (
                <Text
                  style={[
                    styles.poiSummary,
                    { color: colors.foreground, marginTop: 10 },
                  ]}
                >
                  {selectedPartner.beschreibung}
                </Text>
              )}
              {selectedPartner.angebot && (
                <Pressable
                  onPress={() => {
                    if (selectedPartner.id) {
                      const base = getApiBaseUrl() ?? "";
                      fetch(`${base}/partners/${selectedPartner.id}/tap`, { method: "POST" }).catch(() => {});
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.poiSummary,
                      { color: colors.accent, marginTop: 8, fontFamily: fonts.bodyBold },
                    ]}
                  >
                    {t.partnerOffer}: {selectedPartner.angebot}
                  </Text>
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
                const point = livePos ?? route?.coordinates ?? saga.coordinates;
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

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
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
