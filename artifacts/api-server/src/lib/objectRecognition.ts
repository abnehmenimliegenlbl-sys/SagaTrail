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
const PLANTNET_API_URL = "https://my-api.plantnet.org/v2/identify/all";
const PLANTNET_TIMEOUT_MS = 12_000;
const ANIMAL_DETECT_API_URL = "https://api.animaldetect.com/v1/detect";
const ANIMAL_DETECT_TIMEOUT_MS = 15_000;
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

interface PlantNetSpecies {
  scientificName?: unknown;
  scientificNameWithoutAuthor?: unknown;
  commonNames?: unknown;
}

interface PlantNetResult {
  score?: unknown;
  species?: PlantNetSpecies;
}

interface PlantNetResponse {
  bestMatch?: unknown;
  results?: unknown;
  predictedOrgans?: unknown;
  remainingIdentificationRequests?: unknown;
}

interface AnimalTaxonomy {
  id?: unknown;
  class?: unknown;
  order?: unknown;
  family?: unknown;
  genus?: unknown;
  species?: unknown;
}

interface AnimalAnnotation {
  score?: unknown;
  label?: unknown;
  taxonomy?: AnimalTaxonomy;
}

interface AnimalDetectResponse {
  annotations?: unknown;
}

interface AnimalMatch {
  label: string;
  scientificName: string;
  confidence: number;
  count: number;
}

function plantNetLanguage(language: string): string {
  const normalized = language === "gsw" ? "de" : language;
  return new Set(["de", "en", "fr", "it", "es", "pt", "zh"]).has(normalized)
    ? normalized
    : "en";
}

function multipartPart(boundary: string, name: string, value: string): Buffer {
  return Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
    "utf8",
  );
}

function multipartImage(
  boundary: string,
  image: Buffer,
  mediaType: ObjectRecognitionInput["mediaType"],
): Buffer {
  const extension =
    mediaType === "image/png" ? "png" : mediaType === "image/webp" ? "webp" : "jpg";
  return Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="images"; filename="sagatrail.${extension}"\r\nContent-Type: ${mediaType}\r\n\r\n`,
      "utf8",
    ),
    image,
    Buffer.from("\r\n", "utf8"),
  ]);
}

function plantNetText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function plantNetScore(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : 0;
}

function plantNetScientificName(species: PlantNetSpecies | undefined): string {
  return (
    plantNetText(species?.scientificName) ||
    plantNetText(species?.scientificNameWithoutAuthor)
  );
}

function plantNetCommonName(species: PlantNetSpecies | undefined): string {
  if (!Array.isArray(species?.commonNames)) return "";
  return (
    species.commonNames.find(
      (name): name is string => typeof name === "string" && name.trim().length > 0,
    )?.trim() ?? ""
  );
}

interface PlantMatch {
  title: string;
  confidence: number;
  scientificName: string;
  organ: string;
}

async function identifyPlantWithPlantNet(
  input: ObjectRecognitionInput,
  log: Logger,
): Promise<PlantMatch[] | null> {
  const apiKey = process.env.PLANTNET_API_KEY?.trim();
  if (!apiKey) {
    log.warn("Pl@ntNet-Abgleich übersprungen: PLANTNET_API_KEY fehlt");
    return null;
  }
  if (input.mediaType === "image/webp") {
    log.info("Pl@ntNet-Abgleich übersprungen: WebP wird von Pl@ntNet nicht unterstützt");
    return null;
  }

  const image = Buffer.from(input.imageBase64, "base64");
  const boundary = "----SagaTrailPlantNetBoundary";
  const body = Buffer.concat([
    multipartImage(boundary, image, input.mediaType),
    multipartPart(boundary, "organs", "auto"),
    Buffer.from(`--${boundary}--\r\n`, "utf8"),
  ]);
  const params = new URLSearchParams({
    "api-key": apiKey,
    lang: plantNetLanguage(input.language),
    "nb-results": String(MAX_CANDIDATES),
    "include-related-images": "false",
  });

  try {
    const response = await fetch(`${PLANTNET_API_URL}?${params.toString()}`, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": String(body.byteLength),
        "User-Agent": "SagaTrail/1.0 (plant-recognition)",
      },
      body,
      signal: AbortSignal.timeout(PLANTNET_TIMEOUT_MS),
    });
    if (!response.ok) {
      log.warn({ status: response.status }, "Pl@ntNet-Abgleich nicht erfolgreich");
      return null;
    }

    const payload = (await response.json()) as PlantNetResponse;
    const results = Array.isArray(payload.results) ? payload.results : [];
    const predictedOrgan =
      Array.isArray(payload.predictedOrgans) &&
      payload.predictedOrgans[0] &&
      typeof payload.predictedOrgans[0] === "object"
        ? plantNetText(
            (payload.predictedOrgans[0] as Record<string, unknown>).organ,
          )
        : "";
    const normalized = results
      .map((value): PlantMatch | null => {
        if (!value || typeof value !== "object") return null;
        const result = value as PlantNetResult;
        const scientificName = plantNetScientificName(result.species);
        if (!scientificName) return null;
        const commonName = plantNetCommonName(result.species);
        return {
          title: commonName ? `${commonName} (${scientificName})` : scientificName,
          confidence: plantNetScore(result.score),
          scientificName,
          organ: predictedOrgan,
        };
      })
      .filter((value): value is PlantMatch => value !== null)
      .slice(0, MAX_CANDIDATES);

    log.info(
      {
        candidates: normalized.length,
        bestMatch: plantNetText(payload.bestMatch) || null,
        remainingRequests:
          typeof payload.remainingIdentificationRequests === "number"
            ? payload.remainingIdentificationRequests
            : null,
      },
      "Pl@ntNet-Abgleich abgeschlossen",
    );
    return normalized;
  } catch (err) {
    log.warn(
      { error: err instanceof Error ? err.name : "unknown" },
      "Pl@ntNet-Abgleich fehlgeschlagen; Claude-Ergebnis bleibt aktiv",
    );
    return null;
  }
}

function animalText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function animalScore(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : 0;
}

function animalScientificName(taxonomy: AnimalTaxonomy | undefined): string {
  const genus = animalText(taxonomy?.genus);
  const species = animalText(taxonomy?.species);
  if (genus && species) return `${genus} ${species}`;
  return species || genus;
}

async function identifyAnimalWithAnimalDetect(
  input: ObjectRecognitionInput,
  log: Logger,
): Promise<AnimalMatch[] | null> {
  const apiKey = process.env.ANIMAL_DETECT_API_KEY?.trim();
  if (!apiKey) {
    log.warn("Animal-Detect-Abgleich übersprungen: ANIMAL_DETECT_API_KEY fehlt");
    return null;
  }

  const image = Buffer.from(input.imageBase64, "base64");
  const boundary = "----SagaTrailAnimalDetectBoundary";
  const body = Buffer.concat([
    multipartImage(boundary, image, input.mediaType),
    multipartPart(boundary, "country", "CHE"),
    multipartPart(boundary, "threshold", "0.2"),
    multipartPart(boundary, "classify", "true"),
    multipartPart(boundary, "top_candidate", String(MAX_CANDIDATES)),
    ...(input.lat != null && input.lng != null
      ? [
          multipartPart(boundary, "latitude", String(input.lat)),
          multipartPart(boundary, "longitude", String(input.lng)),
        ]
      : []),
    Buffer.from(`--${boundary}--\r\n`, "utf8"),
  ]);

  try {
    const response = await fetch(ANIMAL_DETECT_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": String(body.byteLength),
        "User-Agent": "SagaTrail/1.0 (animal-recognition)",
      },
      body,
      signal: AbortSignal.timeout(ANIMAL_DETECT_TIMEOUT_MS),
    });
    if (!response.ok) {
      log.warn({ status: response.status }, "Animal-Detect-Abgleich nicht erfolgreich");
      return null;
    }

    const payload = (await response.json()) as AnimalDetectResponse;
    const annotations = Array.isArray(payload.annotations) ? payload.annotations : [];
    const grouped = new Map<string, AnimalMatch>();
    for (const value of annotations) {
      if (!value || typeof value !== "object") continue;
      const annotation = value as AnimalAnnotation;
      const label = animalText(annotation.label);
      if (!label || ["animal", "human", "vehicle", "blank"].includes(label.toLowerCase())) {
        continue;
      }
      const scientificName = animalScientificName(annotation.taxonomy);
      const taxonId = animalText(annotation.taxonomy?.id);
      const key = taxonId || `${scientificName}|${label.toLowerCase()}`;
      const confidence = animalScore(annotation.score);
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, { label, scientificName, confidence, count: 1 });
      } else {
        existing.count += 1;
        existing.confidence = Math.max(existing.confidence, confidence);
      }
    }

    const normalized = [...grouped.values()]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, MAX_CANDIDATES);
    log.info(
      { annotations: annotations.length, species: normalized.length },
      "Animal-Detect-Abgleich abgeschlossen",
    );
    return normalized;
  } catch (err) {
    log.warn(
      { error: err instanceof Error ? err.name : "unknown" },
      "Animal-Detect-Abgleich fehlgeschlagen; Claude-Ergebnis bleibt aktiv",
    );
    return null;
  }
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
  const candidateEntries = rawCandidates
    .slice(0, MAX_CANDIDATES)
    .map((candidate, index) => normalizeCandidate(candidate, index))
    .map((candidate, index) => {
      if (!candidate) return null;
      const raw = rawCandidates[index];
      const rawSearchQuery =
        raw && typeof raw.searchQuery === "string" ? raw.searchQuery.trim() : "";
      return {
        candidate,
        objectType: raw.objectType,
        searchQuery: rawSearchQuery || candidate.title,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        candidate: ObjectRecognitionCandidate;
        objectType: string;
        searchQuery: string;
      } => entry !== null,
    );
  let candidates = candidateEntries.map((entry) => entry.candidate);

  const plantEntry = candidateEntries.find((entry) => entry.objectType === "plant");
  if (plantEntry) {
    const plantMatches = await identifyPlantWithPlantNet(input, log);
    if (plantMatches && plantMatches.length > 0) {
      const originalPlantCandidate = plantEntry.candidate;
      const plantCandidates = plantMatches.map((match, index) => ({
        candidate: {
          id: `plantnet-${index + 1}`,
          title: match.title,
          category: originalPlantCandidate.category || "Pflanze",
          confidence: match.confidence,
          description:
            index === 0
              ? originalPlantCandidate.description
              : "Pl@ntNet führt diese Art als möglichen visuellen Treffer.",
          whyLikely:
            index === 0
              ? originalPlantCandidate.whyLikely
              : "Die Art gehört zu den wahrscheinlichsten Pl@ntNet-Treffern für dieses Foto.",
          sourceUrl: null,
          sourceTitle: null,
          sourceExtract: null,
          sourceImage: null,
        },
        objectType: "plant",
        searchQuery: match.scientificName,
      }));
      const nonPlantCandidates = candidateEntries.filter(
        (entry) => entry.objectType !== "plant",
      );
      const enrichedEntries = [...plantCandidates, ...nonPlantCandidates].slice(
        0,
        MAX_CANDIDATES,
      );
      candidates = enrichedEntries.map((entry) => entry.candidate);
      candidateEntries.splice(0, candidateEntries.length, ...enrichedEntries);
    }
  }

  const animalEntry = candidateEntries.find((entry) => entry.objectType === "animal");
  if (animalEntry) {
    const animalMatches = await identifyAnimalWithAnimalDetect(input, log);
    if (animalMatches && animalMatches.length > 0) {
      const originalAnimalCandidate = animalEntry.candidate;
      const animalCandidates = animalMatches.map((match, index) => ({
        candidate: {
          id: `animal-detect-${index + 1}`,
          title: match.scientificName
            ? `${match.label} (${match.scientificName})`
            : match.label,
          category: originalAnimalCandidate.category || "Tier",
          confidence: match.confidence,
          description:
            index === 0
              ? originalAnimalCandidate.description
              : "Animal Detect führt diese Art als möglichen visuellen Treffer.",
          whyLikely:
            index === 0
              ? originalAnimalCandidate.whyLikely
              : "Die Art gehört zu den wahrscheinlichsten Animal-Detect-Treffern für dieses Foto.",
          sourceUrl: null,
          sourceTitle: null,
          sourceExtract: null,
          sourceImage: null,
        },
        objectType: "animal",
        searchQuery: match.scientificName || match.label,
      }));
      const nonAnimalCandidates = candidateEntries.filter(
        (entry) => entry.objectType !== "animal",
      );
      const enrichedEntries = [...animalCandidates, ...nonAnimalCandidates].slice(
        0,
        MAX_CANDIDATES,
      );
      candidates = enrichedEntries.map((entry) => entry.candidate);
      candidateEntries.splice(0, candidateEntries.length, ...enrichedEntries);
    }
  }

  const enriched = await Promise.all(
    candidateEntries.map(async ({ candidate, searchQuery }) => {
      try {
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