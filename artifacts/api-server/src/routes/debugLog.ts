import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * Nimmt Debug-Log-Zeilen vom Client entgegen und schreibt sie in die
 * Server-Logs. Noetig, weil `console.log` in einem TestFlight-/App-Store-Build
 * nur lokal auf dem Geraet landet — ohne Weiterleitung sind Kauf-Probleme
 * (z.B. der IAP-Freeze) auf einem echten Geraet sonst nur per Mac/Xcode-
 * Konsole einsehbar. Bewusst ohne Auth: die Paywall-Logs werden schon vor
 * einer eventuellen Anmeldung erzeugt, und der Inhalt ist nicht sensibel.
 */
router.post("/debug/log", (req, res) => {
  const { tag, message, data, eventId, emittedAt, sequence } = req.body ?? {};
  req.log.info(
    {
      tag: typeof tag === "string" ? tag : "client",
      eventId: typeof eventId === "string" ? eventId : undefined,
      emittedAt: typeof emittedAt === "string" ? emittedAt : undefined,
      sequence: Number.isFinite(sequence) ? sequence : undefined,
      data,
    },
    `[CLIENT-DEBUG] ${typeof message === "string" ? message : "log"}`
  );
  res.status(204).end();
});

export default router;
