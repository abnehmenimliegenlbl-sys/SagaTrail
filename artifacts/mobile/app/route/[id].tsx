import { Feather } from "@expo/vector-icons";
import { getAerialways } from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { RouteMap } from "@/components/brand/RouteMap";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { SwisstopoMap } from "@/components/brand/SwisstopoMap";
import { SparkDivider } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useDownloads } from "@/contexts/DownloadContext";
import { useColors } from "@/hooks/useColors";
import { bboxAroundGeometry } from "@/lib/geo";
import { sagaLokalisierung } from "@/lib/sagaMatch";
import { Saga } from "@/types";

const WEB_TOP = 67;

export default function Routenplanung() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { energiesparmodus, setEnergiesparmodus, profile, premium } = useApp();
  const { getRoute, getSagaForRoute, ensureRouteSaga } = useCatalog();
  const { download, remove, isDownloaded, getRecord, progress } = useDownloads();

  const route = getRoute(id);
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  const [saga, setSaga] = useState<Saga | undefined>(
    route ? getSagaForRoute(route) : undefined,
  );
  const [sagaLoading, setSagaLoading] = useState(!saga);
  const [lowBattery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aerialways, setAerialways] = useState<
    { id: string; geometry: number[][] }[] | null
  >(null);

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
  }, [route, ensureRouteSaga, getSagaForRoute]);

  if (!route) {
    return (
      <Background>
        <View style={styles.center}>
          <Text style={{ color: colors.foreground, fontFamily: fonts.titleBold }}>
            Route nicht gefunden.
          </Text>
        </View>
      </Background>
    );
  }

  const meta = route;
  const locked = !premium && route.region !== profile?.homeCanton;
  const h = Math.floor(meta.minutes / 60);
  const m = meta.minutes % 60;

  const sagaId = route.sagaId;
  const downloaded = isDownloaded(sagaId);
  const record = getRecord(sagaId);
  const downloading = progress?.sagaId === sagaId;
  const progressText = downloading
    ? progress?.phase === "tiles"
      ? `Karte wird gesichert … ${progress.done}/${progress.total}`
      : "Sage wird geladen …"
    : "";

  const onDownload = async () => {
    if (!profile || !saga || downloading || busy) return;
    setBusy(true);
    try {
      await download(saga, route, profile);
    } catch {
      Alert.alert(
        "Download fehlgeschlagen",
        "Die Wanderung konnte nicht vollstaendig geladen werden. Bitte pruefe deine Verbindung und versuche es erneut."
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
        <ScreenHeader eyebrow={route.region} title="Routenplanung" onBack />

        <Text style={[styles.routeName, { color: colors.foreground }]}>
          {meta.name}
        </Text>
        <Text style={[styles.forSaga, { color: colors.accent }]}>
          {route.terrain}
        </Text>

        <View style={{ marginTop: 18 }}>
          {route.coordinates ? (
            <SwisstopoMap
              center={route.coordinates}
              label={route.name}
              height={200}
              geometry={route.geometry}
              aerialways={aerialways}
            />
          ) : (
            <RouteMap progress={0.15} height={200} />
          )}
        </View>

        <Animated.View entering={FadeInDown} style={styles.statsGrid}>
          <Stat label="Distanz" value={`${meta.distanceKm}`} unit="km" />
          <Stat label="Aufstieg" value={`${meta.ascentM}`} unit="hm" />
          <Stat label="Dauer" value={`${h}:${String(m).padStart(2, "0")}`} unit="h" />
          <Stat label="SAC-Skala" value={meta.sac} unit="" />
        </Animated.View>

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
              {downloaded ? "Offline verfügbar" : "Für offline sichern"}
            </Text>
          </View>
          <Text style={[styles.downloadHint, { color: colors.mutedForeground }]}>
            {downloaded
              ? `Sage und Karte liegen auf dem Gerät${sizeLabel ? ` · ${sizeLabel}` : ""}. Die Wanderung startet ohne Empfang.`
              : "Lädt die Sage und den Kartenausschnitt herunter, damit die Tour auch ohne Empfang funktioniert."}
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
              label="Download entfernen"
              variant="ghost"
              onPress={onDelete}
              style={{ marginTop: 14 }}
            />
          ) : (
            <PrimaryButton
              label="Herunterladen"
              variant="ghost"
              onPress={onDownload}
              style={{ marginTop: 14 }}
            />
          )}
        </View>

        <SparkDivider style={{ marginVertical: 22 }} />

        <Text style={[styles.blockTitle, { color: colors.foreground }]}>
          Vor der Tour prüfen
        </Text>
        <View
          style={[
            styles.checkCard,
            { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
          ]}
        >
          <CheckRow icon="cloud" label="Wetter" value="Wechselnd, 8-14°C" ok />
          <CheckRow icon="wind" label="Wind" value="Mässig, Böen 35 km/h" ok />
          <CheckRow icon="alert-triangle" label="Wegzustand" value="Teils feucht" warn />
          <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>
            Richtwerte zur eigenen Prüfung. Live-Wetterdaten folgen in einer
            späteren Ausbaustufe.
          </Text>
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
              Energiesparmodus
            </Text>
            <Text style={[styles.energyHint, { color: colors.mutedForeground }]}>
              Diese Tour verbraucht durch GPS und Audio spürbar Akku. Der Sparmodus
              schont die Batterie.
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
          label="GPX importieren"
          variant="ghost"
          onPress={() =>
            Alert.alert(
              "GPX-Import",
              "Der Import eigener GPX-Routen ist noch nicht verfügbar und folgt in einer späteren Ausbaustufe."
            )
          }
          style={{ marginTop: 20 }}
        />

        <SparkDivider style={{ marginVertical: 22 }} />

        <Text style={[styles.blockTitle, { color: colors.foreground }]}>
          Passende Sage
        </Text>
        <Text style={[styles.sagaHint, { color: colors.mutedForeground }]}>
          {sagaLoading
            ? "Die passende Regionalsage wird gesucht …"
            : "Diese überlieferte Legende begleitet dich auf der Route. Tippe an, um sie zu lesen."}
        </Text>

        {sagaLoading ? (
          <View
            style={[
              styles.sagaCard,
              { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
            ]}
          >
            <ActivityIndicator color={colors.accent} />
            <Text
              style={[styles.sagaLoadingText, { color: colors.mutedForeground }]}
            >
              Sage wird geschrieben …
            </Text>
          </View>
        ) : !saga ? (
          <View
            style={[
              styles.sagaCard,
              { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
            ]}
          >
            <Text style={[styles.sagaMood, { color: colors.mutedForeground }]}>
              Die Sage konnte nicht geladen werden. Bitte prüfe deine Verbindung.
            </Text>
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
            Für diese Route ist keine punktgenau belegte Sage überliefert. Gezeigt
            wird die nächstgelegene dokumentierte Regionalsage.
          </Text>
        ) : null}

        {saga && !sagaLoading ? (
          <PrimaryButton
            label={locked ? "Premium freischalten" : "Zur Sage weiter"}
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
  routeName: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 18 },
  forSaga: { fontFamily: fonts.story, fontSize: 14, marginTop: 2 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  stat: {
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
  downloadCard: {
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
  checkCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  checkLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, flex: 1 },
  checkValue: { fontFamily: fonts.mono, fontSize: 13 },
  checkNote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 8, fontStyle: "italic" },
  energyCard: {
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
  sagaCard: {
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
