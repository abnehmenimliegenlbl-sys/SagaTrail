import { Router, type IRouter } from "express";
import { GetRoutePhotoResponse, GetSagaPhotoQueryParams } from "@workspace/api-zod";
import { getCachedSagaPhoto } from "../lib/commonsPhoto";
import { db, catalogSagasTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";

const router: IRouter = Router();

// Thematisch passendes Foto fuer eine Sage (Kernmotiv-Volltextsuche statt Ort).
// Liefert bewusst 200 mit photoUrl null statt eines Fehlers: kein Foto zu
// haben ist ein normaler Zustand, der Client zeigt dann sein Fallback-Bild.
// Optionaler `sagaId`-Parameter: wenn angegeben und ein Foto gefunden wird,
// wird es in catalog_sagas persistiert (dauerhafter Cache wie bei Routen).
router.get("/sagas/photo", async (req, res): Promise<void> => {
  const parsed = GetSagaPhotoQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Anfrage" });
    return;
  }
  const { query } = parsed.data;
  const sagaId = typeof req.query.sagaId === "string" ? req.query.sagaId : null;
  const foto = await getCachedSagaPhoto(query, req.log);

  // Foto dauerhaft in catalog_sagas speichern — kein Extra-Request beim nächsten Laden.
  // Vorhandene URL nie mit null überschreiben (COALESCE-Logik, analog zu Routen).
  if (sagaId && foto.photoUrl) {
    db.update(catalogSagasTable)
      .set({ fotoUrl: foto.photoUrl, fotoAttribution: foto.attribution })
      .where(and(eq(catalogSagasTable.id, sagaId), isNull(catalogSagasTable.fotoUrl)))
      .execute()
      .then(() => req.log.info({ sagaId, photoUrl: foto.photoUrl }, "Sagenfoto in DB gespeichert"))
      .catch((err) => req.log.warn({ err, sagaId }, "Sagenfoto-Rueckschreiben fehlgeschlagen"));
  }

  res.json(GetRoutePhotoResponse.parse(foto));
});

export default router;
