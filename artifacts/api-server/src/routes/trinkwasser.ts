import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { fetchDrinkingWater } from "../lib/overpass";

const router: IRouter = Router();

const QuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radius: z.coerce.number().min(500).max(20_000).default(8_000),
});

/**
 * GET /trinkwasser?lat=&lng=&radius=
 * Liefert oeffentliche Trinkwasserquellen (Brunnen, Trinkwasserstellen) im
 * Umkreis einer Koordinate — gefiltert aus OpenStreetMap ueber Overpass API.
 */
router.get("/trinkwasser", async (req: Request, res: Response): Promise<void> => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "lat und lng erwartet." });
    return;
  }
  const { lat, lng, radius } = parsed.data;
  try {
    const sources = await fetchDrinkingWater({ lat, lng }, radius, req.log);
    res.json(sources);
  } catch (err) {
    req.log.error({ err }, "Trinkwasser konnten nicht geladen werden");
    res.status(502).json({ error: "Trinkwasserquellen konnten nicht geladen werden." });
  }
});

export default router;
