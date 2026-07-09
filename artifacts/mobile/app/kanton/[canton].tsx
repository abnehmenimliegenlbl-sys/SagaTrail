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
import { alert } from "@/lib/appAlert";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLAS_3D, SCHATTEN_3D } from "@/constants/depth";
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
import { useSharedStrings } from "@/lib/i18n/screens/shared";
import { useRouteFoto } from "@/lib/useRouteFoto";
import { useColors } from "@/hooks/useColors";
import { kantonSlug, packEntitlementFuerKanton } from "@/lib/kantonSlug";
import {
  KANTONSPACK_PACKAGE,
  REVENUECAT_PACKS_OFFERING,
  useSubscription,
} from "@/lib/revenuecat";
import { ApiError, claimKantonspack } from "@workspace/api-client-react";

const DIST_MIN = 0;
const DIST_MAX = 50;
const ASC_MIN = 0;
const ASC_MAX = 3000;
const DIFF_MIN = 1;
const DIFF_MAX = 6;


const WEB_TOP = 67;

export default function KantonRouten() {
  const t = useKantonStrings();
  const ts = useSharedStrings();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { canton } = useLocalSearchParams<{ canton: string }>();
  const { profile, premium, freeHikeUsed } = useApp();
  const { loadCantonRoutes } = useCatalog();
  const {
    isElite,
    hatEntitlement,
    offerings,
    purchase,
    isPurchasing,
    refreshCustomerInfo,
  } = useSubscription();
  const [packBusy, setPackBusy] = useState(false);

  const cantonName = decodeURIComponent(canton ?? "");
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  // Sagen-Pack-Regel: Premium-Kundschaft bekommt pro Kanton die erste
  // entdeckte Sage inklusive; fuer weitere Sagen des Kantons braucht es das
  // Pack dieses Kantons (oder Elite, das alle Packs einschliesst). Ohne
  // Premium ist der Kauf noch nicht relevant (erst die Basis-Freischaltung).
  const packKey = cantonName ? packEntitlementFuerKanton(cantonName) : "";
  const packLocked =
    premium && !!cantonName && !isElite && !hatEntitlement(packKey);
  const packPaket = offerings?.all?.[REVENUECAT_PACKS_OFFERING]?.availablePackages.find(
    (p) => p.identifier === KANTONSPACK_PACKAGE
  );

  const ordnePackZu = async () => {
    await claimKantonspack({ kanton: kantonSlug(cantonName) });
    await refreshCustomerInfo();
  };

  const kaufePack = async () => {
    if (!packPaket) return;
    setPackBusy(true);
    try {
      // Zuerst versuchen, einen bereits bezahlten, aber noch nicht
      // zugeordneten Kauf zu verwenden — verhindert eine Doppelbelastung.
      try {
        await ordnePackZu();
        return;
      } catch (err: any) {
        if (!(err instanceof ApiError && err.status === 409)) throw err;
      }
      await purchase(packPaket);
      await ordnePackZu();
    } catch (err: any) {
      if (!err?.userCancelled) {
        alert(t.packBuyErrorTitle, err?.message ?? String(err));
      }
    } finally {
      setPackBusy(false);
    }
  };

  const [routes, setRoutes] = useState<HikingRoute[]>([]);
  const [routeSource, setRouteSource] = useState<CatalogSource>("server");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [distFilter, setDistFilter] = useState<[number, number]>([DIST_MIN, DIST_MAX]);
  const [ascFilter, setAscFilter] = useState<[number, number]>([ASC_MIN, ASC_MAX]);
  const [diffFilter, setDiffFilter] = useState<[number, number]>([DIFF_MIN, DIFF_MAX]);
  // Waehrend ein Schieberegler gezogen wird, pausiert das Scrollen der Seite,
  // damit die Geste nicht von der Liste uebernommen wird und haengen bleibt.
  const [sliderAktiv, setSliderAktiv] = useState(false);

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
        scrollEnabled={!sliderAktiv}
      >
        <ScreenHeader eyebrow={t.eyebrow} title={cantonName} onBack />

        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          {t.intro(cantonName)}
        </Text>

        {packLocked && (
          <PrimaryButton
            label={
              packPaket
                ? `${t.buyPackButton} · ${packPaket.product.priceString}`
                : t.buyPackButton
            }
            variant="gold"
            onPress={kaufePack}
            disabled={packBusy || isPurchasing || !packPaket}
            loading={packBusy || isPurchasing}
            style={{ marginBottom: 18 }}
          />
        )}

        <View style={SCHATTEN_3D}>
        <View
          style={[
            styles.filterPanel,
            { backgroundColor: colors.glassBgStrong, borderColor: colors.glassBorder },
          ]}
        >
          <LinearGradient
            colors={[colors.glassHighlight, "transparent"]}
            style={styles.filterHighlight}
            pointerEvents="none"
          />
          <View
            style={[styles.filterHead, { borderBottomColor: colors.glassBorder }]}
          >
            <View style={[styles.filterIconBadge, { backgroundColor: colors.accent }]}>
              <Feather name="sliders" size={13} color={colors.accentForeground} />
            </View>
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
            onDraggingChange={setSliderAktiv}
          />
          <RangeSlider
            label={t.elevationLabel}
            min={ASC_MIN}
            max={ASC_MAX}
            step={50}
            values={ascFilter}
            onChange={setAscFilter}
            formatValue={(v) => t.elevationUnit(v, v === ASC_MAX)}
            onDraggingChange={setSliderAktiv}
          />
          <RangeSlider
            label={t.difficultyLabel}
            min={DIFF_MIN}
            max={DIFF_MAX}
            step={1}
            values={diffFilter}
            onChange={setDiffFilter}
            formatValue={(v) => t.difficultyUnit(v)}
            onDraggingChange={setSliderAktiv}
          />
        </View>
        </View>

        <PrimaryButton
          label={searching ? t.searchingButton : t.searchButton}
          onPress={onSearch}
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
              {loadError && (
                <Pressable
                  onPress={onSearch}
                  accessibilityRole="button"
                  accessibilityLabel={ts.retry}
                  style={[styles.retryBtn, { borderColor: colors.accent }]}
                >
                  <Feather name="refresh-cw" size={14} color={colors.accent} />
                  <Text style={[styles.retryBtnText, { color: colors.accent }]}>
                    {ts.retry}
                  </Text>
                </Pressable>
              )}
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
          colors={["rgba(8,10,12,0.05)", "rgba(8,10,12,0.55)", "rgba(8,10,12,0.96)"]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        {foto.attribution && (
          <Text
            style={[styles.cardAttribution, { color: colors.photoScrimMuted }]}
            numberOfLines={1}
          >
            {foto.attribution}
          </Text>
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={[styles.cardEyebrowChip, { backgroundColor: colors.accent }]}>
              <Text style={[styles.cardEyebrow, { color: colors.accentForeground }]}>
                {t.sacLabel} {route.sac} · {route.distanceKm} km · {route.ascentM} hm ·{" "}
                {h}:{String(m).padStart(2, "0")} h
              </Text>
            </View>
            {locked && (
              <Feather name="lock" size={14} color={colors.photoScrimText} />
            )}
          </View>
          <Text style={[styles.cardTitle, { color: colors.photoScrimText }]}>
            {route.name}
          </Text>
          <Text
            style={[styles.cardTerrain, { color: colors.photoScrimMuted }]}
            numberOfLines={1}
          >
            {route.terrain}
          </Text>
          <View style={styles.cardSeasonRow}>
            <Feather
              name={route.season === "ganzjaehrig" ? "sun" : "cloud-snow"}
              size={12}
              color={colors.photoScrimMuted}
            />
            <Text style={[styles.cardSeasonText, { color: colors.photoScrimMuted }]}>
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
    borderWidth: 1.5,
    padding: 18,
    paddingBottom: 4,
    marginBottom: 18,
    overflow: "hidden",
  },
  filterHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  filterHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  filterIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
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
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryBtnText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  cardWrap: { ...SCHATTEN_3D, marginBottom: 14 },
  card: { ...GLAS_3D, height: 200, borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  cardImg: { width: "100%", height: "100%" },
  cardContent: { position: "absolute", left: 16, right: 16, bottom: 16 },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardEyebrowChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  cardEyebrow: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1 },
  cardTitle: { fontFamily: fonts.titleBold, fontSize: 24, marginTop: 6 },
  cardTerrain: { fontFamily: fonts.story, fontSize: 13, marginTop: 3 },
  cardSeasonRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  cardSeasonText: { fontFamily: fonts.body, fontSize: 11 },
});
