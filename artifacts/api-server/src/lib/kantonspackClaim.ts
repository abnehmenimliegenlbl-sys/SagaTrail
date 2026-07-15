// Ordnet einen bezahlten Kantonspack-Kauf (Einzelprodukt
// "sagatrail_kantonspack", consumable) verifiziert einem Kanton zu:
// Der Server zaehlt bei RevenueCat die gueltigen Kantonspack-Kaeufe des
// Customers und die bereits vergebenen pack_<kanton>-Entitlements. Nur wenn
// mehr Kaeufe als Zuordnungen vorliegen, wird das Entitlement des gewaehlten
// Kantons per Grant vergeben. Der Client darf sich Packs NICHT selbst geben.
import { ReplitConnectors } from "@replit/connectors-sdk";
import { createClient } from "@replit/revenuecat-sdk/client";
import {
  listCustomerActiveEntitlements,
  listEntitlements,
  listProducts,
  listPurchases,
  grantCustomerEntitlement,
  type Purchase,
} from "@replit/revenuecat-sdk";

const KANTONSPACK_STORE_ID = "sagatrail_kantonspack";

// Muss identisch sein zu artifacts/mobile/lib/kantonSlug.ts und
// scripts/src/portfolio2026.ts (kantonSlug).
export const KANTON_SLUGS: readonly string[] = [
  "aargau",
  "appenzell_ausserrhoden",
  "appenzell_innerrhoden",
  "basel_landschaft",
  "basel_stadt",
  "bern",
  "freiburg",
  "genf",
  "glarus",
  "graubuenden",
  "jura",
  "luzern",
  "neuenburg",
  "nidwalden",
  "obwalden",
  "schaffhausen",
  "schwyz",
  "solothurn",
  "st_gallen",
  "tessin",
  "thurgau",
  "uri",
  "waadt",
  "wallis",
  "zug",
  "zuerich",
] as const;

// Packs sind Einmalkaeufe ohne Ablauf: Grant weit in der Zukunft (100 Jahre).
const GRANT_DAUER_MS = 100 * 365 * 24 * 60 * 60 * 1000;

const connectors = new ReplitConnectors();

// Client nie cachen: der Proxy-Fetch erneuert Auth-Tokens pro Anfrage.
function getRevenueCatClient() {
  return createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    fetch: connectors.createProxyFetch("revenuecat"),
  });
}

function getProjectId(): string {
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  if (!projectId) throw new Error("REVENUECAT_PROJECT_ID ist nicht gesetzt");
  return projectId;
}

// pack_<slug> -> Entitlement-ID; aendert sich nie, daher im Prozess gecacht.
let packEntitlementIds: Map<string, string> | null = null;

async function getPackEntitlementIds(): Promise<Map<string, string>> {
  if (packEntitlementIds) return packEntitlementIds;
  const client = getRevenueCatClient();
  const map = new Map<string, string>();
  let startingAfter: string | undefined;
  for (let seite = 0; seite < 5; seite++) {
    const { data, error, response } = await listEntitlements({
      client,
      path: { project_id: getProjectId() },
      query: { limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) },
    });
    if (error) {
      throw new Error(
        `RevenueCat-Entitlements nicht abrufbar (${response?.status ?? "?"}): ${JSON.stringify(error)}`
      );
    }
    const items = data?.items ?? [];
    for (const e of items) {
      if (e.lookup_key.startsWith("pack_")) map.set(e.lookup_key, e.id);
    }
    if (!data?.next_page || items.length === 0) break;
    startingAfter = items[items.length - 1]?.id;
    if (!startingAfter) break;
  }
  packEntitlementIds = map;
  return map;
}

// Produkt-IDs des Kantonspack-Einzelprodukts (eine je Store-App); gecacht.
let kantonspackProduktIds: Set<string> | null = null;

async function getKantonspackProduktIds(): Promise<Set<string>> {
  if (kantonspackProduktIds) return kantonspackProduktIds;
  const client = getRevenueCatClient();
  const { data, error, response } = await listProducts({
    client,
    path: { project_id: getProjectId() },
    query: { limit: 200 },
  });
  if (error) {
    throw new Error(
      `RevenueCat-Produkte nicht abrufbar (${response?.status ?? "?"}): ${JSON.stringify(error)}`
    );
  }
  const ids = new Set(
    (data?.items ?? [])
      .filter((p) => p.store_identifier === KANTONSPACK_STORE_ID)
      .map((p) => p.id)
  );
  if (ids.size === 0) {
    throw new Error(`Produkt ${KANTONSPACK_STORE_ID} existiert nicht in RevenueCat`);
  }
  kantonspackProduktIds = ids;
  return ids;
}

// Claims pro Customer strikt serialisieren: die Kaufbilanz ist ein
// Check-then-act gegen RevenueCat; zwei parallele Claims desselben Customers
// koennten sonst denselben offenen Kauf doppelt zuordnen. Eine In-Process-
// Kette pro Customer reicht, da der Server einprozessig laeuft.
const claimKetten = new Map<string, Promise<unknown>>();

function serialisiertProCustomer<T>(
  customerId: string,
  arbeit: () => Promise<T>
): Promise<T> {
  const vorher = claimKetten.get(customerId) ?? Promise.resolve();
  const ergebnis = vorher.then(arbeit, arbeit);
  claimKetten.set(
    customerId,
    ergebnis.catch(() => undefined)
  );
  void ergebnis.finally(() => {
    if (claimKetten.get(customerId) === ergebnis) claimKetten.delete(customerId);
  }).catch(() => undefined);
  return ergebnis;
}

export type ClaimErgebnis =
  | { status: "vergeben"; entitlement: string }
  | { status: "bereits_freigeschaltet"; entitlement: string }
  | { status: "kein_offener_kauf" };

/**
 * Prueft die Kaufbilanz des Customers und vergibt das pack_<slug>-Entitlement,
 * wenn ein noch nicht zugeordneter Kantonspack-Kauf vorliegt.
 * Der Slug muss vom Aufrufer bereits gegen KANTON_SLUGS validiert sein.
 */
export function claimKantonspack(
  customerId: string,
  slug: string
): Promise<ClaimErgebnis> {
  return serialisiertProCustomer(customerId, () =>
    claimKantonspackIntern(customerId, slug)
  );
}

async function claimKantonspackIntern(
  customerId: string,
  slug: string
): Promise<ClaimErgebnis> {
  const projectId = getProjectId();
  const entKey = `pack_${slug}`;
  const packIds = await getPackEntitlementIds();
  const entId = packIds.get(entKey);
  if (!entId) {
    throw new Error(`Entitlement ${entKey} existiert nicht in RevenueCat`);
  }
  const idZuKey = new Map(Array.from(packIds, ([key, id]) => [id, key] as const));

  const client = getRevenueCatClient();
  const jetzt = Date.now();

  // Aktive pack_*-Entitlements des Customers zaehlen (= bereits zugeordnete
  // Kaeufe). Ein unbekannter Customer (404) hat schlicht keine.
  const aktivePacks = new Set<string>();
  let startingAfter: string | undefined;
  for (let seite = 0; seite < 10; seite++) {
    const { data, error, response } = await listCustomerActiveEntitlements({
      client,
      path: { project_id: projectId, customer_id: customerId },
      query: { limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) },
    });
    if (error) {
      if (response?.status === 404) break;
      throw new Error(
        `RevenueCat-Abfrage fehlgeschlagen (${response?.status ?? "?"}): ${JSON.stringify(error)}`
      );
    }
    const items = data?.items ?? [];
    for (const e of items) {
      if (e.expires_at !== null && e.expires_at <= jetzt) continue;
      const key = idZuKey.get(e.entitlement_id);
      if (key) aktivePacks.add(key);
    }
    if (!data?.next_page || items.length === 0) break;
    startingAfter = items[items.length - 1]?.entitlement_id;
    if (!startingAfter) break;
  }

  if (aktivePacks.has(entKey)) {
    return { status: "bereits_freigeschaltet", entitlement: entKey };
  }

  // Gueltige (nicht erstattete) Kantonspack-Kaeufe zaehlen.
  const produktIds = await getKantonspackProduktIds();
  let kaeufe = 0;
  startingAfter = undefined;
  for (let seite = 0; seite < 10; seite++) {
    const { data, error, response } = await listPurchases({
      client,
      path: { project_id: projectId, customer_id: customerId },
      query: { limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) },
    });
    if (error) {
      if (response?.status === 404) break;
      throw new Error(
        `RevenueCat-Kaufabfrage fehlgeschlagen (${response?.status ?? "?"}): ${JSON.stringify(error)}`
      );
    }
    const items: Purchase[] = data?.items ?? [];
    for (const p of items) {
      if (p.status === "owned" && produktIds.has(p.product_id)) {
        kaeufe += p.quantity > 0 ? p.quantity : 1;
      }
    }
    if (!data?.next_page || items.length === 0) break;
    startingAfter = items[items.length - 1]?.id;
    if (!startingAfter) break;
  }

  if (kaeufe <= aktivePacks.size) {
    return { status: "kein_offener_kauf" };
  }

  const { error, response } = await grantCustomerEntitlement({
    client,
    path: { project_id: projectId, customer_id: customerId },
    body: { entitlement_id: entId, expires_at: jetzt + GRANT_DAUER_MS },
  });
  if (error) {
    throw new Error(
      `Entitlement-Grant ${entKey} fehlgeschlagen (${response?.status ?? "?"}): ${JSON.stringify(error)}`
    );
  }
  return { status: "vergeben", entitlement: entKey };
}
