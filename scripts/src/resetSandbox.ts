// Loescht alle RC-Customers des Projekts (Sandbox-Reset vor Produktionsstart).
// Aufruf: tsx src/resetSandbox.ts
// ACHTUNG: Unwiderruflich. Nur fuer Sandbox/Testbetrieb gedacht.
import { getUncachableRevenueCatClient } from "./revenueCatClient";
import { listCustomers, deleteCustomer } from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID!;

async function main() {
  const client = await getUncachableRevenueCatClient();

  let geloescht = 0;
  let uebersprungen = 0;
  let nextPage: string | null | undefined = undefined;
  let seite = 1;

  console.log("Starte RC-Customer-Reset …\n");

  do {
    const { data, error } = await listCustomers({
      client,
      path: { project_id: PROJECT_ID },
      query: { limit: 100, ...(nextPage ? { starting_after: nextPage } : {}) },
    });

    if (error || !data) {
      console.error("Fehler beim Laden der Customer-Liste:", JSON.stringify(error));
      process.exit(1);
    }

    const items = data.items ?? [];
    console.log(`Seite ${seite}: ${items.length} Customers geladen`);

    for (const customer of items) {
      const { error: delErr } = await deleteCustomer({
        client,
        path: { project_id: PROJECT_ID, customer_id: customer.id },
      });

      if (delErr) {
        const typ = (delErr as Record<string, unknown>)["type"];
        if (typ === "not_found_error") {
          console.log(`  Uebersprungen (nicht gefunden): ${customer.id}`);
          uebersprungen++;
        } else {
          console.warn(`  Loeschen fehlgeschlagen (${customer.id}):`, JSON.stringify(delErr));
          uebersprungen++;
        }
      } else {
        console.log(`  Geloescht: ${customer.id}`);
        geloescht++;
      }

      // Kurze Pause um Rate-Limits zu vermeiden
      await new Promise((r) => setTimeout(r, 100));
    }

    nextPage = data.next_page ?? null;
    seite++;
  } while (nextPage);

  console.log(`\nRC-Reset abgeschlossen: ${geloescht} geloescht, ${uebersprungen} uebersprungen.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
