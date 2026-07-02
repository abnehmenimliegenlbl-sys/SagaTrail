import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { SparkDivider, SparkMountain } from "@/components/brand/SparkMountain";
import {
  AGE_TIERS,
  ARCHETYPES,
  CANTONS,
  LANGUAGES,
} from "@/constants/onboarding";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { AgeTier, Archetype } from "@/types";

const WEB_TOP = 67;

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { saveProfile } = useApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [canton, setCanton] = useState<string | null>(null);
  const [language, setLanguage] = useState("de");
  const [ageTier, setAgeTier] = useState<AgeTier | null>(null);
  const [consent, setConsent] = useState(false);

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 12;

  const totalSteps = 5;

  const canAdvance = () => {
    switch (step) {
      case 0:
        return name.trim().length >= 2;
      case 1:
        return archetype !== null;
      case 2:
        return canton !== null;
      case 3:
        return true;
      case 4:
        return ageTier !== null && (ageTier !== "kinder" || consent);
      default:
        return false;
    }
  };

  const next = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else if (archetype && canton && ageTier) {
      saveProfile({
        id: `p_${Date.now()}`,
        name: name.trim(),
        archetype,
        homeCanton: canton,
        language,
        ageTier,
      });
    }
  };

  return (
    <Background deep>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 22,
          paddingBottom: 140,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Fortschritt */}
        <View style={styles.progressRow}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                {
                  backgroundColor: i <= step ? colors.accent : colors.glassBorder,
                  width: i === step ? 26 : 8,
                },
              ]}
            />
          ))}
        </View>

        {step === 0 && (
          <Animated.View entering={FadeIn.duration(500)} style={styles.welcome}>
            <SparkMountain size={110} pulsing />
            <Text style={[styles.brand, { color: colors.foreground }]}>
              SAGATRAIL
            </Text>
            <Text style={[styles.tagline, { color: colors.accent }]}>
              Die Sagen der Alpen, lebendig auf deinem Weg
            </Text>
            <SparkDivider style={{ marginVertical: 24 }} />
            <Text style={[styles.intro, { color: colors.mutedForeground }]}>
              Du wanderst als Zeug:in durch uralte Schweizer Legenden. Sie werden
              dir erzählt, während du gehst — Schritt für Schritt, Ort für Ort.
            </Text>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Wie dürfen wir dich nennen?
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Dein Name"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  borderColor: colors.glassBorder,
                  borderRadius: colors.radius,
                },
              ]}
            />
          </Animated.View>
        )}

        {step === 1 && (
          <StepFrame title="Dein Archetyp" eyebrow="Schritt 2 von 5">
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Dein Archetyp verändert den Ton der Erzählung und wie du dargestellt
              wirst — nie den Ausgang der Sage.
            </Text>
            {ARCHETYPES.map((a, i) => {
              const active = archetype === a.id;
              return (
                <Animated.View key={a.id} entering={FadeInDown.delay(i * 70)}>
                  <Pressable
                    onPress={() => setArchetype(a.id)}
                    style={[
                      styles.card,
                      {
                        borderColor: active ? colors.accent : colors.glassBorder,
                        backgroundColor: active
                          ? colors.glassBgStrong
                          : colors.glassBg,
                        borderRadius: colors.radius,
                      },
                    ]}
                  >
                    <Text style={[styles.cardEyebrow, { color: colors.accent }]}>
                      {a.tagline.toUpperCase()}
                    </Text>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                      {a.title}
                    </Text>
                    <Text
                      style={[styles.cardBody, { color: colors.mutedForeground }]}
                    >
                      {a.description}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </StepFrame>
        )}

        {step === 2 && (
          <StepFrame title="Deine Heimatregion" eyebrow="Schritt 3 von 5">
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Wähle deinen Heimatkanton. Von hier aus beginnt deine Reise durch
              die Sagenwelt.
            </Text>
            <View style={styles.chipWrap}>
              {CANTONS.map((cn) => {
                const active = canton === cn;
                return (
                  <Pressable
                    key={cn}
                    onPress={() => setCanton(cn)}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? colors.accent : colors.glassBorder,
                        backgroundColor: active
                          ? colors.glassBgStrong
                          : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.foreground : colors.mutedForeground },
                      ]}
                    >
                      {cn}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </StepFrame>
        )}

        {step === 3 && (
          <StepFrame title="Deine Sprache" eyebrow="Schritt 4 von 5">
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              In welcher Sprache sollen dir die Sagen erzählt werden?
            </Text>
            {LANGUAGES.map((l) => {
              const active = language === l.code;
              return (
                <Pressable
                  key={l.code}
                  onPress={() => setLanguage(l.code)}
                  style={[
                    styles.langRow,
                    {
                      borderColor: active ? colors.accent : colors.glassBorder,
                      backgroundColor: active ? colors.glassBgStrong : colors.glassBg,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  <View>
                    <Text style={[styles.langNative, { color: colors.foreground }]}>
                      {l.native}
                    </Text>
                    <Text style={[styles.langLabel, { color: colors.mutedForeground }]}>
                      {l.label}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: active ? colors.accent : colors.glassBorder,
                        backgroundColor: active ? colors.accent : "transparent",
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </StepFrame>
        )}

        {step === 4 && (
          <StepFrame title="Alterstufe" eyebrow="Schritt 5 von 5">
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Sie bestimmt, wie intensiv die Sagen erzählt werden.
            </Text>
            {AGE_TIERS.map((t) => {
              const active = ageTier === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => {
                    setAgeTier(t.id);
                    if (t.id !== "kinder") setConsent(false);
                  }}
                  style={[
                    styles.card,
                    {
                      borderColor: active ? colors.accent : colors.glassBorder,
                      backgroundColor: active ? colors.glassBgStrong : colors.glassBg,
                      borderRadius: colors.radius,
                    },
                  ]}
                >
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                    {t.title}
                  </Text>
                  <Text style={[styles.tierRange, { color: colors.accent }]}>
                    {t.range}
                  </Text>
                  <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
                    {t.description}
                  </Text>
                </Pressable>
              );
            })}
            {ageTier === "kinder" && (
              <Pressable
                onPress={() => setConsent((c) => !c)}
                style={[
                  styles.consent,
                  {
                    borderColor: consent ? colors.accent : colors.glassBorder,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: consent ? colors.accent : "transparent",
                      borderColor: consent ? colors.accent : colors.glassBorder,
                    },
                  ]}
                />
                <Text style={[styles.consentText, { color: colors.foreground }]}>
                  Ich bin ein Elternteil oder erziehungsberechtigt und stimme der
                  Nutzung durch ein Kind zu.
                </Text>
              </Pressable>
            )}
          </StepFrame>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 16, borderTopColor: colors.glassBorder },
        ]}
      >
        {step > 0 && (
          <Pressable onPress={() => setStep((s) => s - 1)} style={styles.backLink}>
            <Text style={[styles.backText, { color: colors.mutedForeground }]}>
              Zurück
            </Text>
          </Pressable>
        )}
        <PrimaryButton
          label={step === totalSteps - 1 ? "Reise beginnen" : "Weiter"}
          onPress={next}
          disabled={!canAdvance()}
          style={{ flex: 1 }}
        />
      </View>
    </Background>
  );
}

function StepFrame({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <Text style={[styles.stepEyebrow, { color: colors.accent }]}>
        {eyebrow.toUpperCase()}
      </Text>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>{title}</Text>
      <View style={{ height: 16 }} />
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  progressRow: { flexDirection: "row", gap: 6, marginBottom: 28 },
  progressDot: { height: 8, borderRadius: 4 },
  welcome: { alignItems: "center", paddingTop: 12 },
  brand: {
    fontFamily: fonts.titleBlack,
    fontSize: 46,
    letterSpacing: 4,
    marginTop: 18,
  },
  tagline: {
    fontFamily: fonts.story,
    fontSize: 15,
    textAlign: "center",
    marginTop: 6,
  },
  intro: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    alignSelf: "flex-start",
    marginTop: 28,
    marginBottom: 10,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: fonts.body,
    fontSize: 17,
  },
  stepEyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2 },
  stepTitle: { fontFamily: fonts.titleBold, fontSize: 34, marginTop: 4 },
  hint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginBottom: 18 },
  card: { borderWidth: 1, padding: 18, marginBottom: 12 },
  cardEyebrow: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5 },
  cardTitle: { fontFamily: fonts.titleBold, fontSize: 22, marginTop: 4 },
  cardBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 6 },
  tierRange: { fontFamily: fonts.mono, fontSize: 12, marginTop: 2 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  langRow: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  langNative: { fontFamily: fonts.bodyBold, fontSize: 17 },
  langLabel: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  consent: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
    alignItems: "flex-start",
  },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, marginTop: 2 },
  consentText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    backgroundColor: "rgba(16,24,26,0.85)",
  },
  backLink: { paddingHorizontal: 8, paddingVertical: 12 },
  backText: { fontFamily: fonts.bodyMedium, fontSize: 15 },
});
