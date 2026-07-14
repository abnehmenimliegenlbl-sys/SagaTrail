import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { mkdtemp, rm, writeFile, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { Logger } from "pino";
import { textToSpeech as openaiTextToSpeech } from "@workspace/integrations-openai-ai-server/audio";

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
  // nur Tempoanpassung.
  if (sentences.length <= 1) {
    const audio = await openaiTextToSpeech(text, voice, "mp3");
    return applyTempo(audio, speed);
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
    return applyTempo(concatenated, speed);
  } catch (err) {
    log.warn(
      { err },
      "Satzweise Pacing-Synthese fehlgeschlagen, Rueckfall auf einfache TTS ohne Pausen",
    );
    const audio = await openaiTextToSpeech(text, voice, "mp3");
    return applyTempo(audio, speed);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function applyTempo(mp3Buffer: Buffer, speed: number): Promise<Buffer> {
  // Bei vernachlaessigbarer Abweichung (< 1 %) direkt zurueckgeben.
  if (Math.abs(speed - 1.0) < 0.01) return mp3Buffer;
  // atempo unterstuetzt nur 0.5-2.0 pro Filterstufe; fuer unsere Werte
  // (~0.95) reicht eine einzelne Stufe.
  const clampedSpeed = Math.min(2, Math.max(0.5, speed));
  const dir = await mkdtemp(join(tmpdir(), "sagatrail-tempo-"));
  const inPath = join(dir, "in.mp3");
  const outPath = join(dir, "out.mp3");
  try {
    await writeFile(inPath, mp3Buffer);
    await runFfmpeg([
      "-i", inPath,
      "-filter:a", `atempo=${clampedSpeed}`,
      "-acodec", "libmp3lame",
      "-y",
      outPath,
    ]);
    return await readFile(outPath);
  } catch {
    // ffmpeg nicht verfuegbar (z.B. Production-Container ohne ffmpeg-Binary) —
    // Originalaudio ohne Tempoaenderung zurueckgeben statt die gesamte
    // Narration mit 502 fehlschlagen zu lassen. Der Unterschied von 0.95x
    // ist kaum wahrnehmbar.
    return mp3Buffer;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
