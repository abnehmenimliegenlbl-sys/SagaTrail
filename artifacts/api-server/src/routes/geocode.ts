import { Router, type IRouter } from "express";
import { SearchPlacesQueryParams, SearchPlacesResponse } from "@workspace/api-zod";
import { searchPlaces } from "../lib/geocoding";

const router: IRouter = Router();

// Orts-/Adressvorschlaege fuer die Eigene-Route-Eingabe (Start/Ziel).
router.get("/routes/geocode", async (req, res): Promise<void> => {
  const parsed = SearchPlacesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Sucheingabe" });
    return;
  }
  try {
    const results = await searchPlaces(parsed.data.q, req.log);
    res.json(SearchPlacesResponse.parse(results));
  } catch (err) {
    req.log.error({ err }, "Ortssuche fehlgeschlagen");
    res.status(502).json({ error: "Externe Datenquelle nicht erreichbar" });
  }
});

export default router;
