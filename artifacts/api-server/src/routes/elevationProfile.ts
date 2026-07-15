import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { computeElevationProfile } from "../lib/elevation";

const router: IRouter = Router();

const BodySchema = z.object({
  geometry: z.array(z.tuple([z.number(), z.number()])).min(2).max(2000),
});

/**
 * POST /elevation-profile
 * Nimmt eine Route als GeoJSON-Geometrie ([lat, lng]-Paare) entgegen und gibt
 * das Hoehenprofil als Array von {distanceKm, altM}-Paaren zurueck.
 * Der swisstopo-Profildienst (api3.geo.admin.ch) liefert die Hoehenangaben.
 */
router.post("/elevation-profile", async (req: Request, res: Response): Promise<void> => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "geometry als Array von [lat, lng]-Paaren erwartet (min. 2 Punkte)." });
    return;
  }
  const { geometry } = parsed.data;
  const points = geometry.map(([lat, lng]) => ({ lat, lng }));

  try {
    const profile = await computeElevationProfile(points, req.log);
    if (!profile) {
      res.status(502).json({ error: "Hoehenprofil konnte nicht geladen werden." });
      return;
    }
    res.json({ profile });
  } catch (err) {
    req.log.error({ err }, "Hoehenprofil-Berechnung fehlgeschlagen");
    res.status(502).json({ error: "Hoehenprofil konnte nicht geladen werden." });
  }
});

export default router;
