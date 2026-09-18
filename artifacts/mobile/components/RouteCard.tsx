import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { GLAS_3D, SCHATTEN_3D } from "@/constants/depth";
import type { HikingRoute } from "@/constants/routes";
import { fonts } from "@/constants/typography";
import { useKantonStrings } from "@/lib/i18n/screens/kanton";
import { haversineKm } from "@/lib/geo";
import { clearRouteFotoCache, useRouteFoto } from "@/lib/useRouteFoto";
import { useColors } from "@/hooks/useColors";
import { Wegweiser } from "@/components/Wegweiser";

export function RouteCard({
  route,
  index,
  locked,
  nearbyPos,
  onPress,
  kanton,
}: {
  route: HikingRoute;
  index: number;
  locked: boolean;
  nearbyPos?: { lat: number; lng: number } | null;
  onPress: () => void;
  kanton?: string | null;
}) {
  const t = useKantonStrings();
  const colors = useColors();
  const distToStart =
    nearbyPos && route.coordinates
      ? (() => {
          const km = haversineKm(nearbyPos, {
            lat: route.coordinates.lat,
            lng: route.coordinates.lng,
          });
          return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
        })()
      : null;
  const foto = useRouteFoto(route);
  const [fotoFehler, setFotoFehler] = useState(false);
  const prevPhotoUrl = useRef(route.photoUrl);
  if (prevPhotoUrl.current !== route.photoUrl) {
    prevPhotoUrl.current = route.photoUrl;
    setFotoFehler(false);
  }
  const h = Math.floor(route.minutes / 60);
  const m = route.minutes % 60;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80)} style={styles.cardWrap}>
      <Pressable onPress={onPress} style={[styles.card, { borderColor: colors.glassBorder }]}>
        <ExpoImage
          source={fotoFehler ? foto.fallback : foto.source}
          style={styles.cardImg}
          contentFit="cover"
          onError={() => {
            clearRouteFotoCache(route);
            setFotoFehler(true);
          }}
        />
        {foto.attribution && (
          <View style={styles.cardAttributionScrim}>
            <Text
              style={[styles.cardAttribution, { color: colors.photoScrimMuted }]}
              numberOfLines={1}
            >
              {foto.attribution}
            </Text>
          </View>
        )}
        {locked && (
          <View style={styles.cardLockBadge}>
            <Feather name="lock" size={14} color={colors.photoScrimText} />
          </View>
        )}
        <View style={styles.cardContent}>
          <Wegweiser name={route.name} sac={route.sac} kompakt kanton={kanton} />
          {distToStart && (
            <View style={styles.cardSeasonRow}>
              <Feather name="navigation" size={11} color={colors.accent} />
              <Text style={[styles.cardSeasonText, { color: colors.accent }]}>
                {" "}
                {t.nearbyDistBadge(distToStart)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.cardZeitleiste}>
          <Text
            style={styles.cardZeitleisteText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {t.sacLabel} {route.sac} · {route.distanceTagKm ?? route.distanceKm} km ·{" "}
            {route.ascentM} hm · {h}:{String(m).padStart(2, "0")} h ·{" "}
            {t.season[
              route.season === "ganzjaehrig"
                ? "ganzjaehrig"
                : route.season === "nur_sommer"
                  ? "nurSommer"
                  : "eherSommer"
            ]}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrap: { ...SCHATTEN_3D, marginBottom: 14 },
  card: {
    ...GLAS_3D,
    height: 200,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardImg: { width: "100%", height: "100%" },
  cardContent: { position: "absolute", left: 16, right: 16, bottom: 40 },
  cardAttributionScrim: {
    position: "absolute",
    top: 8,
    right: 10,
    maxWidth: "70%",
    backgroundColor: "rgba(8,10,12,0.58)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  cardAttribution: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.88)",
  },
  cardLockBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,10,12,0.55)",
    zIndex: 2,
  },
  cardZeitleiste: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
    backgroundColor: "rgba(227,6,19,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  cardZeitleisteText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: "#FFFFFF",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardSeasonRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  cardSeasonText: { fontFamily: fonts.body, fontSize: 11 },
});