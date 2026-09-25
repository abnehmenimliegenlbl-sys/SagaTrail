import { ReplitConnectors } from "@replit/connectors-sdk";
import type { Logger } from "pino";
import type { PoiSource, WikiSummary } from "./wikipedia";

const connectors = new ReplitConnectors();
const FIRECRAWL_TIMEOUT_MS = 20_000;
const SEARCH_RESULT_LIMIT = 5;
const MAX_PAGE_TEXT_CHARS = 32_000;
const MAX_EXTRACT_CHARS = 1_200;
const MIN_FACT_PARAGRAPH_CHARS = 45;

const GENERIC_POI_NAMES = new Set([
  "aussichtspunkt",
  "findling",
  "hohle",
  "kapelle",
  "kreuz",
  "ruine",
  "ruins",
  "unterstand",
  "wegkreuz",
]);

export interface PoiWebContext {
  name: string;
  kind: string;
  place: string | null;
  canton: string | null;
}

export interface PoiWebSearchResult {
  title?: unknown;
  url?: unknown;
  description?: unknown;
}

type FirecrawlEndpoint = "/search" | "/scrape";
type FirecrawlPost = (
  endpoint: FirecrawlEndpoint,
  body: Record<string, unknown>,
) => Promise<unknown>;

function asRecord(value: unknown): Record<string, unknown> {
  return value != null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isSearchablePoiName(name: string): boolean {
  const normalized = normalizeText(name);
  if (normalized.length < 3 || GENERIC_POI_NAMES.has(normalized)) return false;
  // Codes and short route numbers have too many unrelated web matches.
  return !/^[a-z]{0,2}\s*\d[\w\s]*$/i.test(normalized);
}

function matchesPoiName(text: string, name: string): boolean {
  const target = normalizeText(name);
  const haystack = normalizeText(text);
  if (!target || !haystack) return false;
  if (` ${haystack} `.includes(` ${target} `)) return true;
  const words = new Set(haystack.split(" "));
  const tokens = target.split(" ").filter((token) => token.length >= 3);
  return tokens.length > 0 && tokens.every((token) => words.has(token));
}

function matchesLocation(text: string, input: Pick<PoiWebContext, "place" | "canton">): boolean {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  const words = new Set(normalized.split(" "));
  for (const hint of [input.place, input.canton]) {
    if (!hint?.trim()) continue;
    const target = normalizeText(hint);
    if (!target) continue;
    if (normalized.includes(target)) return true;
    const distinctiveTokens = target.split(" ").filter((token) => token.length >= 4);
    if (distinctiveTokens.some((token) => words.has(token))) return true;
  }
  return false;
}

function normalizeHttpsUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = value.startsWith("//")
    ? `https:${value}`
    : /^[a-z][a-z\d+.-]*:/i.test(value)
      ? value
      : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol === "http:") url.protocol = "https:";
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) {
      return null;
    }
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.includes(":") ||
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
    ) {
      return null;
    }
    if (
      hostname === "wikipedia.org" ||
      hostname.endsWith(".wikipedia.org") ||
      hostname === "wikidata.org" ||
      hostname.endsWith(".wikidata.org")
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sameSiteFamily(a: string, b: string): boolean {
  const hostA = hostnameOf(a);
  const hostB = hostnameOf(b);
  return Boolean(
    hostA &&
      hostB &&
      (hostA === hostB || hostA.endsWith(`.${hostB}`) || hostB.endsWith(`.${hostA}`)),
  );
}

function officialSourceBonus(title: string, description: string, url: string): number {
  const host = hostnameOf(url);
  const text = normalizeText(`${title} ${description}`);
  let score = 0;
  if (host.endsWith(".ch") || host.endsWith(".li")) score += 2;
  if (/\b(official|offiziell|gemeinde|stadt|kanton|tourismus|museum|zoo)\b/.test(text)) {
    score += 2;
  }
  return score;
}

export function selectPoiWebSearchResult(
  results: PoiWebSearchResult[],
  input: PoiWebContext,
): { title: string; url: string; description: string } | null {
  if (
    !isSearchablePoiName(input.name) ||
    (!input.place?.trim() && !input.canton?.trim())
  ) {
    return null;
  }

  const scored = results.flatMap((result, index) => {
    const title = asText(result.title);
    const rawUrl = asText(result.url);
    const url = normalizeHttpsUrl(rawUrl);
    const description = asText(result.description);
    if (!title || !url) return [];

    const evidence = `${title} ${description} ${url}`;
    if (
      !matchesPoiName(evidence, input.name) ||
      !matchesLocation(evidence, input)
    ) {
      return [];
    }

    let score = 0;
    if (matchesPoiName(title, input.name)) score += 4;
    if (matchesLocation(title, input)) score += 3;
    if (matchesPoiName(description, input.name)) score += 2;
    if (matchesLocation(description, input)) score += 2;
    score += officialSourceBonus(title, description, url);
    return [{ title, url, description, score, index }];
  });

  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  const best = scored[0];
  return best
    ? { title: best.title, url: best.url, description: best.description }
    : null;
}

export function extractPoiWebText(markdown: string, poiName?: string): string {
  const paragraphs = markdown
    .slice(0, MAX_PAGE_TEXT_CHARS)
    .replace(/\r/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => {
      if ((paragraph.match(/\]\(/g) ?? []).length > 2) return "";
      return paragraph
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/^#{1,6}\s*/gm, "")
        .replace(/^\s*[-*>]+\s*/gm, "")
        .replace(/[`*_]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    })
    .filter((paragraph) => {
      const normalized = normalizeText(paragraph);
      return !(
        /\b(newsletter|subscribe|subscription|abonnieren|abonnement|inscription|cookie|cookies|privacy policy|datenschutz|impressum)\b/.test(
          normalized,
        ) ||
        /\b(highlights include|nearby places include|tap on a place|satellite imagery|open data sources)\b/.test(
          normalized,
        ) ||
        (/^discover\b/.test(normalized) && /\bfrom above\b/.test(normalized))
      );
    })
    .filter((paragraph) => !poiName || namesPoiSubject(paragraph, poiName))
    .filter((paragraph) => paragraph.length >= MIN_FACT_PARAGRAPH_CHARS);

  let extract = "";
  for (const paragraph of paragraphs) {
    const next = extract ? `${extract}\n\n${paragraph}` : paragraph;
    if (next.length > MAX_EXTRACT_CHARS) {
      if (!extract) return paragraph.slice(0, MAX_EXTRACT_CHARS);
      break;
    }
    extract = next;
    if (extract.length >= 700) break;
  }
  return extract;
}

function namesPoiSubject(paragraph: string, poiName: string): boolean {
  const normalized = normalizeText(paragraph);
  const target = normalizeText(poiName);
  const index = normalized.indexOf(target);
  if (!target || index < 0 || index > 60) return false;
  const leadIn = normalized.slice(Math.max(0, index - 32), index);
  return !/\b(near|nearby|north of|south of|east of|west of|metres from|meters from)\b/.test(
    leadIn,
  );
}

async function firecrawlPost(
  endpoint: FirecrawlEndpoint,
  body: Record<string, unknown>,
): Promise<unknown> {
  // The connected Firecrawl API base already includes /v2, so use /search and
  // /scrape rather than repeating the version in the path.
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let response: Response;
  try {
    response = await Promise.race([
      connectors.proxy("firecrawl", endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Firecrawl ${endpoint} timed out`)),
          FIRECRAWL_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(`Firecrawl ${endpoint} HTTP ${response.status}`);
  }
  return response.json();
}

function providerName(title: string, url: string): string {
  const suffix = title.split(/\s+[|–—]\s+/).at(-1)?.trim();
  if (suffix && suffix !== title && suffix.length <= 100) return suffix;
  return hostnameOf(url) || "Webseite";
}

function pageLanguage(value: string): string {
  const match = value.trim().toLowerCase().match(/^(de|fr|it|rm|en)(?:[-_]|$)/);
  return match?.[1] ?? "de";
}

async function scrapeVerifiedPoiPage(
  input: PoiWebContext,
  candidate: { title: string; url: string; description: string },
  post: FirecrawlPost,
  log: Logger,
): Promise<WikiSummary | null> {
  const raw = asRecord(
    await post("/scrape", {
      url: candidate.url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  );
  if (raw.success === false) {
    log.info({ name: input.name }, "Firecrawl konnte die POI-Seite nicht scrapen");
    return null;
  }
  const data = asRecord(raw.data);
  const metadata = asRecord(data.metadata);
  const markdown = asText(data.markdown);
  const title = asText(metadata.title) || candidate.title;
  const reportedUrl = normalizeHttpsUrl(asText(metadata.sourceURL));
  if (reportedUrl && !sameSiteFamily(candidate.url, reportedUrl)) {
    log.info({ name: input.name }, "Firecrawl-POI-Seite auf fremde Domain umgeleitet");
    return null;
  }
  const url = reportedUrl ?? candidate.url;

  const evidence = `${title}\n${candidate.description}\n${markdown.slice(0, MAX_PAGE_TEXT_CHARS)}`;
  const nameMatches = matchesPoiName(evidence, input.name);
  const locationMatches = matchesLocation(evidence, input);
  if (!nameMatches || !locationMatches) {
    log.info(
      { name: input.name, nameMatches, locationMatches },
      "Firecrawl-POI-Seite passt nicht zu Name oder Ort",
    );
    return null;
  }
  const extract = extractPoiWebText(markdown, input.name);
  if (!extract) {
    log.info(
      {
        name: input.name,
        pageHost: hostnameOf(url),
        markdownLength: markdown.length,
      },
      "Firecrawl-POI-Seite enthielt keinen sachlichen Text",
    );
    return null;
  }

  const source: PoiSource = {
    role: "text",
    provider: providerName(title, url),
    title,
    url,
  };
  return {
    title,
    extract,
    url,
    lang: pageLanguage(asText(metadata.language)),
    image: null,
    sources: [source],
  };
}

export async function scrapePoiWebsiteSource(
  input: PoiWebContext,
  websiteUrl: string,
  log: Logger,
  post: FirecrawlPost = firecrawlPost,
): Promise<WikiSummary | null> {
  const url = normalizeHttpsUrl(websiteUrl);
  if (
    !url ||
    !isSearchablePoiName(input.name) ||
    (!input.place?.trim() && !input.canton?.trim())
  ) {
    return null;
  }
  try {
    const summary = await scrapeVerifiedPoiPage(input, {
      title: "",
      url,
      description: "",
    }, post, log);
    if (summary) {
      log.info({ name: input.name, source: url }, "POI-Webseite aus OSM verifiziert");
    }
    return summary;
  } catch (err) {
    log.warn({ name: input.name, err }, "OSM-Webseite konnte nicht geprüft werden");
    return null;
  }
}

export async function searchPoiWebsiteSource(
  input: PoiWebContext,
  log: Logger,
  post: FirecrawlPost = firecrawlPost,
): Promise<WikiSummary | null> {
  if (
    !isSearchablePoiName(input.name) ||
    (!input.place?.trim() && !input.canton?.trim())
  ) {
    return null;
  }

  const query = [
    `"${input.name}"`,
    input.kind,
    input.place ? `near ${input.place}` : "",
    input.canton,
    "official",
    "site",
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");

  try {
    const raw = asRecord(
      await post("/search", {
        query,
        sources: [{ type: "web" }],
        limit: SEARCH_RESULT_LIMIT,
        ...(input.canton ? { country: "CH" } : {}),
      }),
    );
    if (raw.success === false) {
      throw new Error("Firecrawl search returned success=false");
    }
    const data = asRecord(raw.data);
    const webResults = Array.isArray(data.web)
      ? (data.web as PoiWebSearchResult[])
      : [];
    const candidate = selectPoiWebSearchResult(webResults, input);
    if (!candidate) {
      log.info(
        {
          name: input.name,
          resultCount: webResults.length,
          candidates: webResults.slice(0, SEARCH_RESULT_LIMIT).map((result) => {
            const title = asText(result.title);
            const rawUrl = normalizeHttpsUrl(asText(result.url)) ?? "";
            const description = asText(result.description);
            const evidence = `${title} ${description} ${rawUrl}`;
            return {
              host: hostnameOf(rawUrl),
              nameMatches: matchesPoiName(evidence, input.name),
              locationMatches: matchesLocation(evidence, input),
            };
          }),
        },
        "Firecrawl fand keine passende POI-Webseite",
      );
      return null;
    }

    const summary = await scrapeVerifiedPoiPage(input, candidate, post, log);
    if (summary) {
      log.info(
        { name: input.name, source: summary.url, provider: summary.sources?.[0]?.provider },
        "POI-Webquelle ueber Firecrawl gefunden und verifiziert",
      );
    }
    return summary;
  } catch (err) {
    log.warn({ name: input.name, err }, "Firecrawl-POI-Suche fehlgeschlagen");
    return null;
  }
}