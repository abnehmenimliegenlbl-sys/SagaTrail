import Anthropic from "@anthropic-ai/sdk";

/**
 * Der Replit-AI-Integrations-Proxy war zeitweise nicht erreichbar
 * ("Replit AI Integrations is not configured"). Als Ausweichloesung
 * spricht der Client direkt mit der Anthropic-API, wenn ein eigener
 * ANTHROPIC_API_KEY gesetzt ist -- sonst faellt er auf den Proxy zurueck.
 */
const directApiKey = process.env.ANTHROPIC_API_KEY;

if (!directApiKey) {
  if (!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL) {
    throw new Error(
      "AI_INTEGRATIONS_ANTHROPIC_BASE_URL must be set. Did you forget to provision the Anthropic AI integration?",
    );
  }

  if (!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) {
    throw new Error(
      "AI_INTEGRATIONS_ANTHROPIC_API_KEY must be set. Did you forget to provision the Anthropic AI integration?",
    );
  }
}

export const anthropic = directApiKey
  ? new Anthropic({ apiKey: directApiKey })
  : new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });
