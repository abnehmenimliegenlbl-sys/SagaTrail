import { getUncachableStripeClient } from "./stripeClient";

async function cleanup() {
  const stripe = await getUncachableStripeClient();

  // Doppelte Produkte finden und älteres deaktivieren
  const names = ["SagaTrail Basic", "SagaTrail Standard", "SagaTrail Premium"];

  for (const name of names) {
    const results = await stripe.products.search({ query: `name:'${name}' AND active:'true'` });
    if (results.data.length <= 1) {
      console.log(`✓ ${name}: kein Duplikat`);
      continue;
    }
    // Nach Erstelldatum sortieren — neuestes behalten, ältere deaktivieren
    const sorted = results.data.sort((a, b) => b.created - a.created);
    console.log(`⚠ ${name}: ${sorted.length} Duplikate — behalte ${sorted[0].id}`);
    for (const old of sorted.slice(1)) {
      await stripe.products.update(old.id, { active: false });
      console.log(`  ✗ Deaktiviert: ${old.id}`);
    }
  }

  // Alle aktiven Produkte + Preise anzeigen
  console.log("\n── Aktive Produkte ──");
  for (const name of names) {
    const r = await stripe.products.search({ query: `name:'${name}' AND active:'true'` });
    if (r.data.length === 0) { console.log(`${name}: nicht gefunden`); continue; }
    const p = r.data[0];
    const prices = await stripe.prices.list({ product: p.id, active: true });
    console.log(`\n${p.name} (${p.id})`);
    for (const pr of prices.data) {
      const chf = ((pr.unit_amount ?? 0) / 100).toFixed(2);
      console.log(`  CHF ${chf}/${pr.recurring?.interval ?? "einmalig"}  →  ${pr.id}`);
    }
  }
}

cleanup().catch(e => { console.error(e.message); process.exit(1); });
