import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { CreateNarrationBody } from "@workspace/api-zod";
import { getOrCreateNarrationAudio, NarrationRateLimitError } from "../lib/narrationCache";

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

  try {
    const audio = await getOrCreateNarrationAudio(
      parsed.data.text,
      parsed.data.language,
      userId,
      req.log,
      parsed.data.provider ?? undefined,
    );
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.send(audio);
  } catch (err) {
    if (err instanceof NarrationRateLimitError) {
      req.log.info({ userId }, "Narration-Tageslimit erreicht, 429 an Client");
      res.status(429).json({
        error: "Tages-Budget für KI-Erzählstimme erreicht. Die Gerätestimme übernimmt bis Mitternacht UTC.",
        fallbackToDevice: true,
      });
      return;
    }
    req.log.error({ err }, "Narration-Synthese fehlgeschlagen");
    res.status(502).json({ error: "Sprachsynthese fehlgeschlagen" });
  }
});

export default router;
