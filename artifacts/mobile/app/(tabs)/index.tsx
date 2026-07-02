import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { SparkDivider } from "@/components/brand/SparkMountain";
import { SAGAS } from "@/constants/sagas";
import { fonts } from "@/constants/typography";
import { ARCHETYPES } from "@/constants/onboarding";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { Saga } from "@/types";

const heroImg = require("@/assets/images/hero-valley.png");
const teufelImg = require("@/assets/images/saga-teufelsbruecke.png");

const WEB_TOP = 67;

export default function Entdecken() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, premium } = useApp();

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;
  const archetypeTitle =
    ARCHETYPES.find((a) => a.id === profile?.archetype)?.title ?? "";

  const anchors = SAGAS.filter((s) => s.isAnchorPlace);
  const rest = SAGAS.filter((s) => !s.isAnchorPlace);

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              Willkommen zurück
            </Text>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {profile?.name ?? "Wander:in"}
            </Text>
            <Text style={[styles.archetype, { color: colors.accent }]}>
              {archetypeTitle}
            </Text>
          </View>
          {!premium && (
            <Pressable
              onPress={() => router.push("/paywall")}
              style={[styles.proBadge, { borderColor: colors.accent }]}
            >
              <Feather name="star" size={13} color={colors.accent} />
              <Text style={[styles.proText, { color: colors.accent }]}>Premium</Text>
            </Pressable>
          )}
        </View>

        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
          <Image source={heroImg} style={styles.heroImg} resizeMode="cover" />
          <LinearGradient
            colors={["transparent", "rgba(16,24,26,0.95)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <Text style={[styles.heroEyebrow, { color: colors.accent }]}>
              DEINE HEIMAT · {profile?.homeCanton?.toUpperCase()}
            </Text>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>
              Die Berge flüstern Geschichten
            </Text>
            <Text style={[styles.heroBody, { color: colors.foreground }]}>
              Wähle eine Sage und lass sie dich auf deiner Wanderung begleiten.
            </Text>
          </View>
        </Animated.View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Ankerorte
          </Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            Legendäre Schauplätze mit fester Verortung
          </Text>
        </View>

        {anchors.map((saga, i) => (
          <AnchorCard
            key={saga.id}
            saga={saga}
            index={i}
            image={saga.id === "teufelsbrucke" ? teufelImg : heroImg}
            onPress={() => router.push(`/saga/${saga.id}`)}
          />
        ))}

        <SparkDivider style={{ marginHorizontal: 20, marginVertical: 24 }} />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Sagenbibliothek
          </Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            {SAGAS.length} Legenden aus der ganzen Schweiz
          </Text>
        </View>

        <View style={styles.grid}>
          {rest.map((saga, i) => (
            <LibraryCard
              key={saga.id}
              saga={saga}
              index={i}
              locked={!premium && saga.canton !== profile?.homeCanton}
              onPress={() => router.push(`/saga/${saga.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </Background>
  );
}

function AnchorCard({
  saga,
  index,
  image,
  onPress,
}: {
  saga: Saga;
  index: number;
  image: number;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeInDown.delay(index * 90)} style={styles.anchorWrap}>
      <Pressable onPress={onPress} style={styles.anchorCard}>
        <Image source={image} style={styles.anchorImg} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(16,24,26,0.15)", "rgba(16,24,26,0.92)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.anchorContent}>
          <Text style={[styles.cardCanton, { color: colors.accent }]}>
            {saga.canton.toUpperCase()} · {saga.coreMotif.toUpperCase()}
          </Text>
          <Text style={[styles.anchorTitle, { color: colors.foreground }]}>
            {saga.title}
          </Text>
          <Text style={[styles.cardMood, { color: colors.mutedForeground }]}>
            {saga.mood}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function LibraryCard({
  saga,
  index,
  locked,
  onPress,
}: {
  saga: Saga;
  index: number;
  locked: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60)}
      style={styles.libCardWrap}
    >
      <Pressable
        onPress={onPress}
        style={[
          styles.libCard,
          {
            backgroundColor: colors.glassBg,
            borderColor: colors.glassBorder,
            borderRadius: colors.radius,
          },
        ]}
      >
        <View style={styles.libHead}>
          <Text style={[styles.cardCanton, { color: colors.accent }]}>
            {saga.canton.toUpperCase()}
          </Text>
          {locked && <Feather name="lock" size={13} color={colors.mutedForeground} />}
        </View>
        <Text style={[styles.libTitle, { color: colors.foreground }]}>
          {saga.title}
        </Text>
        <Text
          style={[styles.cardMood, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {saga.mood}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  greeting: { fontFamily: fonts.body, fontSize: 14 },
  name: { fontFamily: fonts.titleBold, fontSize: 30, marginTop: 2 },
  archetype: { fontFamily: fonts.story, fontSize: 14, marginTop: 2 },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  proText: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 0.5 },
  hero: {
    marginHorizontal: 20,
    height: 230,
    borderRadius: 18,
    overflow: "hidden",
  },
  heroImg: { width: "100%", height: "100%" },
  heroContent: { position: "absolute", left: 18, right: 18, bottom: 18 },
  heroEyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  heroTitle: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 6 },
  heroBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 4 },
  section: { paddingHorizontal: 20, marginTop: 28, marginBottom: 14 },
  sectionTitle: { fontFamily: fonts.titleBold, fontSize: 22 },
  sectionHint: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  anchorWrap: { paddingHorizontal: 20, marginBottom: 14 },
  anchorCard: { height: 180, borderRadius: 18, overflow: "hidden" },
  anchorImg: { width: "100%", height: "100%" },
  anchorContent: { position: "absolute", left: 16, right: 16, bottom: 16 },
  anchorTitle: { fontFamily: fonts.titleBold, fontSize: 24, marginTop: 4 },
  cardCanton: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 },
  cardMood: { fontFamily: fonts.story, fontSize: 13, marginTop: 3 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    gap: 12,
  },
  libCardWrap: { width: "47%", marginHorizontal: "1.5%" },
  libCard: { borderWidth: 1, padding: 14, minHeight: 120, marginBottom: 4 },
  libHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  libTitle: { fontFamily: fonts.titleBold, fontSize: 18, marginTop: 8 },
});
