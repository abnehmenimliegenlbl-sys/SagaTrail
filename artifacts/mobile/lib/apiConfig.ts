import { setBaseUrl } from "@workspace/api-client-react";

/**
 * Absolute Basis-URL des SagaTrail-API-Servers.
 *
 * Der generierte Client ruft relative Pfade wie `/api/catalog` auf. Da die
 * Expo-App nicht denselben Origin wie der API-Server hat, muss die Host-URL
 * vorangestellt werden. Im Dev-Workflow liefert `EXPO_PUBLIC_DOMAIN` die
 * Replit-Domain des Servers (siehe package.json dev-Skript). Fehlt sie, bleibt
 * der Client bei relativen Pfaden (funktioniert im Web-Preview via Proxy).
 */
export function getApiBaseUrl(): string | null {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return null;
  const host = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${host}`;
}

let configured = false;

/** Registriert die Basis-URL genau einmal beim App-Start. */
export function configureApiClient(): void {
  if (configured) return;
  configured = true;
  setBaseUrl(getApiBaseUrl());
}
