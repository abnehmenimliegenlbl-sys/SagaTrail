---
name: SagaTrail App-Design-Dialoge statt native Alerts
description: Wie native OS-Dialoge (Alert.alert, Permission-Popups) im App-Design ersetzt wurden
---

Alle `Alert.alert(...)`-Aufrufe im Code wurden durch ein eigenes `alert(title, message?, buttons?)`
aus `lib/appAlert.tsx` ersetzt (identische Signatur, daher reiner Import-Tausch pro Callsite).
Implementiert als Modul-Singleton + `AppAlertProvider` (in `_layout.tsx` nahe Root gemountet), der
intern `components/brand/AppModal.tsx` rendert (Frozen-Glass-Look, BlurView + GLAS_3D_STARK, passend
zum restlichen App-Design). So bleibt der Aufruf-Ort unverändert, aber das UI ist konsistent statt
nativ/unstylbar.

Für native Berechtigungen (Standort, Mikrofon, Bewegung, Benachrichtigungen — kein Kamera-Feature
vorhanden) gibt es zusätzlich `components/brand/PermissionModal.tsx` (Priming-Dialog im App-Design,
erklärt WOFÜR die Berechtigung gebraucht wird) + `components/brand/PermissionsStep.tsx` als neuer
Onboarding-Schritt (Karten mit Status-Badge pending/granted/denied). Die echte OS-Anfrage
(`Location.requestForegroundPermissionsAsync`, `ExpoSpeechRecognitionModule.requestPermissionsAsync`,
`Pedometer.requestPermissionsAsync`, `Notifications.requestPermissionsAsync`) wird erst NACH
Bestätigung im gestylten Modal ausgelöst, nie direkt.

**Warum:** Der native "Confirm"-Dialog (Alert.alert) ist auf react-native-web ohnehin ein No-Op
(siehe `rn-web-alert-noop.md`), und OS-Berechtigungsdialoge sind grundsätzlich nicht stylbar — ein
vorgeschalteter App-eigener Dialog erhöht Grant-Raten und wirkt konsistent zum Rest der App.

**Wie anwenden:** Neue Bestätigungs-/Fehlerdialoge immer über `import { alert } from "@/lib/appAlert"`
statt `Alert.alert` aus `react-native`. Neue native Berechtigungsanfragen immer zuerst durch ein
`PermissionModal` primen, bevor die echte `request*PermissionsAsync()`-API aufgerufen wird.
