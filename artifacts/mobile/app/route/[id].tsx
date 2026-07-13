import { Feather } from "@expo/vector-icons";
import {
  getAerialways,
  getPartners,
  getWeather,
  importGpxRoute,
} from "@workspace/api-client-react";
import type { Partner, WeatherReport } from "@workspace/api-client-react";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
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

import { GLAS_3D } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { KarteVollbild } from "@/components/brand/KarteVollbild";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { RouteMap } from "@/components/brand/RouteMap";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { Skeleton } from "@/components/brand/Skeleton";
import { SwisstopoMap } from "@/components/brand/SwisstopoMap";
import { SparkDivider } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useDownloads } from "@/contexts/DownloadContext";
import { useColors } from "@/hooks/useColors";
import { useRouteStrings } from "@/lib/i18n/screens/route";
import { useSharedStrings } from "@/lib/i18n/screens/shared";
import { bboxAroundGeometry, haversineKm } from "@/lib/geo";
import { sagaLokalisierung } from "@/lib/sagaMatch";
import { Saga } from "@/types";

const WEB_TOP = 67;

export default function Routenplanung() {
  const t = useRouteStrings();
  const ts = useSharedStrings();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { energiesparmodus, setEnergiesparmodus, profile, premium, freeHikeUsed } = useApp();
  const { getRoute, getSagaForRoute, ensureRouteSaga, addCustomRoute } = useCatalog();
  const [importing, setImporting] = useState(false);
  const { download, remove, isDownloaded, getRecord, progress } = useDownloads();

  const route = getRoute(id);
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  // Routentyp aus der Geometrie ableiten: liegen Start und Ziel nahe
  // beieinander (unter 500 m oder unter 5 % der Streckenlaenge), ist es ein
  // Rundweg — sonst eine Streckenwanderung, bei der die Rueckreise in der
  // Schweiz ueblicherweise mit Bahn oder Postauto erfolgt.
  const routentyp = React.useMemo<"rundweg" | "strecke" | null>(() => {
    const g = route?.geometry;
    if (!g || g.length < 2) return null;
    const start = { lat: g[0][0], lng: g[0][1] };
    const ende = { lat: g[g.length - 1][0], lng: g[g.length - 1][1] };
    const lueckeKm = haversineKm(start, ende);
    const schwelleKm = Math.max(0.5, (route?.distanceKm ?? 0) * 0.05);
    return lueckeKm <= schwelleKm ? "rundweg" : "strecke";
  }, [route?.geometry, route?.distanceKm]);

  // Oeffnet die OeV-Rueckreise vom Routenende zurueck zum Startpunkt
  // (Google-Maps-Transit-Link funktioniert auf iOS, Android und Web).
  const oeffneRueckreise = React.useCallback(() => {
    const g = route?.geometry;
    if (!g || g.length < 2) return;
    const start = g[0];
    const ende = g[g.length - 1];
    const url =
      "https://www.google.com/maps/dir/?api=1" +
      `&origin=${ende[0]},${ende[1]}` +
      `&destination=${start[0]},${start[1]}` +
      "&travelmode=transit";
    Linking.openURL(url).catch(() => {});
  }, [route?.geometry]);

  const onExportGpx = useCallback(async () => {
    const g = route?.geometry;
    if (!g || g.length === 0) return;
    try {
      const name = route?.name ?? "SagaTrail-Route";
      const now = new Date().toISOString();
      const trkpts = g
        .map(([lat, lng]) => `    <trkpt lat="${lat}" lon="${lng}"></trkpt>`)
        .join("\n");
      const gpx = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<gpx version="1.1" creator="SagaTrail" xmlns="http://www.topografix.com/GPX/1/1">',
        `  <metadata><name>${name}</name><time>${now}</time></metadata>`,
        "  <trk>",
        `    <name>${name}</name>`,
        "    <trkseg>",
        trkpts,
        "    </trkseg>",
        "  </trk>",
        "</gpx>",
      ].join("\n");

      const fileName = name.replace(/[^a-zA-Z0-9_\-]/g, "_") + ".gpx";
      const uri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(uri, gpx, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri, { mimeType: "application/gpx+xml", UTI: "com.topografix.gpx" });
    } catch {
      alert("GPX", t.exportGpxError);
    }
  }, [route?.geometry, route?.name, t]);

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
      router.replace(`/route/${imported.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      alert(t.importGpxTitle, message || t.importGpxText);
    } finally {
      setImporting(false);
    }
  }, [addCustomRoute, router, t]);

  const [saga, setSaga] = useState<Saga | undefined>(
    route ? getSagaForRoute(route) : undefined,
  );
  const [sagaLoading, setSagaLoading] = useState(!saga);
  const [sagaRetryCount, setSagaRetryCount] = useState(0);
  const [lowBattery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aerialways, setAerialways] = useState<
    { id: string; geometry: number[][] }[] | null
  >(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(true);
  // Zaehler fuer manuelle Wetter-Neuversuche (Retry-Knopf im Fehlerzustand).
  const [weatherVersuch, setWeatherVersuch] = useState(0);

  // Seilbahnen/Standseilbahnen im Kartenausschnitt laden (typisches alpines
  // Wander-Verkehrsmittel) — nur mit Wegverlauf sinnvoll, best effort.
  useEffect(() => {
    if (!route?.coordinates) return;
    let cancelled = false;
    const bbox = bboxAroundGeometry(route.geometry, route.coordinates);
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
  }, [route?.id]);

  // Aktive Partnerbetriebe (Restaurants, Souvenirlaeden, ...) entlang der Route
  // laden — best effort, gleiche Bounding Box wie die Seilbahnen.
  useEffect(() => {
    if (!route?.coordinates) return;
    let cancelled = false;
    const bbox = bboxAroundGeometry(route.geometry, route.coordinates);
    getPartners(bbox)
      .then((result) => {
        if (!cancelled) setPartners(result);
      })
      .catch(() => {
        if (!cancelled) setPartners([]);
      });
    return () => {
      cancelled = true;
    };
  }, [route?.id]);

  // Live-Wetter + abgeleiteter Wegzustand fuer den Ausgangspunkt der Route.
  useEffect(() => {
    if (!route?.coordinates) {
      setWeatherLoading(false);
      return;
    }
    let cancelled = false;
    setWeatherLoading(true);
    setWeatherError(false);
    getWeather({ lat: route.coordinates.lat, lng: route.coordinates.lng })
      .then((result) => {
        if (cancelled) return;
        setWeather(result);
        setWeatherLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setWeather(null);
        setWeatherError(true);
        setWeatherLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [route?.id, weatherVersuch]);

  useEffect(() => {
    let cancelled = false;
    if (!route) return;
    const known = getSagaForRoute(route);
    if (known) {
      setSaga(known);
      setSagaLoading(false);
      return;
    }
    setSagaLoading(true);
    (async () => {
      const result = await ensureRouteSaga(route.id);
      if (cancelled) return;
      setSaga(result);
      setSagaLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [route, ensureRouteSaga, getSagaForRoute, sagaRetryCount]);

  if (!route) {
    return (
      <Background>
        <View style={styles.center}>
          <Text style={{ color: colors.foreground, fontFamily: fonts.titleBold }}>
            {t.notFound}
          </Text>
        </View>
      </Background>
    );
  }

  const meta = route;
  const locked = !premium && freeHikeUsed;
  const h = Math.floor(meta.minutes / 60);
  const m = meta.minutes % 60;

  const sagaId = route.sagaId;
  const downloaded = isDownloaded(sagaId);
  const record = getRecord(sagaId);
  const downloading = progress?.sagaId === sagaId;
  const progressText = downloading
    ? progress?.phase === "tiles"
      ? t.loadingMap(progress.done, progress.total)
      : t.loadingSaga
    : "";

  const onDownload = async () => {
    if (!profile || !saga || downloading || busy) return;
    setBusy(true);
    try {
      await download(saga, route, profile, premium);
    } catch {
      alert(
        t.downloadFailed,
        t.downloadFailedText
      );
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await remove(sagaId);
    } finally {
      setBusy(false);
    }
  };

  const sizeLabel = record
    ? record.sizeBytes >= 1024 * 1024
      ? `${(record.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(record.sizeBytes / 1024))} KB`
    : "";

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
        <ScreenHeader eyebrow={route.region} title={t.title} onBack />

        <Text style={[styles.routeName, { color: colors.foreground }]}>
          {meta.name}
        </Text>
        <Text style={[styles.forSaga, { color: colors.accent }]}>
          {route.terrain}
        </Text>

        <View style={{ marginTop: 18 }}>
          <KarteVollbild
            height={200}
            renderKarte={(hoehe) =>
              route.coordinates ? (
                <SwisstopoMap
                  center={route.coordinates}
                  label={route.name}
                  height={hoehe}
                  geometry={route.geometry}
                  aerialways={aerialways}
                  partners={partners}
                />
              ) : (
                <RouteMap progress={0.15} height={hoehe} />
              )
            }
          />
        </View>

        <Animated.View entering={FadeInDown} style={styles.statsGrid}>
          <Stat label={t.distance} value={`${meta.distanceKm}`} unit="km" />
          <Stat label={t.ascent} value={`${meta.ascentM}`} unit="hm" />
          <Stat label={t.duration} value={`${h}:${String(m).padStart(2, "0")}`} unit="h" />
          <Stat label={t.sacScale} value={meta.sac} unit="" />
        </Animated.View>

        <View style={styles.checkRow}>
          <Feather
            name={meta.season === "ganzjaehrig" ? "sun" : "cloud-snow"}
            size={16}
            color={colors.mutedForeground}
          />
          <Text style={[styles.checkLabel, { color: colors.foreground }]}>{t.seasonLabel}</Text>
          <Text style={[styles.checkValue, { color: colors.mutedForeground }]}>
            {t.season[
              meta.season === "ganzjaehrig"
                ? "ganzjaehrig"
                : meta.season === "nur_sommer"
                  ? "nurSommer"
                  : "eherSommer"
            ]}
          </Text>
        </View>
        <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.seasonNote}</Text>

        {routentyp && (
          <>
            <View style={styles.checkRow}>
              <Feather
                name={routentyp === "rundweg" ? "rotate-cw" : "arrow-right"}
                size={16}
                color={colors.mutedForeground}
              />
              <Text style={[styles.checkLabel, { color: colors.foreground }]}>
                {t.routeTypeLabel}
              </Text>
              <Text style={[styles.checkValue, { color: colors.mutedForeground }]}>
                {routentyp === "rundweg" ? t.routeTypeRundweg : t.routeTypeStrecke}
              </Text>
            </View>
            {routentyp === "strecke" && (
              <>
                <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>
                  {t.streckeHint}
                </Text>
                <Pressable
                  onPress={oeffneRueckreise}
                  style={[
                    styles.rueckreiseButton,
                    { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                  ]}
                >
                  <Feather name="navigation" size={15} color={colors.accent} />
                  <Text style={[styles.rueckreiseText, { color: colors.accent }]}>
                    {t.planReturn}
                  </Text>
                </Pressable>
              </>
            )}
          </>
        )}

        <View
          style={[
            styles.downloadCard,
            {
              borderColor: downloaded ? colors.accent : colors.glassBorder,
              backgroundColor: colors.glassBg,
            },
          ]}
        >
          <View style={styles.downloadHead}>
            <Feather
              name={downloaded ? "check-circle" : "download-cloud"}
              size={18}
              color={downloaded ? colors.accent : colors.foreground}
            />
            <Text style={[styles.downloadTitle, { color: colors.foreground }]}>
              {downloaded ? t.offlineAvailable : t.saveForOffline}
            </Text>
          </View>
          <Text style={[styles.downloadHint, { color: colors.mutedForeground }]}>
            {downloaded
              ? t.offlineStatusActive(sizeLabel)
              : t.offlineStatusInactive}
          </Text>

          {downloading ? (
            <View style={styles.downloadProgress}>
              <Feather name="loader" size={15} color={colors.accent} />
              <Text style={[styles.downloadProgressText, { color: colors.accent }]}>
                {progressText}
              </Text>
            </View>
          ) : downloaded ? (
            <PrimaryButton
              label={t.removeDownload}
              variant="secondary"
              onPress={onDelete}
              style={{ marginTop: 14 }}
            />
          ) : (
            <PrimaryButton
              label={t.download}
              variant="secondary"
              onPress={onDownload}
              style={{ marginTop: 14 }}
            />
          )}
        </View>

        <SparkDivider style={{ marginVertical: 22 }} />

        <Text style={[styles.blockTitle, { color: colors.foreground }]}>
          {t.checkBeforeTour}
        </Text>
        <View
          style={[
            styles.checkCard,
            { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
          ]}
        >
          {weatherLoading ? (
            <View style={styles.checkRow}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
              <Text style={[styles.checkLabel, { color: colors.mutedForeground }]}>
                {t.weatherLoading}
              </Text>
            </View>
          ) : weatherError || !weather ? (
            <View style={styles.checkRow}>
              <Feather name="cloud-off" size={16} color={colors.destructive} />
              <Text style={[styles.checkLabel, { color: colors.foreground }]}>{t.weather}</Text>
              <Text style={[styles.checkValue, { color: colors.mutedForeground }]}>
                {t.weatherNotAvailable}
              </Text>
              <Pressable
                onPress={() => setWeatherVersuch((v) => v + 1)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={ts.retry}
                style={[styles.retryChip, { borderColor: colors.glassBorder }]}
              >
                <Feather name="refresh-cw" size={12} color={colors.accent} />
                <Text style={[styles.retryChipText, { color: colors.accent }]}>
                  {ts.retry}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <CheckRow
                icon="cloud"
                label={t.weather}
                value={t.weatherValues(weather.conditionLabel, Math.round(weather.temperatureC))}
                ok
              />
              <CheckRow
                icon="wind"
                label={t.wind}
                value={t.windValues(Math.round(weather.windKmh), Math.round(weather.windGustsKmh))}
                ok
              />
              <CheckRow
                icon="alert-triangle"
                label={t.trailCondition}
                value={
                  t.trailConditions[
                    weather.trailConditionLevel as keyof typeof t.trailConditions
                  ] ?? weather.trailConditionLabel
                }
                ok={weather.trailConditionLevel === "gut"}
                warn={weather.trailConditionLevel !== "gut"}
              />
              <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>
                {weather.trailConditionNote} {t.weatherNote}
              </Text>
            </>
          )}
        </View>

        <View
          style={[
            styles.energyCard,
            { borderColor: colors.glassBorder },
            lowBattery && { borderColor: colors.accent },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.energyTitle, { color: colors.foreground }]}>
              {t.energySavingTitle}
            </Text>
            <Text style={[styles.energyHint, { color: colors.mutedForeground }]}>
              {t.energySavingHint}
            </Text>
          </View>
          <Switch
            value={energiesparmodus}
            onValueChange={setEnergiesparmodus}
            trackColor={{ true: colors.accent, false: colors.card }}
            thumbColor={colors.foreground}
          />
        </View>

        <PrimaryButton
          label={importing ? t.importGpxImporting : t.importGpx}
          variant="secondary"
          onPress={onImportGpx}
          disabled={importing}
          style={{ marginTop: 20 }}
        />

        {route?.geometry && route.geometry.length > 0 && (
          <PrimaryButton
            label={t.exportGpx}
            variant="secondary"
            onPress={onExportGpx}
            style={{ marginTop: 8 }}
          />
        )}

        <SparkDivider style={{ marginVertical: 22 }} />

        <Text style={[styles.blockTitle, { color: colors.foreground }]}>
          {t.matchingSaga}
        </Text>
        <Text style={[styles.sagaHint, { color: colors.mutedForeground }]}>
          {sagaLoading
            ? t.matchingSagaHintLoading
            : t.matchingSagaHintLoaded}
        </Text>

        {sagaLoading ? (
          <View
            style={[
              styles.sagaCard,
              { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
            ]}
          >
            {/* Skeleton in Sagakarten-Form — Titel, zwei Textzeilen, Meta. */}
            <View style={{ flex: 1 }}>
              <Skeleton height={20} width="55%" radius={8} />
              <Skeleton height={13} radius={7} style={{ marginTop: 10 }} />
              <Skeleton height={13} width="80%" radius={7} style={{ marginTop: 7 }} />
              <Text
                style={[styles.sagaLoadingText, { color: colors.mutedForeground, marginTop: 12 }]}
              >
                {t.sagaWriting}
              </Text>
            </View>
          </View>
        ) : !saga ? (
          <View
            style={[
              styles.sagaCard,
              { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
            ]}
          >
            <Text style={[styles.sagaMood, { color: colors.mutedForeground }]}>
              {t.sagaLoadError}
            </Text>
            <Pressable
              onPress={() => {
                setSagaLoading(true);
                setSagaRetryCount((c) => c + 1);
              }}
              hitSlop={10}
              accessibilityRole="button"
              style={[styles.retryChip, { borderColor: colors.glassBorder, marginTop: 10 }]}
            >
              <Feather name="refresh-cw" size={12} color={colors.accent} />
              <Text style={[styles.retryChipText, { color: colors.accent }]}>
                {ts.retry}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push(`/saga/${saga.id}?routeId=${route.id}`)}
            style={[
              styles.sagaCard,
              { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.sagaCanton, { color: colors.accent }]}>
                {saga.canton.toUpperCase()} · {saga.coreMotif.toUpperCase()}
              </Text>
              <Text style={[styles.sagaTitle, { color: colors.foreground }]}>
                {saga.title}
              </Text>
              <Text
                style={[styles.sagaMood, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {saga.mood}
              </Text>
            </View>
            {locked ? (
              <Feather name="lock" size={18} color={colors.mutedForeground} />
            ) : (
              <Feather name="chevron-right" size={20} color={colors.accent} />
            )}
          </Pressable>
        )}

        {saga &&
        !sagaLoading &&
        sagaLokalisierung(route, saga) === "nicht_exakt_lokalisierbar" ? (
          <Text style={[styles.localisationNote, { color: colors.mutedForeground }]}>
            {t.localisationNote}
          </Text>
        ) : null}

        {saga && !sagaLoading ? (
          <PrimaryButton
            label={locked ? t.premiumButton : t.continueToSaga}
            variant={locked ? "gold" : "primary"}
            onPress={() =>
              router.push(
                locked ? "/paywall" : `/saga/${saga.id}?routeId=${route.id}`,
              )
            }
            style={{ marginTop: 16 }}
          />
        ) : null}
      </ScrollView>
    </Background>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.stat,
        { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
      ]}
    >
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label.toUpperCase()}
      </Text>
      <View style={styles.statValRow}>
        <Text style={[styles.statVal, { color: colors.foreground }]}>{value}</Text>
        {unit ? (
          <Text style={[styles.statUnit, { color: colors.accent }]}>{unit}</Text>
        ) : null}
      </View>
    </View>
  );
}

function CheckRow({
  icon,
  label,
  value,
  ok,
  warn,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  ok?: boolean;
  warn?: boolean;
}) {
  const colors = useColors();
  const tint = warn ? colors.accent : colors.mutedForeground;
  return (
    <View style={styles.checkRow}>
      <Feather name={icon} size={16} color={tint} />
      <Text style={[styles.checkLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.checkValue, { color: colors.mutedForeground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  retryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
  },
  retryChipText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  routeName: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 18 },
  forSaga: { fontFamily: fonts.story, fontSize: 14, marginTop: 2 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  stat: { ...GLAS_3D,
    width: "47.5%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  statLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1 },
  statValRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 4 },
  statVal: { fontFamily: fonts.monoBold, fontSize: 26 },
  statUnit: { fontFamily: fonts.mono, fontSize: 13 },
  blockTitle: { fontFamily: fonts.titleBold, fontSize: 20, marginBottom: 12 },
  downloadCard: { ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  downloadHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  downloadTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  downloadHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6 },
  downloadProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  downloadProgressText: { fontFamily: fonts.mono, fontSize: 13 },
  checkCard: { ...GLAS_3D, borderWidth: 1, borderRadius: 16, padding: 16 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  checkLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, flex: 1 },
  checkValue: { fontFamily: fonts.mono, fontSize: 13 },
  checkNote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 8, fontStyle: "italic" },
  rueckreiseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  rueckreiseText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  energyCard: { ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  energyTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  energyHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 2 },
  sagaHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  sagaCard: { ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  sagaCanton: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 },
  sagaTitle: { fontFamily: fonts.titleBold, fontSize: 19, marginTop: 4 },
  sagaMood: { fontFamily: fonts.story, fontSize: 13, marginTop: 3 },
  sagaLoadingText: { fontFamily: fonts.mono, fontSize: 13 },
  localisationNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    fontStyle: "italic",
  },
});
