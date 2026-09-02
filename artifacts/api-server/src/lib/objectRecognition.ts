import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { Logger } from "pino";

export interface ObjectRecognitionInput {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  lat?: number | null;
  lng?: number | null;
  heading?: number | null;
  language: string;
  nearbyContext?: string | null;
}

export interface ObjectRecognitionCandidate {
  id: string;
  title: string;
  category: string;
  confidence: number;
  description: string;
  whyLikely: string;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  sourceExtract?: string | null;
  sourceImage?: string | null;
}

export interface ObjectRecognitionResult {
  analysisNote: string;
  candidates: ObjectRecognitionCandidate[];
}

const MODEL = "claude-sonnet-4-6";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_CANDIDATES = 3;
const ALLOWED_OBJECT_TYPES = new Set([
  "mountain",
  "landform",
  "geology",
  "plant",
  "animal",
  "building",
  "landmark",
  "trail-sign",
  "trail-infrastructure",
  "water-feature",
]);

const LANGUAGE_LABEL: Record<string, string> = {
  de: "Deutsch",
  gsw: "Deutsch (Schweizer Kontext, kein Dialekt nötig)",
  fr: "Französisch",
  it: "Italienisch",
  en: "Englisch",
  zh: "Mandarin-Chinesisch",
  es: "Spanisch",
  pt: "Portugiesisch",
};

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

  const first = trimmed.indexOf("{");
  if (first === -1) return trimmed;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = first; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) return trimmed.slice(first, i + 1);
    }
  }
  return trimmed;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function isAllowedCandidate(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const objectType = (value as Record<string, unknown>).objectType;
  return typeof objectType === "string" && ALLOWED_OBJECT_TYPES.has(objectType);
}

function normalizeCandidate(value: unknown, index: number): ObjectRecognitionCandidate | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const title = text(candidate.title);
  if (!title) return null;

  const confidenceRaw =
    typeof candidate.confidence === "number" ? candidate.confidence : 0.35;
  const confidence = Math.max(0, Math.min(1, confidenceRaw));
  return {
    id: `object-${index + 1}`,
    title,
    category: text(candidate.category, "Objekt"),
    confidence,
    description: text(candidate.description, "Keine verlässliche Beschreibung verfügbar."),
    whyLikely: text(candidate.whyLikely, "Das Bild enthält Hinweise auf dieses Objekt."),
    sourceUrl: null,
    sourceTitle: null,
    sourceExtract: null,
    sourceImage: null,
  };
}

function wikiLanguage(language: string): string {
  return language === "gsw" ? "de" : LANGUAGE_LABEL[language] ? language : "de";
}

interface WikipediaPage {
  title?: string;
  extract?: string;
  fullurl?: string;
  thumbnail?: { source?: string };
}

async function lookupWikipedia(
  query: string,
  language: string,
  lat?: number | null,
  lng?: number | null,
): Promise<Pick<ObjectRecognitionCandidate, "sourceUrl" | "sourceTitle" | "sourceExtract" | "sourceImage">> {
  const lang = wikiLanguage(language);
  const base = `https://${lang}.wikipedia.org/w/api.php`;
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrlimit: "3",
    prop: "extracts|info|pageimages",
    exintro: "1",
    explaintext: "1",
    exchars: "480",
    inprop: "url",
    piprop: "thumbnail",
    pithumbsize: "640",
    format: "json",
    origin: "*",
  });
  const response = await fetch(`${base}?${params}`, {
    headers: { "User-Agent": "SagaTrail/1.0 (object-recognition)" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return {};
  const payload = (await response.json()) as {
    query?: { pages?: Record<string, WikipediaPage> };
  };
  const page = Object.values(payload.query?.pages ?? {})[0];
  if (!page?.title) return {};

  // A nearby geo lookup is an additional signal, not a requirement: plants,
  // animals and unnamed trail objects usually have no local Wikipedia page.
  // The coordinates are deliberately not sent to Wikimedia when absent.
  void lat;
  void lng;
  return {
    sourceUrl:
      page.fullurl ??
      `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
    sourceTitle: page.title,
    sourceExtract: page.extract?.trim() || null,
    sourceImage: page.thumbnail?.source ?? null,
  };
}

function buildPrompt(input: ObjectRecognitionInput): string {
  const location =
    input.lat != null && input.lng != null
      ? `GPS ungefaehr ${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}.`
      : "Kein GPS-Standort verfuegbar.";
  const direction =
    input.heading != null
      ? `Blickrichtung ungefaehr ${Math.round(input.heading)} Grad (0 = Norden).`
      : "Keine Blickrichtung verfuegbar.";
  const context = input.nearbyContext?.trim()
    ? `OSM-Kontext aus der Umgebung (nur als Hinweis, nicht als Beweis): ${input.nearbyContext.trim()}`
    : "Kein kuratierter OSM-Kontext verfuegbar.";

  return [
    "Du bist eine vorsichtige Bildanalyse fuer eine Schweizer Wander-App.",
    "Analysiere das Foto und nenne hoechstens drei moegliche sichtbare Objekte, die fuer Wandernde oder die Landschaft relevant sind.",
    "Erlaubt sind ausschliesslich: Berge/Gipfel, markante Landschafts- oder geologische Formen, Pflanzen, Tiere, Bauwerke/Sehenswuerdigkeiten, Wegzeichen, Wanderinfrastruktur oder Gewaesser.",
    "Alltagsgegenstaende und beliebiger anderer Unsinn sind auszuschliessen, insbesondere Rucksaecke, Schuhe, Kleidung, Flaschen, Essen, Fahrzeuge, technische Geraete und normale Gebrauchsgegenstaende. Wenn kein erlaubtes Objekt sichtbar ist, gib candidates = [].",
    "Jeder Kandidat muss objectType exakt als einen dieser Werte angeben: mountain, landform, geology, plant, animal, building, landmark, trail-sign, trail-infrastructure oder water-feature. Es gibt keinen Wert fuer sonstige Objekte.",
    "Personen, Gesichter und Identitaeten duerfen NICHT erkannt oder beschrieben werden. Wenn das Bild primaer Personen/Gesichter zeigt, gib ein leeres candidates-Array zurueck.",
    "Behaupte keine sichere Identitaet. Nutze Unsicherheit und gib nur Kandidaten zurueck, die visuell plausibel sind.",
    "GPS, Blickrichtung und OSM-Kontext sind nur Zusatzhinweise. Sie duerfen niemals eine unpassende visuelle Erkennung erzwingen.",
    `Antworte in ${LANGUAGE_LABEL[input.language] ?? "Deutsch"}.`,
    location,
    direction,
    context,
    "",
    "Antworte AUSSCHLIESSLICH als JSON ohne Markdown in genau dieser Form:",
    '{"analysisNote":"kurzer Hinweis zur Sicherheit der Analyse","candidates":[{"objectType":"mountain","title":"Name oder sachliche Bezeichnung","category":"lokalisierte Kategorie","confidence":0.0,"description":"vorsichtige Beschreibung","whyLikely":"sichtbarer Grund","searchQuery":"kurzer Suchbegriff"}]}',
    "confidence ist eine Zahl zwischen 0 und 1. Wenn kein plausibler Kandidat erkennbar ist, candidates = [].",
  ].join("\n");
}

export async function recognizeObject(
  input: ObjectRecognitionInput,
  log: Logger,
): Promise<ObjectRecognitionResult> {
  let imageBytes: number;
  try {
    imageBytes = Buffer.from(input.imageBase64, "base64").byteLength;
  } catch {
    throw new Error("Bild konnte nicht dekodiert werden");
  }
  if (imageBytes === 0 || imageBytes > MAX_IMAGE_BYTES) {
    throw new Error("Bild ist leer oder zu gross");
  }

  log.info({ imageBytes, language: input.language }, "Objekterkennung startet");
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1_200,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: input.mediaType,
              data: input.imageBase64,
            },
          },
          { type: "text", text: buildPrompt(input) },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Analyseantwort ohne Textinhalt");
  }

  const parsed = JSON.parse(extractJson(textBlock.text)) as {
    analysisNote?: unknown;
    candidates?: unknown;
  };
  const rawCandidates = Array.isArray(parsed.candidates)
    ? parsed.candidates.filter(isAllowedCandidate)
    : [];
  const candidates = rawCandidates
    .slice(0, MAX_CANDIDATES)
    .map((candidate, index) => normalizeCandidate(candidate, index))
    .filter((candidate): candidate is ObjectRecognitionCandidate => candidate !== null);

  const enriched = await Promise.all(
    candidates.map(async (candidate, index) => {
      try {
        const raw = rawCandidates[index];
        const searchQuery =
          raw && typeof raw === "object" && typeof (raw as Record<string, unknown>).searchQuery === "string"
            ? ((raw as Record<string, unknown>).searchQuery as string).trim()
            : candidate.title;
        if (!searchQuery) return candidate;
        return { ...candidate, ...(await lookupWikipedia(searchQuery, input.language, input.lat, input.lng)) };
      } catch (err) {
        log.warn({ err, title: candidate.title }, "Wikipedia-Abgleich fuer Objekt fehlgeschlagen");
        return candidate;
      }
    }),
  );

  return {
    analysisNote: text(
      parsed.analysisNote,
      candidates.length > 0
        ? "Das sind wahrscheinliche Kandidaten, keine sichere Identifikation."
        : "Auf diesem Foto liess sich kein Objekt verlaesslich eingrenzen.",
    ),
    candidates: enriched,
  };
}