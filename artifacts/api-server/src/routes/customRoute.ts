import { Router, type IRouter } from "express";
import { GetCustomRouteQueryParams, GetCustomRouteResponse } from "@workspace/api-zod";
import { buildCustomRoute, CustomRouteError } from "../lib/customRoute";

const router: IRouter = Router();

// Berechnet eine Wanderroute zwischen zwei selbst gewaehlten Punkten.
router.get("/routes/custom", async (req, res): Promise<void> => {
  const parsed = GetCustomRouteQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Koordinaten" });
    return;
  }
  const { startLat, startLng, endLat, endLng, startLabel, endLabel } = parsed.data;
  try {
    const route = await buildCustomRoute(
      { lat: startLat, lng: startLng },
      { lat: endLat, lng: endLng },
      startLabel,
      endLabel,
      req.log,
    );
    res.json(GetCustomRouteResponse.parse(route));
  } catch (err) {
    if (err instanceof CustomRouteError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "Eigene Route konnte nicht berechnet werden");
    res.status(502).json({ error: "Externe Datenquelle nicht erreichbar" });
  }
});

export default router;
