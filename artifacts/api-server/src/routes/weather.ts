import { Router, type IRouter } from "express";
import { GetWeatherResponse, GetWeatherQueryParams } from "@workspace/api-zod";
import { getCachedWeather } from "../lib/weather";

const router: IRouter = Router();

// Live-Wetter + abgeleiteter Wegzustand fuer den Ausgangspunkt einer Route.
router.get("/routes/weather", async (req, res): Promise<void> => {
  const parsed = GetWeatherQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Koordinaten" });
    return;
  }
  const { lat, lng } = parsed.data;
  try {
    const report = await getCachedWeather(lat, lng, req.log);
    res.json(GetWeatherResponse.parse(report));
  } catch (err) {
    req.log.error({ err }, "Wetterdaten konnten nicht geladen werden");
    res.status(502).json({ error: "Externe Datenquelle nicht erreichbar" });
  }
});

export default router;
