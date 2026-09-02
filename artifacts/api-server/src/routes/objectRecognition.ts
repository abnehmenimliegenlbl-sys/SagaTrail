import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { AnalyzeObjectBody, AnalyzeObjectResponse } from "@workspace/api-zod";
import { db, objectRecognitionUsageTable, profilesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { istPremiumAktiv } from "../lib/premiumStatus";
import { recognizeObject } from "../lib/objectRecognition";

const router: IRouter = Router();
const OBJECT_RECOGNITION_DAILY_LIMIT = 5;

function zurichCalendarDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Schweizer Tagesdatum konnte nicht bestimmt werden");
  }
  return `${year}-${month}-${day}`;
}

function requireUserId(req: Request, res: Response): string | null {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Nicht authentifiziert" });
    return null;
  }
  return auth.userId;
}

router.post("/object-recognition/analyze", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = AnalyzeObjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Bilddaten", issues: parsed.error.issues });
    return;
  }

  const [profile] = await db
    .select({ premium: profilesTable.premium, premiumBis: profilesTable.premiumBis })
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));
  if (!profile) {
    res.status(404).json({ error: "Kein Profil vorhanden" });
    return;
  }
  if (!istPremiumAktiv(profile)) {
    res.status(403).json({ error: "Premium erforderlich" });
    return;
  }

  try {
    const usageDate = zurichCalendarDate();
    const [usage] = await db
      .insert(objectRecognitionUsageTable)
      .values({ userId, usageDate, count: 1 })
      .onConflictDoUpdate({
        target: [objectRecognitionUsageTable.userId, objectRecognitionUsageTable.usageDate],
        set: { count: sql`${objectRecognitionUsageTable.count} + 1` },
        where: sql`${objectRecognitionUsageTable.count} < ${OBJECT_RECOGNITION_DAILY_LIMIT}`,
      })
      .returning({ count: objectRecognitionUsageTable.count });

    if (!usage) {
      res.status(429).json({
        error: "Tageslimit der Objekterkennung erreicht",
        code: "OBJECT_RECOGNITION_DAILY_LIMIT",
        limit: OBJECT_RECOGNITION_DAILY_LIMIT,
      });
      return;
    }

    const result = await recognizeObject(parsed.data, req.log);
    res.json(AnalyzeObjectResponse.parse(result));
  } catch (err) {
    req.log.error({ err, userId }, "Objekterkennung fehlgeschlagen");
    res.status(502).json({ error: "Objektanalyse momentan nicht verfuegbar" });
  }
});

export default router;