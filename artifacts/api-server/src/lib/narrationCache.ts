import { createHash } from "crypto";
import type { Logger } from "pino";
import { objectStorageClient } from "./objectStorage";
import { synthesizeNarration } from "./elevenlabs";

/**
 * Persistenter GCS-Cache fuer ElevenLabs-Audiodateien. Gecacht wird nach
 * SHA-256 des Erzaehltextes: derselbe Text (Sprache ist bereits Teil des
 * Textes) erzeugt denselben Audio-Schluessel, egal von welcher Sage/Route
 * er stammt. Das haelt die ElevenLabs-Kosten (~0.30-0.70 USD/Wanderung)
 * niedrig, da jedes Kapitel pro Sage/Archetyp/Alterstufe/Sprache nur einmal
 * je synthetisiert wird (die Story selbst ist bereits ueber `stories`
 * gecacht, siehe storyGenerator.ts).
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

export function hashNarrationText(text: string, language: string | undefined): string {
  return createHash("sha256")
    .update(`${language ?? "de"}|${text.trim()}`)
    .digest("hex");
}

export async function getOrCreateNarrationAudio(
  text: string,
  language: string | undefined,
  log: Logger,
): Promise<Buffer> {
  const { bucketName } = parsePrivateDir();
  const hash = hashNarrationText(text, language);
  const objectName = narrationObjectName(hash);
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  const [exists] = await file.exists();
  if (exists) {
    log.info({ hash }, "Narration-Cache-Treffer");
    const [buffer] = await file.download();
    return buffer;
  }

  const audio = await synthesizeNarration(text, language, log);
  await file.save(audio, { contentType: "audio/mpeg" });
  log.info({ hash, bytes: audio.length }, "Narration erzeugt und gecacht");
  return audio;
}
