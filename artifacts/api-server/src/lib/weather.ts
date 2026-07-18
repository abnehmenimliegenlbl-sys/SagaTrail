import type { Logger } from "pino";

/**
 * Live-Wetter fuer einen Punkt ueber Open-Meteo (kostenlos, kein API-Key,
 * unauthentifiziertes REST-JSON). Daraus wird zusaetzlich eine grobe
 * Wegzustand-Einschaetzung abgeleitet — KEIN offizieller Sperr- oder
 * Lawinenstatus (fuer den es keine frei abfragbare Schweizer Live-Quelle
 * gibt), sondern eine ehrlich als "abgeleitet" gekennzeichnete Heuristik aus
 * Niederschlag, Schneehoehe, Temperatur und Boeen.
 */

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const REQUEST_TIMEOUT_MS = 10000;

export interface WeatherReport {
  temperatureC: number;
  windKmh: number;
  windGustsKmh: number;
  precipitationMm: number;
  snowDepthCm: number;
  weatherCode: number;
  conditionLabel: string;
  uvIndex: number | null;
  isThunderstorm: boolean;
  trailConditionLevel: "gut" | "vorsicht" | "kritisch";
  trailConditionLabel: string;
  trailConditionNote: string;
  source: string;
  fetchedAt: string;
}

interface OpenMeteoCurrent {
  temperature_2m: number;
  wind_speed_10m: number;
  wind_gusts_10m: number;
  precipitation: number;
  snow_depth: number;
  weather_code: number;
  uv_index?: number;
}

interface OpenMeteoResponse {
  current?: Partial<OpenMeteoCurrent>;
}

// Kurzfassung der WMO-Wettercodes (https://open-meteo.com/en/docs), Deutsch.
const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "Klar",
  1: "Ueberwiegend klar",
  2: "Teils bewoelkt",
  3: "Bedeckt",
  45: "Nebel",
  48: "Reifnebel",
  51: "Leichter Nieselregen",
  53: "Nieselregen",
  55: "Starker Nieselregen",
  56: "Gefrierender Nieselregen",
  57: "Starker gefrierender Nieselregen",
  61: "Leichter Regen",
  63: "Regen",
  65: "Starker Regen",
  66: "Gefrierender Regen",
  67: "Starker gefrierender Regen",
  71: "Leichter Schneefall",
  73: "Schneefall",
  75: "Starker Schneefall",
  77: "Schneegriesel",
  80: "Leichte Regenschauer",
  81: "Regenschauer",
  82: "Heftige Regenschauer",
  85: "Leichte Schneeschauer",
  86: "Starke Schneeschauer",
  95: "Gewitter",
  96: "Gewitter mit Hagel",
  99: "Schweres Gewitter mit Hagel",
};

function conditionLabel(code: number): string {
  return WEATHER_CODE_LABELS[code] ?? "Unbekannt";
}

function deriveTrailCondition(current: {
  temperatureC: number;
  windGustsKmh: number;
  precipitationMm: number;
  snowDepthCm: number;
}): Pick<WeatherReport, "trailConditionLevel" | "trailConditionLabel" | "trailConditionNote"> {
  const { temperatureC, windGustsKmh, precipitationMm, snowDepthCm } = current;
  const vereisungsgefahr = temperatureC <= 2 && precipitationMm > 5;

  if (snowDepthCm > 10 || vereisungsgefahr) {
    return {
      trailConditionLevel: "kritisch",
      trailConditionLabel: "Erschwerte Bedingungen",
      trailConditionNote: vereisungsgefahr
        ? "Regen bei Temperaturen um den Gefrierpunkt: Vereisungsgefahr auf dem Weg moeglich."
        : "Deutliche Schneelage am Ausgangspunkt: Weg kann verschneit oder schwer begehbar sein.",
    };
  }

  if (precipitationMm > 2 || snowDepthCm > 0 || windGustsKmh > 60 || temperatureC < 2) {
    return {
      trailConditionLevel: "vorsicht",
      trailConditionLabel: "Mit Vorsicht begehbar",
      trailConditionNote: "Aktuelle Wetterlage deutet auf feuchten, rutschigen oder windigen Weg hin.",
    };
  }

  return {
    trailConditionLevel: "gut",
    trailConditionLabel: "Gute Bedingungen",
    trailConditionNote: "Keine auffaelligen Wettereinfluesse auf den Wegzustand erkennbar.",
  };
}

export async function getWeather(lat: number, lng: number, log: Logger): Promise<WeatherReport> {
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set(
    "current",
    "temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation,snow_depth,weather_code,uv_index",
  );
  url.searchParams.set("timezone", "Europe/Zurich");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    log.error({ err }, "Open-Meteo nicht erreichbar");
    throw new Error("weather_unreachable");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    log.error({ status: response.status }, "Open-Meteo antwortete mit Fehler");
    throw new Error("weather_unreachable");
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const current = data.current;
  if (
    !current ||
    typeof current.temperature_2m !== "number" ||
    typeof current.wind_speed_10m !== "number" ||
    typeof current.wind_gusts_10m !== "number" ||
    typeof current.precipitation !== "number" ||
    typeof current.snow_depth !== "number" ||
    typeof current.weather_code !== "number"
  ) {
    log.error({ current }, "Open-Meteo lieferte unvollstaendige Daten");
    throw new Error("weather_incomplete");
  }

  const temperatureC = current.temperature_2m;
  const windKmh = current.wind_speed_10m;
  const windGustsKmh = current.wind_gusts_10m;
  const precipitationMm = current.precipitation;
  const snowDepthCm = current.snow_depth * 100;
  const weatherCode = current.weather_code;
  const uvIndex = typeof current.uv_index === "number" ? current.uv_index : null;
  const isThunderstorm = [95, 96, 99].includes(weatherCode);

  const trail = deriveTrailCondition({ temperatureC, windGustsKmh, precipitationMm, snowDepthCm });

  return {
    temperatureC,
    windKmh,
    windGustsKmh,
    precipitationMm,
    snowDepthCm,
    weatherCode,
    conditionLabel: conditionLabel(weatherCode),
    uvIndex,
    isThunderstorm,
    ...trail,
    source: "Open-Meteo",
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * In-Memory-Cache je grob gerastertem Punkt (2 Nachkommastellen, ~1 km), damit
 * mehrere Aufrufe fuer dieselbe Route nicht bei jedem Laden erneut abgefragt
 * werden. Wetter aendert sich schnell, daher eine kurze TTL.
 */
const WEATHER_TTL_MS = 15 * 60 * 1000; // 15 Minuten
const weatherCache = new Map<string, { at: number; report: WeatherReport }>();

function pointCacheKey(lat: number, lng: number): string {
  const r = (n: number) => Math.round(n * 100) / 100;
  return `${r(lat)},${r(lng)}`;
}

export async function getCachedWeather(lat: number, lng: number, log: Logger): Promise<WeatherReport> {
  const key = pointCacheKey(lat, lng);
  const hit = weatherCache.get(key);
  if (hit && Date.now() - hit.at < WEATHER_TTL_MS) return hit.report;
  const report = await getWeather(lat, lng, log);
  weatherCache.set(key, { at: Date.now(), report });
  return report;
}
