import { Router, type IRouter } from "express";
import { GetRoutePhotoResponse, GetRoutePhotoQueryParams } from "@workspace/api-zod";
import { getCachedRoutePhoto } from "../lib/commonsPhoto";
import { db, externalRoutesTable, catalogSagasTable } from "@workspace/db";
import { and, eq, isNull, sql } from "drizzle-orm";

const router: IRouter = Router();

// Repraesentatives, moeglichst saisonpassendes Foto nahe dem Routenstart.
// Liefert bewusst 200 mit photoUrl null statt eines Fehlers: kein Foto zu
// haben ist ein normaler Zustand, der Client zeigt dann sein Fallback-Bild.
// Optionaler `routeId`-Parameter: wenn angegeben und ein Foto gefunden wird,
// wird es in external_routes zurueckgeschrieben (persistenter Cache).
router.get("/routes/photo", async (req, res): Promise<void> => {
  const parsed = GetRoutePhotoQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Koordinaten" });
    return;
  }
  const { lat, lng } = parsed.data;
  const routeId = typeof req.query.routeId === "string" ? req.query.routeId : null;
  const sagaId = typeof req.query.sagaId === "string" ? req.query.sagaId : null;
  const routeName = typeof req.query.routeName === "string" ? req.query.routeName : undefined;
  const foto = await getCachedRoutePhoto(lat, lng, req.log, routeName);

  // Foto in DB persistieren, damit es beim naechsten Laden der Route direkt
  // mitgeliefert wird (kein separater Request mehr noetig).
  if (routeId && foto.photoUrl) {
    db.update(externalRoutesTable)
      .set({
        photoUrl: foto.photoUrl,
        photoAttribution: foto.attribution,
      })
      .where(and(eq(externalRoutesTable.id, routeId), isNull(externalRoutesTable.photoUrl)))
      .execute()
      .catch((err) => req.log.warn({ err, routeId }, "Foto-Rueckschreiben fehlgeschlagen"));
  }

  // Koordinaten-Fallback-Foto auch fuer Sagen persistieren, falls sagaId mitgegeben.
  if (sagaId && foto.photoUrl) {
    db.update(catalogSagasTable)
      .set({ fotoUrl: foto.photoUrl, fotoAttribution: foto.attribution })
      .where(and(eq(catalogSagasTable.id, sagaId), isNull(catalogSagasTable.fotoUrl)))
      .execute()
      .then(() => req.log.info({ sagaId, photoUrl: foto.photoUrl }, "Sagenfoto (Koordinaten-Fallback) in DB gespeichert"))
      .catch((err) => req.log.warn({ err, sagaId }, "Sagenfoto-Koordinaten-Rueckschreiben fehlgeschlagen"));
  }

  // Kein sagaId vom Client (altes Binary) → Server-seitig Sage anhand der Koordinaten
  // suchen und Foto zurueckschreiben. Toleranz 0.01 Grad ≈ 1 km.
  if (!sagaId && foto.photoUrl) {
    const TOL = 0.01;
    db.select({ id: catalogSagasTable.id })
      .from(catalogSagasTable)
      .where(
        and(
          isNull(catalogSagasTable.fotoUrl),
          sql`abs(${catalogSagasTable.lat} - ${lat}) < ${TOL}`,
          sql`abs(${catalogSagasTable.lng} - ${lng}) < ${TOL}`,
        ),
      )
      .limit(1)
      .execute()
      .then((rows) => {
        if (!rows.length) return;
        const gefundenId = rows[0].id;
        return db.update(catalogSagasTable)
          .set({ fotoUrl: foto.photoUrl, fotoAttribution: foto.attribution })
          .where(and(eq(catalogSagasTable.id, gefundenId), isNull(catalogSagasTable.fotoUrl)))
          .execute()
          .then(() => req.log.info({ sagaId: gefundenId, photoUrl: foto.photoUrl, lat, lng }, "Sagenfoto (Koordinaten-Reverse-Lookup) in DB gespeichert"));
      })
      .catch((err) => req.log.warn({ err, lat, lng }, "Sagenfoto-Reverse-Lookup fehlgeschlagen"));
  }

  res.json(GetRoutePhotoResponse.parse(foto));
});

export default router;
