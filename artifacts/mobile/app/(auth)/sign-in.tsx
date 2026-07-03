import { useSSO } from "@clerk/expo";
import { useSignIn } from "@clerk/expo/legacy";
import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
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

WebBrowser.maybeCompleteAuthSession();

const WEB_TOP = 67;

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 24;

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
      } else {
        setError("Anmeldung nicht abgeschlossen. Bitte erneut versuchen.");
      }
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.message ?? "Anmeldung fehlgeschlagen. Bitte prüfen."
      );
    } finally {
      setLoading(false);
    }
  };

  const onGooglePress = useCallback(async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { createdSessionId, setActive: setActiveSSO } = await startSSOFlow(
        { strategy: "oauth_google" }
      );
      if (createdSessionId && setActiveSSO) {
        await setActiveSSO({ session: createdSessionId });
        router.replace("/onboarding");
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? "Google-Anmeldung fehlgeschlagen.");
    } finally {
      setGoogleLoading(false);
    }
  }, [startSSOFlow, router]);

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
            Willkommen zurück
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Melde dich an, um deine Sagen weiterzuerzählen.
          </Text>
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="E-Mail-Adresse"
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
          placeholder="Passwort"
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
          label="Anmelden"
          onPress={onSignInPress}
          loading={loading}
          disabled={!email.trim() || !password || loading}
          style={{ marginTop: 8 }}
        />

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.glassBorder }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
            oder
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.glassBorder }]} />
        </View>

        <Pressable
          onPress={onGooglePress}
          disabled={googleLoading}
          style={[styles.googleButton, { borderColor: colors.glassBorder }]}
        >
          <Feather name="chrome" size={18} color={colors.foreground} />
          <Text style={[styles.googleLabel, { color: colors.foreground }]}>
            Mit Google anmelden
          </Text>
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Noch kein Konto?
          </Text>
          <Link href="/(auth)/sign-up" replace>
            <Text style={[styles.footerLink, { color: colors.accent }]}>
              Registrieren
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
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
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
