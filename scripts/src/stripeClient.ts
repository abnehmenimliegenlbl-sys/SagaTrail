import Stripe from "stripe";

type StripeConnectionResponse = {
  items?: Array<{
    settings?: {
      secret_key?: string;
      webhook_secret?: string;
    };
  }>;
};

/**
 * Lädt Stripe-Zugangsdaten frisch aus dem Secret oder aus der Replit-
 * Verbindung. Die Scripts bleiben damit unabhängig vom API-Quellordner.
 */
async function getStripeCredentials(): Promise<{ secretKey: string }> {
  if (process.env.STRIPE_SECRET_KEY) {
    return { secretKey: process.env.STRIPE_SECRET_KEY };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;

  if (!hostname || !xReplitToken) {
    throw new Error("Stripe nicht konfiguriert. Bitte STRIPE_SECRET_KEY als Secret setzen.");
  }

  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=stripe`,
    {
      headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Stripe-Zugangsdaten konnten nicht geladen werden: ${response.status}`);
  }

  const data = (await response.json()) as StripeConnectionResponse;
  const secretKey = data.items?.[0]?.settings?.secret_key;
  if (!secretKey) {
    throw new Error("Stripe-Verbindung fehlt oder enthält keinen Secret Key.");
  }
  return { secretKey };
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const { secretKey } = await getStripeCredentials();
  return new Stripe(secretKey);
}