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

const QUICK_TIMEOUT_MS = 8_000;
function withTimeout<T>(p: Promise<T>, fallback: T, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
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
    const aerialways = await withTimeout(
      getAerialways({ south, west, north, east }, req.log),
      [],
      QUICK_TIMEOUT_MS,
    );
    res.json(GetAerialwaysResponse.parse(aerialways.map(toAerialway)));
  } catch (err) {
    req.log.warn({ err }, "Seilbahnen Timeout/Fehler — leeres Array");
    res.json(GetAerialwaysResponse.parse([]));
  }
});

export default router;
