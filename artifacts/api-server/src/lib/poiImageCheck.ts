import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { Logger } from "pino";

/**
 * Prueft per Vision-Modell, ob ein gefundenes Commons/Wikipedia-Bild zu einem
 * POI passt (Task: unpassende POI-Bilder eliminieren — z. B. Lokomotive statt
 * mittelalterliches Refugium, Portrait statt Denkmal, gleichnamiger Ort).
 *
 * Aufruf nur on-demand beim ersten Oeffnen eines POI (getPoiDetail), das
 * Ergebnis haengt am 24h-POI-Detail-Cache — kein Batch, keine Mehrfach-Checks.
 *
 * Fail-open: Bei API-Fehlern (Kontingent, Netz) gilt das Bild als passend —
 * sonst verloere die App bei einem KI-Ausfall saemtliche POI-Bilder.
 */

const MODEL = "claude-sonnet-4-6";

// Eigener kleiner Cache zusaetzlich zum poiDetailCache: verhindert erneute
// Vision-Kosten, wenn derselbe POI nach Ablauf des Detail-Caches (24 h)
// wieder geoeffnet wird und dieselbe Bild-URL gefunden wird.
const CACHE_MAX = 500;
const cache = new Map<string, boolean>();

export async function istPoiBildPassend(
  imageUrl: string,
  name: string,
  kind: string,
  log: Logger,
): Promise<boolean> {
  const key = `${imageUrl}|${name}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  try {
    // Bild serverseitig laden und als Base64 mitschicken — Anthropic kann
    // Wikimedia-URLs nicht zuverlaessig selbst herunterladen ("Unable to
    // download the file").
    const resp = await fetch(imageUrl, {
      headers: { "User-Agent": "SagaTrail/1.0 (poi-image-check)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) throw new Error(`Bild-Download-Status ${resp.status}`);
    const contentType = (resp.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
    const erlaubt = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
    const mediaType = (erlaubt as readonly string[]).includes(contentType)
      ? (contentType as (typeof erlaubt)[number])
      : "image/jpeg";
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length > 4 * 1024 * 1024) throw new Error(`Bild zu gross (${buf.length} B)`);

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: buf.toString("base64") } },
            {
              type: "text",
              text:
                `Dieses Foto soll einen Point of Interest in der Schweiz bebildern: ` +
                `"${name}" (Typ: ${kind || "unbekannt"}). ` +
                `Passt das Foto inhaltlich plausibel zu diesem Ort/Objekt? ` +
                `Unpassend sind z. B. Fahrzeuge/Zuege statt Bauwerken, Personenportraits ` +
                `statt Orten, Innenaufnahmen voellig anderer Objekte oder offensichtlich ` +
                `themenfremde Motive. Landschafts-/Gebaeudefotos, die zum Typ passen, ` +
                `gelten als passend, auch wenn das exakte Objekt nicht sicher erkennbar ist. ` +
                `Antworte NUR mit JA oder NEIN.`,
            },
          ],
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const antwort = (textBlock && textBlock.type === "text" ? textBlock.text : "").trim().toUpperCase();
    // Nur ein klares NEIN verwirft das Bild — alles andere fail-open.
    const passend = !antwort.startsWith("NEIN");
    if (cache.size >= CACHE_MAX) {
      const k = cache.keys().next().value;
      if (k !== undefined) cache.delete(k);
    }
    cache.set(key, passend);
    if (!passend) log.info({ name, imageUrl }, "POI-Bild per KI als unpassend verworfen");
    return passend;
  } catch (err) {
    log.warn({ name, err }, "POI-Bild-Check fehlgeschlagen — Bild wird behalten (fail-open)");
    return true;
  }
}
