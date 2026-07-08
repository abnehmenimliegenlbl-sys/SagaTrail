import { Router, type IRouter } from "express";
import { ImportGpxRouteBody, ImportGpxRouteResponse } from "@workspace/api-zod";
import { CustomRouteError } from "../lib/customRoute";
import { buildGpxRoute } from "../lib/gpxRoute";

const router: IRouter = Router();

// Importiert eine GPX-Datei als angereicherte Wanderroute.
router.post("/routes/gpx", async (req, res): Promise<void> => {
  const parsed = ImportGpxRouteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Anfrage: GPX-Inhalt fehlt" });
    return;
  }
  try {
    const route = await buildGpxRoute(parsed.data.gpx, parsed.data.name, req.log);
    res.json(ImportGpxRouteResponse.parse(route));
  } catch (err) {
    if (err instanceof CustomRouteError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "GPX-Route konnte nicht importiert werden");
    res.status(502).json({ error: "Externe Datenquelle nicht erreichbar" });
  }
});

export default router;
