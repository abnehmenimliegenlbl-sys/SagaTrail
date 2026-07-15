import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, eq, gte, lte, or, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { partnersTable } from "@workspace/db/schema";
import { fetchAlpineHuts, type RawAlpineHut } from "../lib/overpass";

const router: IRouter = Router();

const QuerySchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radius: z.coerce.number().min(500).max(25_000).default(12_000),
});

/** Haversine-Distanz in Metern zwischen zwei Koordinatenpaaren. */
function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/**
 * GET /sac-huetten?lat=&lng=&radius=
 * Liefert alpine Hütten (Overpass) im Umkreis, angereichert mit
 * Partner-Daten falls eine SAC-Hütte als Enhanced-Listing eingetragen ist.
 */
router.get("/sac-huetten", async (req: Request, res: Response): Promise<void> => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "lat, lng und radius (optional) erwartet." });
    return;
  }
  const { lat, lng, radius } = parsed.data;

  try {
    const [huts, partners] = await Promise.all([
      fetchAlpineHuts({ lat, lng }, radius, req.log),
      (async () => {
        const deg = radius / 111_000;
        const now = new Date();
        return db
          .select()
          .from(partnersTable)
          .where(
            and(
              eq(partnersTable.kategorie, "sac_huette"),
              eq(partnersTable.isActive, true),
              gte(partnersTable.lat, lat - deg),
              lte(partnersTable.lat, lat + deg),
              gte(partnersTable.lng, lng - deg),
              lte(partnersTable.lng, lng + deg),
              or(isNull(partnersTable.aktivVon), lte(partnersTable.aktivVon, now)),
              or(isNull(partnersTable.aktivBis), gte(partnersTable.aktivBis, now)),
            )
          );
      })(),
    ]);

    const MATCH_RADIUS_M = 400;

    const enriched = huts.map((hut: RawAlpineHut) => {
      const partner = partners.find(
        (p) => distanceM({ lat: p.lat, lng: p.lng }, { lat: hut.lat, lng: hut.lng }) < MATCH_RADIUS_M
      ) ?? null;
      return {
        osmId: hut.osmId,
        name: partner?.name ?? hut.name,
        lat: hut.lat,
        lng: hut.lng,
        telefon: partner?.telefon ?? hut.telefon,
        websiteUrl: partner?.websiteUrl ?? hut.websiteUrl,
        elevation: hut.elevation,
        openingHours: hut.openingHours,
        isPartner: partner != null,
        partnerId: partner?.id ?? null,
        beschreibung: partner?.beschreibung ?? null,
        angebot: partner?.angebot ?? null,
        fotoUrl: partner?.fotoUrl ?? null,
      };
    });

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "SAC-Hütten konnten nicht geladen werden");
    res.status(502).json({ error: "SAC-Hütten konnten nicht geladen werden." });
  }
});

export default router;
