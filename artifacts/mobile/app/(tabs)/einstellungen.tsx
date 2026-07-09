import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { createNarration } from "@workspace/api-client-react";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import React, { useCallback, useEffect, useRef, useState } from "react";
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

import { GLAS_3D } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { SparkDivider } from "@/components/brand/SparkMountain";
import { AGE_TIERS, ARCHETYPES } from "@/constants/onboarding";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useOnboardingStrings } from "@/lib/i18n/screens/onboarding";
import { useEinstellungenStrings } from "@/lib/i18n/screens/einstellungen";
import {
  NATIVE_LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
} from "@/lib/i18n/languageCode";
import { useColors } from "@/hooks/useColors";
import { blobToDataUri } from "@/lib/narrationAudio";
import { resolveLang, SPEECH_LOCALE } from "@/lib/storyContent";
import { AgeTier, Archetype } from "@/types";

const WEB_TOP = 67;

// Kurzer Vorhoer-Satz pro Erzaehlsprache — bewusst in der Zielsprache,
// damit man die Erzaehlstimme direkt beurteilen kann.
const VOICE_SAMPLES: Record<string, string> = {
  de: "So klingt deine Erzählstimme auf dem Wanderweg.",
  // Bewusst Hochdeutsch: gsw-Erzaehltext bleibt Hochdeutsch (nur die Stimme
  // hat Schweizer Faerbung) — die Vorschau soll dem echten Verhalten entsprechen.
  gsw: "So klingt deine Erzählstimme auf dem Wanderweg.",
  fr: "Voici la voix qui racontera tes légendes en chemin.",
  it: "Questa è la voce che racconterà le tue leggende.",
  en: "This is the voice that will tell your sagas on the trail.",
  zh: "这就是徒步时为你讲述传说的声音。",
  es: "Esta es la voz que narrará tus leyendas en el camino.",
  pt: "Esta é a voz que narrará suas lendas na trilha.",
  ru: "Так звучит голос, который расскажет тебе легенды в пути.",
};

export default function Einstellungen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const t = useEinstellungenStrings();
  const onboardingStrings = useOnboardingStrings();
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
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);

  // Vorschau-Sound (KI-Stimme via expo-av); Generation-Zaehler verhindert,
  // dass eine langsame alte Anfrage eine neuere Vorschau ueberschreibt.
  const previewSoundRef = useRef<Audio.Sound | null>(null);
  const previewGenRef = useRef(0);

  const stopPreview = useCallback(async () => {
    const sound = previewSoundRef.current;
    previewSoundRef.current = null;
    if (sound) {
      try {
        await sound.stopAsync();
      } catch {
        // Sound war evtl. schon fertig — egal
      }
      try {
        await sound.unloadAsync();
      } catch {
        // bereits entladen
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      previewGenRef.current++;
      void stopPreview();
    };
  }, [stopPreview]);

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

  const selectLang = (code: (typeof SUPPORTED_LANGUAGES)[number]) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateProfile({ language: code });
  };

  const previewVoice = useCallback(async () => {
    const lang = resolveLang(profile?.language);
    const sample = VOICE_SAMPLES[lang] ?? VOICE_SAMPLES.de;
    const gen = ++previewGenRef.current;
    await stopPreview();
    if (gen !== previewGenRef.current) return;
    setPreviewUnavailable(false);
    setPreviewLoading(true);
    try {
      const blob = await createNarration({ text: sample, language: profile?.language });
      const uri = await blobToDataUri(blob);
      if (gen !== previewGenRef.current) return;
      const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      if (gen !== previewGenRef.current) {
        void sound.unloadAsync();
        return;
      }
      previewSoundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish && previewSoundRef.current === sound) {
          previewSoundRef.current = null;
          void sound.unloadAsync();
        }
      });
    } catch {
      if (gen !== previewGenRef.current) return;
      setPreviewUnavailable(true);
    } finally {
      if (gen === previewGenRef.current) setPreviewLoading(false);
    }
  }, [profile?.language, stopPreview]);

  const handleExport = async () => {
    const json = await exportData();
    if (Platform.OS === "web") {
      Alert.alert(t.exportTitle, json.slice(0, 500));
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
      t.deleteAlertTitle,
      t.deleteAlertMessage,
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.delete,
          style: "destructive",
          onPress: () => resetAll(),
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(t.logoutAlertTitle, t.logoutAlertMessage, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.logout,
        style: "destructive",
        onPress: async () => {
          await signOut();
          await resetAll();
        },
      },
    ]);
  };

  const archLabel = profile?.archetype
    ? onboardingStrings.archetypes[profile.archetype].title
    : undefined;
  const ageLabel = profile?.ageTier
    ? onboardingStrings.ageTiers[profile.ageTier].title
    : undefined;
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
        <ScreenHeader eyebrow={t.eyebrow} title={t.title} />

        <Section title={t.sectionProfil}>
          <RowButton label={t.nameLabel} value={profile?.name ?? "-"} />
          <RowButton label={t.homeCantonLabel} value={profile?.homeCanton ?? "-"} />
          <RowButton label={t.archetypeLabel} value={archLabel ?? "-"} onPress={cycleArchetype} />
          <RowButton label={t.ageTierLabel} value={ageLabel ?? "-"} onPress={cycleAge} />
          <View style={[styles.langBlock, { borderColor: colors.glassBorder }]}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>
              {t.languageLabel}
            </Text>
            <View style={styles.langChips}>
              {SUPPORTED_LANGUAGES.map((code) => {
                const active = profile?.language === code;
                return (
                  <Pressable
                    key={code}
                    onPress={() => selectLang(code)}
                    style={[
                      styles.langChip,
                      {
                        borderColor: active ? colors.accent : colors.glassBorder,
                        backgroundColor: active ? colors.accent + "22" : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.langChipText,
                        { color: active ? colors.accent : colors.mutedForeground },
                      ]}
                    >
                      {NATIVE_LANGUAGE_NAMES[code]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={previewVoice} disabled={previewLoading} style={styles.voicePreview}>
              <Feather
                name={previewLoading ? "loader" : "volume-2"}
                size={16}
                color={colors.accent}
              />
              <Text style={[styles.voicePreviewText, { color: colors.accent }]}>
                {t.voicePreviewLabel}
              </Text>
            </Pressable>
            {previewUnavailable && (
              <Text style={[styles.voicePreviewHint, { color: colors.mutedForeground }]}>
                {t.voicePreviewUnavailableLabel}
              </Text>
            )}
          </View>
        </Section>

        <Section title={t.sectionWanderung}>
          <View style={[styles.switchRow, { borderColor: colors.glassBorder }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                {t.powerSaveLabel}
              </Text>
              <Text style={[styles.rowHint, { color: colors.mutedForeground }]}>
                {t.powerSaveHint}
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

        <Section title={t.sectionNotfallkontakt}>
          <TextInput
            value={contactName}
            onChangeText={setContactName}
            placeholder={t.contactNamePlaceholder}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, inputStyle(colors)]}
          />
          <TextInput
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder={t.contactPhonePlaceholder}
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
            style={[styles.input, inputStyle(colors)]}
          />
          <PrimaryButton
            label={t.saveContactButton}
            variant="ghost"
            onPress={() => {
              if (contactName && contactPhone) {
                saveEmergencyContact({ name: contactName, phone: contactPhone });
                Alert.alert(t.contactSavedTitle, t.contactSavedMessage);
              }
            }}
            style={{ marginTop: 4 }}
          />
        </Section>

        <Section title={t.sectionAbonnement}>
          <RowButton
            label={t.subscriptionStatusLabel}
            value={premium ? t.subscriptionActive : t.subscriptionFree}
            onPress={() => router.push("/paywall")}
          />
          {premium && (
            <PrimaryButton
              label={t.resetPremiumButton}
              variant="ghost"
              onPress={lockPremium}
              style={{ marginTop: 8 }}
            />
          )}
        </Section>

        <SparkDivider style={{ marginVertical: 22 }} />

        <Section title={t.sectionRechtDaten}>
          <RowButton
            label={t.privacyLabel}
            value=""
            icon="chevron-right"
            onPress={() => router.push("/legal/datenschutz")}
          />
          <RowButton
            label={t.legalLabel}
            value=""
            icon="chevron-right"
            onPress={() => router.push("/legal/impressum")}
          />
          <RowButton
            label={t.exportDataLabel}
            value=""
            icon="download"
            onPress={handleExport}
          />
          <RowButton
            label={t.supportLabel}
            value=""
            icon="mail"
            onPress={async () => {
              const url = "mailto:support@sagatrail.ch";
              try {
                if (await Linking.canOpenURL(url)) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert(t.emailAlertTitle, "support@sagatrail.ch");
                }
              } catch {
                Alert.alert(t.emailAlertTitle, "support@sagatrail.ch");
              }
            }}
          />
        </Section>

        <PrimaryButton
          label={t.logoutButton}
          variant="ghost"
          onPress={handleLogout}
          style={{ marginTop: 10 }}
        />

        <PrimaryButton
          label={t.deleteAccountButton}
          onPress={handleReset}
          style={{ marginTop: 10 }}
        />

        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          {t.versionFooter("1.0.0", "Erststart-Build")}
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
  langBlock: { paddingVertical: 15, borderBottomWidth: 1 },
  langChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  langChip: { ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  langChipText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  voicePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    alignSelf: "flex-start",
  },
  voicePreviewText: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  voicePreviewHint: { fontFamily: fonts.body, fontSize: 12, marginTop: 6 },
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
