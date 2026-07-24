import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { z } from "zod/v4";
import { eq } from "drizzle-orm";
import { db, verbandAnfragenTable } from "@workspace/db";
import { sendVerbandVertrag } from "../lib/verbandEmail";

const router: IRouter = Router();

const ALLE_KANTONE = [
  "Aargau","Appenzell Ausserrhoden","Appenzell Innerrhoden",
  "Basel-Landschaft","Basel-Stadt","Bern","Freiburg","Genf",
  "Glarus","Graubünden","Jura","Luzern","Neuenburg","Nidwalden",
  "Obwalden","Schaffhausen","Schwyz","Solothurn","St. Gallen",
  "Tessin","Thurgau","Uri","Waadt","Wallis","Zug","Zürich",
];

const VerbandAnfrageBody = z.object({
  verbandName:    z.string().min(2).max(200),
  email:          z.email().max(200),
  kontaktName:    z.string().min(2).max(200),
  kontaktTelefon: z.string().max(50).optional().or(z.literal("")),
  kantone:        z.union([
    z.literal("alle"),
    z.array(z.string().min(1)).min(1),
  ]),
});

/**
 * POST /verband/anfrage
 * Öffentlicher Endpunkt vom WordPress-Formular sagatrail.ch/tourismusverband.
 * Speichert die Anfrage, generiert den Pilotvertrag als PDF und sendet ihn per
 * E-Mail an die Kontaktperson sowie intern an info@sagatrail.ch.
 */
router.post("/verband/anfrage", async (req, res): Promise<void> => {
  const parsed = VerbandAnfrageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungültige Anfrage", details: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const kantoneStr =
    d.kantone === "alle" ? "alle" : (d.kantone as string[]).join(",");

  // Validate kantone values (if not "alle")
  if (d.kantone !== "alle") {
    const invalid = (d.kantone as string[]).filter(k => !ALLE_KANTONE.includes(k));
    if (invalid.length > 0) {
      res.status(400).json({ error: `Ungültige Kantone: ${invalid.join(", ")}` });
      return;
    }
  }

  const id  = randomUUID();
  const now = new Date();

  // 1) In DB speichern
  try {
    await db.insert(verbandAnfragenTable).values({
      id,
      verbandName:    d.verbandName,
      email:          d.email,
      kontaktName:    d.kontaktName,
      kontaktTelefon: d.kontaktTelefon || null,
      kantone:        kantoneStr,
      status:         "neu",
      contractSentAt: null,
    });
  } catch (err) {
    req.log.error({ err }, "Verband-Anfrage konnte nicht gespeichert werden");
    res.status(500).json({ error: "Anfrage konnte nicht gespeichert werden" });
    return;
  }

  // 2) Vertrag per E-Mail senden (fire-and-forget mit Logging)
  const emailData = {
    verbandName:    d.verbandName,
    email:          d.email,
    kontaktName:    d.kontaktName,
    kontaktTelefon: d.kontaktTelefon || null,
    kantone:        kantoneStr,
  };

  sendVerbandVertrag(emailData)
    .then(async () => {
      req.log.info({ id, email: d.email }, "Verband-Vertrag erfolgreich gesendet");
      await db
        .update(verbandAnfragenTable)
        .set({ contractSentAt: now, updatedAt: now })
        .where(eq(verbandAnfragenTable.id, id))
        .execute();
    })
    .catch((err: unknown) => {
      req.log.error({ err, id }, "Verband-Vertrag E-Mail fehlgeschlagen");
    });

  res.status(201).json({ ok: true, id });
});

export default router;
