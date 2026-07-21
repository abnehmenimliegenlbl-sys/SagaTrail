import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { narratePartner } from "../lib/partnerNarrator";

const router: IRouter = Router();

const BodySchema = z.object({
  sagaTitle: z.string().min(1),
  coreMotif: z.string().default(""),
  partnerName: z.string().min(1),
  angebot: z.string().nullable().optional(),
  beschreibung: z.string().nullable().optional(),
  lang: z.string().default("de"),
});

// Saga-kontextuelle Anpreisung eines Premium-Partners, wenn der Wanderer
// sich auf 500 m naehert. Gibt einen kurzen atmosphaerischen Text zurueck,
// der den Partner organisch in die laufende Sage einwebt.
router.post("/partners/:id/announce", async (req, res): Promise<void> => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungueltige Anfrage" });
    return;
  }

  const { sagaTitle, coreMotif, partnerName, angebot, beschreibung, lang } =
    parsed.data;

  try {
    const text = await narratePartner(
      { sagaTitle, coreMotif, partnerName, angebot, beschreibung, lang },
      req.log,
    );
    res.json({ text });
  } catch (err) {
    req.log.error({ err }, "Partner-Anpreisung konnte nicht generiert werden");
    res.status(502).json({ error: "KI-Generierung fehlgeschlagen" });
  }
});

export default router;
