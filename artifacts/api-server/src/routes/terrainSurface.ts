import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

import { computeLocalTerrainModel } from "../lib/elevation";

const router: IRouter = Router();

const BodySchema = z.object({
  center: z.object({
    lat: z.number().finite().min(45).max(48.5),
    lng: z.number().finite().min(5).max(11),
  }),
  radiusM: z.number().finite().min(100).max(1000).optional(),
  sectors: z.number().int().min(8).max(16).optional(),
  rings: z.number().int().min(4).max(8).optional(),
});

/**
 * POST /terrain-surface
 * Liefert ein observer-zentriertes, radial abgetastetes SwissTopo-Modell.
 * Unvollständige Strahlen bleiben im Ergebnis erkennbar und werden clientseitig
 * nicht für eine sichere Verdeckung verwendet.
 */
router.post("/terrain-surface", async (req: Request, res: Response): Promise<void> => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "center mit gültigen Schweizer Koordinaten erwartet." });
    return;
  }

  try {
    const model = await computeLocalTerrainModel(parsed.data.center, req.log, parsed.data);
    if (!model) {
      res.status(502).json({ error: "Lokales Terrainmodell konnte nicht geladen werden." });
      return;
    }
    res.json(model);
  } catch (err) {
    req.log.error({ err }, "Lokales Terrainmodell fehlgeschlagen");
    res.status(502).json({ error: "Lokales Terrainmodell konnte nicht geladen werden." });
  }
});

export default router;