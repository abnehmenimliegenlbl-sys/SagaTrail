import { Router, type IRouter } from "express";
import {
  GetCustomRouteQueryParams,
  GetCustomRouteResponse,
  PlanCustomRouteBody,
  PlanDrawnRouteBody,
} from "@workspace/api-zod";
import {
  buildCustomRoute,
  buildCustomRouteThroughWaypoints,
  buildCustomRouteFromDrawnPoints,
  CustomRouteError,
} from "../lib/customRoute";

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

router.post("/routes/custom-waypoints", async (req, res): Promise<void> => {
  const parsed = PlanCustomRouteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bitte mindestens zwei Wegpunkte angeben." });
    return;
  }
  try {
    const route = await buildCustomRouteThroughWaypoints(
      parsed.data.points,
      req.log,
    );
    res.json(GetCustomRouteResponse.parse(route));
  } catch (err) {
    if (err instanceof CustomRouteError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "Wegpunkt-Route konnte nicht berechnet werden");
    res.status(502).json({ error: "Externe Datenquelle nicht erreichbar" });
  }
});

router.post("/routes/custom-drawn", async (req, res): Promise<void> => {
  const parsed = PlanDrawnRouteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bitte eine gezeichnete Linie mit mindestens zwei Punkten senden." });
    return;
  }
  req.log.info(
    { inputPoints: parsed.data.points.length },
    "Freihand-Linie empfangen",
  );
  try {
    const route = await buildCustomRouteFromDrawnPoints(parsed.data.points, req.log);
    req.log.info(
      { inputPoints: parsed.data.points.length, outputPoints: route.geometry.length },
      "Freihand-Linie verarbeitet",
    );
    res.json(GetCustomRouteResponse.parse(route));
  } catch (err) {
    if (err instanceof CustomRouteError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "Freihand-Route konnte nicht gemappt werden");
    res.status(502).json({ error: "Externe Datenquelle nicht erreichbar" });
  }
});

export default router;
