import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

// Kanton-Slug → primärer EAWS-Regions-Code (CH-ISO)
// Nicht-alpine Kantone erhalten null → kein Bulletin verfügbar
const CANTON_TO_EAWS: Record<string, string | null> = {
  "bern":                       "CH-BE",
  "valais":                     "CH-VS",
  "wallis":                     "CH-VS",
  "graubuenden":                "CH-GR",
  "grisons":                    "CH-GR",
  "uri":                        "CH-UR",
  "schwyz":                     "CH-SZ",
  "obwalden":                   "CH-OW",
  "nidwalden":                  "CH-NW",
  "glarus":                     "CH-GL",
  "appenzell-innerrhoden":      "CH-AI",
  "appenzell-ausserrhoden":     "CH-AR",
  "st-gallen":                  "CH-SG",
  "ticino":                     "CH-TI",
  "tessin":                     "CH-TI",
  "vaud":                       "CH-VD",
  "waadt":                      "CH-VD",
  "fribourg":                   "CH-FR",
  "freiburg":                   "CH-FR",
  "luzern":                     "CH-LU",
  // Nicht-alpine Kantone
  "zurich":                     null,
  "aargau":                     null,
  "thurgau":                    null,
  "solothurn":                  null,
  "basel-stadt":                null,
  "basel-landschaft":           null,
  "schaffhausen":               null,
  "zug":                        null,
  "geneva":                     null,
  "genf":                       null,
  "neuchatel":                  null,
  "neuenburg":                  null,
  "jura":                       null,
};

// EAWS Danger-Level-Name → Nummer
const LEVEL_NAME_TO_NUM: Record<string, number> = {
  low: 1,
  moderate: 2,
  considerable: 3,
  high: 4,
  very_high: 5,
};

// In-memory-Cache: key="REGION:LANG", value={ data, expiresAt }
interface CacheEntry {
  data: AvalancheResult;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 Stunde

interface AvalancheResult {
  available: boolean;
  reason?: "no-alpine-region" | "no-bulletin" | "api-error";
  dangerLevel?: number;
  dangerText?: string;
  tendencyText?: string;
  validFrom?: string;
  validUntil?: string;
  regionName?: string;
}

async function fetchBulletin(regionCode: string, lang: string): Promise<AvalancheResult> {
  const cacheKey = `${regionCode}:${lang}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let result: AvalancheResult;
  try {
    const url = `https://api.avalanche.report/v6:getLatestDaytimeBulletin?language=${encodeURIComponent(lang)}&region=${encodeURIComponent(regionCode)}`;
    const resp = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    const text = await resp.text();
    if (!text || text.trim().length === 0) {
      result = { available: false, reason: "no-bulletin" };
    } else {
      const json = JSON.parse(text);
      // EAWS v6 Connect-JSON: { bulletin: { dangerRatings: [...], validTime: {...}, ... } }
      const bulletin = json.bulletin ?? json.bulletins?.[0] ?? json;
      const ratings: Array<{ mainValue?: string; dangerLevel?: { numeric?: number; name?: string } }> =
        bulletin?.dangerRatings ?? bulletin?.danger_ratings ?? [];
      const topRating = ratings[0];
      const levelName: string =
        topRating?.mainValue ??
        topRating?.dangerLevel?.name ??
        "";
      const dangerLevel = LEVEL_NAME_TO_NUM[levelName] ?? null;
      if (dangerLevel) {
        result = {
          available: true,
          dangerLevel,
          dangerText: bulletin?.highlights ?? bulletin?.avalancheActivity?.comment ?? null,
          tendencyText: bulletin?.tendency?.[0]?.comment ?? null,
          validFrom: bulletin?.validTime?.startTime ?? null,
          validUntil: bulletin?.validTime?.endTime ?? null,
          regionName: bulletin?.regions?.[0]?.name ?? regionCode,
        };
      } else {
        result = { available: false, reason: "no-bulletin" };
      }
    }
  } catch {
    result = { available: false, reason: "api-error" };
  }

  cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

// GET /avalanche?canton=bern&lang=de
router.get("/avalanche", async (req: Request, res: Response): Promise<void> => {
  const canton = (req.query.canton as string | undefined)?.toLowerCase().trim() ?? "";
  const lang = (req.query.lang as string | undefined) ?? "de";
  const allowedLang = ["de", "fr", "it", "en"].includes(lang) ? lang : "de";

  if (!canton) {
    res.status(400).json({ error: "canton ist erforderlich" });
    return;
  }

  if (!(canton in CANTON_TO_EAWS)) {
    res.json({ available: false, reason: "no-alpine-region" } as AvalancheResult);
    return;
  }

  const regionCode = CANTON_TO_EAWS[canton];
  if (!regionCode) {
    res.json({ available: false, reason: "no-alpine-region" } as AvalancheResult);
    return;
  }

  const result = await fetchBulletin(regionCode, allowedLang);
  res.json(result);
});

export default router;
