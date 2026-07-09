import type { Logger } from "pino";
import { synthesizeOpenAiNarrationWithPacing, splitIntoSentences } from "./narrationPacing";

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
 *
 * Wenn ELEVEN_LABS_API_KEY fehlt oder ALLE ElevenLabs-Stimmen scheitern
 * (z.B. Kontingent auf 0, Konto-Sperre), springt als letzte Stufe OpenAI
 * (gpt-audio ueber die Replit-AI-Integration, keine eigene Rechnung) ein.
 * Klingt neutraler/ohne Schweizer Akzent, haelt die Erzaehlung aber
 * hoerbar statt komplett auszufallen.
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

// Letzte Rueckfallstufe, wenn ElevenLabs komplett ausfaellt (z.B. Kontingent
// erschoepft). Kein echtes ElevenLabs-Voice-ID-Format, dient hier als
// eindeutiger Cache-Schluessel-Anteil (siehe narrationCache.ts).
// "onyx" = tiefere, ruhige maennliche OpenAI-Stimme; 0.95x Tempo und
// verlaengerte Pausen hinter dramatischen Saetzen sollen den fehlenden
// ElevenLabs-Feinschliff etwas kompensieren.
export const OPENAI_FALLBACK_VOICE_ID = "openai:onyx";
const OPENAI_FALLBACK_SPEED = 0.95;

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

// Fuegt <break/>-SSML-Tags zwischen Saetzen ein, analog zur OpenAI-Pacing-
// Logik (narrationPacing.ts): dramatische Saetze (Ausrufe, Ellipsen)
// bekommen eine laengere Pause als normale Satzuebergaenge. ElevenLabs'
// eleven_multilingual_v2 unterstuetzt <break time="Xs" />-Tags direkt im
// Text.
function mitPausenAnreichern(text: string): string {
  const saetze = splitIntoSentences(text);
  if (saetze.length <= 1) return text;
  return saetze
    .map(({ text: satzText, dramatic }, i) => {
      const istLetzter = i === saetze.length - 1;
      const pause = istLetzter ? "" : dramatic ? ' <break time="0.9s" />' : ' <break time="0.25s" />';
      return satzText + pause;
    })
    .join(" ");
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
        text: mitPausenAnreichern(text),
        model_id: MODEL_ID,
        voice_settings: {
          // Leicht hochgeschraubt (0.5 -> 0.65) fuer eine ruhigere, weniger
          // schwankende Stimme -- auf Nutzerwunsch.
          stability: 0.65,
          similarity_boost: 0.75,
          // 0.95x Tempo, analog zum OpenAI-Rueckfall.
          speed: 0.95,
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

async function requestOpenAiFallback(text: string, log: Logger): Promise<Buffer> {
  log.warn(
    { chars: text.length },
    "ElevenLabs komplett nicht verfuegbar, Rueckfall auf OpenAI-Stimme",
  );
  return synthesizeOpenAiNarrationWithPacing(text, "onyx", OPENAI_FALLBACK_SPEED, log);
}

export async function synthesizeNarration(
  text: string,
  language: string | undefined,
  log: Logger,
): Promise<NarrationResult> {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;

  if (apiKey) {
    const candidates = voiceCandidatesForLanguage(language);
    let lastStatus: number | undefined;
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
        lastStatus = status;
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
        break;
      }
    }
    // Auch die Standardstimme ist gescheitert (z.B. Kontingent = 0, Status
    // 401/402) — statt die Erzaehlung komplett ausfallen zu lassen, springt
    // OpenAI als letzte Stufe ein.
    if (lastStatus !== undefined && VOICE_FALLBACK_STATUS.has(lastStatus)) {
      try {
        const audio = await requestOpenAiFallback(text, log);
        return { audio, voiceId: OPENAI_FALLBACK_VOICE_ID };
      } catch (openaiErr) {
        log.error({ err: openaiErr }, "OpenAI-Rueckfall ebenfalls fehlgeschlagen");
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new ElevenLabsError("ElevenLabs TTS fehlgeschlagen");
  }

  // Kein ElevenLabs-Key gesetzt: direkt OpenAI verwenden.
  const audio = await requestOpenAiFallback(text, log);
  return { audio, voiceId: OPENAI_FALLBACK_VOICE_ID };
}
