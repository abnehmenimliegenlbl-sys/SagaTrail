import { createHash } from "crypto";
import type { Logger } from "pino";
import { objectStorageClient } from "./objectStorage";
import {
  DEFAULT_NARRATOR_VOICE_ID,
  synthesizeNarration,
  voiceCandidatesForLanguage,
} from "./elevenlabs";

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

export async function getOrCreateNarrationAudio(
  text: string,
  language: string | undefined,
  log: Logger,
): Promise<Buffer> {
  const { bucketName } = parsePrivateDir();
  const bucket = objectStorageClient.bucket(bucketName);

  // Cache-Suche in Wunsch-Reihenfolge der Stimmen: erst die bevorzugte
  // Stimme der Sprache (z.B. Schweizer Akzent fuer gsw), dann der Rueckfall.
  for (const voiceId of voiceCandidatesForLanguage(language)) {
    const hash = hashNarrationText(text, language, voiceId);
    const file = bucket.file(narrationObjectName(hash));
    const [exists] = await file.exists();
    if (exists) {
      log.info({ hash, voiceId }, "Narration-Cache-Treffer");
      const [buffer] = await file.download();
      return buffer;
    }
  }

  const { audio, voiceId } = await synthesizeNarration(text, language, log);
  const hash = hashNarrationText(text, language, voiceId);
  const file = bucket.file(narrationObjectName(hash));
  await file.save(audio, { contentType: "audio/mpeg" });
  log.info({ hash, voiceId, bytes: audio.length }, "Narration erzeugt und gecacht");
  return audio;
}
