import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { RangeSlider } from "@/components/brand/RangeSlider";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { SearchProgress } from "@/components/brand/SearchProgress";
import { HikingRoute } from "@/constants/routes";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import {
  useCatalog,
  CatalogSource,
  RouteSearchFilter,
} from "@/contexts/CatalogContext";
import { useKantonStrings } from "@/lib/i18n/screens/kanton";
import { useRouteFoto } from "@/lib/useRouteFoto";
import { useColors } from "@/hooks/useColors";

const DIST_MIN = 0;
const DIST_MAX = 50;
const ASC_MIN = 0;
const ASC_MAX = 3000;
const DIFF_MIN = 1;
const DIFF_MAX = 6;


const WEB_TOP = 67;

export default function KantonRouten() {
  const t = useKantonStrings();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { canton } = useLocalSearchParams<{ canton: string }>();
  const { profile, premium, freeHikeUsed } = useApp();
  const { loadCantonRoutes } = useCatalog();

  const cantonName = decodeURIComponent(canton ?? "");
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  const [routes, setRoutes] = useState<HikingRoute[]>([]);
  const [routeSource, setRouteSource] = useState<CatalogSource>("server");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [distFilter, setDistFilter] = useState<[number, number]>([DIST_MIN, DIST_MAX]);
  const [ascFilter, setAscFilter] = useState<[number, number]>([ASC_MIN, ASC_MAX]);
  const [diffFilter, setDiffFilter] = useState<[number, number]>([DIFF_MIN, DIFF_MAX]);

  // Beim Kantonswechsel Filter und Ergebnisse zuruecksetzen — erst suchen,
  // wenn der Nutzer die Filter gesetzt und die Suche gestartet hat.
  useEffect(() => {
    setDistFilter([DIST_MIN, DIST_MAX]);
    setAscFilter([ASC_MIN, ASC_MAX]);
    setDiffFilter([DIFF_MIN, DIFF_MAX]);
    setRoutes([]);
    setSearched(false);
    setSearching(false);
  }, [cantonName]);

  // Slider-Anschlaege in einen Filter uebersetzen: obere Anschlaege sind nach
  // oben offen (weglassen), volle Schwierigkeit bedeutet "kein Grad-Filter".
  const buildFilter = useCallback((): RouteSearchFilter => {
    const [distMin, distMax] = distFilter;
    const [ascMin, ascMax] = ascFilter;
    const [diffMin, diffMax] = diffFilter;
    const filter: RouteSearchFilter = {};
    if (distMin > DIST_MIN) filter.distMin = distMin;
    if (distMax < DIST_MAX) filter.distMax = distMax;
    if (ascMin > ASC_MIN) filter.ascMin = ascMin;
    if (ascMax < ASC_MAX) filter.ascMax = ascMax;
    if (diffMin > DIFF_MIN || diffMax < DIFF_MAX) {
      filter.diffMin = diffMin;
      filter.diffMax = diffMax;
    }
    return filter;
  }, [distFilter, ascFilter, diffFilter]);

  const onSearch = useCallback(async () => {
    if (!cantonName) return;
    setSearching(true);
    const res = await loadCantonRoutes(cantonName, buildFilter());
    setRoutes(res.routes);
    setRouteSource(res.source);
    setSearched(true);
    setSearching(false);
  }, [cantonName, loadCantonRoutes, buildFilter]);

  const loadError = routeSource === "error";

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
        <ScreenHeader eyebrow={t.eyebrow} title={cantonName} onBack />

        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          {t.intro(cantonName)}
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
              {t.filterTitle}
            </Text>
          </View>

          <RangeSlider
            label={t.distanceLabel}
            min={DIST_MIN}
            max={DIST_MAX}
            step={1}
            values={distFilter}
            onChange={setDistFilter}
            formatValue={(v) => t.distanceUnit(v, v === DIST_MAX)}
          />
          <RangeSlider
            label={t.elevationLabel}
            min={ASC_MIN}
            max={ASC_MAX}
            step={50}
            values={ascFilter}
            onChange={setAscFilter}
            formatValue={(v) => t.elevationUnit(v, v === ASC_MAX)}
          />
          <RangeSlider
            label={t.difficultyLabel}
            min={DIFF_MIN}
            max={DIFF_MAX}
            step={1}
            values={diffFilter}
            onChange={setDiffFilter}
            formatValue={(v) => t.difficultyUnit(v)}
          />
        </View>

        <PrimaryButton
          label={searching ? t.searchingButton : t.searchButton}
          onPress={onSearch}
          variant="gold"
          loading={searching}
          disabled={searching}
        />

        <View style={styles.results}>
          {searching ? (
            <SearchProgress cantonName={cantonName} />
          ) : !searched ? (
            <View style={styles.hint}>
              <Feather name="search" size={22} color={colors.mutedForeground} />
              <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                {t.searchHint}
              </Text>
            </View>
          ) : routes.length === 0 ? (
            <View style={styles.hint}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {loadError ? t.serverError : t.noRoutesFound}
              </Text>
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                {loadError ? t.errorDetail : t.emptyDetail}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
                {routes.length === 1 ? t.routeFound : t.routesFound(routes.length)}
                {" "}{t.nextStepSaga}
              </Text>
              {routes.map((route, i) => {
                const locked = !premium && freeHikeUsed;
                return (
                  <RouteCard
                    key={route.id}
                    route={route}
                    index={i}
                    locked={locked}
                    onPress={() => router.push(`/route/${route.id}`)}
                  />
                );
              })}
            </>
          )}
        </View>
      </ScrollView>
    </Background>
  );
}

function RouteCard({
  route,
  index,
  locked,
  onPress,
}: {
  route: HikingRoute;
  index: number;
  locked: boolean;
  onPress: () => void;
}) {
  const t = useKantonStrings();
  const colors = useColors();
  // Echtes, moeglichst saisonpassendes Foto aus Routennaehe; solange keins
  // geladen ist, zeigt der Hook das gebuendelte Saison-Panorama.
  const foto = useRouteFoto(route);
  const h = Math.floor(route.minutes / 60);
  const m = route.minutes % 60;
  return (
    <Animated.View entering={FadeInDown.delay(index * 80)} style={styles.cardWrap}>
      <Pressable onPress={onPress} style={styles.card}>
        <Image source={foto.source} style={styles.cardImg} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(16,24,26,0.2)", "rgba(16,24,26,0.94)"]}
          style={StyleSheet.absoluteFill}
        />
        {foto.attribution && (
          <Text
            style={[styles.cardAttribution, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {foto.attribution}
          </Text>
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text style={[styles.cardEyebrow, { color: colors.accent }]}>
              {t.sacLabel} {route.sac} · {route.distanceKm} km · {route.ascentM} hm ·{" "}
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
          <View style={styles.cardSeasonRow}>
            <Feather
              name={route.season === "ganzjaehrig" ? "sun" : "cloud-snow"}
              size={12}
              color={colors.mutedForeground}
            />
            <Text style={[styles.cardSeasonText, { color: colors.mutedForeground }]}>
              {t.season[
                route.season === "ganzjaehrig"
                  ? "ganzjaehrig"
                  : route.season === "nur_sommer"
                    ? "nurSommer"
                    : "eherSommer"
              ]}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  intro: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 4, marginBottom: 18 },
  cardAttribution: {
    position: "absolute",
    top: 8,
    right: 10,
    maxWidth: "70%",
    fontFamily: fonts.body,
    fontSize: 9,
    opacity: 0.85,
  },
  filterPanel: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    paddingBottom: 4,
    marginBottom: 18,
  },
  filterHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  filterTitle: { fontFamily: fonts.titleBold, fontSize: 16, flex: 1 },
  results: { marginTop: 18 },
  hint: { alignItems: "center", paddingVertical: 40, gap: 12 },
  hintText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 280,
  },
  resultCount: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    lineHeight: 18,
    marginBottom: 14,
  },
  emptyTitle: { fontFamily: fonts.titleBold, fontSize: 18, textAlign: "center" },
  cardWrap: { marginBottom: 14 },
  card: { height: 200, borderRadius: 18, overflow: "hidden" },
  cardImg: { width: "100%", height: "100%" },
  cardContent: { position: "absolute", left: 16, right: 16, bottom: 16 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardEyebrow: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, flex: 1 },
  cardTitle: { fontFamily: fonts.titleBold, fontSize: 24, marginTop: 6 },
  cardTerrain: { fontFamily: fonts.story, fontSize: 13, marginTop: 3 },
  cardSeasonRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  cardSeasonText: { fontFamily: fonts.body, fontSize: 11 },
});
