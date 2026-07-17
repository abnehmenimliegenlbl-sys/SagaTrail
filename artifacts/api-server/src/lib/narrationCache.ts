import { createHash } from "crypto";
import type { Logger } from "pino";
import { objectStorageClient } from "./objectStorage";
import {
  DEFAULT_NARRATOR_VOICE_ID,
  OPENAI_FALLBACK_VOICE_ID,
  synthesizeNarration,
  voiceCandidatesForLanguage,
} from "./elevenlabs";

/**
 * Wird geworfen, wenn ein Nutzer das tagesaktuelle Zeichen-Budget fuer
 * ElevenLabs-Synthesen erschoepft hat. Der Aufrufer soll dann mit 429
 * antworten und den Client zur Geraetestimme zuruecklenken.
 */
export class NarrationRateLimitError extends Error {
  constructor() {
    super("Tages-Zeichen-Budget fuer KI-Erzaehlstimme erschoepft");
    this.name = "NarrationRateLimitError";
  }
}

// Taeglich zulaessige Zeichen pro Nutzer (inkl. Whitespace/SSML).
// Ueberschreibbar per Env-Variable fuer Tests oder Premium-Erweiterung.
const DAILY_BUDGET = parseInt(process.env.NARRATION_DAILY_CHAR_BUDGET ?? "3000", 10);

interface DayUsage { date: string; usedChars: number }
const userBudget = new Map<string, DayUsage>();

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function checkAndDeductBudget(userId: string, chars: number): void {
  const today = todayUtc();
  let entry = userBudget.get(userId);
  if (!entry || entry.date !== today) {
    entry = { date: today, usedChars: 0 };
    userBudget.set(userId, entry);
  }
  if (entry.usedChars + chars > DAILY_BUDGET) {
    throw new NarrationRateLimitError();
  }
  entry.usedChars += chars;
}

/**
 * Persistenter GCS-Cache fuer ElevenLabs-Audiodateien. Gecacht wird nach
 * SHA-256 des Erzaehltextes: derselbe Text (Sprache ist bereits Teil des
 * Textes) erzeugt denselben Audio-Schluessel, egal von welcher Sage/Route
 * er stammt. Das haelt die ElevenLabs-Kosten (~0.30-0.70 USD/Wanderung)
 * niedrig, da jedes Kapitel pro Sage/Archetyp/Alterstufe/Sprache nur einmal
 * je synthetisiert wird (die Story selbst ist bereits ueber `stories`
 * gecacht, siehe storyGenerator.ts).
 *
 * Der Schluessel ist stimmen-bewusst: Nicht-Standard-Stimmen (z.B. die
 * Schweizer-Akzent-Stimme fuer gsw) haengen ihre Voice-ID an den Hash an.
 * Die Standardstimme behaelt das alte Hash-Format, damit der bestehende
 * Cache-Bestand gueltig bleibt. Beim Lesen werden die Stimmen-Kandidaten
 * in Wunsch-Reihenfolge geprueft; gespeichert wird unter der TATSAECHLICH
 * verwendeten Stimme. So liefert ein Plan-Upgrade bei ElevenLabs sofort
 * frisches Schweizer-Akzent-Audio statt alter Standardstimmen-Dateien.
 */

function parsePrivateDir(): { bucketName: string; prefix: string } {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) {
    throw new Error(
      "PRIVATE_OBJECT_DIR nicht gesetzt. Object Storage wurde nicht provisioniert.",
    );
  }
  const trimmed = dir.startsWith("/") ? dir.slice(1) : dir;
  const parts = trimmed.split("/");
  const bucketName = parts[0];
  const prefix = parts.slice(1).join("/");
  return { bucketName, prefix };
}

function narrationObjectName(hash: string): string {
  const { prefix } = parsePrivateDir();
  const base = prefix ? `${prefix}/narration` : "narration";
  return `${base}/${hash}.mp3`;
}

export function hashNarrationText(
  text: string,
  language: string | undefined,
  voiceId: string = DEFAULT_NARRATOR_VOICE_ID,
): string {
  // Standardstimme = Legacy-Format ohne Voice-Anteil, damit der bestehende
  // Cache-Bestand nicht neu synthetisiert werden muss.
  const voicePart = voiceId === DEFAULT_NARRATOR_VOICE_ID ? "" : `|${voiceId}`;
  return createHash("sha256")
    .update(`${language ?? "de"}|${text.trim()}${voicePart}`)
    .digest("hex");
}

/**
 * Cache-Lesezugriff ist best effort: schlaegt Object Storage fehl (z.B.
 * Sidecar-/Auth-Problem der Umgebung), soll die Erzaehlstimme trotzdem
 * funktionieren, nur eben ungecacht. Vorher liess ein GCS-Fehler die
 * gesamte Anfrage scheitern, was der Nutzerin faelschlich als "KI-
 * Erzaehlstimme nicht verfuegbar (Internet pruefen)" angezeigt wurde,
 * obwohl weder Internet noch ElevenLabs das Problem waren.
 */
async function readFromCache(
  bucket: ReturnType<typeof objectStorageClient.bucket>,
  text: string,
  language: string | undefined,
  log: Logger,
): Promise<Buffer | null> {
  try {
    const candidates = [...voiceCandidatesForLanguage(language), OPENAI_FALLBACK_VOICE_ID];
    for (const voiceId of candidates) {
      const hash = hashNarrationText(text, language, voiceId);
      const file = bucket.file(narrationObjectName(hash));
      const [exists] = await file.exists();
      if (exists) {
        log.info({ hash, voiceId }, "Narration-Cache-Treffer");
        const [buffer] = await file.download();
        return buffer;
      }
    }
  } catch (err) {
    log.warn({ err }, "Narration-Cache-Lesezugriff fehlgeschlagen, synthetisiere ohne Cache");
  }
  return null;
}

async function writeToCache(
  bucket: ReturnType<typeof objectStorageClient.bucket>,
  text: string,
  language: string | undefined,
  voiceId: string,
  audio: Buffer,
  log: Logger,
): Promise<void> {
  try {
    const hash = hashNarrationText(text, language, voiceId);
    const file = bucket.file(narrationObjectName(hash));
    await file.save(audio, { contentType: "audio/mpeg" });
    log.info({ hash, voiceId, bytes: audio.length }, "Narration erzeugt und gecacht");
  } catch (err) {
    log.warn({ err }, "Narration-Cache-Schreibzugriff fehlgeschlagen, Audio bleibt ungecacht");
  }
}

export async function getOrCreateNarrationAudio(
  text: string,
  language: string | undefined,
  userId: string,
  log: Logger,
): Promise<Buffer> {
  const { bucketName } = parsePrivateDir();
  const bucket = objectStorageClient.bucket(bucketName);

  const cached = await readFromCache(bucket, text, language, log);
  if (cached) return cached;

  // Cache-Miss: Zeichen-Budget pruefen, bevor ElevenLabs-Credits verbraucht werden.
  // Cache-Treffer passieren das Budget nicht — sie kosten nichts.
  checkAndDeductBudget(userId, text.length);

  const { audio, voiceId } = await synthesizeNarration(text, language, log);
  await writeToCache(bucket, text, language, voiceId, audio, log);
  return audio;
}

/**
 * Loescht alle gecachten Narrations-Audiodateien aus dem Object Storage.
 * Noetig nach einem ElevenLabs-Plan-Upgrade, damit alte Standard-Voice-Dateien
 * nicht mehr serviert werden und die neu freigeschaltete Swiss-Akzent-Stimme
 * beim naechsten Abruf frisch synthetisiert wird.
 */
export async function clearNarrationCache(log: Logger): Promise<number> {
  const { bucketName, prefix } = parsePrivateDir();
  const bucket = objectStorageClient.bucket(bucketName);
  const narrationPrefix = prefix ? `${prefix}/narration/` : "narration/";
  const [files] = await bucket.getFiles({ prefix: narrationPrefix });
  if (files.length === 0) {
    log.info({ prefix: narrationPrefix }, "Narration-Cache bereits leer");
    return 0;
  }
  await Promise.all(files.map((f) => f.delete().catch(() => {})));
  log.info({ prefix: narrationPrefix, deleted: files.length }, "Narration-Cache geleert");
  return files.length;
}
