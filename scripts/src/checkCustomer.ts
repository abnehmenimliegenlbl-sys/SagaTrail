// Einmalige Diagnose: prueft einen RevenueCat-Customer (Aliases, aktive
// Entitlements, Abos, Kaeufe). Aufruf: tsx src/checkCustomer.ts <customer_id>
import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  getCustomer,
  listCustomerAliases,
  listCustomerActiveEntitlements,
  listSubscriptions,
  listPurchases,
  listEntitlements,
} from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID!;

async function main() {
  const customerId = process.argv[2];
  if (!customerId) throw new Error("customer_id fehlt");
  const client = await getUncachableRevenueCatClient();

  const { data: cust, response } = await getCustomer({
    client,
    path: { project_id: PROJECT_ID, customer_id: customerId },
  });
  console.log("Customer:", response?.status, JSON.stringify(cust));

  const { data: aliases } = await listCustomerAliases({
    client,
    path: { project_id: PROJECT_ID, customer_id: customerId },
    query: { limit: 20 },
  });
  console.log("Aliases:", (aliases?.items ?? []).map((a) => a.id).join(", "));

  const { data: entMap } = await listEntitlements({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 50 },
  });
  const keyById = new Map((entMap?.items ?? []).map((e) => [e.id, e.lookup_key]));

  const { data: active } = await listCustomerActiveEntitlements({
    client,
    path: { project_id: PROJECT_ID, customer_id: customerId },
    query: { limit: 100 },
  });
  console.log(
    "Aktive Entitlements:",
    (active?.items ?? [])
      .map((e) => `${keyById.get(e.entitlement_id) ?? e.entitlement_id} (expires=${e.expires_at})`)
      .join(", ") || "KEINE",
  );

  const { data: subs } = await listSubscriptions({
    client,
    path: { project_id: PROJECT_ID, customer_id: customerId },
    query: { limit: 20 },
  });
  for (const s of subs?.items ?? []) {
    console.log(
      `Sub: product=${s.product_id} status=${s.status} store=${s.store} env=${s.environment} expires=${s.current_period_ends_at}`,
    );
  }

  const { data: purchases } = await listPurchases({
    client,
    path: { project_id: PROJECT_ID, customer_id: customerId },
    query: { limit: 20 },
  });
  for (const p of purchases?.items ?? []) {
    console.log(
      `Kauf: product=${p.product_id} status=${p.status} store=${p.store} env=${p.environment}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
