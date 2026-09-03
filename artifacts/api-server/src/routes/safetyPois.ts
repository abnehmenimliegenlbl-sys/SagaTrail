import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { fetchSafetyPois } from "../lib/overpass";

const router: IRouter = Router();
const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(500).max(20_000).default(8_000),
});

function withTimeout<T>(promise: Promise<T>, fallback: T, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

router.get("/safety-pois", async (req: Request, res: Response): Promise<void> => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "lat, lng und radius erwartet." });
    return;
  }
  try {
    const data = await withTimeout(
      fetchSafetyPois(parsed.data, parsed.data.radius, req.log),
      [],
      8_000,
    );
    res.set("Cache-Control", "public, max-age=300");
    res.json(data);
  } catch (err) {
    req.log.warn({ err }, "Sicherheits-POIs nicht erreichbar");
    res.json([]);
  }
});

export default router;