import { useSignIn } from "@clerk/expo/legacy";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { SparkMountain } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useAuthStrings } from "@/lib/i18n/screens/auth";

const WEB_TOP = 67;

type Step = "email" | "code";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const t = useAuthStrings();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 24;

  const onSendCode = async () => {
    if (!isLoaded || !email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim(),
      });
      setStep("code");
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? t.errorResetFailed);
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async () => {
    if (!isLoaded || !code.trim() || !newPassword) return;
    setError(null);
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password: newPassword,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setDone(true);
        setTimeout(() => router.replace("/onboarding"), 1500);
      } else {
        setError(t.errorResetFailed);
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? t.errorResetFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Background deep>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 24,
          paddingBottom: 60,
          flexGrow: 1,
          justifyContent: "center",
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <SparkMountain size={56} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            {t.forgotPasswordTitle}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t.forgotPasswordSubtitle}
          </Text>
        </View>

        {done ? (
          <Text style={[styles.success, { color: colors.accent }]}>
            {t.forgotPasswordSuccess}
          </Text>
        ) : step === "email" ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t.emailPlaceholder}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={[
                styles.input,
                { color: colors.foreground, borderColor: colors.glassBorder },
              ]}
            />
            {error && (
              <Text style={[styles.error, { color: colors.destructive }]}>
                {error}
              </Text>
            )}
            <PrimaryButton
              label={t.forgotPasswordButton}
              onPress={onSendCode}
              loading={loading}
              disabled={!email.trim() || loading}
              style={{ marginTop: 8 }}
            />
          </>
        ) : (
          <>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder={t.forgotPasswordCodePlaceholder}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="number-pad"
              style={[
                styles.input,
                { color: colors.foreground, borderColor: colors.glassBorder },
              ]}
            />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={t.forgotPasswordNewPassword}
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              autoComplete="new-password"
              style={[
                styles.input,
                { color: colors.foreground, borderColor: colors.glassBorder },
              ]}
            />
            {error && (
              <Text style={[styles.error, { color: colors.destructive }]}>
                {error}
              </Text>
            )}
            <PrimaryButton
              label={t.verifyButton}
              onPress={onResetPassword}
              loading={loading}
              disabled={!code.trim() || !newPassword || loading}
              style={{ marginTop: 8 }}
            />
          </>
        )}

        <Pressable
          onPress={() => router.back()}
          style={styles.backRow}
          accessibilityRole="button"
        >
          <Text style={[styles.backLink, { color: colors.accent }]}>
            {t.forgotPasswordBackToLogin}
          </Text>
        </Pressable>
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginBottom: 32, gap: 10 },
  title: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 8 },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 12,
  },
  error: { fontFamily: fonts.body, fontSize: 13, marginBottom: 8 },
  success: { fontFamily: fonts.bodyMedium, fontSize: 16, textAlign: "center", marginBottom: 16 },
  backRow: { alignItems: "center", marginTop: 24 },
  backLink: { fontFamily: fonts.bodyMedium, fontSize: 14 },
});
