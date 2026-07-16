// Verifizierter RevenueCat-Abgleich: prueft serverseitig ueber die
// RevenueCat REST API (v2, via Replit-Connector-Proxy), ob ein Customer
// ein aktives "premium"-Entitlement besitzt. Der Client darf sich Premium
// NICHT selbst geben — nur dieser verifizierte Pfad (oder der Admin-
// Endpunkt) darf upgraden.
// Voraussetzung: Die Mobile-App meldet sich bei RevenueCat mit
// Purchases.logIn(<Clerk-Nutzer-ID>) an, sodass die Customer-ID hier der
// authentifizierten Nutzer-ID entspricht.
import { ReplitConnectors } from "@replit/connectors-sdk";
import { createClient } from "@replit/revenuecat-sdk/client";
import {
  listCustomerActiveEntitlements,
  listEntitlements,
} from "@replit/revenuecat-sdk";

const PREMIUM_ENTITLEMENT_LOOKUP_KEY = "premium";

const connectors = new ReplitConnectors();

// Client nie cachen: der Proxy-Fetch erneuert Auth-Tokens pro Anfrage.
function getRevenueCatClient() {
  return createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    fetch: connectors.createProxyFetch("revenuecat"),
  });
}

// Die aktiven Entitlements eines Customers tragen nur die Entitlement-ID,
// nicht den lookup_key — die ID des "premium"-Entitlements wird deshalb
// einmal aufgeloest und im Prozess gecacht (sie aendert sich nie).
let premiumEntitlementId: string | null = null;

async function getPremiumEntitlementId(projectId: string): Promise<string> {
  if (premiumEntitlementId) return premiumEntitlementId;

  const client = getRevenueCatClient();
  const { data, error, response } = await listEntitlements({
    client,
    path: { project_id: projectId },
    query: { limit: 100 },
  });
  if (error) {
    throw new Error(
      `RevenueCat-Entitlements nicht abrufbar (${response?.status ?? "?"}): ${JSON.stringify(error)}`
    );
  }
  const premium = (data?.items ?? []).find(
    (e) => e.lookup_key === PREMIUM_ENTITLEMENT_LOOKUP_KEY
  );
  if (!premium) {
    throw new Error('Entitlement "premium" existiert nicht in RevenueCat');
  }
  premiumEntitlementId = premium.id;
  return premium.id;
}

/**
 * Prueft, ob der Customer bei RevenueCat ein aktives "premium"-Entitlement
 * hat. Ein unbekannter Customer (404) zaehlt als "kein Premium".
 * Andere Fehler werden geworfen (Aufrufer antwortet mit 502).
 */
export async function hatAktivesPremiumEntitlement(
  customerId: string
): Promise<boolean> {
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  if (!projectId) {
    throw new Error("REVENUECAT_PROJECT_ID ist nicht gesetzt");
  }

  const premiumId = await getPremiumEntitlementId(projectId);

  const client = getRevenueCatClient();
  const jetzt = Date.now();

  // Alle Seiten abarbeiten: bei vielen aktiven Entitlements (Abo + viele
  // Kantons-Packs) darf "premium" nicht nur auf der ersten Seite gesucht
  // werden.
  let startingAfter: string | undefined;
  for (let seite = 0; seite < 10; seite++) {
    const { data, error, response } = await listCustomerActiveEntitlements({
      client,
      path: { project_id: projectId, customer_id: customerId },
      query: { limit: 100, ...(startingAfter ? { starting_after: startingAfter } : {}) },
    });

    if (error) {
      if (response?.status === 404) return false;
      throw new Error(
        `RevenueCat-Abfrage fehlgeschlagen (${response?.status ?? "?"}): ${JSON.stringify(error)}`
      );
    }

    const items = data?.items ?? [];
    if (
      items.some(
        (e) =>
          e.entitlement_id === premiumId &&
          // Nur echte Abos zaehlen: Konsumable/Einmalkauf-Grants haben
          // expires_at = null (Lifetime-Grant). Falls sagatrail_kantonspack
          // im RC-Dashboard irrtuemlicherweise mit "premium" verknuepft ist,
          // wuerde dies sonst faelschlich Premium gewahren.
          e.expires_at !== null &&
          e.expires_at > jetzt
      )
    ) {
      return true;
    }

    if (!data?.next_page || items.length === 0) return false;
    startingAfter = items[items.length - 1]?.entitlement_id;
    if (!startingAfter) return false;
  }
  return false;
}
