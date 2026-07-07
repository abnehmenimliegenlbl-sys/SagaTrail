// Liest den aktuellen Zustand des RevenueCat-Projekts (Produkte,
// Entitlements, Offerings, Pakete) zur Bestandsaufnahme vor dem
// Portfolio-Umbau. Nur lesend.
import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listProducts,
  listEntitlements,
  listOfferings,
  listPackages,
} from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID!;

async function main() {
  const client = await getUncachableRevenueCatClient();

  const { data: products } = await listProducts({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 100 },
  });
  console.log("--- Produkte ---");
  for (const p of products?.items ?? []) {
    console.log(
      `${p.id} | store_id=${p.store_identifier} | app=${p.app_id} | typ=${p.type} | name=${p.display_name}`,
    );
  }

  const { data: ents } = await listEntitlements({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 50 },
  });
  console.log("--- Entitlements ---");
  for (const e of ents?.items ?? []) {
    console.log(`${e.id} | key=${e.lookup_key} | name=${e.display_name}`);
  }

  const { data: offs } = await listOfferings({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });
  console.log("--- Offerings ---");
  for (const o of offs?.items ?? []) {
    console.log(`${o.id} | key=${o.lookup_key} | current=${o.is_current}`);
    const { data: pkgs } = await listPackages({
      client,
      path: { project_id: PROJECT_ID, offering_id: o.id },
      query: { limit: 50 },
    });
    for (const pk of pkgs?.items ?? []) {
      console.log(`   pkg ${pk.id} | key=${pk.lookup_key} | name=${pk.display_name}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
