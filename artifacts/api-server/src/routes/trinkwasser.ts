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
// Sekundaere POI-Daten: max. 8 s warten, dann leeres Array (kein 502).
// So blockiert ein langsames Overpass nie den Route-Detailscreen.
const QUICK_TIMEOUT_MS = 8_000;
function withTimeout<T>(p: Promise<T>, fallback: T, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

router.get("/trinkwasser", async (req: Request, res: Response): Promise<void> => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "lat und lng erwartet." });
    return;
  }
  const { lat, lng, radius } = parsed.data;
  try {
    const sources = await withTimeout(
      fetchDrinkingWater({ lat, lng }, radius, req.log),
      [],
      QUICK_TIMEOUT_MS,
    );
    res.json(sources);
  } catch (err) {
    req.log.warn({ err }, "Trinkwasser Timeout/Fehler — leeres Array");
    res.json([]);
  }
});

export default router;
