import { Router, type IRouter } from "express";
import { GetRouteSurfacesQueryParams, GetRouteSurfacesResponse } from "@workspace/api-zod";
import { fetchRouteSurfaces } from "../lib/overpass";

const router: IRouter = Router();

router.get("/routes/surfaces", async (req, res): Promise<void> => {
  const parsed = GetRouteSurfacesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige osmId" });
    return;
  }
  const { osmId } = parsed.data;
  try {
    const points = await fetchRouteSurfaces(osmId);
    res.json(GetRouteSurfacesResponse.parse({ points }));
  } catch (err) {
    req.log.error({ err }, "Wegoberflaechendaten konnten nicht geladen werden");
    res.status(502).json({ error: "Overpass nicht erreichbar" });
  }
});

export default router;
