/**
 * Clerk Token-Cache und Keychain-Bereinigung.
 *
 * Diese Datei ist bewusst von _layout.tsx getrennt um zirkuläre
 * Imports zu vermeiden (sign-in.tsx → _layout.tsx → sign-in.tsx).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";
import { Platform } from "react-native";
import { tokenCache as originalTokenCache } from "@clerk/expo/token-cache";

// Original Clerk tokenCache — unverändert, kein custom wrapper.
// Eigener wrapper hatte try/catch der saveToken-Fehler verschluckte
// und dadurch errorSignInIncomplete verursachte.
export const clerkTokenCache = originalTokenCache;

// AFTER_FIRST_UNLOCK: identisch mit dem Original-Clerk-Cache
const OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

const FRESH_INSTALL_KEY = "__st_fresh_install_v1__";

/**
 * Fresh-Install-Erkennung: AsyncStorage wird bei Reinstall geleert,
 * Keychain nicht. Falls der Flag fehlt, löschen wir bekannte Clerk-Keys.
 */
export async function clearKeychainOnFreshInstall() {
  try {
    const seen = await AsyncStorage.getItem(FRESH_INSTALL_KEY);
    if (seen) return;

    const knownKeys = [
      "__clerk_client_jwt",
      `clerk-db-jwt-${process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}`,
    ];
    await Promise.all(
      knownKeys.map((k) => SecureStore.deleteItemAsync(k, OPTS).catch(() => {}))
    );
    await AsyncStorage.setItem(FRESH_INSTALL_KEY, "1");
    console.log("[Auth] Fresh install — Clerk-Keychain-Tokens gelöscht");
  } catch {}
}

const HEAL_FLAG = "__st_clerk_healed_at__";

/**
 * Automatische Selbstheilung: wird beim Anzeigen des Login-Screens aufgerufen
 * (User ist dort ohnehin ausgeloggt). Falls noch ein alter Clerk-Client-Token
 * in der Keychain liegt, wird er gelöscht und die App einmal neu geladen,
 * damit Clerk mit sauberem Zustand startet. Max. 1x pro 10 Minuten (kein Loop).
 */
export async function healStaleClerkSession(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const raw = await AsyncStorage.getItem(HEAL_FLAG);
    const last = raw ? Number(raw) : 0;
    if (Number.isFinite(last) && Date.now() - last < 10 * 60 * 1000) return;

    const staleToken = await SecureStore.getItemAsync(
      "__clerk_client_jwt",
      OPTS
    ).catch(() => null);
    if (!staleToken) return; // nichts zu heilen

    await clearAllClerkTokens();
    await AsyncStorage.setItem(HEAL_FLAG, String(Date.now()));
    console.log("[Auth] Alter Clerk-Token entfernt — App wird neu geladen");
    await Updates.reloadAsync().catch(() => {});
  } catch {}
}

/** Löscht alle bekannten Clerk-Tokens (Reset-Button auf Login-Screen). */
export async function clearAllClerkTokens() {
  const knownKeys = [
    "__clerk_client_jwt",
    `clerk-db-jwt-${process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}`,
  ];
  await Promise.all(
    knownKeys.map((k) => SecureStore.deleteItemAsync(k, OPTS).catch(() => {}))
  );
  await AsyncStorage.removeItem(FRESH_INSTALL_KEY).catch(() => {});
}
