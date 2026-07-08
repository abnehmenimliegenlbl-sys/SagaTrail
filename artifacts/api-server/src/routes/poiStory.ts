import { Router, type IRouter } from "express";
import { GetPoiStoryResponse, GetPoiStoryQueryParams } from "@workspace/api-zod";
import { narratePoi } from "../lib/poiNarrator";

const router: IRouter = Router();

// Wikipedia-Auszug eines POI live per KI in Sagen-Erzaehlton umschreiben.
// Ohne Auszug entsteht ein zurueckhaltender Kontext aus Name + OSM-Kategorie.
router.get("/routes/poi-story", async (req, res): Promise<void> => {
  const parsed = GetPoiStoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Anfrage" });
    return;
  }
  const { name, extract, kind, lang } = parsed.data;
  try {
    const text = await narratePoi({ name, extract, kind, lang }, req.log);
    res.json(GetPoiStoryResponse.parse({ text }));
  } catch (err) {
    req.log.error({ err }, "POI-Erzaehltext konnte nicht umgeschrieben werden");
    res.status(502).json({ error: "KI-Umschreibung fehlgeschlagen" });
  }
});

export default router;
