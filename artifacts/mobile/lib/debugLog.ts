// Gemeinsames Debug-Log fuer den gesamten Kauf-/Dialog-Pfad. Genutzt von
// revenuecat.tsx (Praefix "[IAP]") und appAlert.tsx (Praefix "[MODAL]"), damit
// eine komplette Sequenz — Kauf, Server-Sync, Erfolgs-Dialog, Modal-Close,
// Navigation — lueckenlos nachvollziehbar ist. Siehe getApiBaseUrl-Kommentar
// in apiConfig.ts: console.log landet in einem TestFlight-/App-Store-Build
// nur lokal auf dem Geraet, deshalb zusaetzlich Remote-Weiterleitung an
// /api/debug/log. Entscheidungs- und Audio-Logs werden zusaetzlich lokal
// gepuffert, damit sie bei App-Hintergrund, Netzwerkwechsel oder einem API-
// Neustart nicht lautlos verloren gehen.
import { getApiBaseUrl } from "./apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

let clientLogSequence = 0;
const CRITICAL_TAGS = new Set(["decision_flow", "story_audio"]);
const OUTBOX_KEY = "@sagatrail/debug-log-outbox-v2";
const MAX_OUTBOX_ITEMS = 300;
let criticalQueue: Promise<void> = Promise.resolve();

type RemoteLogPayload = {
  tag: string;
  emittedAt: string;
  eventId: string;
  sequence: number;
  message: string;
  data: unknown[];
};

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
  const [message, ...rest] = args;
  const payload: RemoteLogPayload = {
    tag,
    ...meta,
    message: typeof message === "string" ? message : JSON.stringify(message),
    data: rest,
  };
  if (CRITICAL_TAGS.has(tag)) {
    criticalQueue = criticalQueue
      .then(() => persistAndFlush(payload))
      .catch((error) => {
        console.warn("[REMOTE-DEBUG] critical log queue failed", {
          tag,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    return;
  }
  void postRemoteLog(payload);
}

async function persistAndFlush(payload: RemoteLogPayload): Promise<void> {
  const raw = await AsyncStorage.getItem(OUTBOX_KEY).catch(() => null);
  let pending: RemoteLogPayload[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) pending = parsed;
    } catch {
      pending = [];
    }
  }
  pending = [...pending, payload].slice(-MAX_OUTBOX_ITEMS);
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(pending));

  const remaining: RemoteLogPayload[] = [];
  for (const item of pending) {
    const sent = await postRemoteLog(item);
    if (!sent) {
      remaining.push(item);
      break;
    }
  }
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
}

async function postRemoteLog(payload: RemoteLogPayload): Promise<boolean> {
  try {
    const base = getApiBaseUrl();
    if (!base) return false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const response = await fetch(`${base}/api/debug/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (response.ok) return true;
    console.warn("[REMOTE-DEBUG] server rejected log", {
      tag: payload.tag,
      status: response.status,
    });
  } catch (error) {
    console.warn("[REMOTE-DEBUG] upload failed", {
      tag: payload.tag,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return false;
}
