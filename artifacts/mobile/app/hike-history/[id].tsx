import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { GLAS_3D } from "@/constants/depth";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { hapticSelection } from "@/lib/haptics";
import { alert } from "@/lib/appAlert";
import { useCollectionStrings } from "@/lib/i18n/screens/collection";
import { useColors } from "@/hooks/useColors";

export default function HikeHistoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hikeHistory } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useCollectionStrings();

  const hike = hikeHistory.find((h) => h.id === id);

  const dateStr = hike?.startedAt
    ? new Date(hike.startedAt).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  async function exportGpx() {
    if (!hike) return;
    if (!hike.geometry || hike.geometry.length < 2) {
      alert("GPX", t.exportGpxNoData);
      return;
    }
    try {
      const name = hike.routeName.replace(/[<>&"]/g, " ");
      const startTime = hike.startedAt
        ? new Date(hike.startedAt).toISOString()
        : new Date().toISOString();
      const trkpts = hike.geometry
        .map(([lat, lng]) => `      <trkpt lat="${lat}" lon="${lng}"></trkpt>`)
        .join("\n");
      const gpx = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<gpx version="1.1" creator="SagaTrail" xmlns="http://www.topografix.com/GPX/1/1">`,
        `  <metadata><name>${name}</name><time>${startTime}</time></metadata>`,
        `  <trk><name>${name}</name><trkseg>`,
        trkpts,
        `  </trkseg></trk>`,
        `</gpx>`,
      ].join("\n");
      const fileName =
        hike.routeName.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 50) +
        `_${new Date(hike.startedAt).toISOString().slice(0, 10)}.gpx`;
      const uri = (FileSystem.cacheDirectory ?? "") + fileName;
      await FileSystem.writeAsStringAsync(uri, gpx, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(uri, {
        mimeType: "application/gpx+xml",
        UTI: "com.topografix.gpx",
      });
    } catch {
      alert("GPX", t.exportGpxError);
    }
  }

  return (
    <Background>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, backgroundColor: colors.glassBg },
        ]}
      >
        <Pressable
          onPress={() => { hapticSelection(); router.back(); }}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Zurück"
        >
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {hike?.routeName ?? ""}
        </Text>
        {/* GPX-Export-Button im Header, falls Geometrie vorhanden */}
        {hike?.geometry && hike.geometry.length > 1 ? (
          <Pressable
            onPress={() => { hapticSelection(); exportGpx(); }}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            accessibilityRole="button"
            accessibilityLabel={t.exportGpx}
          >
            <Feather name="download" size={22} color={colors.foreground} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {!hike ? (
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
            {t.diaryDetailNotFound}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero-Foto */}
          {hike.photoUri ? (
            <Image
              source={{ uri: hike.photoUri }}
              style={styles.heroPhoto}
              resizeMode="cover"
            />
          ) : null}

          {/* Datums-Zeile */}
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {dateStr}
          </Text>

          {/* Stats-Karten */}
          <View style={styles.statsRow}>
            <StatCard
              label={t.statsKm}
              value={hike.distanceKm != null ? `${hike.distanceKm} km` : "—"}
              colors={colors}
            />
            <StatCard
              label={t.statsAscent}
              value={hike.ascentM != null ? `${hike.ascentM} m` : "—"}
              colors={colors}
            />
            {hike.durationMin != null && (
              <StatCard
                label={t.statsDuration}
                value={`${Math.round(hike.durationMin / 60 * 10) / 10} h`}
                colors={colors}
              />
            )}
            {!!hike.steps && (
              <StatCard
                label={t.diaryDetailSteps}
                value={hike.steps.toLocaleString()}
                colors={colors}
              />
            )}
          </View>

          {/* Challenge-Fotos */}
          {hike.photoUris && hike.photoUris.length > 0 && (
            <Section title={t.diaryDetailPois.replace("Orte", "Fotos").replace("Places", "Photos").replace("Lieux", "Photos")} colors={colors}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoGallery}>
                {hike.photoUris.map((uri, i) => (
                  <Image
                    key={i}
                    source={{ uri }}
                    style={styles.galleryPhoto}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </Section>
          )}

          {/* Besuchte POIs */}
          {hike.visitedPois && hike.visitedPois.length > 0 && (
            <Section title={t.diaryDetailPois} colors={colors}>
              {hike.visitedPois.map((poi) => (
                <View
                  key={poi.id}
                  style={[
                    styles.poiCard,
                    { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                    GLAS_3D,
                  ]}
                >
                  {poi.photoUrl ? (
                    <Image
                      source={{ uri: poi.photoUrl }}
                      style={styles.poiPhoto}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View style={styles.poiBody}>
                    <Text style={[styles.poiName, { color: colors.foreground }]}>
                      {poi.name}
                    </Text>
                    {poi.extract ? (
                      <Text
                        style={[styles.poiExtract, { color: colors.mutedForeground }]}
                        numberOfLines={3}
                      >
                        {poi.extract}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </Section>
          )}

          {hike.recognitionEntries && hike.recognitionEntries.length > 0 && (
            <Section title={t.diaryDetailPois} colors={colors}>
              {hike.recognitionEntries.map((entry) => (
                <View
                  key={entry.id}
                  style={[
                    styles.poiCard,
                    { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                    GLAS_3D,
                  ]}
                >
                  <Image
                    source={{ uri: entry.photoUri }}
                    style={styles.poiPhoto}
                    resizeMode="cover"
                  />
                  <View style={styles.poiBody}>
                    <View style={styles.recognitionTitleRow}>
                      <Feather
                        name={entry.kind === "peak" ? "triangle" : "maximize"}
                        size={14}
                        color={colors.accent}
                      />
                      <Text style={[styles.poiName, { color: colors.foreground }]}>
                        {entry.title}
                      </Text>
                    </View>
                    <Text style={[styles.poiExtract, { color: colors.mutedForeground }]}>
                      {entry.text}
                    </Text>
                  </View>
                </View>
              ))}
            </Section>
          )}

          {/* Kapitel / Geschichte */}
          {hike.chapters && hike.chapters.length > 0 && (
            <Section title={t.diaryDetailChapters} colors={colors}>
              {hike.chapters.map((ch, i) => (
                <View
                  key={ch.id}
                  style={[
                    styles.chapterCard,
                    { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                    GLAS_3D,
                  ]}
                >
                  <View style={styles.chapterNumBadge}>
                    <Text style={[styles.chapterNum, { color: colors.accent }]}>
                      {i + 1}
                    </Text>
                  </View>
                  <Text
                    style={[styles.chapterText, { color: colors.foreground }]}
                    numberOfLines={6}
                  >
                    {ch.text}
                  </Text>
                  {ch.isDecisionPoint && ch.decision && ch.chosenOptionIndex != null && (
                    <View style={[styles.choiceBadge, { backgroundColor: colors.accent + "22", borderColor: colors.accent }]}>
                      <Feather name="check-circle" size={12} color={colors.accent} />
                      <Text style={[styles.choiceLabel, { color: colors.accent }]}>
                        {ch.decision.options[ch.chosenOptionIndex]?.label}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </Section>
          )}

          {/* Buttons: Route / Sage anzeigen */}
          <View style={styles.actions}>
            {hike.routeId ? (
              <PrimaryButton
                label={t.diaryDetailViewRoute}
                onPress={() => {
                  hapticSelection();
                  router.push(`/route/${encodeURIComponent(hike.routeId!)}`);
                }}
              />
            ) : (
              <PrimaryButton
                label={t.diaryDetailViewSaga}
                onPress={() => {
                  hapticSelection();
                  router.push(`/saga/${encodeURIComponent(hike.sagaId)}`);
                }}
              />
            )}
          </View>
        </ScrollView>
      )}
    </Background>
  );
}

/* ── Hilfs-Komponenten ─────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View
      style={[
        styles.statCard,
        { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
        GLAS_3D,
      ]}
    >
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.titleBold,
    fontSize: 17,
    textAlign: "center",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 0,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  notFoundText: {
    fontFamily: fonts.body,
    fontSize: 15,
    textAlign: "center",
  },
  heroPhoto: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    marginBottom: 16,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: "22%",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statValue: {
    fontFamily: fonts.titleBold,
    fontSize: 16,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: fonts.titleBold,
    fontSize: 17,
    marginBottom: 12,
  },
  photoGallery: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  galleryPhoto: {
    width: 160,
    height: 120,
    borderRadius: 10,
    marginRight: 10,
  },
  poiCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 10,
  },
  poiPhoto: {
    width: "100%",
    height: 100,
  },
  poiBody: {
    padding: 12,
  },
  poiName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    marginBottom: 4,
  },
  poiExtract: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  recognitionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  chapterCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
  },
  chapterNumBadge: {
    marginBottom: 6,
  },
  chapterNum: {
    fontFamily: fonts.titleBold,
    fontSize: 12,
    textTransform: "uppercase",
  },
  chapterText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
  choiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    alignSelf: "flex-start",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  choiceLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
});
