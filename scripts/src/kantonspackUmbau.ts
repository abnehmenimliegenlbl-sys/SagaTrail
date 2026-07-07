// Baut die Kantons-Packs von 26 Einzelprodukten auf EIN Produkt um:
//   - Neues Produkt "sagatrail_kantonspack" (CHF 6.90) in allen 3 Apps.
//     Test Store: consumable; App Store / Play Store: one_time (mehrfach
//     kaufbar, da in App Store Connect als Verbrauchsprodukt anzulegen).
//   - Neues Paket "kantonspack" im Offering "packs".
//   - Die 26 alten Pakete werden aus dem Offering entfernt, die 26x3 alten
//     Produkte geloescht (es existieren keinerlei Kaeufe, geprueft am
//     2026-07-07).
//   - Die 26 Entitlements pack_<kanton> BLEIBEN bestehen: sie werden nach
//     dem Kauf serverseitig per grantCustomerEntitlement vergeben und
//     buchhalten so, welcher Kanton freigeschaltet wurde.
import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listApps,
  listProducts,
  createProduct,
  deleteProduct,
  listOfferings,
  listPackages,
  attachProductsToPackage,
  createPackages,
  deletePackageFromOffering,
  type App,
  type Product,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID!;
const KANTONSPACK_STORE_ID = "sagatrail_kantonspack";
const KANTONSPACK_PAKET = "kantonspack";
const PREISE = [
  { amount_micros: 6_900_000, currency: "CHF" },
  { amount_micros: 6_900_000, currency: "USD" },
  { amount_micros: 6_900_000, currency: "EUR" },
];

type TestStorePricesResponse = { object: string; prices: typeof PREISE };

async function main() {
  const client = await getUncachableRevenueCatClient();

  const { data: apps, error: appsErr } = await listApps({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });
  if (appsErr || !apps) throw new Error("Apps konnten nicht geladen werden");
  const testApp = apps.items.find((a) => a.type === "test_store");
  const iosApp = apps.items.find((a) => a.type === "app_store");
  const playApp = apps.items.find((a) => a.type === "play_store");
  if (!testApp || !iosApp || !playApp) throw new Error("Nicht alle Store-Apps vorhanden");

  const { data: prodList, error: prodErr } = await listProducts({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 200 },
  });
  if (prodErr || !prodList) throw new Error("Produkte konnten nicht geladen werden");
  const vorhandene = prodList.items ?? [];

  async function ensureProdukt(
    app: App,
    typ: "consumable" | "one_time",
  ): Promise<Product> {
    const existing = vorhandene.find(
      (p) => p.store_identifier === KANTONSPACK_STORE_ID && p.app_id === app.id,
    );
    if (existing) {
      console.log(`Produkt existiert: ${KANTONSPACK_STORE_ID} (${app.type})`);
      return existing;
    }
    const body: CreateProductData["body"] = {
      store_identifier: KANTONSPACK_STORE_ID,
      app_id: app.id,
      type: typ,
      display_name: "SagaTrail Kantonspack",
    };
    if (app.type === "test_store") {
      body.title = "SagaTrail Kantonspack";
    }
    const { data, error } = await createProduct({
      client,
      path: { project_id: PROJECT_ID },
      body,
    });
    if (error || !data) {
      throw new Error(
        `Produkt ${KANTONSPACK_STORE_ID} (${app.type}) fehlgeschlagen: ${JSON.stringify(error)}`,
      );
    }
    console.log(`Produkt erstellt: ${KANTONSPACK_STORE_ID} (${app.type})`);
    return data;
  }

  async function setzeTestPreise(produkt: Product, versuch = 0): Promise<void> {
    const { error } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: PROJECT_ID, product_id: produkt.id },
      body: { prices: PREISE },
    });
    if (error) {
      const typ = (error as Record<string, unknown>)["type"];
      if (typ === "rate_limit_error" && versuch < 5) {
        const backoff = Number((error as Record<string, unknown>)["backoff_ms"] ?? 4000);
        await new Promise((r) => setTimeout(r, backoff + 500));
        return setzeTestPreise(produkt, versuch + 1);
      }
      if (typ === "resource_already_exists") {
        console.log("Testpreise existieren bereits");
      } else {
        throw new Error(`Testpreise fehlgeschlagen: ${JSON.stringify(error)}`);
      }
    } else {
      console.log("Testpreise gesetzt: 6.90");
    }
  }

  const test = await ensureProdukt(testApp, "consumable");
  const ios = await ensureProdukt(iosApp, "one_time");
  const play = await ensureProdukt(playApp, "one_time");
  await setzeTestPreise(test);

  // Bewusst KEIN Entitlement am Produkt: die pack_<kanton>-Entitlements
  // werden nach dem Kauf serverseitig gezielt vergeben.

  const { data: offList, error: offErr } = await listOfferings({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });
  if (offErr || !offList) throw new Error("Offerings konnten nicht geladen werden");
  const packsOffering = offList.items?.find((o) => o.lookup_key === "packs");
  if (!packsOffering) throw new Error('Offering "packs" existiert nicht');

  const { data: pkgList, error: pkgErr } = await listPackages({
    client,
    path: { project_id: PROJECT_ID, offering_id: packsOffering.id },
    query: { limit: 100 },
  });
  if (pkgErr || !pkgList) throw new Error("Pakete konnten nicht geladen werden");
  const pakete = pkgList.items ?? [];

  let paket = pakete.find((p) => p.lookup_key === KANTONSPACK_PAKET);
  if (!paket) {
    const { data, error } = await createPackages({
      client,
      path: { project_id: PROJECT_ID, offering_id: packsOffering.id },
      body: { lookup_key: KANTONSPACK_PAKET, display_name: "Kantonspack" },
    });
    if (error || !data) throw new Error(`Paket fehlgeschlagen: ${JSON.stringify(error)}`);
    console.log("Paket erstellt: kantonspack");
    paket = data;
  }
  {
    const { error } = await attachProductsToPackage({
      client,
      path: { project_id: PROJECT_ID, package_id: paket.id },
      body: {
        products: [test, ios, play].map((p) => ({
          product_id: p.id,
          eligibility_criteria: "all" as const,
        })),
      },
    });
    if (error) {
      if (error.type === "unprocessable_entity_error") {
        console.log("Produkte bereits am Paket verknuepft");
      } else {
        throw new Error(`Paket-Verknuepfung fehlgeschlagen: ${JSON.stringify(error)}`);
      }
    }
  }

  // Alte pack_<kanton>-Pakete aus dem Offering entfernen
  for (const alt of pakete) {
    if (!alt.lookup_key.startsWith("pack_")) continue;
    const { error } = await deletePackageFromOffering({
      client,
      path: { project_id: PROJECT_ID, package_id: alt.id },
    });
    if (error) {
      console.log(`Paket ${alt.lookup_key} entfernen fehlgeschlagen:`, JSON.stringify(error));
    } else {
      console.log(`Paket entfernt: ${alt.lookup_key}`);
    }
  }

  // Alte Einzelprodukte loeschen (keine Kaeufe vorhanden, siehe Kopf)
  const altProdukte = vorhandene.filter((p) =>
    p.store_identifier.startsWith("sagatrail_pack_"),
  );
  for (const alt of altProdukte) {
    const { error } = await deleteProduct({
      client,
      path: { project_id: PROJECT_ID, product_id: alt.id },
    });
    if (error) {
      console.log(`Loeschen von ${alt.store_identifier} fehlgeschlagen:`, JSON.stringify(error));
    } else {
      console.log(`Produkt geloescht: ${alt.store_identifier} (${alt.app_id})`);
    }
  }

  console.log("\nKantonspack-Umbau abgeschlossen.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
