import { Router, type IRouter } from "express";
import { GetRoutePhotoResponse, GetSagaPhotoQueryParams } from "@workspace/api-zod";
import { getCachedSagaPhoto } from "../lib/commonsPhoto";

const router: IRouter = Router();

// Thematisch passendes Foto fuer eine Sage (Kernmotiv-Volltextsuche statt Ort).
// Liefert bewusst 200 mit photoUrl null statt eines Fehlers: kein Foto zu
// haben ist ein normaler Zustand, der Client zeigt dann sein Fallback-Bild.
router.get("/sagas/photo", async (req, res): Promise<void> => {
  const parsed = GetSagaPhotoQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Anfrage" });
    return;
  }
  const { query } = parsed.data;
  const foto = await getCachedSagaPhoto(query, req.log);
  res.json(GetRoutePhotoResponse.parse(foto));
});

export default router;
