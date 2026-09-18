// Gemeinsames Debug-Log fuer den gesamten Kauf-/Dialog-Pfad. Genutzt von
// revenuecat.tsx (Praefix "[IAP]") und appAlert.tsx (Praefix "[MODAL]"), damit
// eine komplette Sequenz — Kauf, Server-Sync, Erfolgs-Dialog, Modal-Close,
// Navigation — lueckenlos nachvollziehbar ist. Siehe getApiBaseUrl-Kommentar
// in apiConfig.ts: console.log landet in einem TestFlight-/App-Store-Build
// nur lokal auf dem Geraet, deshalb zusaetzlich Remote-Weiterleitung an
// /api/debug/log (fire-and-forget, darf den Ablauf nie stoeren).
import { getApiBaseUrl } from "./apiConfig";

let clientLogSequence = 0;

export function makeLogger(prefix: string, remoteTag: string) {
  return function log(...args: unknown[]) {
    const emittedAt = new Date().toISOString();
    const sequence = ++clientLogSequence;
    const eventId = `${Date.now()}-${sequence}`;
    console.log(prefix, emittedAt, ...args);
    sendRemoteLog(remoteTag, args, { emittedAt, eventId, sequence });
  };
}

function sendRemoteLog(
  tag: string,
  args: unknown[],
  meta: { emittedAt: string; eventId: string; sequence: number },
) {
  try {
    const base = getApiBaseUrl();
    if (!base) return;
    const [message, ...rest] = args;
    fetch(`${base}/api/debug/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tag,
        ...meta,
        message: typeof message === "string" ? message : JSON.stringify(message),
        data: rest,
      }),
    }).catch(() => {});
  } catch {}
}
