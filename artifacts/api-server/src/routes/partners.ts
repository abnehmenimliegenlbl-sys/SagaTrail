import { Router, type Request, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { GetPartnersResponse, GetPartnersQueryParams } from "@workspace/api-zod";
import { db, partnersTable, type PartnerRow } from "@workspace/db";
import { getPartners } from "../lib/routeService";
import { berechneOeffnungsStatus } from "../lib/oeffnungszeitenLogic";
import { translatePartnerContent } from "../lib/partnerTranslator";

const router: IRouter = Router();

function toPartner(p: PartnerRow, req: Request) {
  const status = berechneOeffnungsStatus(p.oeffnungszeiten);
  const rawFoto = p.fotoUrl ?? null;
  const fotoUrl = rawFoto?.startsWith("/objects/")
    ? `${req.protocol}://${req.get("host")}/api/partner/foto/${p.id}`
    : rawFoto?.startsWith("/")
      ? `${req.protocol}://${req.get("host")}${rawFoto}`
      : rawFoto;
  return {
    id: p.id,
    name: p.name,
    kategorie: p.kategorie,
    canton: p.canton,
    beschreibung: p.beschreibung ?? null,
    angebot: p.angebot ?? null,
    fotoUrl,
    lat: p.lat,
    lng: p.lng,
    paket: p.paket ?? null,
    telefon: p.telefon ?? null,
    websiteUrl: p.websiteUrl ?? null,
    reservierungUrl: p.reservierungUrl ?? null,
    oeffnungszeiten: p.oeffnungszeiten ?? null,
    istOffen: status.istOffen,
    schliesstUm: status.schliesstUm,
    oeffnetAmTag: status.oeffnetAmTag,
    oeffnetUm: status.oeffnetUm,
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
    res.json(GetPartnersResponse.parse(partner.map((p) => toPartner(p, req))));
  } catch (err) {
    req.log.error({ err }, "Partner konnten nicht geladen werden");
    res.status(502).json({ error: "Partner konnten nicht geladen werden" });
  }
});

// GET /partners/:id/translate?lang=fr — beschreibung + angebot in Zielsprache übersetzen
router.get("/partners/:id/translate", async (req, res): Promise<void> => {
  const id = req.params.id as string;
  const lang = (req.query.lang as string | undefined)?.toLowerCase() ?? "de";

  // Für Deutsch (und gsw) keine Übersetzung nötig — Texte sind primär Deutsch
  if (lang === "de" || lang === "gsw") {
    res.json({ beschreibung: null, angebot: null });
    return;
  }

  try {
    const rows = await db.select().from(partnersTable).where(eq(partnersTable.id, id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "Partner nicht gefunden" }); return; }
    const p = rows[0];
    const result = await translatePartnerContent(
      id,
      p.beschreibung ?? null,
      p.angebot ?? null,
      lang,
      req.log,
    );
    res.json(result);
  } catch (err: any) {
    req.log.error({ err, partnerId: id, lang }, "Partner-Übersetzung fehlgeschlagen");
    // Graceful degradation: leere Antwort → Client zeigt Originaltext
    res.json({ beschreibung: null, angebot: null });
  }
});

// Partner-Aufruf tracken (fire-and-forget vom Client beim Öffnen des Modals).
// Kein Auth, da die Partner-ID öffentlich ist.
router.post("/partners/:id/view", async (req, res): Promise<void> => {
  const id = req.params.id as string;
  try {
    await db
      .update(partnersTable)
      .set({ views: sql`${partnersTable.views} + 1` })
      .where(eq(partnersTable.id, id));
    res.status(204).end();
  } catch {
    res.status(204).end(); // still 204 — tracking must never break the UX
  }
});

// Angebot-Tipp tracken (fire-and-forget vom Client).
router.post("/partners/:id/tap", async (req, res): Promise<void> => {
  const id = req.params.id as string;
  try {
    await db
      .update(partnersTable)
      .set({ offersTapped: sql`${partnersTable.offersTapped} + 1` })
      .where(eq(partnersTable.id, id));
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
});

export default router;
