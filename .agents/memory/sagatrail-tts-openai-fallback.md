---
name: SagaTrail TTS OpenAI-Rueckfall
description: OpenAI dient als letzte Rueckfallstufe, wenn ElevenLabs komplett ausfaellt (z.B. Kontingent = 0)
---

Regel: `synthesizeNarration` (elevenlabs.ts) faellt auf OpenAI (`gpt-audio` ueber Replit-AI-Integration, Stimme "alloy") zurueck, wenn ALLE ElevenLabs-Kandidaten (Wunschstimme + Standardstimme) mit 401/402/403/404 scheitern, oder wenn `ELEVEN_LABS_API_KEY` gar nicht gesetzt ist.
**Why:** Nutzer bat explizit um eine Alternative, nachdem das ElevenLabs-Konto sein Kontingent auf 0 Credits erschoepft hatte (beide Stimmen, Wunsch- UND Standardstimme, scheiterten mit quota_exceeded). Ohne Rueckfall gab es gar keine Erzaehlstimme mehr.
**How to apply:** Cache-Key traegt den Voice-Identifier `openai:alloy` (siehe `OPENAI_FALLBACK_VOICE_ID` in elevenlabs.ts), damit alte ElevenLabs-Audiodateien nicht mit OpenAI-Audio verwechselt werden; sobald ElevenLabs wieder Guthaben hat, greift automatisch wieder die bessere Stimme ohne Codeaenderung. OpenAI-Stimme hat KEINEN Schweizer Akzent (neutral) — das ist ein bewusster Kompromiss, kein Bug. Kosten laufen ueber die Replit-AI-Integration (kein eigener API-Key noetig).
