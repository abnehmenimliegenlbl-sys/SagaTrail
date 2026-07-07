// Einmalige Diagnose: listet die zuletzt gesehenen Customer des Projekts
// samt aktiven Entitlements, um verwaiste (anonyme) Kaeufe zu finden.
import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listCustomers,
  listCustomerActiveEntitlements,
  listEntitlements,
} from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID!;

async function main() {
  const client = await getUncachableRevenueCatClient();

  const { data: entMap } = await listEntitlements({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 50 },
  });
  const keyById = new Map((entMap?.items ?? []).map((e) => [e.id, e.lookup_key]));

  const { data } = await listCustomers({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });
  for (const c of data?.items ?? []) {
    const { data: active } = await listCustomerActiveEntitlements({
      client,
      path: { project_id: PROJECT_ID, customer_id: c.id },
      query: { limit: 50 },
    });
    const keys = (active?.items ?? []).map(
      (e) => keyById.get(e.entitlement_id) ?? e.entitlement_id,
    );
    console.log(
      `${c.id} | first_seen=${new Date(c.first_seen_at).toISOString()} | aktiv: ${keys.join(", ") || "-"}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
