import { Router, type IRouter } from "express";
import { GetRouteSagaResponse } from "@workspace/api-zod";
import type { RouteSagaRow } from "@workspace/db";
import { getRouteSaga } from "../lib/routeService";

const router: IRouter = Router();

function toSaga(row: RouteSagaRow) {
  return {
    id: row.id,
    title: row.title,
    canton: row.canton,
    coreMotif: row.coreMotif,
    mood: row.mood,
    summary: row.summary,
    source: row.source,
    coordinates:
      row.lat != null && row.lng != null
        ? { lat: row.lat, lng: row.lng }
        : undefined,
    isAnchorPlace: row.isAnchorPlace,
  };
}

router.get("/routes/:routeId/saga", async (req, res): Promise<void> => {
  const routeId = Array.isArray(req.params.routeId)
    ? req.params.routeId[0]
    : req.params.routeId;
  try {
    const saga = await getRouteSaga(routeId, req.log);
    if (!saga) {
      res.status(404).json({ error: `Route "${routeId}" nicht gefunden` });
      return;
    }
    res.json(GetRouteSagaResponse.parse(toSaga(saga)));
  } catch (err) {
    req.log.error({ err, routeId }, "Route-Sage konnte nicht erzeugt werden");
    res.status(502).json({ error: "Sage konnte nicht erzeugt werden" });
  }
});

export default router;
