import { useCallback, useEffect, useRef, useState } from "react";

import { matchDecisionOption, VoiceMatchOption } from "./decisionVoiceMatch";
import { NATIVE_MODULES_AVAILABLE } from "./nativeEnv";
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

const MAX_LISTEN_RESTARTS = 6;

export function useVoiceDecision(
  active: boolean,
  lang: Lang,
  options: VoiceMatchOption[],
  onMatch: (index: number) => void
): { listening: boolean; supported: boolean } {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(
    NATIVE_SPEECH_AVAILABLE && ExpoSpeechRecognitionModule != null
  );
  const restartsRef = useRef(0);
  const matchedRef = useRef(false);
  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const langRef = useRef(lang);
  langRef.current = lang;

  const stopListening = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule?.stop();
    } catch {
      // Best effort — Erkennung koennte bereits beendet sein.
    }
    setListening(false);
  }, []);

  useEffect(() => {
    if (!active || !supported || !ExpoSpeechRecognitionModule) {
      stopListening();
      return;
    }

    let cancelled = false;
    restartsRef.current = 0;
    matchedRef.current = false;

    (async () => {
      try {
        const perm = await ExpoSpeechRecognitionModule!.requestPermissionsAsync();
        if (cancelled) return;
        if (!perm.granted) {
          setSupported(false);
          return;
        }
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
      } catch {
        if (!cancelled) setSupported(false);
      }
    })();

    return () => {
      cancelled = true;
      stopListening();
    };
  }, [active, supported, stopListening]);

  useSpeechRecognitionEvent("result", (event) => {
    if (!active || matchedRef.current) return;
    // Alle verfuegbaren Transkripte pruefen (auch Zwischen-Ergebnisse):
    // ein Treffer reicht aus, um die Entscheidung auszuloesen.
    const transcripts = event.results?.map((r) => r.transcript).filter(Boolean) ?? [];
    for (const transcript of transcripts) {
      const index = matchDecisionOption(transcript, langRef.current, optionsRef.current);
      if (index != null) {
        matchedRef.current = true;
        stopListening();
        onMatchRef.current(index);
        return;
      }
    }
  });

  useSpeechRecognitionEvent("end", () => {
    if (!active || matchedRef.current) {
      setListening(false);
      return;
    }
    if (restartsRef.current >= MAX_LISTEN_RESTARTS) {
      setListening(false);
      return;
    }
    restartsRef.current += 1;
    try {
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
      setSupported(false);
    }
    setListening(false);
  });

  return { listening, supported };
}
