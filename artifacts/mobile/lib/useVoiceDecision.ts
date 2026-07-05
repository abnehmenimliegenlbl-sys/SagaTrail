import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

import { matchDecisionOption, VoiceMatchOption } from "./decisionVoiceMatch";
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
 * Der native Spracherkenner beendet eine Session oft schon nach kurzer
 * Stille (v. a. Android). Solange der Entscheidungspunkt noch aktiv ist und
 * keine Option erkannt wurde, wird automatisch neu gestartet, damit "freihaendig
 * zuhoeren" sich fuer die Wandernden ununterbrochen anfuehlt.
 */

const MAX_LISTEN_RESTARTS = 6;

export function useVoiceDecision(
  active: boolean,
  lang: Lang,
  options: VoiceMatchOption[],
  onMatch: (index: number) => void
): { listening: boolean; supported: boolean } {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(Platform.OS !== "web");
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
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Best effort — Erkennung koennte bereits beendet sein.
    }
    setListening(false);
  }, []);

  useEffect(() => {
    if (!active || !supported) {
      stopListening();
      return;
    }

    let cancelled = false;
    restartsRef.current = 0;
    matchedRef.current = false;

    (async () => {
      try {
        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (cancelled) return;
        if (!perm.granted) {
          setSupported(false);
          return;
        }
        ExpoSpeechRecognitionModule.start({
          lang: SPEECH_LOCALE[langRef.current],
          interimResults: false,
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
    const transcript = event.results?.[0]?.transcript;
    if (!transcript) return;
    const index = matchDecisionOption(transcript, langRef.current, optionsRef.current);
    if (index != null) {
      matchedRef.current = true;
      stopListening();
      onMatchRef.current(index);
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
      ExpoSpeechRecognitionModule.start({
        lang: SPEECH_LOCALE[langRef.current],
        interimResults: false,
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
