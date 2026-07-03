import type { Logger } from "pino";

/**
 * ElevenLabs Text-to-Speech Client fuer die kostenpflichtige, natuerlich
 * klingende Erzaehlstimme (nur fuer Premium-Nutzer:innen). Die kostenlose
 * erste Wanderung nutzt bewusst die on-device Stimme (expo-speech) und ruft
 * diesen Client NIE auf.
 *
 * Schweizerdeutsch (gsw) wird NIE als Dialekt-Text an die TTS geschickt:
 * der Aufrufer muss fuer gsw bereits den Hochdeutsch-Text uebergeben. Die
 * "Schweizer Faerbung" kommt ausschliesslich ueber die Stimmwahl, nicht
 * ueber den Text.
 */

const ELEVEN_LABS_API_BASE = "https://api.elevenlabs.io/v1";

// Eleven Labs "Antoni" (ErXwobaYiN019PkySvjV) via eleven_multilingual_v2:
// ruhige, klare maennliche Erzaehlstimme, gut geeignet fuer atmosphaerische
// Wander-Narration in mehreren Sprachen. Der Account-API-Key hat keine
// voices_read-Berechtigung (Voice-Liste nicht abrufbar); Stimmen-ID ist
// eine oeffentlich bekannte ElevenLabs-Premade-Stimme, die im Test mit
// diesem Key funktioniert.
const DEFAULT_NARRATOR_VOICE_ID = "ErXwobaYiN019PkySvjV";
// Fuer "gsw" wird bewusst dieselbe Stimme mit ggf. ueberschriebener
// Stimmen-ID verwendet, um eine Schweizer Faerbung zu erzielen — der Text
// selbst bleibt Hochdeutsch (siehe Modul-Kommentar oben). Ohne
// voices_read-Zugriff kann keine Stimme aus der Bibliothek kuratiert werden;
// NARRATOR_VOICE_ID_GSW erlaubt es, spaeter eine besser passende
// Schweizer-Stimme per Env-Variable zu setzen, ohne Codeaenderung.
const GSW_NARRATOR_VOICE_ID =
  process.env.NARRATOR_VOICE_ID_GSW || DEFAULT_NARRATOR_VOICE_ID;
const MODEL_ID = "eleven_multilingual_v2";

function voiceIdForLanguage(language: string | undefined): string {
  return language === "gsw" ? GSW_NARRATOR_VOICE_ID : DEFAULT_NARRATOR_VOICE_ID;
}

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

export async function synthesizeNarration(
  text: string,
  language: string | undefined,
  log: Logger,
): Promise<Buffer> {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  if (!apiKey) {
    throw new ElevenLabsError("ELEVEN_LABS_API_KEY nicht gesetzt");
  }

  const voiceId = voiceIdForLanguage(language);
  log.info({ chars: text.length, language, voiceId }, "ElevenLabs Sprachsynthese startet");

  const response = await fetch(
    `${ELEVEN_LABS_API_BASE}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ElevenLabsError(
      `ElevenLabs TTS fehlgeschlagen (${response.status}): ${detail}`,
      response.status,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
