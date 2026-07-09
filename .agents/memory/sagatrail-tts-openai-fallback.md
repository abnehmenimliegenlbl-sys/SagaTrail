---
name: SagaTrail TTS OpenAI-Rueckfall
description: OpenAI dient als letzte Rueckfallstufe, wenn ElevenLabs komplett ausfaellt (z.B. Kontingent = 0); inkl. Onyx-Stimme, Tempo, Pacing
---

Regel: `synthesizeNarration` (elevenlabs.ts) faellt auf OpenAI zurueck, wenn ALLE ElevenLabs-Kandidaten (Wunschstimme + Standardstimme) mit 401/402/403/404 scheitern, oder wenn `ELEVEN_LABS_API_KEY` gar nicht gesetzt ist.
**Why:** Nutzer bat explizit um eine Alternative, nachdem das ElevenLabs-Konto sein Kontingent auf 0 Credits erschoepft hatte. Ohne Rueckfall gab es gar keine Erzaehlstimme mehr.

Die OpenAI-Fallback-Stimme ist "onyx" (nicht "alloy" — auf expliziten Nutzerwunsch geaendert), Tempo 0.95x, und Text wird satzweise synthetisiert mit laengerer Pause (0.9s) hinter "dramatischen" Saetzen (enden auf `!` oder `...`/`…`) statt normaler Pause (0.25s) — siehe `narrationPacing.ts`.
**Why:** gpt-audio (chat-completions) hat keinen nativen Speed- oder SSML-Pause-Parameter; Tempo wird per ffmpeg `atempo`-Filter nachtraeglich angewendet, Pausen per satzweiser Synthese + ffmpeg-Stille-Konkatenation (`concat`-Filter) simuliert.
**How to apply:** Cache-Key traegt den Voice-Identifier `openai:onyx` (`OPENAI_FALLBACK_VOICE_ID` in elevenlabs.ts). Kosten-Trade-off: satzweise Synthese bedeutet mehrere gpt-audio-Aufrufe pro Erzaehlabschnitt statt einem. Bei ffmpeg-Fehlern faellt die Pacing-Funktion selbst auf einfache TTS ohne Pausen zurueck (kein Hard-Fail). Sobald ElevenLabs wieder Guthaben hat, greift automatisch wieder die bessere Stimme ohne Codeaenderung. Kosten laufen ueber die Replit-AI-Integration (kein eigener API-Key noetig).
