import { Router, type IRouter } from "express";
import { GetPartnersResponse, GetPartnersQueryParams } from "@workspace/api-zod";
import type { PartnerRow } from "@workspace/db";
import { getPartners } from "../lib/routeService";

const router: IRouter = Router();

function toPartner(p: PartnerRow) {
  return {
    id: p.id,
    name: p.name,
    kategorie: p.kategorie,
    canton: p.canton,
    beschreibung: p.beschreibung ?? undefined,
    angebot: p.angebot ?? undefined,
    lat: p.lat,
    lng: p.lng,
  };
}

// Aktive Partnerbetriebe (Restaurants, Souvenirlaeden, ...) in einem
// Kartenausschnitt, gepflegt ueber die interne Admin-Oberflaeche.
router.get("/routes/partners", async (req, res): Promise<void> => {
  const parsed = GetPartnersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Bounding Box" });
    return;
  }
  const { south, west, north, east } = parsed.data;
  try {
    const partner = await getPartners({ south, west, north, east }, req.log);
    res.json(GetPartnersResponse.parse(partner.map(toPartner)));
  } catch (err) {
    req.log.error({ err }, "Partner konnten nicht geladen werden");
    res.status(502).json({ error: "Partner konnten nicht geladen werden" });
  }
});

export default router;
