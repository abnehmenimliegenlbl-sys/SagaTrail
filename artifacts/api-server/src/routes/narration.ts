import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import { CreateNarrationBody } from "@workspace/api-zod";
import { getOrCreateNarrationAudio } from "../lib/narrationCache";
import { istPremiumAktiv } from "../lib/premiumStatus";

const router: IRouter = Router();

function requireUserId(req: Request, res: Response): string | null {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Nicht authentifiziert" });
    return null;
  }
  return auth.userId;
}

router.post("/narration", async (req, res): Promise<void> => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = CreateNarrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Nur Premium-Nutzer:innen erhalten ElevenLabs-Erzaehlung. Die kostenlose
  // erste Wanderung nutzt die on-device Stimme (expo-speech) und ruft
  // diesen Endpunkt gar nie auf, aber wir erzwingen das auch serverseitig.
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));

  if (!profile || !istPremiumAktiv(profile)) {
    res.status(403).json({ error: "Premium erforderlich fuer KI-Erzaehlstimme" });
    return;
  }

  try {
    const audio = await getOrCreateNarrationAudio(
      parsed.data.text,
      parsed.data.language,
      req.log,
    );
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.send(audio);
  } catch (err) {
    req.log.error({ err }, "Narration-Synthese fehlgeschlagen");
    res.status(502).json({ error: "Sprachsynthese fehlgeschlagen" });
  }
});

export default router;
