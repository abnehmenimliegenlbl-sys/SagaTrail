import { Router, type IRouter } from "express";
import { GetRoutePhotoResponse, GetRoutePhotoQueryParams } from "@workspace/api-zod";
import { getCachedRoutePhoto } from "../lib/commonsPhoto";

const router: IRouter = Router();

// Repraesentatives, moeglichst saisonpassendes Foto nahe dem Routenstart.
// Liefert bewusst 200 mit photoUrl null statt eines Fehlers: kein Foto zu
// haben ist ein normaler Zustand, der Client zeigt dann sein Fallback-Bild.
router.get("/routes/photo", async (req, res): Promise<void> => {
  const parsed = GetRoutePhotoQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Koordinaten" });
    return;
  }
  const { lat, lng } = parsed.data;
  const foto = await getCachedRoutePhoto(lat, lng, req.log);
  res.json(GetRoutePhotoResponse.parse(foto));
});

export default router;
