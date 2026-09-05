import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

import { computeLocalTerrainModel, computeTerrainCorridor } from "../lib/elevation";

const router: IRouter = Router();

const BodySchema = z.object({
  center: z.object({
    lat: z.number().finite().min(45).max(48.5),
    lng: z.number().finite().min(5).max(11),
  }),
  radiusM: z.number().finite().min(100).max(5000).optional(),
  sectors: z.number().int().min(8).max(36).optional(),
  rings: z.number().int().min(4).max(16).optional(),
});

const SwissCoordinateSchema = z.tuple([
  z.number().finite().min(45).max(48.5),
  z.number().finite().min(5).max(11),
]);

const CorridorBodySchema = z.object({
  geometry: z.array(SwissCoordinateSchema).min(2).max(500),
  options: z
    .object({
      rows: z.number().int().min(12).max(80).default(32),
      columns: z.number().int().min(5).max(13).default(9),
      halfWidthM: z.number().finite().min(100).max(1500).default(500),
    })
    .default({}),
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

/**
 * POST /terrain-corridor
 * Returns a row-major SwissTopo DTM strip around an entire route. Rows follow
 * route progress and columns are evenly spaced across the requested width.
 */
router.post("/terrain-corridor", async (req: Request, res: Response): Promise<void> => {
  const parsed = CorridorBodySchema.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ issues: parsed.error.issues }, "Terrainkorridor: ungültige Anfrage");
    res.status(400).json({ error: "Schweizer Routengeometrie und gültige Korridoroptionen erwartet." });
    return;
  }

  const route = parsed.data.geometry.map(([lat, lng]) => ({ lat, lng }));
  try {
    const corridor = await computeTerrainCorridor(route, req.log, parsed.data.options);
    if (!corridor) {
      res.status(502).json({ error: "Terrainkorridor enthält zu wenige SwissTopo-Höhenwerte." });
      return;
    }
    res.json(corridor);
  } catch (err) {
    req.log.error({ err, points: route.length }, "Terrainkorridor fehlgeschlagen");
    res.status(502).json({ error: "Terrainkorridor konnte nicht geladen werden." });
  }
});

export default router;