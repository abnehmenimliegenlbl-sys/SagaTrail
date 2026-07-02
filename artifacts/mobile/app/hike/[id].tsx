import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { Glass } from "@/components/brand/Glass";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { RouteMap } from "@/components/brand/RouteMap";
import { SparkMountain } from "@/components/brand/SparkMountain";
import { SAGAS } from "@/constants/sagas";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { generateStory } from "@/lib/storyEngine";
import { HikeSession, StoryChapter } from "@/types";

const WEB_TOP = 67;
const TICK_MS = 4500; // Simulierter Fortschritt pro Wegpunkt

type LocState = "idle" | "granted" | "denied" | "simulated";

export default function LiveHike() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, saveHike, addAchievement } = useApp();

  const saga = SAGAS.find((s) => s.id === id);

  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [preparing, setPreparing] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [awaitingDecision, setAwaitingDecision] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [locState, setLocState] = useState<LocState>("idle");
  const [sosOpen, setSosOpen] = useState(false);
  const [distance, setDistance] = useState(0);
  const [finished, setFinished] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const decisionsRef = useRef<StoryChapter[]>([]);
  const startTimeRef = useRef<number>(Date.now());

  // Story vorbereiten
  useEffect(() => {
    if (!saga || !profile) return;
    const t = setTimeout(() => {
      const story = generateStory(saga, profile.archetype, profile.ageTier);
      setChapters(story);
      decisionsRef.current = story;
      setPreparing(false);
    }, 1600);
    return () => clearTimeout(t);
  }, [saga, profile]);

  // Standortberechtigung anfragen
  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") {
        setLocState("simulated");
        return;
      }
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocState(status === "granted" ? "granted" : "denied");
      } catch {
        setLocState("simulated");
      }
    })();
  }, []);

  const speak = useCallback(
    (text: string) => {
      Speech.stop();
      Speech.speak(text, {
        language: "de-DE",
        rate: 0.92,
        pitch: 1.0,
        onStart: () => setSpeaking(true),
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
      });
    },
    []
  );

  // Kapitel automatisch erzaehlen, wenn es erscheint
  useEffect(() => {
    if (preparing || chapters.length === 0) return;
    const ch = chapters[currentIndex];
    if (!ch) return;
    speak(ch.text);
    if (ch.isDecisionPoint) {
      setAwaitingDecision(true);
    }
  }, [currentIndex, preparing, chapters, speak]);

  // Simulierter Fortschritt entlang der Route
  useEffect(() => {
    if (preparing || awaitingDecision || finished) return;
    timerRef.current = setTimeout(() => {
      setDistance((d) => Math.min(6.4, d + 0.9));
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
  }, [currentIndex, preparing, awaitingDecision, finished, chapters.length]);

  // Sprachausgabe beim Verlassen stoppen
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const chooseOption = (optionIndex: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setChapters((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], chosenOptionIndex: optionIndex };
      decisionsRef.current = next;
      return next;
    });
    setAwaitingDecision(false);
  };

  const finishHike = useCallback(async () => {
    Speech.stop();
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (!saga) return;
    const session: HikeSession = {
      id: `h_${Date.now()}`,
      sagaId: saga.id,
      routeName: saga.title,
      distanceKm: Number(distance.toFixed(1)),
      ascentM: 480,
      sacScale: "T3",
      startedAt: startTimeRef.current,
      chapters: decisionsRef.current,
      visitedPlaceIds: [saga.id],
    };
    await Promise.all([saveHike(session), addAchievement(saga.title, saga.id)]);
    router.replace("/summary");
  }, [saga, distance, saveHike, addAchievement, router]);

  const openUrlSafely = async (url: string, fallback: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Nicht verfügbar", fallback);
      }
    } catch {
      Alert.alert("Nicht verfügbar", fallback);
    }
  };

  const callNumber = (num: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    openUrlSafely(`tel:${num}`, `Bitte wähle den Notruf ${num} manuell.`);
  };

  if (!saga || !profile) {
    return (
      <Background>
        <View style={styles.center}>
          <Text style={{ color: colors.foreground, fontFamily: fonts.titleBold }}>
            Wanderung nicht gefunden.
          </Text>
          <PrimaryButton label="Zurück" variant="ghost" onPress={() => router.back()} />
        </View>
      </Background>
    );
  }

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;
  const progress = chapters.length ? currentIndex / (chapters.length - 1) : 0;
  const currentChapter = chapters[currentIndex];

  return (
    <Background>
      {/* Standort-Banner */}
      {locState === "denied" && (
        <View style={[styles.banner, { top: topPad, backgroundColor: colors.card }]}>
          <Feather name="map-pin" size={16} color={colors.accent} />
          <Text style={[styles.bannerText, { color: colors.foreground }]}>
            Kein Standortzugriff — die Route wird simuliert.
          </Text>
          <Pressable onPress={() => Linking.openSettings?.()}>
            <Text style={[styles.bannerAction, { color: colors.accent }]}>Erlauben</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{
          paddingTop: locState === "denied" ? topPad + 56 : topPad,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>
              {saga.canton.toUpperCase()} · LIVE
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {saga.title}
            </Text>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="minimize-2" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={{ marginTop: 14 }}>
          <RouteMap progress={progress} height={200} />
        </View>

        {/* Statusleiste in Frozen Glass */}
        <Glass style={{ marginTop: 14 }}>
          <View style={styles.statBar}>
            <Metric label="DISTANZ" value={distance.toFixed(1)} unit="km" />
            <Metric label="HÖHE" value={`${Math.round(progress * 480)}`} unit="hm" />
            <Metric
              label="RESTZEIT"
              value={`${Math.max(0, Math.round((1 - progress) * 165))}`}
              unit="min"
            />
            <Metric label="SAC" value="T3" unit="" />
          </View>
        </Glass>

        {/* Story-Bereich */}
        {preparing ? (
          <View style={styles.preparing}>
            <SparkMountain size={90} pulsing />
            <Text style={[styles.preparingText, { color: colors.mutedForeground }]}>
              Die Sage erwacht …
            </Text>
          </View>
        ) : (
          <Animated.View entering={FadeIn} style={styles.storyWrap}>
            <View style={styles.chapterHead}>
              <Text style={[styles.chapterMark, { color: colors.accent }]}>
                KAPITEL {currentIndex + 1} / {chapters.length}
              </Text>
              <Pressable
                onPress={() => {
                  if (speaking) {
                    Speech.stop();
                    setSpeaking(false);
                  } else if (currentChapter) {
                    speak(currentChapter.text);
                  }
                }}
                style={[styles.playBtn, { borderColor: colors.glassBorder }]}
              >
                <Feather
                  name={speaking ? "pause" : "play"}
                  size={16}
                  color={colors.foreground}
                />
                <Text style={[styles.playText, { color: colors.foreground }]}>
                  {speaking ? "Pause" : "Vorlesen"}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.storyText, { color: colors.foreground }]}>
              {currentChapter?.text}
            </Text>

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
                    WAHRNEHMUNG
                  </Text>
                  <Text style={[styles.decisionQuestion, { color: colors.foreground }]}>
                    {currentChapter.decision.question}
                  </Text>
                  {currentChapter.decision.options.map((opt, i) => (
                    <Pressable
                      key={i}
                      onPress={() => chooseOption(i)}
                      style={[
                        styles.optionBtn,
                        { borderColor: colors.glassBorder },
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

            {finished && (
              <PrimaryButton
                label="Wanderung abschliessen"
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
        style={[styles.sosBtn, { bottom: insets.bottom + 20, backgroundColor: colors.primary }]}
      >
        <Text style={styles.sosText}>SOS</Text>
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
            <Text style={[styles.sosTitle, { color: colors.foreground }]}>Notfall</Text>
            <Text style={[styles.sosSub, { color: colors.mutedForeground }]}>
              Wähle den passenden Notruf. Bleib ruhig, nenne Standort und Lage.
            </Text>

            <Pressable
              onPress={() => callNumber("1414")}
              style={[styles.sosCall, { backgroundColor: colors.primary }]}
            >
              <Feather name="phone" size={20} color={colors.primaryForeground} />
              <View>
                <Text style={styles.sosCallTitle}>Rega 1414</Text>
                <Text style={styles.sosCallSub}>Schweizerische Rettungsflugwacht</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => callNumber("112")}
              style={[styles.sosCall, { backgroundColor: colors.primary }]}
            >
              <Feather name="phone" size={20} color={colors.primaryForeground} />
              <View>
                <Text style={styles.sosCallTitle}>Euro-Notruf 112</Text>
                <Text style={styles.sosCallSub}>Allgemeiner Notruf</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                const coords = saga.coordinates
                  ? `${saga.coordinates.lat}, ${saga.coordinates.lng}`
                  : "unbekannt";
                const body = `Notfall auf Wanderung. Mein ungefährer Standort: ${coords}`;
                openUrlSafely(
                  `sms:&body=${encodeURIComponent(body)}`,
                  "SMS ist auf diesem Gerät nicht verfügbar."
                );
              }}
              style={[styles.sosSecondary, { borderColor: colors.glassBorder }]}
            >
              <Feather name="share-2" size={18} color={colors.foreground} />
              <Text style={[styles.sosSecondaryText, { color: colors.foreground }]}>
                Standort an Notfallkontakt senden
              </Text>
            </Pressable>

            <Pressable onPress={() => setSosOpen(false)} style={styles.sosClose}>
              <Text style={[styles.sosCloseText, { color: colors.mutedForeground }]}>
                Schliessen
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerText: { flex: 1, fontFamily: fonts.body, fontSize: 13 },
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
  storyWrap: { marginTop: 24 },
  chapterHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  chapterMark: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  playBtn: {
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
  decisionWrap: { marginTop: 24 },
  decisionPanel: { borderWidth: 1, borderRadius: 16, padding: 18 },
  decisionLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2 },
  decisionQuestion: { fontFamily: fonts.titleBold, fontSize: 20, marginTop: 6, marginBottom: 14 },
  optionBtn: { borderWidth: 1, borderRadius: 12, padding: 15, marginBottom: 10 },
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
  sosSecondary: {
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
