import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { mkdtemp, rm, writeFile, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { Logger } from "pino";
import { textToSpeech as openaiTextToSpeech } from "@workspace/integrations-openai-ai-server/audio";

// Lautstaerke-Boost fuer die OpenAI-Fallback-Stimme (relativ zu ElevenLabs).
// 1.5 = 50 % lauter. Ueberschreibbar per Env-Variable OPENAI_NARRATION_VOLUME.
const OPENAI_VOLUME_BOOST = parseFloat(process.env.OPENAI_NARRATION_VOLUME ?? "1.5");

/**
 * Zerlegt Erzaehltext in Saetze und erkennt "dramatische" Saetze (Ausrufe,
 * Ellipsen), hinter denen eine laengere Pause wirkungsvoller ist als der
 * normale Satzabstand. Rein textbasierte Heuristik, kein NLP-Modell.
 */
export function splitIntoSentences(text: string): { text: string; dramatic: boolean }[] {
  const matches = text.match(/[^.!?…]+[.!?…]+(\s+|$)/g);
  const parts = (matches && matches.length > 0 ? matches : [text])
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return parts.map((s) => ({
    text: s,
    dramatic: /[!]+$/.test(s) || /…$/.test(s) || /\.\.\.$/.test(s),
  }));
}

async function runFfmpeg(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);
    let stderr = "";
    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    ffmpeg.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-2000)}`));
    });
    ffmpeg.on("error", reject);
  });
}

async function generateSilenceMp3(dir: string, seconds: number): Promise<string> {
  const outPath = join(dir, `silence-${randomUUID()}.mp3`);
  await runFfmpeg([
    "-f", "lavfi",
    "-i", `anullsrc=r=44100:cl=mono`,
    "-t", String(seconds),
    "-q:a", "9",
    "-acodec", "libmp3lame",
    "-y",
    outPath,
  ]);
  return outPath;
}

/**
 * Erzeugt OpenAI-Erzaehlaudio mit Betonungspausen und Tempoanpassung:
 * jeder Satz wird einzeln synthetisiert, dramatische Saetze (Ausrufe,
 * Ellipsen) bekommen eine laengere Pause danach, alles wird
 * zusammengefuehrt und am Ende auf `speed` (z.B. 0.95 = 5% langsamer)
 * abgespielt. Kostet pro Wanderungs-Schnipsel mehrere kleine
 * gpt-audio-Aufrufe statt einem grossen — bewusster Trade-off fuer die
 * hoerbare Dramaturgie.
 */
export async function synthesizeOpenAiNarrationWithPacing(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
  speed: number,
  log: Logger,
): Promise<Buffer> {
  const sentences = splitIntoSentences(text);

  // Ein einzelner Satz (oder Erkennung fehlgeschlagen): kein Concat noetig,
  // nur Tempoanpassung + Lautstaerke.
  if (sentences.length <= 1) {
    const audio = await openaiTextToSpeech(text, voice, "mp3");
    return applyAudioProcessing(audio, speed, OPENAI_VOLUME_BOOST);
  }

  const dir = await mkdtemp(join(tmpdir(), "sagatrail-tts-"));
  try {
    const segmentPaths: string[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const { text: satzText, dramatic } = sentences[i];
      const audio = await openaiTextToSpeech(satzText, voice, "mp3");
      const segPath = join(dir, `seg-${i}-${randomUUID()}.mp3`);
      await writeFile(segPath, audio);
      segmentPaths.push(segPath);

      const istLetzter = i === sentences.length - 1;
      if (!istLetzter) {
        const pauseDauer = dramatic ? 0.9 : 0.25;
        const pausePath = await generateSilenceMp3(dir, pauseDauer);
        segmentPaths.push(pausePath);
      }
    }

    const concatPath = join(dir, `concat-${randomUUID()}.mp3`);
    const inputArgs = segmentPaths.flatMap((p) => ["-i", p]);
    const filterInputs = segmentPaths.map((_, idx) => `[${idx}:a]`).join("");
    const filterComplex = `${filterInputs}concat=n=${segmentPaths.length}:v=0:a=1[out]`;

    await runFfmpeg([
      ...inputArgs,
      "-filter_complex", filterComplex,
      "-map", "[out]",
      "-acodec", "libmp3lame",
      "-y",
      concatPath,
    ]);

    const concatenated = await readFile(concatPath);
    return applyAudioProcessing(concatenated, speed, OPENAI_VOLUME_BOOST);
  } catch (err) {
    log.warn(
      { err },
      "Satzweise Pacing-Synthese fehlgeschlagen, Rueckfall auf einfache TTS ohne Pausen",
    );
    const audio = await openaiTextToSpeech(text, voice, "mp3");
    return applyAudioProcessing(audio, speed, OPENAI_VOLUME_BOOST);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Kombinierter Audio-Postprocessing-Schritt fuer OpenAI-TTS:
 * Tempo (atempo) und Lautstaerke (volume) werden in einem einzigen
 * ffmpeg-Durchlauf angewendet.
 *
 * @param speed      Tempokoeffizient (0.5–2.0); 1.0 = unveraendert
 * @param volumeBoost Lautstaerkefaktor (z. B. 1.5 = 50 % lauter); 1.0 = unveraendert
 */
async function applyAudioProcessing(
  mp3Buffer: Buffer,
  speed: number,
  volumeBoost = 1.0,
): Promise<Buffer> {
  const needsTempo  = Math.abs(speed - 1.0) >= 0.01;
  const needsVolume = Math.abs(volumeBoost - 1.0) >= 0.01;
  if (!needsTempo && !needsVolume) return mp3Buffer;

  const clampedSpeed  = Math.min(2, Math.max(0.5, speed));
  const clampedVolume = Math.min(10, Math.max(0.1, volumeBoost));

  // Filter-Kette: atempo und/oder volume kombiniert.
  const filters: string[] = [];
  if (needsTempo)  filters.push(`atempo=${clampedSpeed}`);
  if (needsVolume) filters.push(`volume=${clampedVolume}`);
  const filterStr = filters.join(",");

  const dir = await mkdtemp(join(tmpdir(), "sagatrail-audio-"));
  const inPath  = join(dir, "in.mp3");
  const outPath = join(dir, "out.mp3");
  try {
    await writeFile(inPath, mp3Buffer);
    await runFfmpeg([
      "-i", inPath,
      "-filter:a", filterStr,
      "-acodec", "libmp3lame",
      "-y",
      outPath,
    ]);
    return await readFile(outPath);
  } catch {
    // ffmpeg nicht verfuegbar — Originalaudio unveraendert zurueckgeben.
    return mp3Buffer;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
