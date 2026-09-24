import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
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

import { GLAS_3D } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { PermissionsStep } from "@/components/brand/PermissionsStep";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { SparkDivider, SparkMountain } from "@/components/brand/SparkMountain";
import { AGE_TIERS, ARCHETYPES } from "@/constants/onboarding";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { useOnboardingStrings } from "@/lib/i18n/screens/onboarding";
import {
  LanguageCode,
  NATIVE_LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
} from "@/lib/i18n/languageCode";
import { AgeTier, Archetype } from "@/types";

const WEB_TOP = 67;
const PROFILE_COPY: Record<LanguageCode, {
  avatarSelected: string;
  avatarSelect: string;
  birthDate: string;
  birthPlaceholder: string;
}> = {
  de: { avatarSelected: "Profilbild ausgewählt", avatarSelect: "Profilbild auswählen (optional)", birthDate: "Geburtsdatum", birthPlaceholder: "TT.MM.JJJJ" },
  gsw: { avatarSelected: "Profilbild usgwählt", avatarSelect: "Profilbild usswähle (optional)", birthDate: "Geburtsdatum", birthPlaceholder: "TT.MM.JJJJ" },
  fr: { avatarSelected: "Photo sélectionnée", avatarSelect: "Choisir une photo (facultatif)", birthDate: "Date de naissance", birthPlaceholder: "JJ.MM.AAAA" },
  it: { avatarSelected: "Foto selezionata", avatarSelect: "Scegli foto (facoltativo)", birthDate: "Data di nascita", birthPlaceholder: "GG.MM.AAAA" },
  en: { avatarSelected: "Profile picture selected", avatarSelect: "Choose profile picture (optional)", birthDate: "Date of birth", birthPlaceholder: "DD.MM.YYYY" },
  zh: { avatarSelected: "已选择头像", avatarSelect: "选择头像（可选）", birthDate: "出生日期", birthPlaceholder: "日.月.年" },
  es: { avatarSelected: "Foto de perfil seleccionada", avatarSelect: "Elegir foto de perfil (opcional)", birthDate: "Fecha de nacimiento", birthPlaceholder: "DD.MM.AAAA" },
  pt: { avatarSelected: "Foto de perfil selecionada", avatarSelect: "Escolher foto de perfil (opcional)", birthDate: "Data de nascimento", birthPlaceholder: "DD.MM.AAAA" },
  ru: { avatarSelected: "Фото профиля выбрано", avatarSelect: "Выбрать фото профиля (необязательно)", birthDate: "Дата рождения", birthPlaceholder: "ДД.ММ.ГГГГ" },
};

const BIRTHDATE_ERRORS: Record<LanguageCode, { invalid: string; age: string }> = {
  de: { invalid: "Ungültiges Geburtsdatum", age: "Ungültiges Alter" },
  gsw: { invalid: "Ungültigs Geburtsdatum", age: "Ungültigs Alter" },
  fr: { invalid: "Date de naissance invalide", age: "Âge invalide" },
  it: { invalid: "Data di nascita non valida", age: "Età non valida" },
  en: { invalid: "Invalid date of birth", age: "Invalid age" },
  zh: { invalid: "出生日期无效", age: "年龄无效" },
  es: { invalid: "Fecha de nacimiento no válida", age: "Edad no válida" },
  pt: { invalid: "Data de nascimento inválida", age: "Idade inválida" },
  ru: { invalid: "Недействительная дата рождения", age: "Недопустимый возраст" },
};

function normalizeBirthDate(value: string, language: LanguageCode): string {
  const errors = BIRTHDATE_ERRORS[language];
  const match = value.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!match) throw new Error(errors.invalid);
  const [, day, month, year] = match;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) {
    throw new Error(errors.invalid);
  }
  const age = new Date().getUTCFullYear() - date.getUTCFullYear();
  if (age < 13 || age > 120) throw new Error(errors.age);
  return iso;
}

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { saveProfile, uploadProfileAvatar, language: activeLanguage, setPendingLanguage } = useApp();
  const t = useOnboardingStrings();
  const profileCopy = PROFILE_COPY[activeLanguage];

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [language, setLanguage] = useState<LanguageCode>(activeLanguage);
  const [ageTier, setAgeTier] = useState<AgeTier | null>(null);
  const [consent, setConsent] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 12;

  const totalSteps = 5;

  const canAdvance = () => {
    switch (step) {
      case 0:
        if (name.trim().length < 2 || !dateOfBirth.trim()) return false;
        try {
           normalizeBirthDate(dateOfBirth, language);
          return true;
        } catch {
          return false;
        }
      case 1:
        return archetype !== null;
      case 2:
        return true;
      case 3:
        return ageTier !== null && (ageTier !== "kinder" || consent);
      case 4:
        // Alle Berechtigungen ausser Kamera müssen vor dem Abschluss des
        // Onboardings bestätigt sein.
        return permissionsGranted;
      default:
        return false;
    }
  };

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const next = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else if (archetype && ageTier) {
      setSaveError(null);
      setSaving(true);
      try {
        await saveProfile({
          name: name.trim(),
          bio: bio.trim() || null,
           dateOfBirth: normalizeBirthDate(dateOfBirth, language),
          archetype,
          language,
          ageTier,
        });
        if (avatarUri) await uploadProfileAvatar(avatarUri);
      } catch {
        setSaveError(t.saveError);
      } finally {
        setSaving(false);
      }
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
              {t.brandTagline}
            </Text>
            <SparkDivider style={{ marginVertical: 24 }} />
            <Text style={[styles.intro, { color: colors.mutedForeground }]}>
              {t.intro}
            </Text>
            <Text style={[styles.label, { color: colors.foreground }]}>
              {t.nameLabel}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t.namePlaceholder}
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
            <Text style={[styles.label, { color: colors.foreground }]}>
              {t.bioLabel}
            </Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder={t.bioPlaceholder}
              placeholderTextColor={colors.mutedForeground}
              maxLength={160}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={[
                styles.input,
                styles.bioInput,
                {
                  color: colors.foreground,
                  borderColor: colors.glassBorder,
                  borderRadius: colors.radius,
                },
              ]}
            />
            <Text style={[styles.hint, styles.bioHint, { color: colors.mutedForeground }]}>
              {t.bioHint}
            </Text>
            <Pressable
              onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ["images"],
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.82,
                });
                if (!result.canceled) setAvatarUri(result.assets[0]?.uri ?? null);
              }}
              style={[styles.photoButton, { borderColor: colors.glassBorder }]}
            >
              <Feather name={avatarUri ? "check" : "camera"} size={18} color={colors.accent} />
              <Text style={[styles.photoButtonText, { color: colors.accent }]}>
                 {avatarUri ? profileCopy.avatarSelected : profileCopy.avatarSelect}
              </Text>
            </Pressable>
            <Text style={[styles.label, { color: colors.foreground }]}>{profileCopy.birthDate}</Text>
            <TextInput
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder={profileCopy.birthPlaceholder}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numbers-and-punctuation"
              style={[styles.input, { color: colors.foreground, borderColor: colors.glassBorder, borderRadius: colors.radius }]}
            />
          </Animated.View>
        )}

        {step === 1 && (
          <StepFrame title={t.archetypeTitle} eyebrow={t.stepOf(2, totalSteps)}>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              {t.archetypeHint}
            </Text>
            {ARCHETYPES.map((a, i) => {
              const active = archetype === a.id;
              const strings = t.archetypes[a.id];
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
                      {strings.tagline.toUpperCase()}
                    </Text>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                      {strings.title}
                    </Text>
                    <Text
                      style={[styles.cardBody, { color: colors.mutedForeground }]}
                    >
                      {strings.description}
                    </Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </StepFrame>
        )}

        {step === 2 && (
          <StepFrame title={t.languageStepTitle} eyebrow={t.stepOf(3, totalSteps)}>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              {t.languageHint}
            </Text>
            {SUPPORTED_LANGUAGES.map((code) => {
              const active = language === code;
              return (
                <Pressable
                  key={code}
                  onPress={() => {
                    setLanguage(code);
                    setPendingLanguage(code);
                  }}
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
                      {NATIVE_LANGUAGE_NAMES[code]}
                    </Text>
                    <Text style={[styles.langLabel, { color: colors.mutedForeground }]}>
                      {t.languageNames[code]}
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

        {step === 3 && (
          <StepFrame title={t.ageTierTitle} eyebrow={t.stepOf(4, totalSteps)}>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              {t.ageTierHint}
            </Text>
            {AGE_TIERS.map((tier) => {
              const active = ageTier === tier.id;
              const strings = t.ageTiers[tier.id];
              return (
                <Pressable
                  key={tier.id}
                  onPress={() => {
                    setAgeTier(tier.id);
                    if (tier.id !== "kinder") setConsent(false);
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
                    {strings.title}
                  </Text>
                  <Text style={[styles.tierRange, { color: colors.accent }]}>
                    {strings.range}
                  </Text>
                  <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
                    {strings.description}
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
                  {t.consentText}
                </Text>
              </Pressable>
            )}
          </StepFrame>
        )}

        {step === 4 && (
          <StepFrame title={t.permissionsTitle} eyebrow={t.stepOf(5, totalSteps)}>
            <PermissionsStep onAllGrantedChange={setPermissionsGranted} />
          </StepFrame>
        )}
      </ScrollView>

      {saveError && (
        <Animated.View
          entering={FadeIn}
          style={[
            styles.errorBox,
            {
              borderColor: colors.destructive,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Feather name="alert-circle" size={18} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {saveError}
          </Text>
        </Animated.View>
      )}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 16, borderTopColor: colors.glassBorder },
        ]}
      >
        {step > 0 && (
          <Pressable onPress={() => setStep((s) => s - 1)} style={styles.backLink}>
            <Text style={[styles.backText, { color: colors.mutedForeground }]}>
              {t.back}
            </Text>
          </Pressable>
        )}
        <PrimaryButton
          label={step === totalSteps - 1 ? t.start : t.next}
          onPress={next}
          disabled={!canAdvance() || saving}
          loading={saving}
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
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 22,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
  },
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
  bioInput: { minHeight: 88 },
  bioHint: { alignSelf: "flex-start", marginBottom: 0, marginTop: 7 },
  photoButton: { alignItems: "center", borderWidth: 1, borderRadius: 12, flexDirection: "row", gap: 8, marginTop: 14, padding: 13 },
  photoButtonText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  stepEyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2 },
  stepTitle: { fontFamily: fonts.titleBold, fontSize: 34, marginTop: 4 },
  hint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginBottom: 18 },
  card: { ...GLAS_3D, borderWidth: 1, padding: 18, marginBottom: 12 },
  cardEyebrow: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5 },
  cardTitle: { fontFamily: fonts.titleBold, fontSize: 22, marginTop: 4 },
  cardBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 6 },
  tierRange: { fontFamily: fonts.mono, fontSize: 12, marginTop: 2 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  langRow: { ...GLAS_3D,
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
  consent: { ...GLAS_3D,
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
