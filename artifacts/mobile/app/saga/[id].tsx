import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { SparkDivider } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useColors } from "@/hooks/useColors";

const heroImg = require("@/assets/images/hero-valley.png");
const teufelImg = require("@/assets/images/saga-teufelsbruecke.png");

export default function SagaDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, premium } = useApp();
  const { getSaga, ensureRouteSaga } = useCatalog();

  const [saga, setSaga] = useState(() => getSaga(id));
  const [loading, setLoading] = useState(!saga);

  useEffect(() => {
    let cancelled = false;
    const known = getSaga(id);
    if (known) {
      setSaga(known);
      setLoading(false);
      return;
    }
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const result = await ensureRouteSaga(id);
      if (cancelled) return;
      setSaga(result);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, getSaga, ensureRouteSaga]);

  if (loading) {
    return (
      <Background>
        <View style={styles.notFound}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.notFoundText, { color: colors.foreground }]}>
            Die Sage wird erzeugt …
          </Text>
        </View>
      </Background>
    );
  }

  if (!saga) {
    return (
      <Background>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.foreground }]}>
            Diese Sage wurde nicht gefunden.
          </Text>
          <PrimaryButton label="Zurück" variant="ghost" onPress={() => router.back()} />
        </View>
      </Background>
    );
  }

  const locked = !premium && saga.canton !== profile?.homeCanton;
  const image = saga.id === "teufelsbrucke" ? teufelImg : heroImg;
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <Image source={image} style={styles.hero} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(16,24,26,0.4)", "rgba(16,24,26,0.98)"]}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.back,
              { top: topInset + 6, borderColor: colors.glassBorder },
            ]}
            hitSlop={10}
          >
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>
          <Animated.View entering={FadeIn} style={styles.heroText}>
            <Text style={[styles.canton, { color: colors.accent }]}>
              {saga.canton.toUpperCase()} · {saga.coreMotif.toUpperCase()}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {saga.title}
            </Text>
            <Text style={[styles.mood, { color: colors.mutedForeground }]}>
              {saga.mood}
            </Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(80)} style={styles.body}>
          <Text style={[styles.summary, { color: colors.foreground }]}>
            {saga.summary}
          </Text>

          <SparkDivider style={{ marginVertical: 22 }} />

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={15} color={colors.accent} />
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
                Koordinaten
              </Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>
                {saga.coordinates
                  ? `${saga.coordinates.lat.toFixed(4)}, ${saga.coordinates.lng.toFixed(4)}`
                  : "Ortsungebunden"}
              </Text>
            </View>
          </View>

          <View style={[styles.sourceBox, { borderColor: colors.glassBorder }]}>
            <Text style={[styles.sourceLabel, { color: colors.mutedForeground }]}>
              QUELLE
            </Text>
            <Text style={[styles.sourceText, { color: colors.foreground }]}>
              {saga.source}
            </Text>
          </View>

          {locked ? (
            <View
              style={[
                styles.lockedBox,
                { borderColor: colors.accent, backgroundColor: colors.glassBg },
              ]}
            >
              <Feather name="lock" size={20} color={colors.accent} />
              <Text style={[styles.lockedText, { color: colors.foreground }]}>
                Diese Region ist Teil von SagaTrail Premium. Schalte alle Kantone
                frei, um diese Wanderung zu starten.
              </Text>
              <PrimaryButton
                label="Premium freischalten"
                variant="gold"
                onPress={() => router.push("/paywall")}
                style={{ marginTop: 12, alignSelf: "stretch" }}
              />
            </View>
          ) : (
            <PrimaryButton
              label="Wanderung starten"
              onPress={() => router.replace(`/hike/${saga.id}`)}
              style={{ marginTop: 26 }}
            />
          )}
        </Animated.View>
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  heroWrap: { height: 380 },
  hero: { width: "100%", height: "100%" },
  back: {
    position: "absolute",
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16,24,26,0.4)",
  },
  heroText: { position: "absolute", left: 20, right: 20, bottom: 20 },
  canton: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  title: { fontFamily: fonts.titleBlack, fontSize: 36, marginTop: 6, lineHeight: 38 },
  mood: { fontFamily: fonts.story, fontSize: 15, marginTop: 6 },
  body: { paddingHorizontal: 20, marginTop: 20 },
  summary: { fontFamily: fonts.story, fontSize: 18, lineHeight: 30 },
  metaRow: { flexDirection: "row" },
  metaItem: { flex: 1 },
  metaLabel: { fontFamily: fonts.body, fontSize: 12, marginTop: 6 },
  metaValue: { fontFamily: fonts.mono, fontSize: 15, marginTop: 2 },
  sourceBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
  },
  sourceLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5 },
  sourceText: { fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  lockedBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginTop: 26,
    alignItems: "flex-start",
    gap: 6,
  },
  lockedText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 30 },
  notFoundText: { fontFamily: fonts.titleBold, fontSize: 20 },
});
