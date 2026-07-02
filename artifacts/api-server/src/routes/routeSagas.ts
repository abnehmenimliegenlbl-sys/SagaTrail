import { Router, type IRouter } from "express";
import { GetRouteSagaResponse } from "@workspace/api-zod";
import type { CatalogSagaRow } from "@workspace/db";
import { getRouteSaga } from "../lib/routeService";

const router: IRouter = Router();

// Bildet eine kuratierte Katalog-Sage (die naechstgelegene belegte Regionalsage
// zur Route) auf die API-Form ab. Frei erfundene Sagen gibt es nicht mehr.
function toSaga(row: CatalogSagaRow) {
  return {
    id: row.id,
    title: row.title,
    canton: row.canton,
    coreMotif: row.coreMotif,
    mood: row.mood,
    summary: row.summary,
    summaries: row.summaries,
    altersstufenHinweis: row.altersstufenHinweis ?? undefined,
    quelle: row.quelle ?? undefined,
    source: row.source,
    coordinates:
      row.lat != null && row.lng != null
        ? { lat: row.lat, lng: row.lng }
        : undefined,
    koordinatenSicherheit: row.koordinatenSicherheit,
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
    req.log.error({ err, routeId }, "Route-Sage konnte nicht ermittelt werden");
    res.status(502).json({ error: "Sage konnte nicht ermittelt werden" });
  }
});

export default router;
