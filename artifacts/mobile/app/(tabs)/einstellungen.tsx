import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { SparkDivider } from "@/components/brand/SparkMountain";
import { AGE_TIERS, ARCHETYPES, LANGUAGES } from "@/constants/onboarding";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { AgeTier, Archetype } from "@/types";

const WEB_TOP = 67;

export default function Einstellungen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    profile,
    premium,
    energiesparmodus,
    emergencyContact,
    updateProfile,
    setEnergiesparmodus,
    saveEmergencyContact,
    exportData,
    resetAll,
    lockPremium,
  } = useApp();

  const [contactName, setContactName] = useState(emergencyContact?.name ?? "");
  const [contactPhone, setContactPhone] = useState(emergencyContact?.phone ?? "");

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  const cycleArchetype = () => {
    const order: Archetype[] = ["reisende", "hueterin", "gewitzte", "senn"];
    const idx = order.indexOf(profile?.archetype ?? "reisende");
    updateProfile({ archetype: order[(idx + 1) % order.length] });
  };

  const cycleAge = () => {
    const order: AgeTier[] = ["kinder", "jugendliche", "erwachsene"];
    const idx = order.indexOf(profile?.ageTier ?? "erwachsene");
    updateProfile({ ageTier: order[(idx + 1) % order.length] });
  };

  const cycleLang = () => {
    const idx = LANGUAGES.findIndex((l) => l.code === profile?.language);
    const nextLang = LANGUAGES[(idx + 1) % LANGUAGES.length];
    updateProfile({ language: nextLang.code });
  };

  const handleExport = async () => {
    const json = await exportData();
    if (Platform.OS === "web") {
      Alert.alert("Datenexport", json.slice(0, 500));
      return;
    }
    try {
      await Share.share({ message: json });
    } catch {
      // Teilen abgebrochen — kein Fehlerzustand noetig
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Konto & Daten löschen",
      "Alle lokalen Daten werden unwiderruflich gelöscht. Fortfahren?",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: () => resetAll(),
        },
      ]
    );
  };

  const archLabel = ARCHETYPES.find((a) => a.id === profile?.archetype)?.title;
  const ageLabel = AGE_TIERS.find((a) => a.id === profile?.ageTier)?.title;
  const langLabel = LANGUAGES.find((l) => l.code === profile?.language)?.native;

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 20,
          paddingBottom: 120,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader eyebrow="Dein Profil" title="Einstellungen" />

        <Section title="Profil">
          <RowButton label="Name" value={profile?.name ?? "-"} />
          <RowButton label="Heimatkanton" value={profile?.homeCanton ?? "-"} />
          <RowButton label="Archetyp" value={archLabel ?? "-"} onPress={cycleArchetype} />
          <RowButton label="Alterstufe" value={ageLabel ?? "-"} onPress={cycleAge} />
          <RowButton label="Sprache" value={langLabel ?? "-"} onPress={cycleLang} />
        </Section>

        <Section title="Wanderung">
          <View style={[styles.switchRow, { borderColor: colors.glassBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                Energiesparmodus
              </Text>
              <Text style={[styles.rowHint, { color: colors.mutedForeground }]}>
                Reduziert GPS-Genauigkeit und Kartenaktualisierung
              </Text>
            </View>
            <Switch
              value={energiesparmodus}
              onValueChange={setEnergiesparmodus}
              trackColor={{ true: colors.accent, false: colors.card }}
              thumbColor={colors.foreground}
            />
          </View>
        </Section>

        <Section title="Notfallkontakt">
          <TextInput
            value={contactName}
            onChangeText={setContactName}
            placeholder="Name"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, inputStyle(colors)]}
          />
          <TextInput
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="Telefonnummer"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
            style={[styles.input, inputStyle(colors)]}
          />
          <PrimaryButton
            label="Kontakt speichern"
            variant="ghost"
            onPress={() => {
              if (contactName && contactPhone) {
                saveEmergencyContact({ name: contactName, phone: contactPhone });
                Alert.alert("Gespeichert", "Notfallkontakt wurde gesichert.");
              }
            }}
            style={{ marginTop: 4 }}
          />
        </Section>

        <Section title="Abonnement">
          <RowButton
            label="Status"
            value={premium ? "Premium aktiv" : "Kostenlos"}
            onPress={() => router.push("/paywall")}
          />
          {premium && (
            <PrimaryButton
              label="Premium zurücksetzen (Demo)"
              variant="ghost"
              onPress={lockPremium}
              style={{ marginTop: 8 }}
            />
          )}
        </Section>

        <SparkDivider style={{ marginVertical: 22 }} />

        <Section title="Recht & Daten">
          <RowButton
            label="Datenschutz"
            value=""
            icon="chevron-right"
            onPress={() => router.push("/legal/datenschutz")}
          />
          <RowButton
            label="Impressum"
            value=""
            icon="chevron-right"
            onPress={() => router.push("/legal/impressum")}
          />
          <RowButton
            label="Daten exportieren"
            value=""
            icon="download"
            onPress={handleExport}
          />
          <RowButton
            label="Support kontaktieren"
            value=""
            icon="mail"
            onPress={async () => {
              const url = "mailto:support@sagatrail.ch";
              try {
                if (await Linking.canOpenURL(url)) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert("E-Mail", "support@sagatrail.ch");
                }
              } catch {
                Alert.alert("E-Mail", "support@sagatrail.ch");
              }
            }}
          />
        </Section>

        <PrimaryButton
          label="Konto & Daten löschen"
          onPress={handleReset}
          style={{ marginTop: 10 }}
        />

        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          SagaTrail · Version 1.0.0 · Erststart-Build
        </Text>
      </ScrollView>
    </Background>
  );
}

function inputStyle(colors: ReturnType<typeof useColors>) {
  return {
    color: colors.foreground,
    borderColor: colors.glassBorder,
    borderRadius: colors.radius,
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={[styles.sectionTitle, { color: colors.accent }]}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function RowButton({
  label,
  value,
  onPress,
  icon,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  icon?: React.ComponentProps<typeof Feather>["name"];
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, { borderColor: colors.glassBorder }]}
    >
      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? (
          <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>
            {value}
          </Text>
        ) : null}
        {onPress && (
          <Feather
            name={icon ?? "chevron-right"}
            size={18}
            color={colors.mutedForeground}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  rowHint: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  rowValue: { fontFamily: fonts.body, fontSize: 14 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    marginTop: 10,
  },
  version: {
    fontFamily: fonts.mono,
    fontSize: 11,
    textAlign: "center",
    marginTop: 30,
  },
});
