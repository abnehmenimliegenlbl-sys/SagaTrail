import { Router, type IRouter } from "express";
import { GetPoisResponse, GetPoisQueryParams } from "@workspace/api-zod";
import type { EnrichedPoi } from "../lib/routeService";
import { getPois } from "../lib/routeService";

const router: IRouter = Router();

function toPoi(p: EnrichedPoi) {
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    lat: p.lat,
    lng: p.lng,
    wiki: p.wiki ?? undefined,
  };
}

// Historische/touristische Orte in einem Kartenausschnitt, live mit
// Wikipedia-Zusammenfassungen angereichert (POI-verknuepfte Live-Anreicherung).
router.get("/routes/pois", async (req, res): Promise<void> => {
  const parsed = GetPoisQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Bounding Box" });
    return;
  }
  const { south, west, north, east } = parsed.data;
  try {
    const pois = await getPois({ south, west, north, east }, req.log);
    res.json(GetPoisResponse.parse(pois.map(toPoi)));
  } catch (err) {
    req.log.error({ err }, "POIs konnten nicht geladen werden");
    res.status(502).json({ error: "Externe Datenquelle nicht erreichbar" });
  }
});

export default router;
