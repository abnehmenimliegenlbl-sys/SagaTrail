// Ordnet einen bezahlten Kantonspack-Kauf (Einzelprodukt
// "sagatrail_kantonspack", consumable) verifiziert einem Kanton zu:
// Der Server zaehlt bei RevenueCat die gueltigen Kantonspack-Kaeufe des
// Customers und vergleicht sie mit den bereits in der DB gespeicherten
// freigeschalteten Packs. Nur wenn mehr Kaeufe als Zuordnungen vorliegen,
// wird der Kanton als freigeschaltet in profiles.purchased_packs geschrieben.
// Der RC-Connector-Key hat nur Lesezugriff — grantCustomerEntitlement wird
// bewusst NICHT aufgerufen (wurde mit 403 abgelehnt).
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { createClient } from "@replit/revenuecat-sdk/client";
import {
  listProducts,
  listPurchases,
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
// Check-then-act gegen die DB; zwei parallele Claims desselben Customers
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
 * Prueft die Kaufbilanz des Customers und speichert den pack-Slug in
 * profiles.purchased_packs, wenn ein noch nicht zugeordneter Kantonspack-Kauf
 * vorliegt. Der Slug muss vom Aufrufer bereits gegen KANTON_SLUGS validiert
 * sein.
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
  const entKey = `pack_${slug}`;

  // 1. DB-Stand laden: bereits freigeschaltete Packs des Nutzers.
  const [profilRow] = await db
    .select({ purchasedPacks: profilesTable.purchasedPacks })
    .from(profilesTable)
    .where(eq(profilesTable.id, customerId));

  const currentPacks = profilRow?.purchasedPacks ?? [];
  if (currentPacks.includes(slug)) {
    return { status: "bereits_freigeschaltet", entitlement: entKey };
  }

  // 2. Gueltige (nicht erstattete) Kantonspack-Kaeufe in RC zaehlen.
  const projectId = getProjectId();
  const client = getRevenueCatClient();
  const produktIds = await getKantonspackProduktIds();
  let kaeufe = 0;
  let startingAfter: string | undefined;
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

  // 3. Kaeufe mit bereits zugeordneten DB-Packs vergleichen.
  if (kaeufe <= currentPacks.length) {
    return { status: "kein_offener_kauf" };
  }

  // 4. Pack in der DB freischalten.
  await db
    .update(profilesTable)
    .set({ purchasedPacks: [...currentPacks, slug], updatedAt: new Date() })
    .where(eq(profilesTable.id, customerId));

  return { status: "vergeben", entitlement: entKey };
}
