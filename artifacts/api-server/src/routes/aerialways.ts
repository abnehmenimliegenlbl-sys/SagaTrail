import { Router, type IRouter } from "express";
import { GetAerialwaysResponse, GetAerialwaysQueryParams } from "@workspace/api-zod";
import type { RawAerialway } from "../lib/overpass";
import { getAerialways } from "../lib/routeService";

const router: IRouter = Router();

function toAerialway(a: RawAerialway) {
  return {
    id: a.id,
    kind: a.kind,
    geometry: a.points.map((p) => [p.lat, p.lng]),
  };
}

// Seilbahnen/Standseilbahnen fuer einen Kartenausschnitt — typische alpine
// Wander-Verkehrsmittel, dienen nur der Kartendarstellung (kein Routing).
router.get("/routes/aerialways", async (req, res): Promise<void> => {
  const parsed = GetAerialwaysQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Bounding Box" });
    return;
  }
  const { south, west, north, east } = parsed.data;
  try {
    const aerialways = await getAerialways({ south, west, north, east }, req.log);
    res.json(GetAerialwaysResponse.parse(aerialways.map(toAerialway)));
  } catch (err) {
    req.log.error({ err }, "Seilbahnen konnten nicht geladen werden");
    res.status(502).json({ error: "Externe Datenquelle nicht erreichbar" });
  }
});

export default router;
