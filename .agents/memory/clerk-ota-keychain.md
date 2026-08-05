---
name: Clerk OTA Keychain Login-Block
description: Ursachen und Lösung wenn Login nach OTA-Update nicht funktioniert (iOS Keychain + Clerk Expo)
---

## Root Cause
Nach OTA-Update: `errorSignInIncomplete` weil ein benutzerdefinierter `saveToken` mit `try/catch {}` Fehler verschluckte — Clerk dachte Token wurde gespeichert, war er nicht → Session nicht etabliert.

## Goldene Regel
**Clerk `tokenCache` NIE mit eigenem try/catch wrapper ersetzen.** Original-`tokenCache` von `@clerk/expo/token-cache` verwenden. Eigene Logik (Fresh-Install, Reset) separat daneben, nicht als Wrapper.

## Weitere Erkenntnisse
1. **iOS Keychain überlebt Reinstall** — `AFTER_FIRST_UNLOCK` Einträge bleiben; AsyncStorage wird geleert → Fresh-Install-Erkennung möglich.
2. **Zirkulärer Import** — `sign-in.tsx` darf NIE aus `_layout.tsx` importieren. Auth-Utilities → `lib/clerkAuth.ts`.
3. **`ClerkLoaded` blockiert** — wenn Clerk hängt, rendert `ClerkLoaded` nie. Ersatz: `ClerkGuard` mit `if (!isLoaded) return null`.
4. **Timeout-basierter Token-Clear** — 6s Timeout löscht gültige Tokens bei langsamem Netz → User ausgeloggt. Niemals machen.
5. **EAS Build ohne Zustimmung** — nie triggern; App Store Review = 48h Downtime.

## Aktuelle Lösung (lib/clerkAuth.ts)
- `clerkTokenCache` = direkt re-export von `@clerk/expo/token-cache`
- `clearKeychainOnFreshInstall()` = AsyncStorage-Flag-basiert, löscht bekannte Keys mit `AFTER_FIRST_UNLOCK`
- `clearAllClerkTokens()` = Reset-Button auf Login-Screen

## EIGENTLICHE Root Cause (04.08.2026)
Login nach OTA kaputt, Reinstall "half": `.env.production` im Workspace hatte einen ALTEN Clerk-Publishable-Key (andere Instanz), `eas.json` build-env den richtigen. `eas update` bündelt `.env.production`, `eas build` nutzt `eas.json` → jedes OTA redete mit der falschen Clerk-Instanz → `errorSignInIncomplete` bei jedem Login. Reinstall = altes Embedded-Bundle mit richtigem Key.

**Regel:** Bei jedem Auth-Fehler der NUR nach OTA auftritt: zuerst `EXPO_PUBLIC_*`-Werte zwischen `.env.production` und `eas.json` diffen, bevor irgendein Code angefasst wird.

## Metro-Cache-Falle (04.08.2026)
Nach Korrektur von `.env.production` bundelte `eas update` trotzdem den ALTEN Key: Metro inlinet `EXPO_PUBLIC_*` beim Transform und liefert bei unveränderten Quelldateien gecachte Transforms mit dem alten Wert.
**Regel:** Nach jeder `EXPO_PUBLIC_*`-Änderung `eas update --clear-cache` verwenden, und danach IMMER verifizieren: `strings dist/_expo/static/js/ios/entry-*.hbc | grep -o "pk_test_[A-Za-z0-9]*"` muss den erwarteten Key zeigen. Nie einem Env-Fix trauen, ohne das exportierte Bundle zu prüfen.
