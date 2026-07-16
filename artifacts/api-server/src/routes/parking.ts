import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { fetchParking } from "../lib/overpass";

const router: IRouter = Router();

const QuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radius: z.coerce.number().min(200).max(2_000).default(800),
});

/**
 * GET /parking?lat=&lng=&radius=
 * Oeffentliche Parkplaetze (amenity=parking, access!=private) im Umkreis
 * einer Koordinate aus OpenStreetMap/Overpass. Typischerweise am Start und
 * Endpunkt einer Wanderroute aufgerufen.
 */
router.get("/parking", async (req: Request, res: Response): Promise<void> => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "lat und lng erwartet." });
    return;
  }
  const { lat, lng, radius } = parsed.data;
  try {
    const spots = await fetchParking({ lat, lng }, radius, req.log);
    res.json(spots);
  } catch (err) {
    req.log.error({ err }, "Parkplaetze konnten nicht geladen werden");
    res.status(502).json({ error: "Parkplaetze konnten nicht geladen werden." });
  }
});

export default router;
