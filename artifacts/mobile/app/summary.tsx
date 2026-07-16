import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useRef } from "react";
import { captureRef } from "react-native-view-shot";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLAS_3D } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { ShareCard } from "@/components/brand/ShareCard";
import { AchievementMarker, SparkDivider } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useColors } from "@/hooks/useColors";
import { useOnboardingStrings } from "@/lib/i18n/screens/onboarding";
import { useSummaryStrings } from "@/lib/i18n/screens/summary";

const WEB_TOP = 67;

export default function Summary() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lastHike, profile, attachHikePhoto } = useApp();
  const { sagas } = useCatalog();
  const shareCardRef = useRef<View>(null);

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;
  const onboardingStrings = useOnboardingStrings();
  const t = useSummaryStrings();
  const archetype = profile?.archetype
    ? onboardingStrings.archetypes[profile.archetype].title
    : undefined;

  if (!lastHike) {
    return (
      <Background>
        <View style={styles.center}>
          <Text style={{ color: colors.foreground, fontFamily: fonts.titleBold }}>
            {t.noHikeFound}
          </Text>
          <PrimaryButton label={t.backToOverview} onPress={() => router.replace("/")} />
        </View>
      </Background>
    );
  }

  const decisions = lastHike.chapters.filter((c) => c.isDecisionPoint);

  const sagaTitle =
    sagas.find((s) => s.id === lastHike.sagaId)?.title ?? lastHike.routeName;

  // Erinnerungsfoto aus der Galerie waehlen und im Tagebuch ablegen.
  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets[0]?.uri) {
        await attachHikePhoto(lastHike.id, result.assets[0].uri);
      }
    } catch {
      // Auswahl abgebrochen oder nicht verfuegbar — kein Fehlerzustand noetig
    }
  };

  const onExportGpx = async () => {
    const g = lastHike?.geometry;
    if (!g || g.length === 0) return;
    try {
      const name = lastHike.routeName ?? "SagaTrail-Route";
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
      const uri = (FileSystem.cacheDirectory ?? "") + fileName;
      await FileSystem.writeAsStringAsync(uri, gpx, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri, { mimeType: "application/gpx+xml", UTI: "com.topografix.gpx" });
    } catch {
      // Teilen abgebrochen oder nicht verfuegbar — kein Fehlerzustand noetig
    }
  };

  const share = async () => {
    const text = t.shareTextTemplate(lastHike.routeName, lastHike.distanceKm);
    if (Platform.OS === "web") {
      return;
    }
    // Zuerst die Share-Grafik versuchen (deutlich attraktiver auf Social
    // Media); wenn das Abfotografieren fehlschlaegt, faellt der Flow auf
    // den bisherigen reinen Text zurueck.
    try {
      const uri = await captureRef(shareCardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: t.shareBtn,
        });
        return;
      }
    } catch {
      // Grafik nicht verfuegbar — Text-Fallback unten
    }
    try {
      await Share.share({ message: text });
    } catch {
      // Teilen abgebrochen — kein Fehlerzustand noetig
    }
  };

  return (
    <Background deep>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 60,
        }}
      >
        <Animated.View entering={FadeIn} style={styles.hero}>
          <AchievementMarker size={100} unlocked color={colors.accent} />
          <Text style={[styles.unlocked, { color: colors.accent }]}>
            {t.achievementUnlocked}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {lastHike.routeName}
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {t.archetypeSub(archetype ?? "")}
          </Text>
        </Animated.View>

        <SparkDivider style={{ marginVertical: 26 }} />

        <Animated.View entering={FadeInDown} style={styles.statsRow}>
          <Stat value={`${lastHike.distanceKm}`} unit="km" label={t.stats.distance} />
          <Stat value={`${lastHike.ascentM}`} unit="hm" label={t.stats.ascent} />
          <Stat value={lastHike.sacScale} unit="" label={t.stats.sac} />
          <Stat value={`${lastHike.chapters.length}`} unit="" label={t.stats.chapters} />
          {typeof lastHike.steps === "number" && lastHike.steps > 0 && (
            <Stat value={`${lastHike.steps}`} unit="" label={t.stats.steps} />
          )}
        </Animated.View>

        {decisions.length > 0 && (
          <View style={{ marginTop: 30 }}>
            <Text style={[styles.blockTitle, { color: colors.foreground }]}>
              {t.blockTitle}
            </Text>
            {decisions.map((d) => {
              const chosen =
                d.chosenOptionIndex != null
                  ? d.decision?.options[d.chosenOptionIndex]
                  : null;
              return (
                <View
                  key={d.id}
                  style={[
                    styles.decisionCard,
                    { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                  ]}
                >
                  <Text style={[styles.decisionQ, { color: colors.mutedForeground }]}>
                    {d.decision?.question}
                  </Text>
                  <Text style={[styles.decisionA, { color: colors.foreground }]}>
                    {chosen ? chosen.label : t.noChoiceMade}
                  </Text>
                  {chosen && (
                    <Text style={[styles.decisionTone, { color: colors.accent }]}>
                      {chosen.archetypeHint}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {lastHike.photoUris && lastHike.photoUris.length > 0 && (
          <View style={{ marginTop: 30 }}>
            <Text style={[styles.blockTitle, { color: colors.foreground }]}>
              {t.hikePhotosTitle}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              {lastHike.photoUris.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={[styles.hikePhotoThumb, { borderColor: colors.glassBorder }]}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ marginTop: 30 }}>
          <Text style={[styles.blockTitle, { color: colors.foreground }]}>
            {t.photoTitle}
          </Text>
          {lastHike.photoUri && (
            <Image
              source={{ uri: lastHike.photoUri }}
              style={[styles.diaryPhoto, { borderColor: colors.glassBorder }]}
              resizeMode="cover"
            />
          )}
          <PrimaryButton
            variant="secondary"
            label={lastHike.photoUri ? t.changePhoto : t.addPhoto}
            onPress={pickPhoto}
            style={{ marginTop: 10 }}
          />
        </View>

        <PrimaryButton
          variant="secondary"
          label={t.shareBtn}
          onPress={share}
          style={{ marginTop: 30 }}
        />

        {lastHike.geometry && lastHike.geometry.length > 0 && Platform.OS !== "web" && (
          <PrimaryButton
            variant="secondary"
            label={t.exportGpx}
            onPress={onExportGpx}
            style={{ marginTop: 8 }}
          />
        )}

        <PrimaryButton
          label={t.backButton}
          onPress={() => router.replace("/")}
          style={{ marginTop: 12 }}
        />
      </ScrollView>

      {Platform.OS !== "web" && (
        <View style={styles.shareCardOffscreen} pointerEvents="none">
          <ShareCard
            ref={shareCardRef}
            sagaTitle={sagaTitle}
            routeName={lastHike.routeName}
            distanceKm={lastHike.distanceKm}
            ascentM={lastHike.ascentM}
            sacScale={lastHike.sacScale}
            durationMin={lastHike.durationMin}
            steps={lastHike.steps}
            geometry={lastHike.geometry}
            photoUri={lastHike.photoUri}
            distanceLabel={t.stats.distance}
            ascentLabel={t.stats.ascent}
            timeLabel={t.stats.time}
            stepsLabel={t.stats.steps}
          />
        </View>
      )}
    </Background>
  );
}

function Stat({ value, unit, label }: { value: string; unit: string; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.stat}>
      <View style={styles.statValRow}>
        <Text style={[styles.statVal, { color: colors.foreground }]}>{value}</Text>
        {unit ? <Text style={[styles.statUnit, { color: colors.accent }]}>{unit}</Text> : null}
      </View>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  hero: { alignItems: "center", marginTop: 12 },
  unlocked: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2, marginTop: 18 },
  title: { fontFamily: fonts.titleBlack, fontSize: 32, marginTop: 8, textAlign: "center" },
  sub: { fontFamily: fonts.story, fontSize: 15, marginTop: 6 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center", flex: 1 },
  statValRow: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  statVal: { fontFamily: fonts.monoBold, fontSize: 26 },
  statUnit: { fontFamily: fonts.mono, fontSize: 12 },
  statLabel: { fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  blockTitle: { fontFamily: fonts.titleBold, fontSize: 22, marginBottom: 14 },
  decisionCard: { ...GLAS_3D, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  decisionQ: { fontFamily: fonts.body, fontSize: 13 },
  decisionA: { fontFamily: fonts.story, fontSize: 17, marginTop: 6, lineHeight: 24 },
  decisionTone: { fontFamily: fonts.mono, fontSize: 11, marginTop: 6 },
  diaryPhoto: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  hikePhotoThumb: {
    width: 150,
    height: 150,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
    marginBottom: 4,
  },
  // Ausserhalb des sichtbaren Bereichs, aber gerendert — Voraussetzung,
  // damit react-native-view-shot die Karte abfotografieren kann.
  shareCardOffscreen: { position: "absolute", left: -1000, top: 0 },
});
