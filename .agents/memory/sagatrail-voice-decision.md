---
name: SagaTrail hands-free voice decisions
description: How live-hike perception decisions are answered by speech instead of a button tap, and why it degrades gracefully.
---

Live-hike decision points can be answered by speaking (no tap required), using
`expo-speech-recognition` (community native module, not expo-speech which is
TTS-only). This joins background-audio/GPS as another native feature that
needs a dev/EAS build and does **not** work in Expo Go or web.

**Why:** the app's whole premise is being handsfree while hiking — a button
tap to answer a decision defeated that, even though narration itself was
already handsfree via TTS.

**How to apply:**
- Recognition auto-starts only once the question+options have finished being
  read aloud (`speaking === false`), so the app's own narration doesn't talk
  over the microphone.
- Matching (`lib/decisionVoiceMatch.ts`) tries spoken ordinal words first
  ("eins/one/un/uno/一" etc., per language) before falling back to keyword
  overlap with the option label/archetypeHint — ties or zero matches return
  `null` and the app keeps listening rather than guessing.
- Availability is feature-detected per session (permission denial or a
  native-module load failure just turns `supported` off); tap buttons remain
  visible and functional at all times as the permanent fallback, so this is
  never a hard requirement to progress the hike.

**Pitfall (fixed 2026-07-09):** `ExpoSpeechRecognitionModule.js` calls
`requireNativeModule("ExpoSpeechRecognition")` at module top level, which
throws IMMEDIATELY on import in Expo Go — not just when a function is called.
A plain top-level `import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent }
from "expo-speech-recognition"` crashed the *entire route* that imported it
(`hike/[id].tsx`), breaking hiking/group-join completely in Expo Go —
surfaced as "Route is missing the required default export" + "Cannot find
native module", easily misdiagnosed as an unrelated feature bug (e.g. a
"join session" button doing nothing). Fix: detect Expo Go via
`expo-constants`'s `Constants.executionEnvironment === ExecutionEnvironment.StoreClient`
(not just `Platform.OS`, since Expo Go is still ios/android), and only
`require()` the native-module package when NOT in Expo Go and NOT web; keep a
no-op fallback for the hook itself so call order stays stable across renders.
Apply the same guard pattern to any Expo native module lacking a web/Expo-Go
JS fallback that's imported from a route file.

**Pitfall (fixed 2026-07-31):** "Timer läuft ab, 'zwei' wird ignoriert" — zwei gleichzeitige Bugs:
(1) Race-Condition Audio-Session: `speak/didJustFinish` setzt `Audio.setAudioModeAsync({allowsRecordingIOS:false})` fire-and-forget, NACHDEM `setSpeaking(false)` React-State-Update getriggert wurde. Das Re-Render startet sofort die Spracherkennung (useVoiceDecision-Effekt), aber der verzögerte Audio-Reset schreibt danach noch `allowsRecordingIOS:false` und tötet das Mikrofon. Fix: (a) `awaitingDecisionRef` als Ref-Spiegel auf `awaitingDecision`; (b) Audio-Reset in "Queue leer"-Pfad überspringen wenn `awaitingDecisionRef.current`; (c) 250ms Startdelay in `useVoiceDecision` (Belt+Suspenders).
(2) 50%-Meilenstein feuert genau bei Etappe 3 (Halbzeit = Entscheidungspunkt): `speaking=true` → Countdown+Erkennung stoppen → Audio-Session-Reset → Neustart → Mikrofon kaputt. Fix: GPS-getriggerte Ansagen (Meilenstein, Wegoberfläche, Partner) checken `awaitingDecisionRef.current` und überspringen nur den `speak()`-Aufruf (Watch-Mitteilung bleibt).
Scope: `app/hike/[id].tsx` (awaitingDecisionRef + alle speakRef.current-Calls in GPS-Effekten); `lib/useVoiceDecision.ts` (250ms Delay).

**Pitfall (fixed 2026-07-23):** "App hoert nicht zu" bei Entscheidungspunkten:
der Audio-Session-Reset-Effekt im Hike-Screen setzte `allowsRecordingIOS:false`
sobald `listening` kurz false flackerte — also zwischen den automatischen
Erkennungs-Neustarts, mitten im aktiven Entscheidungspunkt → Mikrofon tot,
Countdown lief ab, Timeout-Default wurde gewaehlt. Drei Regeln: (1) Session-Reset
nur wenn der Entscheidungspunkt NICHT mehr aktiv ist; (2) transiente
Recognizer-Fehler (no-speech etc.) duerfen `listening` nicht auf false setzen —
nur echte Permission-Fehler; (3) Restart-Limit muss das ganze Countdown-Fenster
abdecken (iOS beendet Sessions nach 1-3s Stille). Zudem: letztes Transkript in
der UI anzeigen, sonst ist der Fehler fuer Nutzende unsichtbar.

**Pitfall (fixed 2026-07-23):** Ordinal-Matching normalisierte nur das
Transkript (Akzente weg), nicht die Vergleichswortliste — Umlaut-/Akzent-
Ordinale (gsw "zwöiti", fr "première", pt "três") matchten deshalb NIE.
Beide Seiten durch dieselbe normalize() schicken. Matcher-Logik laesst sich
ohne Test-Framework verifizieren: Datei mit gestubbtem Lang-Typ nach /tmp
kopieren + `node --experimental-strip-types`.
