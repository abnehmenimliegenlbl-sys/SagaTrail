import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { HikingRoute, getRoutesByCanton, getSagaForRoute } from "@/constants/routes";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const heroImg = require("@/assets/images/hero-valley.png");
const teufelImg = require("@/assets/images/saga-teufelsbruecke.png");

const WEB_TOP = 67;

export default function KantonRouten() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { canton } = useLocalSearchParams<{ canton: string }>();
  const { profile, premium } = useApp();

  const cantonName = decodeURIComponent(canton ?? "");
  const routes = getRoutesByCanton(cantonName);
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  if (routes.length === 0) {
    return (
      <Background>
        <View style={styles.center}>
          <Text style={{ color: colors.foreground, fontFamily: fonts.titleBold }}>
            Für {cantonName || "diesen Kanton"} gibt es noch keine Routen.
          </Text>
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader eyebrow="Schritt 2 · Route" title={cantonName} onBack />

        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          Wähle eine Wanderroute in {cantonName}. Danach folgt die passende Sage.
        </Text>

        <View style={{ marginTop: 8 }}>
          {routes.map((route, i) => {
            const saga = getSagaForRoute(route);
            const locked = !premium && route.region !== profile?.homeCanton;
            return (
              <RouteCard
                key={route.id}
                route={route}
                sagaTitle={saga?.title}
                index={i}
                locked={locked}
                image={route.id === "teufelsbrucke" ? teufelImg : heroImg}
                onPress={() => router.push(`/route/${route.id}`)}
              />
            );
          })}
        </View>
      </ScrollView>
    </Background>
  );
}

function RouteCard({
  route,
  sagaTitle,
  index,
  locked,
  image,
  onPress,
}: {
  route: HikingRoute;
  sagaTitle?: string;
  index: number;
  locked: boolean;
  image: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const h = Math.floor(route.minutes / 60);
  const m = route.minutes % 60;
  return (
    <Animated.View entering={FadeInDown.delay(index * 80)} style={styles.cardWrap}>
      <Pressable onPress={onPress} style={styles.card}>
        <Image source={image} style={styles.cardImg} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(16,24,26,0.2)", "rgba(16,24,26,0.94)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text style={[styles.cardEyebrow, { color: colors.accent }]}>
              SAC {route.sac} · {route.distanceKm} km · {route.ascentM} hm ·{" "}
              {h}:{String(m).padStart(2, "0")} h
            </Text>
            {locked && (
              <Feather name="lock" size={14} color={colors.mutedForeground} />
            )}
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {route.name}
          </Text>
          <Text
            style={[styles.cardTerrain, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {route.terrain}
          </Text>
          {sagaTitle ? (
            <Text style={[styles.cardSaga, { color: colors.foreground }]} numberOfLines={1}>
              Sage: {sagaTitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  intro: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 4, marginBottom: 18 },
  cardWrap: { marginBottom: 14 },
  card: { height: 200, borderRadius: 18, overflow: "hidden" },
  cardImg: { width: "100%", height: "100%" },
  cardContent: { position: "absolute", left: 16, right: 16, bottom: 16 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardEyebrow: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, flex: 1 },
  cardTitle: { fontFamily: fonts.titleBold, fontSize: 24, marginTop: 6 },
  cardTerrain: { fontFamily: fonts.story, fontSize: 13, marginTop: 3 },
  cardSaga: { fontFamily: fonts.mono, fontSize: 12, marginTop: 6 },
});
