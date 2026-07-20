import { useSSO } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import { Ionicons } from "@expo/vector-icons";
import { makeRedirectUri } from "expo-auth-session";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import { GoogleIcon } from "@/components/brand/GoogleIcon";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { SparkMountain } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useAuthStrings } from "@/lib/i18n/screens/auth";

WebBrowser.maybeCompleteAuthSession();

const WEB_TOP = 67;

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const t = useAuthStrings();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 24;

  const isRateLimit = (err: any) =>
    err?.status === 429 ||
    /too.many.requests/i.test(err?.errors?.[0]?.message ?? "") ||
    /too.many.requests/i.test(err?.message ?? "");

  const onSignInPress = async () => {
    if (!isLoaded) return;
    setError(null);
    setLoading(true);
    try {
      const attempt = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/onboarding");
      } else if (attempt.status === "needs_first_factor") {
        const result = await signIn.attemptFirstFactor({
          strategy: "password",
          password,
        });
        if (result.status === "complete") {
          await setActive({ session: result.createdSessionId });
          router.replace("/onboarding");
        } else {
          setError(t.errorSignInIncomplete);
        }
      } else if (attempt.status === "needs_second_factor") {
        setError(t.errorSignInIncomplete);
      } else {
        setError(t.errorSignInIncomplete);
      }
    } catch (err: any) {
      setError(
        isRateLimit(err) ? t.errorRateLimit : (err?.errors?.[0]?.message ?? t.errorSignInFailed)
      );
    } finally {
      setLoading(false);
    }
  };

  const redirectUrl = makeRedirectUri();

  const onGooglePress = useCallback(async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive: setActiveSSO } = await startSSOFlow(
        { strategy: "oauth_google", redirectUrl }
      );
      if (createdSessionId && setActiveSSO) {
        await setActiveSSO({ session: createdSessionId });
        router.replace("/onboarding");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? t.errorGoogleFailed);
    } finally {
      setGoogleLoading(false);
    }
  }, [startSSOFlow, router, redirectUrl]);

  const onApplePress = useCallback(async () => {
    setError(null);
    setAppleLoading(true);
    try {
      const { createdSessionId, setActive: setActiveApple } = await startSSOFlow(
        { strategy: "oauth_apple", redirectUrl }
      );
      if (createdSessionId && setActiveApple) {
        await setActiveApple({ session: createdSessionId });
        router.replace("/onboarding");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? t.errorAppleFailed);
    } finally {
      setAppleLoading(false);
    }
  }, [startSSOFlow, router, redirectUrl, t]);

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
            {t.signInTitle}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t.signInSubtitle}
          </Text>
        </View>

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
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={t.passwordPlaceholder}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
          autoComplete="password"
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
          label={t.signInButton}
          onPress={onSignInPress}
          loading={loading}
          disabled={!email.trim() || !password || loading}
          style={{ marginTop: 8 }}
        />

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.glassBorder }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
            {t.or}
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.glassBorder }]} />
        </View>

        {Platform.OS === "ios" && (
          <Pressable
            onPress={onApplePress}
            disabled={appleLoading}
            accessibilityRole="button"
            accessibilityLabel={t.continueWithAppleSignIn}
            style={styles.appleButton}
          >
            <Ionicons name="logo-apple" size={19} color="#FFFFFF" />
            <Text style={styles.appleLabel}>{t.continueWithAppleSignIn}</Text>
          </Pressable>
        )}

        <Pressable
          onPress={onGooglePress}
          disabled={googleLoading}
          accessibilityRole="button"
          accessibilityLabel={t.continueWithGoogleSignIn}
          style={[styles.googleButton, { borderColor: colors.glassBorder, marginTop: 12 }]}
        >
          <GoogleIcon size={18} />
          <Text style={[styles.googleLabel, { color: colors.foreground }]}>
            {t.continueWithGoogleSignIn}
          </Text>
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            {t.noAccountYet}
          </Text>
          <Link href="/(auth)/sign-up" replace>
            <Text style={[styles.footerLink, { color: colors.accent }]}>
              {t.registerLink}
            </Text>
          </Link>
        </View>
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: fonts.body, fontSize: 12 },
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    paddingVertical: 14,
    minHeight: 50,
    backgroundColor: "#000000",
  },
  appleLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: "#FFFFFF" },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    minHeight: 50,
  },
  googleLabel: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 28,
  },
  footerText: { fontFamily: fonts.body, fontSize: 14 },
  footerLink: { fontFamily: fonts.bodyMedium, fontSize: 14 },
});
