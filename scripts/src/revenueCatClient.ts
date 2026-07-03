// RevenueCat integration (Replit connector): authenticated client for the
// RevenueCat REST API, proxied through Replit's connectors infrastructure.
// Never cache the returned client -- always call this fresh; the underlying
// proxy fetch refreshes auth tokens per request (with automatic 401 retry).
import { ReplitConnectors } from "@replit/connectors-sdk";
import { createClient } from "@replit/revenuecat-sdk/client";

const connectors = new ReplitConnectors();

export async function getUncachableRevenueCatClient() {
  return createClient({
    baseUrl: "https://api.revenuecat.com/v2",
    fetch: connectors.createProxyFetch("revenuecat"),
  });
}
