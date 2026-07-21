import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { alert } from "@/lib/appAlert";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLAS_3D, SCHATTEN_3D } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { PremiumUpsellBanner } from "@/components/brand/PremiumUpsellBanner";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { RangeSlider } from "@/components/brand/RangeSlider";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { SearchProgress } from "@/components/brand/SearchProgress";
import { HikingRoute } from "@/constants/routes";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { importGpxRoute } from "@workspace/api-client-react";
import {
  useCatalog,
  CatalogSource,
  RouteSearchFilter,
} from "@/contexts/CatalogContext";
import { useKantonStrings } from "@/lib/i18n/screens/kanton";
import { useSharedStrings } from "@/lib/i18n/screens/shared";
import { translateCanton } from "@/lib/i18n/cantonNames";
import { LanguageCode } from "@/lib/i18n/languageCode";
import { haversineKm } from "@/lib/geo";
import { useRouteFoto, clearRouteFotoCache } from "@/lib/useRouteFoto";
import { useColors } from "@/hooks/useColors";
import { kantonSlug } from "@/lib/kantonSlug";
import {
  KANTONSPACK_PACKAGE,
  REVENUECAT_PACKS_OFFERING,
  useSubscription,
} from "@/lib/revenuecat";
import { useClaimKantonspack, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const DIST_MIN = 0;
const DIST_MAX = 50;
const ASC_MIN = 0;
const ASC_MAX = 3000;
const DIFF_MIN = 1;
const DIFF_MAX = 6;

function getLastSundayOf(year: number, month: number): Date {
  const d = new Date(year, month + 1, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function isCEST(date: Date): boolean {
  const y = date.getFullYear();
  const start = getLastSundayOf(y, 2);
  const end = getLastSundayOf(y, 9);
  return date >= start && date < end;
}

function calcSunsetCH(date: Date): { h: number; m: number } {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const b = (2 * Math.PI * (dayOfYear - 1)) / 365;
  const decl =
    0.006918 -
    0.399912 * Math.cos(b) +
    0.070257 * Math.sin(b) -
    0.006758 * Math.cos(2 * b) +
    0.000907 * Math.sin(2 * b);
  const lat = (47.0 * Math.PI) / 180;
  const cosHa = -Math.tan(lat) * Math.tan(decl);
  const haRad = Math.acos(Math.max(-1, Math.min(1, cosHa)));
  const haHours = (haRad * 12) / Math.PI;
  const eot =
    ((-0.0000075 +
      0.001868 * Math.cos(b) -
      0.032077 * Math.sin(b) -
      0.014615 * Math.cos(2 * b) -
      0.04089 * Math.sin(2 * b)) *
      12) /
    Math.PI;
  const lngOffset = 8 / 15;
  const tz = isCEST(date) ? 2 : 1;
  const sunsetLocal = 12 + haHours + lngOffset + tz + eot;
  const h = Math.floor(sunsetLocal);
  const m = Math.round((sunsetLocal - h) * 60) % 60;
  return { h, m };
}

const WEB_TOP = 67;

export default function KantonRouten() {
  const t = useKantonStrings();
  const ts = useSharedStrings();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { canton } = useLocalSearchParams<{ canton: string }>();
  const { profile, premium, language, freeHikeUsed } = useApp();
  const { loadCantonRoutes, sagas, addCustomRoute } = useCatalog();
  const {
    isElite,
    offerings,
    purchase,
    isPurchasing,
    refreshCustomerInfo,
  } = useSubscription();
  const [packBusy, setPackBusy] = useState(false);
  const [importing, setImporting] = useState(false);

  const onImportGpx = useCallback(async () => {
    setImporting(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/gpx+xml", "application/octet-stream", "text/xml", "application/xml", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      let gpx: string;
      try {
        gpx =
          Platform.OS === "web"
            ? await (await fetch(asset.uri)).text()
            : await FileSystem.readAsStringAsync(asset.uri);
      } catch {
        alert(t.importGpxTitle, t.importGpxReadError);
        return;
      }
      const name = asset.name?.replace(/\.gpx$/i, "").trim() || undefined;
      const imported = (await importGpxRoute({ gpx, name })) as import("@/constants/routes").HikingRoute;
      addCustomRoute(imported);
      router.push(`/route/${imported.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      alert(t.importGpxTitle, message || t.importGpxText);
    } finally {
      setImporting(false);
    }
  }, [addCustomRoute, router, t]);

  const cantonName = decodeURIComponent(canton ?? "");
  const displayCantonName = translateCanton(cantonName, language as LanguageCode);
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  // Sagen-Pack-Regel: Premium-Kundschaft (nicht Elite) sieht den Kauf-Button,
  // sobald der Kanton mindestens 8 noch nicht freigeschaltete Sagen hat.
  // Autoritaetive Quelle: profiles.purchased_packs (server-seitiger Claim).
  // RC-Entitlements werden bewusst NICHT geprueft: das sagatrail_kantonspack-
  // Einzel-Consumable-Produkt hat kein RC-Entitlement verknuepft; wuerde ein
  // (Fehl-)Grant trotzdem alle pack_<kanton>-Entitlements aktivieren, wuerden
  // faelschlicherweise alle Kantone freigeschaltet.
  const packSlug = cantonName ? kantonSlug(cantonName) : "";
  const dbPackUnlocked = (profile?.purchasedPacks ?? []).includes(packSlug);
  const packUnlocked = isElite || dbPackUnlocked;
  const sagasInCanton = sagas.filter((s) => s.canton === cantonName);
  // Pack-Banner: nur fuer Premium (nicht Elite) sichtbar, wenn Pack noch nicht
  // gekauft wurde und der Kanton >= 8 Sagen hat.
  const packLocked = premium && !isElite && !!packSlug && !packUnlocked && sagasInCanton.length >= 8;
  // Alle Kantonspakete werden ueber ein einziges RC-Produkt (KANTONSPACK_PACKAGE)
  // gekauft; der Server schreibt den Grant in profiles.purchased_packs.
  const packPaket = packSlug
    ? offerings?.all?.[REVENUECAT_PACKS_OFFERING]?.availablePackages.find(
        (p) => p.identifier === KANTONSPACK_PACKAGE
      )
    : undefined;
  const { mutateAsync: claimKantonspack } = useClaimKantonspack();
  const queryClient = useQueryClient();

  const kaufePack = async () => {
    if (!packPaket) return;
    setPackBusy(true);
    try {
      await purchase(packPaket);
      // Server-seitiger Grant: der Kauf ist bei RC verbucht; der Server
      // zaehlt die RC-Kaeufe und schreibt den Kanton in purchased_packs.
      // 3 Versuche mit kurzer Pause decken voruebergehende Netzwerk-
      // oder RC-API-Fehler ab.
      let claimed = false;
      for (let versuch = 0; versuch < 3; versuch++) {
        try {
          await claimKantonspack({ data: { kanton: packSlug } });
          claimed = true;
          break;
        } catch {
          if (versuch < 2) {
            await new Promise((r) => setTimeout(r, 1200 * (versuch + 1)));
          }
        }
      }
      // Profil immer neu laden: war der Claim erfolgreich, zeigt die UI
      // sofort das freigeschaltete Pack; war er es nicht, bleibt der
      // Kauf-Button sichtbar, und der Nutzer kann es ueber den Hinweis
      // erneut versuchen (naechstes App-Oeffnen loest den Claim erneut aus).
      await queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      if (!claimed) {
        alert(t.packBuyErrorTitle, t.packClaimFailed);
      }
      await refreshCustomerInfo();
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
  const [ganzjaehrigFilter, setGanzjaehrigFilter] = useState(false);
  const [nearbyPos, setNearbyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyLocating, setNearbyLocating] = useState(false);
  const [nearbyDenied, setNearbyDenied] = useState(false);
  const [sunsetFilter, setSunsetFilter] = useState(false);
  const [startH, setStartH] = useState(9);
  const [startMin, setStartMin] = useState(0);
  const [sliderAktiv, setSliderAktiv] = useState(false);

  const sunsetTime = useMemo(() => calcSunsetCH(new Date()), []);
  const sunsetTimeStr = `${String(sunsetTime.h).padStart(2, "0")}:${String(sunsetTime.m).padStart(2, "0")}`;

  const filteredRoutes = useMemo(() => {
    if (!sunsetFilter) return routes;
    const availMin = sunsetTime.h * 60 + sunsetTime.m - (startH * 60 + startMin);
    if (availMin <= 0) return [];
    return routes.filter((r) => r.minutes <= availMin);
  }, [routes, sunsetFilter, startH, startMin, sunsetTime]);

  // Beim Kantonswechsel Filter und Ergebnisse zuruecksetzen — erst suchen,
  // wenn der Nutzer die Filter gesetzt und die Suche gestartet hat.
  useEffect(() => {
    setDistFilter([DIST_MIN, DIST_MAX]);
    setAscFilter([ASC_MIN, ASC_MAX]);
    setDiffFilter([DIFF_MIN, DIFF_MAX]);
    setGanzjaehrigFilter(false);
    setNearbyPos(null);
    setNearbyLocating(false);
    setNearbyDenied(false);
    setSunsetFilter(false);
    setStartH(9);
    setStartMin(0);
    setRoutes([]);
    setSearched(false);
    setSearching(false);
  }, [cantonName]);

  const handleNearbyToggle = useCallback(async (value: boolean) => {
    if (!value) {
      setNearbyPos(null);
      setNearbyDenied(false);
      return;
    }
    setNearbyLocating(true);
    setNearbyDenied(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setNearbyDenied(true);
        setNearbyLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setNearbyPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {
      setNearbyDenied(true);
    } finally {
      setNearbyLocating(false);
    }
  }, []);

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
    if (ganzjaehrigFilter) filter.ganzjaehrigNur = true;
    if (nearbyPos) {
      filter.nearLat = nearbyPos.lat;
      filter.nearLng = nearbyPos.lng;
    }
    return filter;
  }, [distFilter, ascFilter, diffFilter, ganzjaehrigFilter, nearbyPos]);

  const onSearch = useCallback(async () => {
    if (!cantonName) return;
    setSearching(true);
    try {
      const res = await loadCantonRoutes(cantonName, buildFilter());
      setRoutes(res.routes);
      setRouteSource(res.source);
      setSearched(true);
    } catch {
      // loadCantonRoutes fängt intern — hier nur als Sicherheitsnetz.
      setRouteSource("error");
      setSearched(true);
    } finally {
      setSearching(false);
    }
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
        <ScreenHeader eyebrow={t.eyebrow} title={displayCantonName} onBack />

        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          {t.intro(displayCantonName)}
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

          <View style={[styles.switchRow, { borderTopColor: colors.glassBorder }]}>
            <Text style={[styles.switchLabel, { color: colors.foreground }]}>
              {t.yearRoundLabel}
            </Text>
            <Switch
              value={ganzjaehrigFilter}
              onValueChange={setGanzjaehrigFilter}
              trackColor={{ true: colors.accent, false: colors.card }}
              thumbColor={colors.foreground}
            />
          </View>

          <View style={[styles.switchRow, { borderTopColor: colors.glassBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>
                {t.nearbyLabel}
              </Text>
              {nearbyLocating && (
                <Text style={[styles.switchHint, { color: colors.mutedForeground }]}>
                  {t.nearbyLocating}
                </Text>
              )}
              {nearbyDenied && !nearbyLocating && (
                <Text style={[styles.switchHint, { color: colors.destructive }]}>
                  {t.nearbyDenied}
                </Text>
              )}
              {nearbyPos && !nearbyLocating && (
                <Text style={[styles.switchHint, { color: colors.accent }]}>
                  {nearbyPos.lat.toFixed(4)}, {nearbyPos.lng.toFixed(4)}
                </Text>
              )}
            </View>
            <Switch
              value={nearbyPos !== null}
              onValueChange={handleNearbyToggle}
              disabled={nearbyLocating}
              trackColor={{ true: colors.accent, false: colors.card }}
              thumbColor={colors.foreground}
            />
          </View>

          <View style={[styles.switchRow, { borderTopColor: colors.glassBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>
                {t.sunsetFilterLabel}
              </Text>
              <Text style={[styles.switchHint, { color: colors.mutedForeground }]}>
                {t.sunsetInfo(sunsetTimeStr)}
              </Text>
            </View>
            <Switch
              value={sunsetFilter}
              onValueChange={setSunsetFilter}
              trackColor={{ true: colors.accent, false: colors.card }}
              thumbColor={colors.foreground}
            />
          </View>

          {sunsetFilter && (
            <View style={[styles.switchRow, { borderTopColor: colors.glassBorder }]}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>
                {t.sunsetStartLabel}
              </Text>
              <View style={styles.timeRow}>
                <Pressable
                  onPress={() => setStartH((h) => (h - 1 + 24) % 24)}
                  style={[styles.timeBtn, { borderColor: colors.glassBorder }]}
                  hitSlop={8}
                >
                  <Feather name="minus" size={13} color={colors.foreground} />
                </Pressable>
                <Text style={[styles.timeDisplay, { color: colors.foreground }]}>
                  {String(startH).padStart(2, "0")}:{String(startMin).padStart(2, "0")}
                </Text>
                <Pressable
                  onPress={() => setStartH((h) => (h + 1) % 24)}
                  style={[styles.timeBtn, { borderColor: colors.glassBorder }]}
                  hitSlop={8}
                >
                  <Feather name="plus" size={13} color={colors.foreground} />
                </Pressable>
                <Pressable
                  onPress={() => setStartMin((m) => (m + 15) % 60)}
                  style={[styles.timeBtnMin, { borderColor: colors.glassBorder }]}
                  hitSlop={8}
                >
                  <Text style={[styles.timeBtnMinLabel, { color: colors.mutedForeground }]}>
                    +15′
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
        </View>

        <PrimaryButton
          label={searching ? t.searchingButton : t.searchButton}
          onPress={onSearch}
          loading={searching}
          disabled={searching}
        />

        {freeHikeUsed && !premium && !isElite && (
          <PremiumUpsellBanner
            title={t.premiumCta}
            body={t.premiumCtaBody}
            cta={t.premiumCta}
            style={{ marginTop: 12 }}
          />
        )}

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
              {loadError ? (
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
              ) : (
                <Pressable
                  onPress={() => {
                    setDistFilter([DIST_MIN, DIST_MAX]);
                    setAscFilter([ASC_MIN, ASC_MAX]);
                    setDiffFilter([DIFF_MIN, DIFF_MAX]);
                    setGanzjaehrigFilter(false);
                    setSunsetFilter(false);
                    setStartH(9);
                    setStartMin(0);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t.resetFilters}
                  style={[styles.retryBtn, { borderColor: colors.glassBorder }]}
                >
                  <Feather name="sliders" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.retryBtnText, { color: colors.mutedForeground }]}>
                    {t.resetFilters}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : filteredRoutes.length === 0 && sunsetFilter ? (
            <View style={styles.hint}>
              <Feather name="sunset" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {t.sunsetNoneInTime}
              </Text>
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                {t.sunsetInfo(sunsetTimeStr)}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
                {sunsetFilter
                  ? (filteredRoutes.length === 1 ? t.routeFound : t.routesFound(filteredRoutes.length))
                  : (routes.length === 1 ? t.routeFound : t.routesFound(routes.length))
                }
                {" "}{t.nextStepSaga}
              </Text>
              {filteredRoutes.map((route, i) => {
                // Premium oder Pack schaltet alles frei.
                // Ohne Premium: eine beliebige Route ist gratis (solange freeHikeUsed=false).
                // Sobald die erste Wanderung stattgefunden hat, sind alle weiteren gesperrt.
                const canAccess = premium || packUnlocked;
                const locked = !canAccess && freeHikeUsed;
                const unlocked = canAccess;
                return (
                  <RouteCard
                    key={route.id}
                    route={route}
                    index={i}
                    locked={locked}
                    unlocked={unlocked}
                    nearbyPos={nearbyPos}
                    onPress={() => router.push(`/route/${route.id}`)}
                  />
                );
              })}
            </>
          )}
        </View>

        {/* ── Eigene Route ─────────────────────────────────────────── */}
        <View style={styles.eigeneRouteSection}>
          <View style={styles.eigeneRouteHeader}>
            <Feather name="map" size={14} color={colors.mutedForeground} />
            <Text style={[styles.eigeneRouteTitle, { color: colors.mutedForeground }]}>
              {t.eigeneRouteTitle}
            </Text>
          </View>
          <PrimaryButton
            label={t.eigeneRouteButton}
            variant="secondary"
            onPress={() => router.push("/eigene-route")}
            style={{ marginBottom: 10 }}
          />
          <PrimaryButton
            label={importing ? t.importGpxImporting : t.importGpx}
            variant="secondary"
            onPress={onImportGpx}
            disabled={importing}
            loading={importing}
          />
        </View>

      </ScrollView>
    </Background>
  );
}

function RouteCard({
  route,
  index,
  locked,
  unlocked,
  nearbyPos,
  onPress,
}: {
  route: HikingRoute;
  index: number;
  locked: boolean;
  unlocked?: boolean;
  nearbyPos?: { lat: number; lng: number } | null;
  onPress: () => void;
}) {
  const t = useKantonStrings();
  const colors = useColors();
  const distToStart = nearbyPos && route.coordinates
    ? (() => {
        const km = haversineKm(nearbyPos, { lat: route.coordinates.lat, lng: route.coordinates.lng });
        return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
      })()
    : null;
  // Echtes, moeglichst saisonpassendes Foto aus Routennaehe; solange keins
  // geladen ist, zeigt der Hook das gebuendelte Saison-Panorama.
  const foto = useRouteFoto(route);
  const [fotoFehler, setFotoFehler] = useState(false);
  const h = Math.floor(route.minutes / 60);
  const m = route.minutes % 60;
  return (
    <Animated.View entering={FadeInDown.delay(index * 80)} style={styles.cardWrap}>
      <Pressable onPress={onPress} style={styles.card}>
        <Image
          source={fotoFehler ? foto.fallback : foto.source}
          style={styles.cardImg}
          resizeMode="cover"
          onError={() => { clearRouteFotoCache(route); setFotoFehler(true); }}
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
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={[styles.cardEyebrowChip, { backgroundColor: colors.accent }]}>
              <Text style={[styles.cardEyebrow, { color: colors.accentForeground }]}>
                {t.sacLabel} {route.sac} · {route.distanceKm} km · {route.ascentM} hm ·{" "}
                {h}:{String(m).padStart(2, "0")} h
              </Text>
            </View>
            {locked && (
              <View style={styles.cardLockBadge}>
                <Feather name="lock" size={14} color={colors.photoScrimText} />
              </View>
            )}
            {!locked && unlocked && (
              <View style={styles.cardUnlockedBadge}>
                <Feather name="check-circle" size={14} color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.cardTextScrim}>
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
              {distToStart && (
                <>
                  <Text style={[styles.cardSeasonText, { color: colors.photoScrimMuted }]}> · </Text>
                  <Feather name="navigation" size={11} color={colors.accent} />
                  <Text style={[styles.cardSeasonText, { color: colors.accent }]}>
                    {" "}{t.nearbyDistBadge(distToStart)}
                  </Text>
                </>
              )}
            </View>
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: 1,
    paddingBottom: 14,
  },
  switchLabel: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  switchHint: { fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
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
  eigeneRouteSection: {
    marginTop: 28,
    marginBottom: 8,
  },
  eigeneRouteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  eigeneRouteTitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timeDisplay: {
    fontFamily: fonts.mono,
    fontSize: 18,
    minWidth: 52,
    textAlign: "center",
  },
  timeBtnMin: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  timeBtnMinLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
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
  cardLockBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,10,12,0.55)",
  },
  cardUnlockedBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16A34A",
  },
  cardTextScrim: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(8,10,12,0.4)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    maxWidth: "100%",
  },
  cardTitle: { fontFamily: fonts.titleBold, fontSize: 24, marginTop: 0 },
  cardTerrain: { fontFamily: fonts.story, fontSize: 13, marginTop: 3 },
  cardSeasonRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  cardSeasonText: { fontFamily: fonts.body, fontSize: 11 },
});
