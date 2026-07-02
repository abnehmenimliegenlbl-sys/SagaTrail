import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
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
import { SparkDivider } from "@/components/brand/SparkMountain";
import { SAGAS } from "@/constants/sagas";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const WEB_TOP = 67;

// Plausible Routenkennwerte je Sage (Erststart-Build: statisch, klar gekennzeichnet)
const ROUTE_META: Record<
  string,
  { name: string; distanceKm: number; ascentM: number; minutes: number; sac: string }
> = {
  teufelsbrucke: { name: "Schöllenen-Schlucht", distanceKm: 6.4, ascentM: 480, minutes: 165, sac: "T3" },
  rossberg: { name: "Bergsturz-Weg Goldau", distanceKm: 8.1, ascentM: 620, minutes: 210, sac: "T2" },
  martinsloch: { name: "Martinsloch-Panorama", distanceKm: 10.2, ascentM: 910, minutes: 290, sac: "T4" },
};

const DEFAULT_META = {
  name: "Sagenweg",
  distanceKm: 7.5,
  ascentM: 540,
  minutes: 190,
  sac: "T2",
};

export default function Routenplanung() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { energiesparmodus, setEnergiesparmodus } = useApp();

  const saga = SAGAS.find((s) => s.id === id);
  const meta = (id && ROUTE_META[id]) || DEFAULT_META;
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  const [lowBattery] = useState(false);

  if (!saga) {
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

  const h = Math.floor(meta.minutes / 60);
  const m = meta.minutes % 60;

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
        <ScreenHeader eyebrow={saga.canton} title="Routenplanung" onBack />

        <Text style={[styles.routeName, { color: colors.foreground }]}>
          {meta.name}
        </Text>
        <Text style={[styles.forSaga, { color: colors.accent }]}>
          Für: {saga.title}
        </Text>

        <View style={{ marginTop: 18 }}>
          <RouteMap progress={0.15} height={200} />
        </View>

        <Animated.View entering={FadeInDown} style={styles.statsGrid}>
          <Stat label="Distanz" value={`${meta.distanceKm}`} unit="km" />
          <Stat label="Aufstieg" value={`${meta.ascentM}`} unit="hm" />
          <Stat label="Dauer" value={`${h}:${String(m).padStart(2, "0")}`} unit="h" />
          <Stat label="SAC-Skala" value={meta.sac} unit="" />
        </Animated.View>

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

        <PrimaryButton
          label="Wanderung jetzt beginnen"
          onPress={() => router.replace(`/hike/${saga.id}`)}
          style={{ marginTop: 12 }}
        />
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
});
