import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { AnalyzeObjectBody, AnalyzeObjectResponse } from "@workspace/api-zod";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { istPremiumAktiv } from "../lib/premiumStatus";
import { recognizeObject } from "../lib/objectRecognition";

const router: IRouter = Router();

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
    const result = await recognizeObject(parsed.data, req.log);
    res.json(AnalyzeObjectResponse.parse(result));
  } catch (err) {
    req.log.error({ err, userId }, "Objekterkennung fehlgeschlagen");
    res.status(502).json({ error: "Objektanalyse momentan nicht verfuegbar" });
  }
});

export default router;