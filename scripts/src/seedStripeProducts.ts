/**
 * SagaTrail Stripe-Produkte anlegen
 * Idempotent — prüft ob das Produkt bereits existiert bevor es erstellt wird.
 *
 * Ausführen: pnpm --filter @workspace/scripts exec tsx src/seedStripeProducts.ts
 */
import { getUncachableStripeClient } from "../../artifacts/api-server/src/lib/stripeClient";

const PRODUCTS = [
  {
    name: "SagaTrail Basic",
    description: "Ihr Betrieb erscheint als Kartenmarker auf der Wanderroute.",
    prices: [
      { interval: "month" as const, amount: 1499, label: "CHF 14.99/Monat" },
      { interval: "year"  as const, amount: 9900, label: "CHF 99/Jahr" },
    ],
  },
  {
    name: "SagaTrail Standard",
    description: "Mit Foto, Beschreibung und Kontaktdaten auf der Wanderroute.",
    prices: [
      { interval: "year" as const, amount: 19900, label: "CHF 199/Jahr" },
    ],
  },
  {
    name: "SagaTrail Premium",
    description: "Vollständiges Profil + automatische Wanderer-Ansage in der Nähe.",
    prices: [
      { interval: "year" as const, amount: 49900, label: "CHF 499/Jahr" },
    ],
  },
];

async function seed() {
  const stripe = await getUncachableStripeClient();
  console.log("Stripe verbunden. Starte Produkt-Seeding...\n");

  for (const prod of PRODUCTS) {
    // Idempotenz-Check
    const existing = await stripe.products.search({
      query: `name:'${prod.name}' AND active:'true'`,
    });

    let productId: string;
    if (existing.data.length > 0) {
      productId = existing.data[0].id;
      console.log(`✓ Produkt bereits vorhanden: ${prod.name} (${productId})`);
    } else {
      const created = await stripe.products.create({
        name:        prod.name,
        description: prod.description,
      });
      productId = created.id;
      console.log(`+ Produkt erstellt: ${prod.name} (${productId})`);
    }

    // Preise prüfen / erstellen
    const existingPrices = await stripe.prices.list({ product: productId, active: true });

    for (const p of prod.prices) {
      const already = existingPrices.data.find(
        (ep) => ep.recurring?.interval === p.interval && ep.unit_amount === p.amount,
      );
      if (already) {
        console.log(`  ✓ Preis bereits vorhanden: ${p.label} (${already.id})`);
      } else {
        const price = await stripe.prices.create({
          product:   productId,
          currency:  "chf",
          unit_amount: p.amount,
          recurring: { interval: p.interval },
        });
        console.log(`  + Preis erstellt: ${p.label} (${price.id})`);
      }
    }
  }

  console.log("\n✅ Seeding abgeschlossen.");
}

seed().catch((err) => {
  console.error("Fehler:", err.message);
  process.exit(1);
});
