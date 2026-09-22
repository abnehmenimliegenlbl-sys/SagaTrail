import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { matchDecisionOption, VoiceMatchOption } from "./decisionVoiceMatch";
import { NATIVE_MODULES_AVAILABLE } from "./nativeEnv";
import { readSpeechPermissionWithRetry, isSpeechPermissionGranted } from "./speechPermission";
import { Lang, SPEECH_LOCALE } from "./storyContent";

/**
 * Freihaendige Sprachsteuerung fuer Entscheidungspunkte waehrend der
 * Wanderung: hoert automatisch zu, sobald ein Entscheidungspunkt erscheint —
 * kein Tastendruck noetig. Erkennung braucht native Spracherkennung
 * (expo-speech-recognition) und ist daher NUR in einem Dev-/EAS-Build
 * verfuegbar, nicht in Expo Go (siehe expo-Skill: Hintergrund-Standort hat
 * dieselbe Einschraenkung). Bei fehlender Verfuegbarkeit/Berechtigung faellt
 * die App still auf die bestehenden Antwort-Buttons zurueck — kein Fehler,
 * kein Blockieren der Wanderung.
 *
 * WICHTIG: `expo-speech-recognition` ruft beim Modul-Import intern
 * `requireNativeModule("ExpoSpeechRecognition")` auf, was in Expo Go SOFORT
 * wirft (kein natives Modul vorhanden) — nicht erst beim Aufruf einer
 * Funktion. Ein normaler Top-Level-Import wuerde daher die gesamte
 * `hike/[id]`-Route zum Absturz bringen, sobald sie in Expo Go geladen wird
 * (sichtbar als "missing required default export"). Deshalb wird das Modul
 * hier nur dynamisch per `require()` geladen, und nur dann, wenn wir NICHT
 * in Expo Go laufen.
 *
 * Der native Spracherkenner beendet eine Session oft schon nach kurzer
 * Stille (v. a. Android). Solange der Entscheidungspunkt noch aktiv ist und
 * keine Option erkannt wurde, wird automatisch neu gestartet, damit "freihaendig
 * zuhoeren" sich fuer die Wandernden ununterbrochen anfuehlt.
 */

const NATIVE_SPEECH_AVAILABLE = NATIVE_MODULES_AVAILABLE;

type SpeechModule = typeof import("expo-speech-recognition");

let ExpoSpeechRecognitionModule: SpeechModule["ExpoSpeechRecognitionModule"] | null =
  null;
let useSpeechRecognitionEvent: SpeechModule["useSpeechRecognitionEvent"] = () => {
  // Kein natives Modul verfuegbar (Web oder Expo Go) -- No-op.
};

if (NATIVE_SPEECH_AVAILABLE) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("expo-speech-recognition") as SpeechModule;
    ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
    useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
  } catch {
    // Natives Modul konnte nicht geladen werden -- bleibt bei den Fallbacks.
  }
}

// Grosszuegig: iOS/Android beenden Sessions oft schon nach 1-3 s Stille.
// Der Entscheidungs-Countdown laeuft 30 s — die Neustarts muessen die ganze
// Zeitspanne abdecken, sonst ist das Mikrofon lange vor Ablauf tot.
const MAX_LISTEN_RESTARTS = 40;

function transcriptFingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${value.length}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

type VoiceDecisionDebug = (
  event: string,
  details?: Record<string, unknown>,
) => void;

export function useVoiceDecision(
  active: boolean,
  lang: Lang,
  options: VoiceMatchOption[],
  onMatch: (index: number) => void,
  onDebug?: VoiceDecisionDebug,
): {
  listening: boolean;
  supported: boolean;
  lastTranscript: string | null;
  stopListening: () => Promise<void>;
} {
  const [listening, setListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [supported, setSupported] = useState(
    NATIVE_SPEECH_AVAILABLE && ExpoSpeechRecognitionModule != null
  );
  const [permissionRevision, setPermissionRevision] = useState(0);
  const restartsRef = useRef(0);
  const matchedRef = useRef(false);
  const permissionBlockedRef = useRef(false);
  const listeningRef = useRef(false);
  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;
  const onDebugRef = useRef(onDebug);
  onDebugRef.current = onDebug;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const langRef = useRef(lang);
  langRef.current = lang;
  listeningRef.current = listening;
  const previousActiveRef = useRef<boolean | null>(null);
  const debugSequenceRef = useRef(0);
  const speechSessionRef = useRef(0);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const emitDebug = (
    event: string,
    details: Record<string, unknown> = {},
  ) => {
    onDebugRef.current?.(event, {
      debugSequence: ++debugSequenceRef.current,
      speechSession: speechSessionRef.current,
      listening: listeningRef.current,
      active: activeRef.current,
      ...details,
    });
  };

  useEffect(() => {
    if (previousActiveRef.current !== active) {
      emitDebug("active_changed", {
        active,
        supported,
        listening: listeningRef.current,
        optionCount: optionsRef.current.length,
        lang: langRef.current,
      });
      previousActiveRef.current = active;
    }
  }, [active, supported]);

  useEffect(() => {
    if (!active) return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && !listeningRef.current) {
        setPermissionRevision((value) => value + 1);
      }
    });
    return () => subscription.remove();
  }, [active]);

  const stopListening = useCallback(async () => {
    if (stopPromiseRef.current) return stopPromiseRef.current;
    const session = speechSessionRef.current;
    const stopPromise = (async () => {
      emitDebug("stop_requested", {
        nativeMethod: "ExpoSpeechRecognitionModule.stop",
        stopSession: session,
      });
      try {
        emitDebug("native_stop_called", { stopSession: session });
        ExpoSpeechRecognitionModule?.stop();
      } catch (error) {
        emitDebug("native_stop_failed", {
          stopSession: session,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      setListening(false);
      // `stop()` ist bei expo-speech-recognition nur ein Request. Auf iOS
      // bleibt die PlayAndRecord-Session noch kurz aktiv, bis das native
      // "end"-Event verarbeitet wurde. Die aufrufende Entscheidung darf die
      // Bestaetigung erst danach starten, sonst wird die Audiosession der
      // anderen App weiter unterbrochen bzw. die Bestaetigung leise.
      if (NATIVE_SPEECH_AVAILABLE) {
        // iOS releases the PlayAndRecord session asynchronously after stop().
        // Give it enough time before the next playback starts, including when
        // a button tap closes the decision and its effect cleanup runs in
        // parallel with the confirmation audio.
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
      }
      emitDebug("stop_completed", { stopSession: session });
    })();
    stopPromiseRef.current = stopPromise;
    return stopPromise;
  }, []);

  useEffect(() => {
    if (!active || !supported || !ExpoSpeechRecognitionModule) {
      void stopListening();
      return;
    }

    let cancelled = false;
    speechSessionRef.current += 1;
    const speechSession = speechSessionRef.current;
    const previousStop = stopPromiseRef.current;
    restartsRef.current = 0;
    matchedRef.current = false;
    permissionBlockedRef.current = false;
    setLastTranscript(null);

    (async () => {
      try {
        emitDebug("permission_check_started", {
          lang: langRef.current,
          optionCount: optionsRef.current.length,
          speechSession,
        });
        // Kurze Pause damit laufende fire-and-forget setAudioModeAsync()-
        // Aufrufe (aus speak/didJustFinish) abgeschlossen sind, bevor die
        // Spracherkennung allowsRecording:true setzt. Ohne diese Pause kann
        // ein verspäteter Reset das Mikrofon nach dem Start wieder deaktivieren.
        await new Promise<void>((r) => setTimeout(r, 250));
        if (previousStop) await previousStop;
        if (cancelled) return;
        // Allow cleanup of this new session to create its own stop promise.
        if (stopPromiseRef.current === previousStop) {
          stopPromiseRef.current = null;
        }
        const permissionState = await readSpeechPermissionWithRetry(
          () => ExpoSpeechRecognitionModule!.getPermissionsAsync(),
        );
        emitDebug("permission_check_completed", {
          permissionState,
          speechSession,
        });
        if (cancelled) return;
        if (permissionState === "unknown") {
          setListening(false);
          return;
        }
        if (permissionState === "denied") {
          // The onboarding normally requests this already, but an OTA update
          // or a stale native permission read can leave the decision flow
          // without a confirmed grant. Ask once at the actual listening
          // boundary instead of starting recognition blindly.
          const perm = await ExpoSpeechRecognitionModule!.requestPermissionsAsync();
          if (cancelled) return;
          if (!isSpeechPermissionGranted(perm)) {
            permissionBlockedRef.current = true;
            setListening(false);
            return;
          }
        }
        emitDebug("native_start_called", {
          speechSession,
          nativeMethod: "ExpoSpeechRecognitionModule.start",
          restart: restartsRef.current,
        });
        ExpoSpeechRecognitionModule!.start({
          lang: SPEECH_LOCALE[langRef.current],
          // interimResults: true — Treffer werden schon bei Zwischen-
          // ergebnissen geprueft, nicht erst nach einer langen Sprechpause.
          // Verbessert die Reaktionszeit deutlich (z. B. bei kurzem "Links"
          // oder "Rechts") ohne die Erkennungsgenauigkeit zu senken.
          interimResults: true,
          continuous: true,
        });
        setListening(true);
        emitDebug("recognition_started", {
          lang: SPEECH_LOCALE[langRef.current],
          restart: restartsRef.current,
          speechSession,
        });
      } catch {
        if (!cancelled) {
          permissionBlockedRef.current = true;
          setListening(false);
          emitDebug("recognition_start_failed", {
            speechSession,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      void stopListening();
    };
  }, [active, permissionRevision, supported, stopListening]);

  useSpeechRecognitionEvent("result", (event) => {
    if (!active || matchedRef.current) return;
    // Alle verfuegbaren Transkripte pruefen (auch Zwischen-Ergebnisse):
    // ein Treffer reicht aus, um die Entscheidung auszuloesen.
    const transcripts = event.results?.map((r) => r.transcript).filter(Boolean) ?? [];
    if (transcripts.length > 0) setLastTranscript(transcripts[transcripts.length - 1]);
    for (const transcript of transcripts) {
      const index = matchDecisionOption(transcript, langRef.current, optionsRef.current);
      if (index != null) {
        matchedRef.current = true;
        emitDebug("option_matched", {
            optionIndex: index,
            transcriptLength: transcript.length,
            transcriptCount: transcripts.length,
          transcriptFingerprint: transcriptFingerprint(transcript),
        });
        // Native Recognition und Playback duerfen nicht gleichzeitig um die
        // iOS-Audiosession kaempfen. Erst nach dem kurzen Release-Fenster die
        // Auswahl bestaetigen und die Ack-Ansage starten.
        void stopListening().then(() => {
          onMatchRef.current(index);
        });
        return;
      }
    }
  });

  useSpeechRecognitionEvent("end", () => {
    if (!active || matchedRef.current) {
      setListening(false);
      return;
    }
    if (permissionBlockedRef.current) {
      setListening(false);
      return;
    }
    if (restartsRef.current >= MAX_LISTEN_RESTARTS) {
      setListening(false);
      emitDebug("restart_limit_reached", {
        restartCount: restartsRef.current,
      });
      return;
    }
    restartsRef.current += 1;
    emitDebug("recognition_end_restart", {
      restartCount: restartsRef.current,
    });
    try {
      emitDebug("native_start_called", {
        nativeMethod: "ExpoSpeechRecognitionModule.start",
        restart: restartsRef.current,
      });
      ExpoSpeechRecognitionModule?.start({
        lang: SPEECH_LOCALE[langRef.current],
        interimResults: true,
        continuous: true,
      });
    } catch {
      setListening(false);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      permissionBlockedRef.current = true;
      setListening(false);
      emitDebug("recognition_blocked", {
        error: event.error,
      });
      return;
    }
    emitDebug("recognition_transient_error", {
      error: event.error,
    });
    // Transiente Fehler ("no-speech", "network", "aborted" bei Session-Ende)
    // NICHT als "Zuhoeren beendet" werten: gleich danach feuert "end" und
    // startet die Erkennung neu. setListening(false) wuerde hier den
    // Audio-Session-Reset im Hike-Screen ausloesen (allowsRecording:false)
    // und das Mikrofon mitten im Entscheidungspunkt lahmlegen — genau der
    // Fehler, bei dem die App scheinbar "nicht zuhoert".
  });

  return { listening, supported, lastTranscript, stopListening };
}
