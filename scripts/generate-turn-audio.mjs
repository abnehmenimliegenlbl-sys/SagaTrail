/**
 * Einmaliges Skript: Erzeugt die 18 Navigations-Ansage-MP3s
 * (9 Sprachen × 2 Richtungen) via OpenAI gpt-audio und legt sie
 * in artifacts/mobile/assets/audio/turns/ ab.
 *
 * Ausführen:
 *   node scripts/generate-turn-audio.mjs
 */
import { mkdir, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../artifacts/mobile/assets/audio/turns");

const BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const API_KEY  = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

if (!BASE_URL || !API_KEY) {
  console.error("Fehlende Umgebungsvariablen: AI_INTEGRATIONS_OPENAI_BASE_URL / AI_INTEGRATIONS_OPENAI_API_KEY");
  process.exit(1);
}

/** Ruft gpt-audio über chat.completions auf (wie narrationPacing.ts) */
async function tts(text, voice = "onyx") {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-audio",
      modalities: ["text", "audio"],
      audio: { voice, format: "mp3" },
      messages: [
        { role: "system", content: "You are a text-to-speech assistant. Repeat the user's text exactly, without adding anything." },
        { role: "user",   content: text },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`gpt-audio HTTP ${res.status}: ${body}`);
  }
  const json = await res.json();
  const audioData = json.choices?.[0]?.message?.audio?.data;
  if (!audioData) throw new Error(`Keine audio.data in Antwort: ${JSON.stringify(json).slice(0,300)}`);
  return Buffer.from(audioData, "base64");
}

const CLIPS = [
  // lang,  direction,  text
  ["de",  "links",  "Jetzt links abbiegen!"],
  ["de",  "rechts", "Jetzt rechts abbiegen!"],
  ["gsw", "links",  "Jetzt links abbiege!"],
  ["gsw", "rechts", "Jetzt rechts abbiege!"],
  ["fr",  "links",  "Tournez à gauche!"],
  ["fr",  "rechts", "Tournez à droite!"],
  ["it",  "links",  "Svoltate a sinistra!"],
  ["it",  "rechts", "Svoltate a destra!"],
  ["en",  "links",  "Turn left!"],
  ["en",  "rechts", "Turn right!"],
  ["zh",  "links",  "向左转。"],
  ["zh",  "rechts", "向右转。"],
  ["es",  "links",  "Gire a la izquierda!"],
  ["es",  "rechts", "Gire a la derecha!"],
  ["pt",  "links",  "Vire à esquerda!"],
  ["pt",  "rechts", "Vire à direita!"],
  ["ru",  "links",  "Поверните налево!"],
  ["ru",  "rechts", "Поверните направо!"],
];

await mkdir(OUT_DIR, { recursive: true });

let ok = 0, fail = 0;
for (const [lang, dir, text] of CLIPS) {
  const filename = `${lang}_${dir}.mp3`;
  try {
    console.log(`  Generating ${filename}  "${text}"…`);
    const buf = await tts(text);
    await writeFile(join(OUT_DIR, filename), buf);
    console.log(`  ✓ ${filename}  (${buf.length} bytes)`);
    ok++;
  } catch (err) {
    console.error(`  ✗ ${filename}  ${err.message}`);
    fail++;
  }
}

console.log(`\nFertig: ${ok} OK, ${fail} Fehler`);
if (fail > 0) process.exit(1);
