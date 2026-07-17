import { createHash } from "crypto";
import type { Logger } from "pino";
import { objectStorageClient } from "./objectStorage";
import {
  DEFAULT_NARRATOR_VOICE_ID,
  OPENAI_FALLBACK_VOICE_ID,
  synthesizeNarration,
  voiceCandidatesForLanguage,
} from "./elevenlabs";
import { synthesizeOpenAiNarrationWithPacing } from "./narrationPacing";

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

// ---------------------------------------------------------------------------
// In-Memory-Cache (Prozess-lokal)
// ---------------------------------------------------------------------------
// Schnelle Schicht vor GCS: einmal synthetisiert (ElevenLabs ODER OpenAI-
// Fallback) wird der Audio-Buffer im Prozess gehalten. Vorteile:
//   • Kein ElevenLabs-Aufruf, selbst wenn GCS-Write beim ersten Mal scheiterte
//   • Kein GCS-Round-Trip fuer Texte, die im selben Server-Prozess bereits
//     erzeugt wurden (z.B. "Ich verstehe." — wird taeglich dutzendfach angefordert)
//   • Macht das OpenAI-Fallback-Problem unproblematisch: War OpenAI zustaendig,
//     liefert der In-Memory-Cache sofort zurueck, ohne erst ElevenLabs zu probieren
// Max. 50 Eintraege (~50 ×~1.5 MB ≈ ~75 MB) — bei Ueberschreitung wird der
// aelteste Eintrag verdraengt (FIFO). Groessere Werte kaemen nahe an das
// Heap-Limit eines typischen Node-Prozesses.
const IN_MEMORY_MAX = 50;
const inMemoryNarrationCache = new Map<string, Buffer>();

function inMemoryGet(hash: string): Buffer | undefined {
  return inMemoryNarrationCache.get(hash);
}

function inMemorySet(hash: string, audio: Buffer): void {
  if (inMemoryNarrationCache.size >= IN_MEMORY_MAX) {
    const oldestKey = inMemoryNarrationCache.keys().next().value;
    if (oldestKey !== undefined) inMemoryNarrationCache.delete(oldestKey);
  }
  inMemoryNarrationCache.set(hash, audio);
}

// ---------------------------------------------------------------------------

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

// Cache-Versionierung fuer OpenAI-Fallback-Audio. Beim Bumpen werden alle
// alten OpenAI-Narrations-Caches automatisch invalidiert (anderer Hash),
// ohne ElevenLabs-Eintraege zu beruehren. Erhoehen, wenn sich OpenAI-
// Synthesis-Parameter aendern (z.B. Lautstaerke, Tempo, Stimme).
const OPENAI_CACHE_VERSION = "v2";

export function hashNarrationText(
  text: string,
  language: string | undefined,
  voiceId: string = DEFAULT_NARRATOR_VOICE_ID,
): string {
  // Standardstimme = Legacy-Format ohne Voice-Anteil, damit der bestehende
  // Cache-Bestand nicht neu synthetisiert werden muss.
  const voicePart = voiceId === DEFAULT_NARRATOR_VOICE_ID ? "" : `|${voiceId}`;
  // OpenAI-Cache-Buster: verhindert, dass alte OpenAI-Audios (z.B. mit
  // anderer Lautstaerke) nach einem Parameter-Update noch serviert werden.
  // ElevenLabs-Hashes sind davon vollstaendig unberuehrt.
  const openaiVersion = voiceId.startsWith("openai:") ? `|${OPENAI_CACHE_VERSION}` : "";
  return createHash("sha256")
    .update(`${language ?? "de"}|${text.trim()}${voicePart}${openaiVersion}`)
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
  const candidates = [...voiceCandidatesForLanguage(language), OPENAI_FALLBACK_VOICE_ID];
  // In-Memory zuerst pruefen — kein GCS-Round-Trip noetig.
  // Dabei wird die bevorzugte Stimmen-Reihenfolge respektiert: ElevenLabs-
  // Kandidaten kommen vor OpenAI, damit nach einem Plan-Upgrade frisches
  // ElevenLabs-Audio aus dem In-Memory-Cache serviert wird (nicht altes OpenAI).
  for (const voiceId of candidates) {
    const hash = hashNarrationText(text, language, voiceId);
    const mem = inMemoryGet(hash);
    if (mem) {
      log.info({ hash, voiceId }, "Narration-In-Memory-Treffer");
      return mem;
    }
  }
  // GCS-Fallback.
  try {
    for (const voiceId of candidates) {
      const hash = hashNarrationText(text, language, voiceId);
      const file = bucket.file(narrationObjectName(hash));
      const [exists] = await file.exists();
      if (exists) {
        log.info({ hash, voiceId }, "Narration-GCS-Cache-Treffer");
        const [buffer] = await file.download();
        // In-Memory befuellen damit der naechste Aufruf ohne GCS auskommt.
        inMemorySet(hash, buffer);
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
  const hash = hashNarrationText(text, language, voiceId);
  // In-Memory sofort befuellen — gilt auch wenn GCS-Write scheitert,
  // damit dasselbe Audio im selben Prozess-Lauf sofort verfuegbar ist.
  inMemorySet(hash, audio);
  try {
    const file = bucket.file(narrationObjectName(hash));
    await file.save(audio, { contentType: "audio/mpeg" });
    log.info({ hash, voiceId, bytes: audio.length }, "Narration erzeugt und gecacht");
  } catch (err) {
    log.warn({ err }, "Narration-GCS-Schreibzugriff fehlgeschlagen, Audio nur in In-Memory-Cache");
  }
}

export async function getOrCreateNarrationAudio(
  text: string,
  language: string | undefined,
  userId: string,
  log: Logger,
  provider?: "elevenlabs" | "openai",
): Promise<Buffer> {
  const { bucketName } = parsePrivateDir();
  const bucket = objectStorageClient.bucket(bucketName);

  // OpenAI-Direkt-Pfad: Einleitung, POIs, Meilensteine, Uebergaenge,
  // Entscheidungs-Feedback. Kein ElevenLabs, kein Zeichen-Budget-Check
  // (OpenAI laeuft ueber Replit-AI-Integration, kein separates Kontingent).
  if (provider === "openai") {
    const hash = hashNarrationText(text, language, OPENAI_FALLBACK_VOICE_ID);
    // In-Memory zuerst pruefen.
    const memHit = inMemoryGet(hash);
    if (memHit) {
      log.info({ hash }, "OpenAI-Narration-In-Memory-Treffer");
      return memHit;
    }
    const file = bucket.file(narrationObjectName(hash));
    try {
      const [exists] = await file.exists();
      if (exists) {
        log.info({ hash }, "OpenAI-Narration-GCS-Cache-Treffer");
        const [buffer] = await file.download();
        inMemorySet(hash, buffer);
        return buffer;
      }
    } catch (err) {
      log.warn({ err }, "OpenAI-Cache-Lesezugriff fehlgeschlagen, synthetisiere ohne Cache");
    }
    log.info({ chars: text.length, language }, "OpenAI-Narration direkt synthetisieren");
    const audio = await synthesizeOpenAiNarrationWithPacing(text, "onyx", 0.95, log);
    await writeToCache(bucket, text, language, OPENAI_FALLBACK_VOICE_ID, audio, log);
    return audio;
  }

  // ElevenLabs-Pfad (Story-Kapitel): Cache ueber alle Stimm-Kandidaten pruefen.
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
