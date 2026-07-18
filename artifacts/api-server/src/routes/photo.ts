import { Router, type IRouter } from "express";
import { GetRoutePhotoResponse, GetRoutePhotoQueryParams } from "@workspace/api-zod";
import { getCachedRoutePhoto } from "../lib/commonsPhoto";
import { db, externalRoutesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
      .where(eq(externalRoutesTable.id, routeId))
      .execute()
      .catch((err) => req.log.warn({ err, routeId }, "Foto-Rueckschreiben fehlgeschlagen"));
  }

  res.json(GetRoutePhotoResponse.parse(foto));
});

export default router;
