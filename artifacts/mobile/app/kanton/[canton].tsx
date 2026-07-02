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
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { RangeSlider } from "@/components/brand/RangeSlider";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { HikingRoute } from "@/constants/routes";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog, CatalogSource } from "@/contexts/CatalogContext";
import { useColors } from "@/hooks/useColors";

const DIST_MIN = 0;
const DIST_MAX = 50;
const ASC_MIN = 0;
const ASC_MAX = 3000;
const DIFF_MIN = 1;
const DIFF_MAX = 6;

/** Liest den SAC-Grad (T1–T6) aus einem Routen-Feld; null bei "unbekannt". */
function sacStufe(sac: string): number | null {
  const m = /T\s*([1-6])/i.exec(sac);
  return m ? Number(m[1]) : null;
}

const heroImg = require("@/assets/images/hero-valley.png");
const teufelImg = require("@/assets/images/saga-teufelsbruecke.png");

const WEB_TOP = 67;

export default function KantonRouten() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { canton } = useLocalSearchParams<{ canton: string }>();
  const { profile, premium } = useApp();
  const { loadCantonRoutes } = useCatalog();

  const cantonName = decodeURIComponent(canton ?? "");
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  const [routes, setRoutes] = useState<HikingRoute[]>([]);
  const [routeSource, setRouteSource] = useState<CatalogSource>("seed");
  const [loading, setLoading] = useState(true);

  const [distFilter, setDistFilter] = useState<[number, number]>([DIST_MIN, DIST_MAX]);
  const [ascFilter, setAscFilter] = useState<[number, number]>([ASC_MIN, ASC_MAX]);
  const [diffFilter, setDiffFilter] = useState<[number, number]>([DIFF_MIN, DIFF_MAX]);

  useEffect(() => {
    let cancelled = false;
    if (!cantonName) return;
    setLoading(true);
    // Filter beim Kantonswechsel zuruecksetzen.
    setDistFilter([DIST_MIN, DIST_MAX]);
    setAscFilter([ASC_MIN, ASC_MAX]);
    setDiffFilter([DIFF_MIN, DIFF_MAX]);
    (async () => {
      const res = await loadCantonRoutes(cantonName);
      if (cancelled) return;
      setRoutes(res.routes);
      setRouteSource(res.source);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [cantonName, loadCantonRoutes]);

  const [distMin, distMax] = distFilter;
  const [ascMin, ascMax] = ascFilter;
  const [diffMin, diffMax] = diffFilter;
  const diffAll = diffMin === DIFF_MIN && diffMax === DIFF_MAX;

  // Obere Zugpunkte am Anschlag sind nach oben offen (z. B. "50 km" = 50+),
  // damit lange Routen bei Maximalstellung nicht unbemerkt verschwinden.
  const filtered = routes.filter((r) => {
    if (r.distanceKm < distMin) return false;
    if (distMax < DIST_MAX && r.distanceKm > distMax) return false;
    if (r.ascentM < ascMin) return false;
    if (ascMax < ASC_MAX && r.ascentM > ascMax) return false;
    const stufe = sacStufe(r.sac);
    if (stufe === null) return diffAll; // "unbekannt" nur bei vollem Bereich
    return stufe >= diffMin && stufe <= diffMax;
  });

  if (loading) {
    return (
      <Background>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Echte Wanderrouten für {cantonName || "diesen Kanton"} werden aus
            swisstopo und OpenStreetMap geladen …
          </Text>
        </View>
      </Background>
    );
  }

  if (routes.length === 0) {
    return (
      <Background>
        <View style={styles.center}>
          <Text
            style={{
              color: colors.foreground,
              fontFamily: fonts.titleBold,
              textAlign: "center",
            }}
          >
            Für {cantonName || "diesen Kanton"} konnten keine Routen geladen
            werden.
          </Text>
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Bitte prüfe deine Verbindung und versuche es erneut.
          </Text>
        </View>
      </Background>
    );
  }

  const offline = routeSource === "seed";

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
          {offline
            ? `Ohne Verbindung: kuratierte Routen in ${cantonName}. Danach folgt die passende Sage.`
            : `Echte Wanderrouten in ${cantonName}, angereichert mit swisstopo-Höhenmetern. Danach folgt die passende Sage.`}
        </Text>

        <View
          style={[
            styles.filterPanel,
            { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
          ]}
        >
          <View style={styles.filterHead}>
            <Feather name="sliders" size={14} color={colors.accent} />
            <Text style={[styles.filterTitle, { color: colors.foreground }]}>
              Filter
            </Text>
            <Text style={[styles.filterCount, { color: colors.mutedForeground }]}>
              {filtered.length} von {routes.length}
            </Text>
          </View>

          <RangeSlider
            label="Distanz"
            min={DIST_MIN}
            max={DIST_MAX}
            step={1}
            values={distFilter}
            onChange={setDistFilter}
            formatValue={(v) => `${v}${v === DIST_MAX ? "+" : ""} km`}
          />
          <RangeSlider
            label="Höhenmeter"
            min={ASC_MIN}
            max={ASC_MAX}
            step={50}
            values={ascFilter}
            onChange={setAscFilter}
            formatValue={(v) => `${v}${v === ASC_MAX ? "+" : ""} hm`}
          />
          <RangeSlider
            label="Schwierigkeit"
            min={DIFF_MIN}
            max={DIFF_MAX}
            step={1}
            values={diffFilter}
            onChange={setDiffFilter}
            formatValue={(v) => `T${v}`}
          />
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyFilter}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Keine Route im gewählten Bereich.
            </Text>
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Erweitere die Filter, um wieder mehr Routen zu sehen.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 8 }}>
            {filtered.map((route, i) => {
              const locked = !premium && route.region !== profile?.homeCanton;
              return (
                <RouteCard
                  key={route.id}
                  route={route}
                  index={i}
                  locked={locked}
                  image={route.id === "teufelsbrucke" ? teufelImg : heroImg}
                  onPress={() => router.push(`/route/${route.id}`)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </Background>
  );
}

function RouteCard({
  route,
  index,
  locked,
  image,
  onPress,
}: {
  route: HikingRoute;
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
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 14 },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  intro: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 4, marginBottom: 18 },
  filterPanel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    paddingBottom: 4,
    marginBottom: 18,
  },
  filterHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  filterTitle: { fontFamily: fonts.titleBold, fontSize: 16, flex: 1 },
  filterCount: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.5 },
  emptyFilter: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTitle: { fontFamily: fonts.titleBold, fontSize: 18, textAlign: "center" },
  cardWrap: { marginBottom: 14 },
  card: { height: 200, borderRadius: 18, overflow: "hidden" },
  cardImg: { width: "100%", height: "100%" },
  cardContent: { position: "absolute", left: 16, right: 16, bottom: 16 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardEyebrow: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, flex: 1 },
  cardTitle: { fontFamily: fonts.titleBold, fontSize: 24, marginTop: 6 },
  cardTerrain: { fontFamily: fonts.story, fontSize: 13, marginTop: 3 },
});
