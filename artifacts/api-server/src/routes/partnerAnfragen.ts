import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";
import { db, partnerAnfragenTable } from "@workspace/db";
import { sendPartnerVertrag, sendAnfrageBestaetigung } from "../lib/partnerEmail";

const router: IRouter = Router();

const AnfrageBody = z.object({
  betriebsName:   z.string().min(2).max(200),
  kategorie:      z.enum(["restaurant", "cafe", "souvenir", "uebernachtung", "sonstiges"]),
  canton:         z.string().min(2).max(30),
  website:        z.string().url().max(300).optional().or(z.literal("")),
  adresse:        z.string().max(200).optional(),
  plz:            z.string().max(10).optional(),
  ort:            z.string().max(100).optional(),
  kontaktName:    z.string().min(2).max(200),
  kontaktEmail:   z.email().max(200),
  kontaktTelefon: z.string().max(50).optional(),
  paket:               z.enum(["basic", "standard", "premium"]).default("standard"),
  typ:                 z.enum(["anfrage", "bestellung"]).default("anfrage"),
  abrechnungsperiode:  z.enum(["monatlich", "jaehrlich"]).optional(),
});

/**
 * Öffentlicher Endpunkt für Partnerschafts-Anfragen vom WordPress-Formular.
 * Speichert die Anfrage in partner_anfragen (status = 'neu') zur manuellen
 * Prüfung durch das SagaTrail-Team.
 *
 * Defensiv: falls die Prod-DB die `typ`-Spalte noch nicht hat (Schema-Lag),
 * wird ein Fallback-Insert ohne `typ` ausgeführt damit keine Daten verloren gehen.
 */
router.post("/partner/anfrage", async (req, res): Promise<void> => {
  const parsed = AnfrageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungültige Anfrage", details: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const id   = randomUUID();
  const now  = new Date();

  try {
    await db
      .insert(partnerAnfragenTable)
      .values({
        id,
        betriebsName:   data.betriebsName,
        kategorie:      data.kategorie,
        canton:         data.canton,
        website:        data.website || null,
        adresse:        data.adresse ?? null,
        plz:            data.plz ?? null,
        ort:            data.ort ?? null,
        kontaktName:    data.kontaktName,
        kontaktEmail:   data.kontaktEmail,
        kontaktTelefon: data.kontaktTelefon ?? null,
        typ:            data.typ,
        paket:          data.paket,
        status:         "neu",
      });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTypMissing = msg.includes("typ") && msg.includes("column");
    if (!isTypMissing) {
      req.log.error({ err }, "Partner-Anfrage konnte nicht gespeichert werden");
      res.status(500).json({ error: "Anfrage konnte nicht gespeichert werden" });
      return;
    }

    // Prod-DB hat noch keine typ-Spalte — Fallback ohne typ
    req.log.warn("typ-Spalte fehlt in prod_db — Fallback-Insert ohne typ");
    try {
      await db.execute(sql`
        INSERT INTO partner_anfragen
          (id, betriebs_name, kategorie, canton, website, adresse, plz, ort,
           kontakt_name, kontakt_email, kontakt_telefon, paket, status, created_at, updated_at)
        VALUES
          (${id}, ${data.betriebsName}, ${data.kategorie}, ${data.canton},
           ${data.website || null}, ${data.adresse ?? null}, ${data.plz ?? null}, ${data.ort ?? null},
           ${data.kontaktName}, ${data.kontaktEmail}, ${data.kontaktTelefon ?? null},
           ${data.paket}, ${"neu"}, ${now}, ${now})
      `);
    } catch (err2) {
      req.log.error({ err: err2 }, "Fallback-Insert fehlgeschlagen");
      res.status(500).json({ error: "Anfrage konnte nicht gespeichert werden" });
      return;
    }
  }

  req.log.info(
    { id, email: data.kontaktEmail, betrieb: data.betriebsName, typ: data.typ },
    "Partner-Anfrage eingegangen"
  );

  // Eingangsbestätigung an den Partner senden (fire-and-forget, immer)
  sendAnfrageBestaetigung({
    betriebsName:  data.betriebsName,
    kontaktName:   data.kontaktName,
    kontaktEmail:  data.kontaktEmail,
    paket:         data.paket,
    typ:           data.typ,
  })
    .then(() => req.log.info({ id }, "Eingangsbestätigung gesendet"))
    .catch((err: unknown) => req.log.error({ err, id }, "Eingangsbestätigung fehlgeschlagen"));

  // Bei Direktbestellungen sofort Vertrag per E-Mail senden (fire-and-forget)
  if (data.typ === "bestellung") {
    sendPartnerVertrag({
      betriebsName:   data.betriebsName,
      kontaktName:    data.kontaktName,
      kontaktEmail:   data.kontaktEmail,
      kontaktTelefon: data.kontaktTelefon ?? null,
      kategorie:      data.kategorie,
      canton:         data.canton,
      adresse:        data.adresse ?? null,
      plz:            data.plz ?? null,
      ort:            data.ort ?? null,
      paket:          data.paket,
    })
      .then(() => req.log.info({ id }, "Partnervertrag (Bestellung) gesendet"))
      .catch((err: unknown) => req.log.error({ err, id }, "Partnervertrag-Versand fehlgeschlagen"));
  }

  res.status(201).json({ ok: true, id });
});

export default router;
