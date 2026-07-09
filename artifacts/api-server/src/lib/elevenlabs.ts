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
export const DEFAULT_NARRATOR_VOICE_ID = "ErXwobaYiN019PkySvjV";
// Fuer "gsw" ist die Wunschstimme "Heidi factual" (kMdYHZK2wkocJnpZxE08):
// Hochdeutsch mit deutlichem Schweizer Akzent, aus der ElevenLabs
// Community-Bibliothek. Bibliotheks-Stimmen sind per API erst ab einem
// Bezahlplan nutzbar (Gratis-Plan: 402 payment_required) — darum probiert
// synthesizeNarration diese Stimme zuerst und faellt bei einem
// Berechtigungs-/Planfehler automatisch auf die Standardstimme zurueck.
// Sobald der ElevenLabs-Plan Bibliotheks-Stimmen erlaubt, greift die
// Schweizer Stimme ohne Codeaenderung. NARRATOR_VOICE_ID_GSW kann sie
// weiterhin per Env-Variable ueberschreiben.
const GSW_NARRATOR_VOICE_ID =
  process.env.NARRATOR_VOICE_ID_GSW || "kMdYHZK2wkocJnpZxE08";
// Fuer Hochdeutsch (de) eine eigene, vom Auftraggeber ausgewaehlte Stimme.
// Ueberschreibbar per Env-Variable, gleiches Rueckfallprinzip wie bei gsw.
const DE_NARRATOR_VOICE_ID =
  process.env.NARRATOR_VOICE_ID_DE || "g1jpii0iyvtRs8fqXsd1";
const MODEL_ID = "eleven_multilingual_v2";

export function voiceCandidatesForLanguage(language: string | undefined): string[] {
  if (language === "gsw" && GSW_NARRATOR_VOICE_ID !== DEFAULT_NARRATOR_VOICE_ID) {
    return [GSW_NARRATOR_VOICE_ID, DEFAULT_NARRATOR_VOICE_ID];
  }
  if (language === "de" && DE_NARRATOR_VOICE_ID !== DEFAULT_NARRATOR_VOICE_ID) {
    return [DE_NARRATOR_VOICE_ID, DEFAULT_NARRATOR_VOICE_ID];
  }
  return [DEFAULT_NARRATOR_VOICE_ID];
}

// Fehlercodes, bei denen ein Rueckfall auf die Standardstimme sinnvoll ist:
// 402 = Planbeschraenkung (Bibliotheks-Stimme im Gratis-Plan),
// 401/403 = fehlende Berechtigung, 404 = Stimme nicht (mehr) verfuegbar.
const VOICE_FALLBACK_STATUS = new Set([401, 402, 403, 404]);

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

async function requestTts(
  voiceId: string,
  text: string,
  apiKey: string,
): Promise<Buffer> {
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

export interface NarrationResult {
  audio: Buffer;
  // Tatsaechlich verwendete Stimme — bei Rueckfall die Standardstimme.
  voiceId: string;
}

export async function synthesizeNarration(
  text: string,
  language: string | undefined,
  log: Logger,
): Promise<NarrationResult> {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  if (!apiKey) {
    throw new ElevenLabsError("ELEVEN_LABS_API_KEY nicht gesetzt");
  }

  const candidates = voiceCandidatesForLanguage(language);
  let lastError: unknown;
  for (let i = 0; i < candidates.length; i++) {
    const voiceId = candidates[i];
    log.info(
      { chars: text.length, language, voiceId, versuch: i + 1 },
      "ElevenLabs Sprachsynthese startet",
    );
    try {
      const audio = await requestTts(voiceId, text, apiKey);
      return { audio, voiceId };
    } catch (err) {
      lastError = err;
      const status = err instanceof ElevenLabsError ? err.status : undefined;
      const hatFallback = i < candidates.length - 1;
      if (hatFallback && status !== undefined && VOICE_FALLBACK_STATUS.has(status)) {
        // Wunschstimme (z.B. Schweizer Akzent) ist mit dem aktuellen Plan/Key
        // nicht nutzbar — Standardstimme uebernimmt, Narration bleibt hoerbar.
        log.warn(
          { voiceId, status },
          "Stimme nicht verfuegbar, Rueckfall auf Standardstimme",
        );
        continue;
      }
      throw err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new ElevenLabsError("ElevenLabs TTS fehlgeschlagen");
}
