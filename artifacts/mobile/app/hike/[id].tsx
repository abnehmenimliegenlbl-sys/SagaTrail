import { Feather } from "@expo/vector-icons";
import {
  createNarration,
  getAerialways,
  getPois,
  getPoiStory,
} from "@workspace/api-client-react";
import type { Poi } from "@workspace/api-client-react";
import { Audio, InterruptionModeIOS } from "expo-av";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLAS_3D } from "@/constants/depth";
import type { HikingRoute } from "@/constants/routes";
import { Background } from "@/components/brand/Background";
import { Glass } from "@/components/brand/Glass";
import { KarteVollbild } from "@/components/brand/KarteVollbild";
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
import { bboxAroundGeometry, distanzZuSegmentKm, haversineKm } from "@/lib/geo";
import {
  effectiveStoryLanguage,
  resolveLang,
  STORY_PACKS,
  trimForNarration,
} from "@/lib/storyContent";
import { blobToDataUri } from "@/lib/narrationAudio";
import { detectNavigationCues, NavigationCue } from "@/lib/navigationCues";
import {
  bereiteAbbiegeMitteilungenVor,
  sendeAbbiegeMitteilung,
  sendePoiMitteilung,
} from "@/lib/turnNotifications";
import { weaveNavigationCues } from "@/lib/storyEngine";
import { useVoiceDecision } from "@/lib/useVoiceDecision";
import { HikeSession, LatLng, StoryChapter } from "@/types";

const WEB_TOP = 67;
const TICK_MS = 4500; // Simulierter Fortschritt pro Wegpunkt (nur ohne echtes GPS)

type LocState = "idle" | "granted" | "denied" | "simulated";

export default function LiveHike() {
  const colors = useColors();
  const t = useHikeStrings();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, routeId } = useLocalSearchParams<{ id: string; routeId?: string }>();
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
    activeHike && activeHike.sagaId === id ? activeHike.chapterIndex : null,
  );
  // Beim Fortsetzen nach Absturz/Neustart: die mitpersistierte Route aus dem
  // gespeicherten Wanderstand — Routen sind online-only, der Katalog ist nach
  // einem Kaltstart also oft (noch) leer.
  const resumeRouteRef = useRef<HikingRoute | null>(
    activeHike && activeHike.sagaId === id ? (activeHike.route ?? null) : null,
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
  const mapCenter: LatLng | null = route?.coordinates ?? saga?.coordinates ?? null;

  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [preparing, setPreparing] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [awaitingDecision, setAwaitingDecision] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [locState, setLocState] = useState<LocState>("idle");
  const [sosOpen, setSosOpen] = useState(false);
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
  const [livePos, setLivePos] = useState<LatLng | null>(null);
  const [finished, setFinished] = useState(false);
  const [offlineTiles, setOfflineTiles] = useState<Record<string, string> | null>(null);
  const [aerialways, setAerialways] = useState<
    { id: string; geometry: number[][] }[] | null
  >(null);
  const [pois, setPois] = useState<Poi[]>([]);
  const [nearbyPoi, setNearbyPoi] = useState<Poi | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [, setKarteVollbild] = useState(false);
  const [karteCloseSignal, setKarteCloseSignal] = useState(0);
  const [poiStory, setPoiStory] = useState<string | null>(null);
  const [poiStoryLoading, setPoiStoryLoading] = useState(false);
  // KI-Kontext fuer die "Entdeckt"-Karte, wenn der POI keinen
  // Wikipedia-Auszug hat (wird im Erzaehl-Effekt mitbefuellt).
  const [nearbyPoiKontext, setNearbyPoiKontext] = useState<string | null>(null);
  const [narrationUnavailable, setNarrationUnavailable] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decisionsRef = useRef<StoryChapter[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const lastFixRef = useRef<LatLng | null>(null);
  const lastNarratedRef = useRef<number>(-1);
  const announcedPoiIdsRef = useRef<Set<string>>(new Set());
  const narratedPoiIdRef = useRef<string | null>(null);
  const narrationSoundRef = useRef<Audio.Sound | null>(null);
  // Generationszaehler gegen ueberlappende Sprecher: jeder speak()-Aufruf
  // erhoeht ihn; nach jedem await prueft der Aufruf, ob er noch die aktuelle
  // Generation ist. Ein schneller Doppel-Tipp auf "Wiederholen" startet sonst
  // zwei parallele KI-Anfragen, die BEIDE abspielen (die erste hatte beim
  // stopNarration() der zweiten noch keinen Sound zum Stoppen).
  const narrationGenRef = useRef(0);

  // KI-Erzaehlstimme (ElevenLabs) ist online-only und ausschliesslich fuer
  // Premium — kein Offline-Fallback. Fuer "gsw" wird dabei NIE Dialekt-Text
  // verwendet: die Story wird in diesem Fall in Hochdeutsch angefordert, die
  // Schweizer Faerbung kommt allein ueber die Stimmwahl (server-seitig).
  const storyLanguage = effectiveStoryLanguage(profile?.language ?? "de", true);

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
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    }).catch(() => {
      // Best effort — falls die Audiosession nicht gesetzt werden kann, wird
      // trotzdem versucht, ganz normal ueber die Standard-Session vorzulesen.
    });
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
      // Navigationshinweise werden erst hier, mit der konkret gewaehlten Route,
      // eingeflochten — unabhaengig davon, ob die Kapitel lokal, vom Server
      // oder als Download geladen wurden.
      const woven = weaveNavigationCues(story, saga, route, storyLanguage);
      setChapters(woven);
      decisionsRef.current = woven;
      const resumeAt = resumeIndexRef.current;
      resumeIndexRef.current = null;
      if (resumeAt != null && resumeAt > 0 && resumeAt < woven.length) {
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
    if (!mapCenter) return;
    let cancelled = false;
    const bbox = bboxAroundGeometry(route?.geometry, mapCenter);
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
  }, [route?.id, route?.geometry, mapCenter?.lat, mapCenter?.lng]);

  // Historische/touristische Orte im Kartenausschnitt laden, live mit
  // Wikipedia-Zusammenfassungen angereichert — best effort, kein Blocker.
  useEffect(() => {
    if (!mapCenter) return;
    let cancelled = false;
    // Enger Rand (0.5 km statt 3 km): behalten werden ohnehin nur POIs im
    // 300-m-Korridor, und eine grosse Box macht die Overpass-Abfrage in
    // dichten Staedten (z. B. Basel) so teuer, dass sie in ein Timeout laeuft.
    const bbox = bboxAroundGeometry(route?.geometry, mapCenter, 0.5);
    // Nur POIs im 300-m-Korridor um die Strecke behalten — Orte weiter weg
    // liegen nicht am Weg und wuerden die Karte und Ansagen verwaessern.
    // (100 m erwies sich im Feldtest als zu eng: auf 7 km nur 2 POIs.)
    // Gemessen wird gegen die Liniensegmente (nicht nur Stuetzpunkte), da die
    // gespeicherte Geometrie ausgeduennt ist und Segmente >100 m lang sein koennen.
    const KORRIDOR_KM = 0.3;
    const geo = route?.geometry;
    getPois(bbox)
      .then((result) => {
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
      })
      .catch(() => {
        if (!cancelled) setPois([]);
      });
    return () => {
      cancelled = true;
    };
  }, [route?.id, route?.geometry, mapCenter?.lat, mapCenter?.lng]);

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

  // Neue GPS-Position verarbeiten: real zurueckgelegte Strecke aufaddieren
  const handleFix = useCallback((lat: number, lng: number) => {
    const cur: LatLng = { lat, lng };
    setLivePos(cur);
    const prev = lastFixRef.current;
    if (prev) {
      const d = haversineKm(prev, cur);
      // GPS-Rauschen (<3 m) und unrealistische Spruenge (>500 m) ignorieren
      if (d > 0.003 && d < 0.5) {
        setDistance((x) => x + d);
      }
    }
    lastFixRef.current = cur;
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

  // Abbiege-Mitteilungen: markante Abzweigungen der Route (echte Geometrie,
  // siehe navigationCues.ts) loesen bei Annaeherung genau einmal eine lokale
  // Mitteilung aus. iOS spiegelt diese auf eine gekoppelte Smartwatch (inkl.
  // Vibration), sobald das iPhone gesperrt ist. Web: No-op.
  const turnCues = useMemo<NavigationCue[]>(
    () => detectNavigationCues(route?.geometry, 8),
    [route?.geometry]
  );
  const notifiedTurnsRef = useRef<Set<number>>(new Set());
  const [turnNotifsReady, setTurnNotifsReady] = useState(false);
  useEffect(() => {
    if (turnCues.length === 0) return;
    let cancelled = false;
    bereiteAbbiegeMitteilungenVor().then((ok) => {
      if (!cancelled) setTurnNotifsReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [turnCues.length]);
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
      sendeAbbiegeMitteilung(
        t.turnNotifTitle,
        treffer.cue.direction === "links" ? t.turnNotifLeft : t.turnNotifRight
      );
    }
  }, [livePos, distance, totalKm, route?.geometry, turnCues, turnNotifsReady, t]);

  // Erkennt, ob die aktuelle Position (echtes GPS oder entlang des Weges
  // interpoliert) nahe an einem geladenen POI liegt, und zeigt ihn genau
  // einmal je Wanderung als Karte an ("live entlang der Route entdeckt").
  useEffect(() => {
    if (pois.length === 0) return;
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
    const NEARBY_KM = 0.35;
    const hit = pois.find(
      (poi) =>
        !announcedPoiIdsRef.current.has(poi.id) &&
        haversineKm(current, { lat: poi.lat, lng: poi.lng }) <= NEARBY_KM
    );
    if (hit) {
      announcedPoiIdsRef.current.add(hit.id);
      setNearbyPoi(hit);
    }
  }, [livePos, distance, totalKm, route?.geometry, pois]);

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
              handleFix(p.coords.latitude, p.coords.longitude);
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
          if (!cancelled) handleFix(first.coords.latitude, first.coords.longitude);
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
            handleFix(p.coords.latitude, p.coords.longitude)
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
    setSpeaking(false);
  }, []);

  // Manueller Stopp (Pause-Button, Abschluss, Verlassen des Screens):
  // erhoeht zusaetzlich die Generation, damit auch noch in-flight laufende
  // speak()-Aufrufe (z. B. eine KI-Anfrage, die gerade laedt) verfallen und
  // nach dem Stopp nicht doch noch zu sprechen beginnen.
  const cancelNarration = useCallback(async () => {
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
    async (text: string, onFinished?: () => void) => {
      // Neue Generation SOFORT beanspruchen, damit noch laufende speak()-
      // Aufrufe (z. B. nach schnellem Doppel-Tipp auf "Wiederholen") sich
      // nach ihren awaits als veraltet erkennen und nichts mehr abspielen.
      const gen = ++narrationGenRef.current;
      await stopNarration();
      if (gen !== narrationGenRef.current) return;
      setNarrationUnavailable(false);
      setSpeaking(true);

      try {
        const blob = await createNarration({ text, language: profile?.language });
        const uri = await blobToDataUri(blob);
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
            setSpeaking(false);
            onFinished?.();
          }
        });
      } catch {
        if (gen !== narrationGenRef.current) return;
        setNarrationUnavailable(true);
        setSpeaking(false);
      }
    },
    [profile?.language, stopNarration]
  );

  // Kapitel automatisch erzaehlen, sobald es erscheint. Ein Ref verhindert,
  // dass eine Kapitel-Mutation (Entscheidung) dasselbe Kapitel erneut vorliest
  // oder den Entscheidungsmoment erneut sperrt.
  useEffect(() => {
    if (preparing || chapters.length === 0) return;
    const ch = chapters[currentIndex];
    if (!ch) return;
    if (lastNarratedRef.current !== currentIndex) {
      lastNarratedRef.current = currentIndex;
      speak(ch.text);
      // Kapitelwechsel als Mitteilung (Uhr-Spiegelung, wenn iPhone gesperrt).
      // Das erste Kapitel wird nicht gemeldet — der Start ist offensichtlich.
      if (currentIndex > 0 && turnNotifsReady) {
        sendeAbbiegeMitteilung(
          t.chapterNotif(currentIndex + 1),
          route?.name ?? saga?.title ?? ""
        );
      }
    }
    if (ch.isDecisionPoint && ch.chosenOptionIndex == null) {
      setAwaitingDecision(true);
    }
  }, [currentIndex, preparing, chapters, speak, turnNotifsReady, t, route?.name, saga?.title]);

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
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // Parallel zur Erzaehlung eine Mitteilung mit dem Wikipedia-Bild des Ortes
    // senden — iOS spiegelt sie samt Bild auf eine gekoppelte Watch. Best
    // effort: ohne Berechtigung oder Bild passiert einfach nichts Stoerendes.
    const poiName = nearbyPoi.name;
    const poiBild = nearbyPoi.wiki?.image ?? null;
    const poiText = nearbyPoi.wiki?.extract
      ? trimForNarration(nearbyPoi.wiki.extract)
      : t.poiNotifBody;
    bereiteAbbiegeMitteilungenVor().then((ok) => {
      if (ok) sendePoiMitteilung(poiName, poiText, poiBild);
    });
    // Zustand im Moment der Entdeckung einfrieren: nur wenn JETZT ein Kapitel
    // laeuft, wird es nach dem POI-Einschub weitererzaehlt.
    const wasChapterPlaying = speakingRef.current;
    const chapterToResume = chapterTextRef.current;
    const pack = STORY_PACKS[resolveLang(storyLanguage)];
    const resume =
      wasChapterPlaying && chapterToResume ? () => speak(chapterToResume) : undefined;
    const rawExtract = nearbyPoi.wiki?.extract ?? null;
    let cancelled = false;
    const erzaehle = (text: string) => {
      if (!cancelled) speak(text, resume);
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

  // Echtes GPS steuert den Kapitelfortschritt entlang der Routenlaenge
  useEffect(() => {
    if (locState !== "granted") return;
    if (preparing || awaitingDecision || finished || chapters.length === 0) return;
    const steps = chapters.length - 1;
    if (steps <= 0) {
      setFinished(true);
      return;
    }
    const reached = Math.min(steps, Math.floor((distance / totalKm) * steps + 1e-6));
    if (reached > currentIndex) {
      setCurrentIndex(reached);
      if (reached >= steps) setFinished(true);
    }
  }, [distance, locState, preparing, awaitingDecision, finished, chapters.length, currentIndex, totalKm]);

  // Simulierter Fortschritt als Rueckfall — nur in den ausdruecklichen
  // Ersatzzustaenden, damit die Erlaubnisabfrage keinen Fortschritt vortaeuscht.
  useEffect(() => {
    if (locState !== "denied" && locState !== "simulated") return;
    if (preparing || awaitingDecision || finished) return;
    timerRef.current = setTimeout(() => {
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
  }, [currentIndex, preparing, awaitingDecision, finished, chapters.length, locState, totalKm]);

  // Konsistente Haptik: jedes abgeschlossene Kapitel gibt ein leichtes
  // Vibrationsfeedback — unabhaengig davon, ob GPS oder Simulation den
  // Fortschritt treibt.
  const lastHapticIndexRef = useRef(0);
  useEffect(() => {
    if (preparing || currentIndex <= lastHapticIndexRef.current) return;
    lastHapticIndexRef.current = currentIndex;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [currentIndex, preparing]);

  // Sprachausgabe beim Verlassen stoppen
  useEffect(() => {
    return () => {
      cancelNarration();
    };
  }, [cancelNarration]);

  const chooseOption = (optionIndex: number) => {
    // Mitglieder einer Gruppenwanderung entscheiden nicht selbst — sie
    // warten auf die Entscheidung der Gruppenleitung.
    if (folgtGruppenleitung) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const gewaehlt = chapters[currentIndex]?.decision?.options[optionIndex]?.label;
    if (gewaehlt) {
      // Kurze sichtbare Bestaetigung der Wahl, bevor die Geschichte weitergeht
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      setChoiceFeedback(t.yourChoice(gewaehlt));
      feedbackTimerRef.current = setTimeout(() => setChoiceFeedback(null), 2500);
    }
    setChapters((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], chosenOptionIndex: optionIndex };
      decisionsRef.current = next;
      return next;
    });
    setAwaitingDecision(false);
    // Leitung: Entscheidung an alle Mitglieder verteilen.
    if (istGruppenleitung) {
      sendGroupHikeEvent({
        kind: "decision",
        chapterIndex: currentIndex,
        optionIndex,
      });
    }
  };

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

  const finishHike = useCallback(async () => {
    await cancelNarration();
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
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
    };
    await Promise.all([
      saveHike(session),
      addAchievement(saga.title, saga.id),
      clearActiveHike(),
    ]);
    router.replace("/summary");
  }, [saga, route, distance, ascentM, sac, saveHike, addAchievement, clearActiveHike, router, cancelNarration]);

  const openUrlSafely = async (url: string, fallback: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t.notAvailable, fallback);
      }
    } catch {
      Alert.alert(t.notAvailable, fallback);
    }
  };

  const callNumber = (num: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
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

      <ScrollView
        contentContainerStyle={{
          paddingTop: locState === "denied" ? topPad + 148 : topPad,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>
              {saga.canton.toUpperCase()} · {t.live}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {saga.title}
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
            renderKarte={(hoehe) =>
              mapCenter ? (
                <SwisstopoMap
                  center={mapCenter}
                  position={shownPos}
                  label={saga.title}
                  height={hoehe}
                  geometry={route?.geometry}
                  offlineTiles={offlineTiles}
                  aerialways={aerialways}
                  pois={pois}
                  onPoiPress={(id) => {
                    const poi = pois.find((p) => p.id === id);
                    if (poi) {
                      // Vollbild-Karte VOR dem POI-Detail schliessen: zwei
                      // gleichzeitig offene Modals stapeln sich sonst
                      // plattformabhaengig falsch und die Karte ueberlagert
                      // das Detail. onVollbildChange allein reicht nicht,
                      // es benachrichtigt nur -- closeSignal erzwingt es.
                      setKarteVollbild(false);
                      setKarteCloseSignal((n) => n + 1);
                      setSelectedPoi(poi);
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
              <View style={styles.poiRow}>
                <Feather name="map-pin" size={18} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.poiEyebrow, { color: colors.accent }]}>
                    {t.discoveredNearby}
                  </Text>
                  <Text style={[styles.poiTitle, { color: colors.foreground }]}>
                    {nearbyPoi.name}
                  </Text>
                  {(nearbyPoi.wiki?.extract || nearbyPoiKontext) && (
                    <Text
                      style={[styles.poiSummary, { color: colors.mutedForeground }]}
                      numberOfLines={4}
                    >
                      {nearbyPoi.wiki?.extract ?? nearbyPoiKontext}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => setNearbyPoi(null)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t.close}
                >
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </Glass>
          </Animated.View>
        )}

        {/* Detailansicht eines angetippten Point of Interest auf der Karte */}
        <Modal
          visible={!!selectedPoi}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedPoi(null)}
        >
          <Pressable
            style={styles.poiModalBackdrop}
            onPress={() => setSelectedPoi(null)}
          >
            <Pressable style={{ width: "100%" }} onPress={(e) => e.stopPropagation()}>
              <Glass>
                {selectedPoi?.wiki?.image && (
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
                      {selectedPoi?.name}
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
                    : (poiStory ?? selectedPoi?.wiki?.extract ?? t.notAvailable)}
                </Text>
              </Glass>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Statusleiste in Frozen Glass */}
        <Glass style={{ marginTop: 14 }}>
          <View style={styles.statBar}>
            <Metric label={t.metricDistance} value={distance.toFixed(1)} unit={t.unitKm} />
            <Metric label={t.metricHeight} value={`${Math.round(progress * ascentM)}`} unit={t.unitHm} />
            <Metric
              label={t.metricTimeLeft}
              value={`${Math.max(0, Math.round((1 - progress) * totalMin))}`}
              unit={t.unitMin}
            />
            <Metric label={t.metricSac} value={sac} unit="" />
          </View>
        </Glass>

        {/* Story-Bereich */}
        {preparing ? (
          <View style={styles.preparing}>
            <SparkMountain size={90} pulsing />
            <Text style={[styles.preparingText, { color: colors.mutedForeground }]}>
              {t.preparingText}
            </Text>
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
                      speak(currentChapter.text);
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
                      speak(currentChapter.text);
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
          </Animated.View>
        )}
      </ScrollView>

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
  metric: { alignItems: "flex-start" },
  metricLabel: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1 },
  metricValRow: { flexDirection: "row", alignItems: "baseline", gap: 3, marginTop: 3 },
  metricVal: { fontFamily: fonts.monoBold, fontSize: 20 },
  metricUnit: { fontFamily: fonts.mono, fontSize: 11 },
  preparing: { alignItems: "center", paddingVertical: 50, gap: 16 },
  preparingText: { fontFamily: fonts.story, fontSize: 16 },
  poiRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  poiEyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2 },
  poiTitle: { fontFamily: fonts.titleBold, fontSize: 19, marginTop: 2 },
  poiSummary: { fontFamily: fonts.story, fontSize: 16, marginTop: 4, lineHeight: 23 },
  poiModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16,24,26,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  poiModalImage: { width: "100%", height: 150, borderRadius: 10, marginBottom: 12 },
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
