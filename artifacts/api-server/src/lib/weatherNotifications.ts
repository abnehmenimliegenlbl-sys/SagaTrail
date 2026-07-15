import { and, eq, ne, sql } from "drizzle-orm";
import { db, profilesTable, catalogSagasTable } from "@workspace/db";
import { logger } from "./logger";

/**
 * WMO-Wettercodes fuer schlechtes Wetter (Regen, Gewitter, Schnee).
 * Quelle: https://open-meteo.com/en/docs#weathervariables
 */
const SCHLECHTES_WETTER_CODES = new Set([
  51, 53, 55, 56, 57,        // Nieselregen
  61, 63, 65, 66, 67,        // Regen
  71, 73, 75, 77,            // Schneefall
  80, 81, 82,                // Regenschauer
  85, 86,                    // Schneeschauer
  95, 96, 99,                // Gewitter
]);

async function fetchWmoCode(lat: number, lng: number): Promise<number | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&daily=weathercode&timezone=Europe%2FZurich&forecast_days=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { daily?: { weathercode?: number[] } };
    return json.daily?.weathercode?.[0] ?? null;
  } catch {
    return null;
  }
}

async function sendPush(token: string, title: string, body: string): Promise<void> {
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ to: token, title, body, sound: "default" }),
  });
}

/**
 * Prueft Wetter fuer alle Nutzer mit gespeicherten Touren und
 * versendet Push-Benachrichtigungen bei schlechtem Wetter.
 * Wird einmal taeglich um ~07:00 UTC ausgefuehrt.
 */
export async function sendWeatherWarnings(): Promise<void> {
  logger.info("Wetter-Benachrichtigungen: starte taeglich Pruefung");
  try {
    const profiles = await db
      .select({
        id: profilesTable.id,
        pushToken: profilesTable.pushToken,
        savedSagaIds: profilesTable.savedSagaIds,
        language: profilesTable.language,
      })
      .from(profilesTable)
      .where(
        and(
          eq(profilesTable.pushWeatherEnabled, true),
          ne(profilesTable.pushToken, sql`NULL`),
          sql`array_length(${profilesTable.savedSagaIds}, 1) > 0`
        )
      );

    if (profiles.length === 0) return;

    // Alle benoetigen Saga-Koordinaten einmalig laden
    const allSagaIds = [...new Set(profiles.flatMap((p) => p.savedSagaIds ?? []))];
    if (allSagaIds.length === 0) return;

    const sagaRows = await db
      .select({ id: catalogSagasTable.id, lat: catalogSagasTable.lat, lng: catalogSagasTable.lng })
      .from(catalogSagasTable)
      .where(sql`${catalogSagasTable.id} = ANY(${allSagaIds})`);

    const sagaCoords = new Map(sagaRows.map((r) => [r.id, { lat: r.lat, lng: r.lng }]));

    for (const p of profiles) {
      if (!p.pushToken) continue;
      const ids = p.savedSagaIds ?? [];
      for (const sagaId of ids) {
        const coords = sagaCoords.get(sagaId);
        if (!coords || coords.lat == null || coords.lng == null) continue;
        const code = await fetchWmoCode(coords.lat, coords.lng);
        if (code === null || !SCHLECHTES_WETTER_CODES.has(code)) continue;
        const { title, body } = weatherPushText(p.language ?? "de", code);
        try {
          await sendPush(p.pushToken, title, body);
          logger.info({ userId: p.id, sagaId, code }, "Wetter-Warnung gesendet");
        } catch (err) {
          logger.warn({ err, userId: p.id }, "Push-Warnung konnte nicht gesendet werden");
        }
        break; // Pro Nutzer maximal eine Warnung pro Tag
      }
    }
  } catch (err) {
    logger.error({ err }, "Wetter-Benachrichtigungen: Fehler bei Pruefung");
  }
}

function weatherPushText(lang: string, code: number): { title: string; body: string } {
  const isGewitter = code >= 95;
  const isSchnee = (code >= 71 && code <= 77) || code === 85 || code === 86;
  switch (lang) {
    case "fr":
      return { title: "⛈ Météo pour ta randonnée", body: isGewitter ? "Orage prévu sur ta prochaine randonnée." : isSchnee ? "Chute de neige possible — vérifiez les conditions." : "Pluie prévue sur ta prochaine randonnée." };
    case "it":
      return { title: "⛈ Meteo per la tua escursione", body: isGewitter ? "Temporali previsti sul tuo prossimo percorso." : isSchnee ? "Possibili nevicate — verifica le condizioni." : "Pioggia prevista sulla tua prossima escursione." };
    case "en":
      return { title: "⛈ Weather Alert for Your Hike", body: isGewitter ? "Thunderstorms expected on your saved route." : isSchnee ? "Snowfall possible — check conditions." : "Rain expected on your saved hike." };
    case "zh":
      return { title: "⛈ 您的徒步天气提醒", body: isGewitter ? "您保存的路线预计有雷暴。" : isSchnee ? "可能降雪，请检查路况。" : "您保存的路线预计有降雨。" };
    default:
      return { title: "⛈ Wetterwarnungen für deine Tour", body: isGewitter ? "Gewitter erwartet auf deiner gespeicherten Route. Bitte Wanderung verschieben." : isSchnee ? "Schneefall möglich — Wegbedingungen prüfen." : "Regen erwartet auf deiner gespeicherten Route." };
  }
}

function millisUntilNext7amUtc(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7, 0, 0, 0));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

/**
 * Startet den taeglich-Wetter-Cron. Wird einmal beim Server-Start aufgerufen.
 */
export function startWeatherNotificationCron(): void {
  const scheduleNext = () => {
    const delay = millisUntilNext7amUtc();
    logger.info({ inMinutes: Math.round(delay / 60000) }, "Naechste Wetter-Benachrichtigung geplant");
    setTimeout(() => {
      void sendWeatherWarnings();
      setInterval(() => void sendWeatherWarnings(), 24 * 60 * 60 * 1000);
    }, delay);
  };
  scheduleNext();
}
