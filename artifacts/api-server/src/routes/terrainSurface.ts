import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

import {
  computeLocalTerrainModel,
  computeRouteTerrainArea,
  computeTerrainCorridor,
} from "../lib/elevation";
import { createOpenTopoPanoramaMap } from "../lib/openTopoMosaic";

const router: IRouter = Router();

const BodySchema = z.object({
  center: z.object({
    lat: z.number().finite().min(45).max(48.5),
    lng: z.number().finite().min(5).max(11),
  }),
  radiusM: z.number().finite().min(100).max(5000).optional(),
  sectors: z.number().int().min(8).max(72).optional(),
  rings: z.number().int().min(4).max(24).optional(),
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

const RouteTerrainAreaBodySchema = z.object({
  geometry: z.array(SwissCoordinateSchema).min(2).max(500),
  options: z
    .object({
      rows: z.number().int().min(12).max(40).default(24),
      columns: z.number().int().min(12).max(40).default(24),
      paddingM: z.number().finite().min(500).max(5000).default(2000),
      viewportAspect: z.number().finite().min(0.4).max(1).default(9 / 19.5),
    })
    .default({}),
});

const PanoramaMapQuerySchema = z.object({
  lat: z.coerce.number().finite().min(45).max(48.5),
  lng: z.coerce.number().finite().min(5).max(11),
  radiusM: z.coerce.number().finite().min(100).max(5000).default(5000),
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

router.get("/terrain-map", async (req: Request, res: Response): Promise<void> => {
  const parsed = PanoramaMapQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Gültige Schweizer Kartenkoordinaten erwartet." });
    return;
  }
  try {
    const png = await createOpenTopoPanoramaMap(
      parsed.data.lat,
      parsed.data.lng,
      parsed.data.radiusM,
    );
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=600");
    res.send(png);
  } catch (err) {
    req.log.error({ err }, "OpenTopoMap-Panoramatextur fehlgeschlagen");
    res.status(502).json({ error: "OpenTopoMap-Panoramatextur konnte nicht geladen werden." });
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

router.post("/terrain-area", async (req: Request, res: Response): Promise<void> => {
  const parsed = RouteTerrainAreaBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Schweizer Routengeometrie erwartet." });
    return;
  }
  const route = parsed.data.geometry.map(([lat, lng]) => ({ lat, lng }));
  try {
    const area = await computeRouteTerrainArea(route, req.log, parsed.data.options);
    if (!area) {
      res.status(502).json({ error: "Rechteckiges Routengelände enthält zu wenige Höhenwerte." });
      return;
    }
    res.json(area);
  } catch (err) {
    req.log.error({ err }, "Rechteckiges Routengelände fehlgeschlagen");
    res.status(502).json({ error: "Rechteckiges Routengelände konnte nicht geladen werden." });
  }
});

export default router;