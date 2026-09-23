import Anthropic from "@anthropic-ai/sdk";

/**
 * Der direkte Anthropic-Zugang ist der bevorzugte Weg, wenn ein eigener
 * ANTHROPIC_API_KEY gesetzt ist. Bei Guthaben-/Quota-/Rate-Limit- oder
 * temporaeren Providerfehlern faellt jeder Messages-Aufruf auf den
 * Replit-AI-Integrations-Proxy zurueck, sofern dieser verfuegbar ist.
 */
const directApiKey = process.env.ANTHROPIC_API_KEY;
const replitBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
const replitApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

function isProviderFailureEligibleForFallback(error: unknown): boolean {
  const status = (error as { status?: unknown })?.status;
  if (
    typeof status === "number" &&
    (status === 401 ||
      status === 403 ||
      status === 408 ||
      status === 429 ||
      status >= 500)
  ) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /credit balance|insufficient|quota|rate limit|overloaded|temporar|timeout|not configured/i.test(
    message,
  );
}

const replitClient =
  replitBaseUrl && replitApiKey
    ? new Anthropic({ apiKey: replitApiKey, baseURL: replitBaseUrl })
    : null;

if (!directApiKey && !replitClient) {
  throw new Error(
    "Anthropic requires either ANTHROPIC_API_KEY or the Replit AI integration.",
  );
}

const directClient = directApiKey ? new Anthropic({ apiKey: directApiKey }) : null;

if (directClient && replitClient) {
  const directCreate = directClient.messages.create as unknown as (
    ...args: any[]
  ) => Promise<unknown>;
  const replitCreate = replitClient.messages.create as unknown as (
    ...args: any[]
  ) => Promise<unknown>;

  directClient.messages.create = (async (...args: any[]) => {
    try {
      return await directCreate(...args);
    } catch (error) {
      if (!isProviderFailureEligibleForFallback(error)) throw error;
      return replitCreate(...args);
    }
  }) as unknown as typeof directClient.messages.create;
}

export const anthropic = directClient ?? replitClient!;
