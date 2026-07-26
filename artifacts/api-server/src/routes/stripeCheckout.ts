/**
 * Partner-Stripe-Checkout
 * POST /api/partner/checkout  → Stripe-Checkout-Session erstellen, URL zurückgeben
 * GET  /api/partner/checkout/success → Erfolgsseite nach Zahlung
 */
import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import { getUncachableStripeClient } from "../lib/stripeClient";

const router: IRouter = Router();

const CheckoutBody = z.object({
  betriebsName:       z.string().min(1).max(200),
  kategorie:          z.string().min(1),
  canton:             z.string().min(1),
  adresse:            z.string().optional().default(""),
  plz:                z.string().optional().default(""),
  ort:                z.string().optional().default(""),
  kontaktName:        z.string().min(1).max(200),
  email:              z.string().email(),
  telefon:            z.string().optional().default(""),
  paket:              z.enum(["basic", "standard", "premium"]),
  abrechnungsperiode: z.enum(["monatlich", "jaehrlich"]).default("jaehrlich"),
  // Wohin nach Zahlung zurückkehren (der WordPress-Host)
  returnHost:         z.string().optional().default("https://sagatrail.ch"),
});

// Stripe-Preis-IDs je Paket (werden beim Seeden gesetzt und danach nicht mehr geändert)
// Die tatsächlichen IDs kommen aus Stripe via Metadata auf den Produkten.
// Wir suchen zur Laufzeit nach dem passenden aktiven Preis.
const PAKET_METADATA: Record<string, { name: string; interval: string }> = {
  "basic_monatlich":  { name: "SagaTrail Basic",    interval: "month" },
  "basic_jaehrlich":  { name: "SagaTrail Basic",    interval: "year"  },
  "standard_jaehrlich": { name: "SagaTrail Standard", interval: "year" },
  "premium_jaehrlich":  { name: "SagaTrail Premium",  interval: "year" },
};

router.post("/partner/checkout", async (req, res): Promise<void> => {
  const parsed = CheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungültige Angaben.", details: parsed.error.issues });
    return;
  }

  const d = parsed.data;
  const paketKey = `${d.paket}_${d.abrechnungsperiode}`;
  const paketInfo = PAKET_METADATA[paketKey];

  if (!paketInfo) {
    res.status(400).json({ error: `Ungültige Kombination: ${paketKey}` });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();

    // Passendes Produkt + Preis aus Stripe suchen
    const products = await stripe.products.search({
      query: `name:'${paketInfo.name}' AND active:'true'`,
    });

    if (products.data.length === 0) {
      req.log.error({ paketKey }, "Stripe-Produkt nicht gefunden");
      res.status(503).json({ error: "Produkt noch nicht in Stripe angelegt. Bitte wenden Sie sich an info@sagatrail.ch." });
      return;
    }

    const product = products.data[0];

    // Passenden Preis nach Interval finden
    const prices = await stripe.prices.list({ product: product.id, active: true });
    const price = prices.data.find(
      (p) => p.recurring?.interval === paketInfo.interval,
    );

    if (!price) {
      req.log.error({ paketKey, productId: product.id }, "Passender Stripe-Preis nicht gefunden");
      res.status(503).json({ error: "Preis noch nicht konfiguriert. Bitte wenden Sie sich an info@sagatrail.ch." });
      return;
    }

    // Stripe-Kunde erstellen
    const customer = await stripe.customers.create({
      email: d.email,
      name:  d.kontaktName,
      metadata: { betriebsName: d.betriebsName, canton: d.canton },
    });

    // Checkout-Session mit allen Partner-Daten in Metadata
    const successUrl = `${d.returnHost}/portal/?session_id={CHECKOUT_SESSION_ID}&checkout=success`;
    const cancelUrl  = `${d.returnHost}/partner/?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      customer:             customer.id,
      payment_method_types: ["card"],
      line_items:           [{ price: price.id, quantity: 1 }],
      mode:                 "subscription",
      subscription_data:    { trial_period_days: 30 },
      success_url:          successUrl,
      cancel_url:           cancelUrl,
      locale:               "de",
      metadata: {
        flow:               "partner_onboarding",
        betriebsName:       d.betriebsName,
        kategorie:          d.kategorie,
        canton:             d.canton,
        adresse:            d.adresse,
        plz:                d.plz,
        ort:                d.ort,
        kontaktName:        d.kontaktName,
        email:              d.email,
        telefon:            d.telefon,
        paket:              d.paket,
        abrechnungsperiode: d.abrechnungsperiode,
      },
    });

    req.log.info({ sessionId: session.id, email: d.email, paketKey }, "Stripe-Checkout-Session erstellt");
    res.json({ url: session.url });
  } catch (err: any) {
    req.log.error({ err }, "Fehler beim Erstellen der Stripe-Checkout-Session");
    res.status(500).json({ error: "Stripe-Fehler: " + (err.message ?? "Unbekannter Fehler") });
  }
});

export default router;
