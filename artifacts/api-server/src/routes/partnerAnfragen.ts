import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { z } from "zod/v4";
import { db, partnerAnfragenTable } from "@workspace/db";

const router: IRouter = Router();

const AnfrageBody = z.object({
  betriebsName:   z.string().min(2).max(200),
  kategorie:      z.enum(["restaurant", "cafe", "souvenir", "uebernachtung", "sonstiges"]),
  canton:         z.string().min(2).max(30),
  beschreibung:   z.string().max(1000).optional(),
  angebot:        z.string().max(500).optional(),
  website:        z.string().url().max(300).optional().or(z.literal("")),
  adresse:        z.string().max(200).optional(),
  plz:            z.string().max(10).optional(),
  ort:            z.string().max(100).optional(),
  kontaktName:    z.string().min(2).max(200),
  kontaktEmail:   z.email().max(200),
  kontaktTelefon: z.string().max(50).optional(),
  paket:          z.enum(["basic", "standard", "premium"]).default("standard"),
});

/**
 * Öffentlicher Endpunkt für Partnerschafts-Anfragen vom WordPress-Formular.
 * Speichert die Anfrage in partner_anfragen (status = 'neu') zur manuellen
 * Prüfung durch das SagaTrail-Team.
 */
router.post("/partner/anfrage", async (req, res): Promise<void> => {
  const parsed = AnfrageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungültige Anfrage", details: parsed.error.message });
    return;
  }

  const data = parsed.data;

  try {
    const [row] = await db
      .insert(partnerAnfragenTable)
      .values({
        id:             randomUUID(),
        betriebsName:   data.betriebsName,
        kategorie:      data.kategorie,
        canton:         data.canton,
        beschreibung:   data.beschreibung ?? null,
        angebot:        data.angebot ?? null,
        website:        data.website || null,
        adresse:        data.adresse ?? null,
        plz:            data.plz ?? null,
        ort:            data.ort ?? null,
        kontaktName:    data.kontaktName,
        kontaktEmail:   data.kontaktEmail,
        kontaktTelefon: data.kontaktTelefon ?? null,
        paket:          data.paket,
        status:         "neu",
      })
      .returning({ id: partnerAnfragenTable.id });

    req.log.info(
      { id: row.id, email: data.kontaktEmail, betrieb: data.betriebsName },
      "Partner-Anfrage eingegangen"
    );

    res.status(201).json({ ok: true, id: row.id });
  } catch (err) {
    req.log.error({ err }, "Partner-Anfrage konnte nicht gespeichert werden");
    res.status(500).json({ error: "Anfrage konnte nicht gespeichert werden" });
  }
});

export default router;
