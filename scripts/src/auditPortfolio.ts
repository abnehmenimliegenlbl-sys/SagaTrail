// Einmaliges Audit: prueft die Verknuepfungen Entitlement->Produkte und
// Paket->Produkte des SagaTrail-Portfolios in RevenueCat.
import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listEntitlements,
  listOfferings,
  listPackages,
  getProductsFromEntitlement,
  getProductsFromPackage,
} from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID!;

async function main() {
  const client = await getUncachableRevenueCatClient();

  const { data: entList } = await listEntitlements({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 50 },
  });
  console.log("--- Entitlement -> Produkte ---");
  for (const e of entList?.items ?? []) {
    const { data } = await getProductsFromEntitlement({
      client,
      path: { project_id: PROJECT_ID, entitlement_id: e.id },
      query: { limit: 50 },
    });
    const stores = (data?.items ?? []).map((p) => p.store_identifier).sort();
    console.log(`${e.lookup_key}: ${stores.length} Produkte | ${stores.join(", ")}`);
  }

  const { data: offList } = await listOfferings({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });
  for (const o of offList?.items ?? []) {
    console.log(`--- Offering ${o.lookup_key} (current=${o.is_current}) ---`);
    const { data: pkgList } = await listPackages({
      client,
      path: { project_id: PROJECT_ID, offering_id: o.id },
      query: { limit: 50 },
    });
    for (const pkg of pkgList?.items ?? []) {
      const { data } = await getProductsFromPackage({
        client,
        path: { project_id: PROJECT_ID, package_id: pkg.id },
        query: { limit: 50 },
      });
      const stores = (data?.items ?? []).map((p) => p.product.store_identifier).sort();
      console.log(`${pkg.lookup_key}: ${stores.length} Produkte | ${stores.join(", ")}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
