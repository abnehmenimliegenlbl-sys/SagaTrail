import { Router, type IRouter } from "express";
import { SearchPlacesQueryParams, SearchPlacesResponse } from "@workspace/api-zod";
import { reverseGeocode, searchPlaces } from "../lib/geocoding";

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

// Ermittelt den naechsten Ort zu einer aktuellen GPS-Position.
router.get("/routes/reverse-geocode", async (req, res): Promise<void> => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ error: "Ungueltige Koordinaten" });
    return;
  }
  try {
    const result = await reverseGeocode(lat, lng, req.log);
    res.json({ place: result.place, found: result.found });
  } catch (err) {
    req.log.error({ err }, "Reverse-Geocoding fehlgeschlagen");
    res.status(502).json({ error: "Externe Datenquelle nicht erreichbar" });
  }
});

export default router;
