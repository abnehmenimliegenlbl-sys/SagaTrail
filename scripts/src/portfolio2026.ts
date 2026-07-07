// Baut das SagaTrail-Monetarisierungs-Portfolio in RevenueCat um:
//   Abos (Entitlement "premium"):
//     - sagatrail_premium_monthly_1499   P1M  CHF 14.99
//     - sagatrail_premium_yearly         P1Y  CHF 89.99
//     - sagatrail_family_yearly          P1Y  CHF 119.00
//     - sagatrail_elite_yearly           P1Y  CHF 199.99  (+ Entitlement "elite")
//     - sagatrail_elite_family_yearly    P1Y  CHF 299.99  (+ Entitlement "elite")
//   Einmalkaeufe (nur fuer Premium-Kunden kaufbar, App-seitig erzwungen):
//     - sagatrail_pack_<kanton>          CHF 6.90, Entitlement "pack_<kanton>"
//   Offerings:
//     - "default" (current): Pakete $rc_monthly, $rc_annual, family, elite, elite_family
//     - "packs": ein Paket pro Kanton (lookup_key = pack_<kanton>)
//   Alte 12.90/6.99-Monthly-Produkte werden geloescht (Testpreise sind unveraenderlich).
import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listApps,
  listProducts,
  createProduct,
  deleteProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  detachProductsFromPackage,
  type App,
  type Product,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID!;

// Muss identisch sein zu artifacts/mobile/lib/kantonSlug.ts
function kantonSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const KANTONE = [
  "Aargau",
  "Appenzell Ausserrhoden",
  "Appenzell Innerrhoden",
  "Basel-Landschaft",
  "Basel-Stadt",
  "Bern",
  "Freiburg",
  "Genf",
  "Glarus",
  "Graubünden",
  "Jura",
  "Luzern",
  "Neuenburg",
  "Nidwalden",
  "Obwalden",
  "Schaffhausen",
  "Schwyz",
  "Solothurn",
  "St. Gallen",
  "Tessin",
  "Thurgau",
  "Uri",
  "Waadt",
  "Wallis",
  "Zug",
  "Zürich",
];

interface Preis {
  amount_micros: number;
  currency: string;
}

function chf(betrag: number): Preis[] {
  const micros = Math.round(betrag * 1_000_000);
  return [
    { amount_micros: micros, currency: "CHF" },
    { amount_micros: micros, currency: "USD" },
    { amount_micros: micros, currency: "EUR" },
  ];
}

interface AboDef {
  id: string;
  playId: string;
  display: string;
  titel: string;
  dauer: "P1M" | "P1Y";
  preise: Preis[];
  paket: string;
  paketName: string;
  elite: boolean;
}

const ABOS: AboDef[] = [
  {
    id: "sagatrail_premium_monthly_1499",
    playId: "sagatrail_premium_monthly_1499:monthly",
    display: "SagaTrail Premium (Monat)",
    titel: "SagaTrail Premium",
    dauer: "P1M",
    preise: chf(14.99),
    paket: "$rc_monthly",
    paketName: "Premium Monat",
    elite: false,
  },
  {
    id: "sagatrail_premium_yearly",
    playId: "sagatrail_premium_yearly:annual",
    display: "SagaTrail Premium (Jahr)",
    titel: "SagaTrail Premium Jahr",
    dauer: "P1Y",
    preise: chf(89.99),
    paket: "$rc_annual",
    paketName: "Premium Jahr",
    elite: false,
  },
  {
    id: "sagatrail_family_yearly",
    playId: "sagatrail_family_yearly:annual",
    display: "SagaTrail Familie (Jahr)",
    titel: "SagaTrail Familie",
    dauer: "P1Y",
    preise: chf(119.0),
    paket: "family",
    paketName: "Familien-Abo Jahr",
    elite: false,
  },
  {
    id: "sagatrail_elite_yearly",
    playId: "sagatrail_elite_yearly:annual",
    display: "SagaTrail Elite (Jahr)",
    titel: "SagaTrail Elite",
    dauer: "P1Y",
    preise: chf(199.99),
    paket: "elite",
    paketName: "Elite Jahr",
    elite: true,
  },
  {
    id: "sagatrail_elite_family_yearly",
    playId: "sagatrail_elite_family_yearly:annual",
    display: "SagaTrail Elite Familie (Jahr)",
    titel: "SagaTrail Elite Familie",
    dauer: "P1Y",
    preise: chf(299.99),
    paket: "elite_family",
    paketName: "Elite Familien-Abo Jahr",
    elite: true,
  },
];

const PACK_PREISE = chf(6.9);
const ALTE_PRODUKT_STORE_IDS = [
  "sagatrail_premium_monthly",
  "sagatrail_premium_monthly:monthly",
];

type TestStorePricesResponse = {
  object: string;
  prices: Preis[];
};

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

  const findeProdukt = (storeId: string, appId: string) =>
    vorhandene.find((p) => p.store_identifier === storeId && p.app_id === appId);

  async function ensureProdukt(
    app: App,
    storeId: string,
    typ: "subscription" | "one_time" | "non_consumable",
    display: string,
    titel: string,
    dauer?: "P1M" | "P1Y",
  ): Promise<Product> {
    const existing = findeProdukt(storeId, app.id);
    if (existing) {
      console.log(`Produkt existiert: ${storeId} (${app.type})`);
      return existing;
    }
    const body: CreateProductData["body"] = {
      store_identifier: storeId,
      app_id: app.id,
      type: typ,
      display_name: display,
    };
    if (app.type === "test_store") {
      body.title = titel;
      if (typ === "subscription" && dauer) body.subscription = { duration: dauer };
    }
    const { data, error } = await createProduct({
      client,
      path: { project_id: PROJECT_ID },
      body,
    });
    if (error || !data) {
      throw new Error(`Produkt ${storeId} (${app.type}) fehlgeschlagen: ${JSON.stringify(error)}`);
    }
    console.log(`Produkt erstellt: ${storeId} (${app.type})`);
    return data;
  }

  async function setzeTestPreise(produkt: Product, preise: Preis[], versuch = 0) {
    const { error } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: PROJECT_ID, product_id: produkt.id },
      body: { prices: preise },
    });
    if (error) {
      const typ = (error as Record<string, unknown>)["type"];
      if (typ === "rate_limit_error" && versuch < 5) {
        const backoff = Number((error as Record<string, unknown>)["backoff_ms"] ?? 4000);
        console.log(`Rate-Limit, warte ${backoff}ms: ${produkt.store_identifier}`);
        await new Promise((r) => setTimeout(r, backoff + 500));
        return setzeTestPreise(produkt, preise, versuch + 1);
      }
      if (typ === "resource_already_exists") {
        console.log(`Testpreise existieren bereits: ${produkt.store_identifier}`);
      } else {
        throw new Error(`Testpreise fuer ${produkt.store_identifier} fehlgeschlagen: ${JSON.stringify(error)}`);
      }
    } else {
      console.log(`Testpreise gesetzt: ${produkt.store_identifier}`);
    }
  }

  const { data: entList, error: entErr } = await listEntitlements({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 100 },
  });
  if (entErr || !entList) throw new Error("Entitlements konnten nicht geladen werden");
  const entitlements = [...(entList.items ?? [])];

  async function ensureEntitlement(key: string, display: string): Promise<Entitlement> {
    const existing = entitlements.find((e) => e.lookup_key === key);
    if (existing) return existing;
    const { data, error } = await createEntitlement({
      client,
      path: { project_id: PROJECT_ID },
      body: { lookup_key: key, display_name: display },
    });
    if (error || !data) throw new Error(`Entitlement ${key} fehlgeschlagen: ${JSON.stringify(error)}`);
    console.log(`Entitlement erstellt: ${key}`);
    entitlements.push(data);
    return data;
  }

  async function verknuepfeEntitlement(ent: Entitlement, produktIds: string[]) {
    const { error } = await attachProductsToEntitlement({
      client,
      path: { project_id: PROJECT_ID, entitlement_id: ent.id },
      body: { product_ids: produktIds },
    });
    if (error) {
      if (error.type === "unprocessable_entity_error") {
        console.log(`Produkte bereits an Entitlement ${ent.lookup_key} verknuepft`);
      } else {
        throw new Error(`Entitlement-Verknuepfung ${ent.lookup_key} fehlgeschlagen: ${JSON.stringify(error)}`);
      }
    }
  }

  // --- Abos ---
  const premiumEnt = await ensureEntitlement("premium", "Premium Access");
  const eliteEnt = await ensureEntitlement("elite", "Elite Access");

  const aboProdukteJePaket = new Map<string, Product[]>();
  for (const abo of ABOS) {
    const test = await ensureProdukt(testApp, abo.id, "subscription", abo.display, abo.titel, abo.dauer);
    const ios = await ensureProdukt(iosApp, abo.id, "subscription", abo.display, abo.titel);
    const play = await ensureProdukt(playApp, abo.playId, "subscription", abo.display, abo.titel);
    await setzeTestPreise(test, abo.preise);
    const ids = [test.id, ios.id, play.id];
    await verknuepfeEntitlement(premiumEnt, ids);
    if (abo.elite) await verknuepfeEntitlement(eliteEnt, ids);
    aboProdukteJePaket.set(abo.paket, [test, ios, play]);
  }

  // --- Kantons-Packs ---
  const packProdukteJeKanton = new Map<string, Product[]>();
  for (const kanton of KANTONE) {
    const slug = kantonSlug(kanton);
    const storeId = `sagatrail_pack_${slug}`;
    const display = `Sagen-Pack ${kanton}`;
    const test = await ensureProdukt(testApp, storeId, "non_consumable", display, display);
    const ios = await ensureProdukt(iosApp, storeId, "one_time", display, display);
    const play = await ensureProdukt(playApp, storeId, "one_time", display, display);
    await setzeTestPreise(test, PACK_PREISE);
    const ent = await ensureEntitlement(`pack_${slug}`, display);
    await verknuepfeEntitlement(ent, [test.id, ios.id, play.id]);
    packProdukteJeKanton.set(slug, [test, ios, play]);
  }

  // --- Offerings ---
  const { data: offList, error: offErr } = await listOfferings({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });
  if (offErr || !offList) throw new Error("Offerings konnten nicht geladen werden");

  async function ensureOffering(key: string, display: string, current: boolean): Promise<Offering> {
    let off = offList!.items?.find((o) => o.lookup_key === key);
    if (!off) {
      const { data, error } = await createOffering({
        client,
        path: { project_id: PROJECT_ID },
        body: { lookup_key: key, display_name: display },
      });
      if (error || !data) throw new Error(`Offering ${key} fehlgeschlagen: ${JSON.stringify(error)}`);
      console.log(`Offering erstellt: ${key}`);
      off = data;
    }
    if (current && !off.is_current) {
      const { error } = await updateOffering({
        client,
        path: { project_id: PROJECT_ID, offering_id: off.id },
        body: { is_current: true },
      });
      if (error) throw new Error(`Offering ${key} als current fehlgeschlagen`);
      console.log(`Offering ${key} ist jetzt current`);
    }
    return off;
  }

  async function ensurePaket(offering: Offering, key: string, display: string, vorhandenePakete: Package[]): Promise<Package> {
    const existing = vorhandenePakete.find((p) => p.lookup_key === key);
    if (existing) return existing;
    const { data, error } = await createPackages({
      client,
      path: { project_id: PROJECT_ID, offering_id: offering.id },
      body: { lookup_key: key, display_name: display },
    });
    if (error || !data) throw new Error(`Paket ${key} fehlgeschlagen: ${JSON.stringify(error)}`);
    console.log(`Paket erstellt: ${key}`);
    return data;
  }

  async function verknuepfePaket(paket: Package, produkte: Product[]) {
    const { error } = await attachProductsToPackage({
      client,
      path: { project_id: PROJECT_ID, package_id: paket.id },
      body: {
        products: produkte.map((p) => ({ product_id: p.id, eligibility_criteria: "all" as const })),
      },
    });
    if (error) {
      if (error.type === "unprocessable_entity_error") {
        console.log(`Paket ${paket.lookup_key}: Produkte bereits verknuepft/inkompatibel`);
      } else {
        throw new Error(`Paket-Verknuepfung ${paket.lookup_key} fehlgeschlagen: ${JSON.stringify(error)}`);
      }
    }
  }

  const defaultOffering = await ensureOffering("default", "Default Offering", true);
  const { data: defaultPkgList } = await listPackages({
    client,
    path: { project_id: PROJECT_ID, offering_id: defaultOffering.id },
    query: { limit: 50 },
  });
  const defaultPakete = defaultPkgList?.items ?? [];

  // Altes Monthly-Produkt aus dem $rc_monthly-Paket loesen (falls verknuepft)
  const alteProdukte = vorhandene.filter((p) =>
    ALTE_PRODUKT_STORE_IDS.includes(p.store_identifier),
  );
  const monthlyPaket = defaultPakete.find((p) => p.lookup_key === "$rc_monthly");
  if (monthlyPaket && alteProdukte.length > 0) {
    const { error } = await detachProductsFromPackage({
      client,
      path: { project_id: PROJECT_ID, package_id: monthlyPaket.id },
      body: { product_ids: alteProdukte.map((p) => p.id) },
    });
    if (error) {
      console.log("Detach alter Produkte (evtl. nicht verknuepft):", JSON.stringify(error));
    } else {
      console.log("Alte Monthly-Produkte vom Paket geloest");
    }
  }

  for (const abo of ABOS) {
    const paket = await ensurePaket(defaultOffering, abo.paket, abo.paketName, defaultPakete);
    await verknuepfePaket(paket, aboProdukteJePaket.get(abo.paket)!);
  }

  const packsOffering = await ensureOffering("packs", "Kantons-Sagen-Packs", false);
  const { data: packsPkgList } = await listPackages({
    client,
    path: { project_id: PROJECT_ID, offering_id: packsOffering.id },
    query: { limit: 100 },
  });
  const packsPakete = packsPkgList?.items ?? [];
  for (const kanton of KANTONE) {
    const slug = kantonSlug(kanton);
    const paket = await ensurePaket(packsOffering, `pack_${slug}`, `Sagen-Pack ${kanton}`, packsPakete);
    await verknuepfePaket(paket, packProdukteJeKanton.get(slug)!);
  }

  // --- Alte Produkte endgueltig loeschen ---
  for (const alt of alteProdukte) {
    const { error } = await deleteProduct({
      client,
      path: { project_id: PROJECT_ID, product_id: alt.id },
    });
    if (error) {
      console.log(`Loeschen von ${alt.store_identifier} (${alt.id}) fehlgeschlagen:`, JSON.stringify(error));
    } else {
      console.log(`Altes Produkt geloescht: ${alt.store_identifier} (${alt.id})`);
    }
  }

  console.log("\nPortfolio-Umbau abgeschlossen.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
