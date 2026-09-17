import { getApiBaseUrl } from "@/lib/apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Client fuer die Gruppen-WebSocket-Verbindung (Task #6). Kapselt Verbindung,
 * automatisches Reconnect mit exponentiellem Backoff und das Nachrichten-
 * protokoll. `AppContext` haelt den eigentlichen React-Zustand; dieser Client
 * meldet nur rohe Ereignisse zurueck.
 */

export type GroupActivity =
  | { type: "idle" }
  | {
      type: "wandert";
      sagaTitle: string;
      startedAt: number;
      // Saga/Route der laufenden Wanderung — erlaubt anderen Mitgliedern
      // das Mitwandern auf derselben Route.
      sagaId?: string;
      routeId?: string;
      location?: GroupLocation;
    };

export interface GroupLocation {
  lat: number;
  lng: number;
  accuracy: number | null;
  updatedAt: number;
}

/**
 * Live-Sync-Ereignisse einer Gruppenwanderung. Nur die Gruppenleitung darf
 * sie senden (serverseitig erzwungen); Mitglieder empfangen sie und folgen
 * Kapiteln und Entscheidungen der Leitung.
 */
export type HikeSyncEvent =
  | { kind: "start"; sagaId: string; routeId: string; routeName: string; clientHikeId?: string }
  | { kind: "chapter"; index: number }
  | { kind: "decision"; chapterIndex: number; optionIndex: number }
  | { kind: "finish"; clientHikeId?: string };

export interface GroupMember {
  id: string;
  name: string;
  ageTier: string;
  isLeader: boolean;
  connected: boolean;
  activity: GroupActivity;
  location?: GroupLocation;
}

export type GroupConnectionStatus =
  | "getrennt"
  | "verbindet"
  | "verbunden"
  | "fehler";

export type GroupSocketError =
  | "premium_required"
  | "not_found"
  | "full"
  | "already_in_group"
  | "expired"
  | "network"
  | "unbekannt";

export interface GroupSocketEvents {
  onStatusChange: (status: GroupConnectionStatus) => void;
  onJoined: (
    code: string,
    members: GroupMember[],
    rendezvous?: GroupLocation | null,
    hikeState?: { event: HikeSyncEvent; updatedAt: number } | null,
  ) => void;
  onMembers: (members: GroupMember[]) => void;
  onClosedByLeader: () => void;
  onKicked: () => void;
  onError: (error: GroupSocketError) => void;
  onHikeEvent?: (event: HikeSyncEvent) => void;
  onHikeFinishAck?: (clientHikeId: string | null) => void;
  onRendezvous?: (location: GroupLocation | null) => void;
}

type PendingAction =
  | { type: "create" }
  | { type: "join"; code: string };

interface WireMember {
  userId: string;
  name: string;
  ageTier: string;
  isLeader: boolean;
  connected?: boolean;
  activity: GroupActivity;
  location?: GroupLocation;
}

function normalizeMembers(raw: unknown): GroupMember[] {
  if (!Array.isArray(raw)) return [];
  return (raw as WireMember[]).map((m) => ({
    id: m.userId,
    name: m.name,
    ageTier: m.ageTier,
    isLeader: m.isLeader,
    connected: m.connected !== false,
    activity: m.activity,
    location: m.location,
  }));
}

const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];
const NETWORK_ERROR_THRESHOLD = 2;
const GROUP_FINISH_INTENT_KEY = "sagatrail:groupHikeFinishIntent";

interface PersistedFinishIntent {
  roomCode: string;
  clientHikeId: string;
}

function wsBaseUrl(): string | null {
  const apiBase = getApiBaseUrl();
  if (apiBase) {
    return apiBase.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  }
  if (typeof window !== "undefined" && window.location) {
    const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${scheme}//${window.location.host}`;
  }
  return null;
}

export class GroupSocket {
  private ws: WebSocket | null = null;
  private status: GroupConnectionStatus = "getrennt";
  private lastAction: PendingAction | null = null;
  private joinedRoomCode: string | null = null;
  private pendingActivity: GroupActivity | null = null;
  private pendingRendezvous: GroupLocation | null | undefined;
  private pendingHikeEvents: HikeSyncEvent[] = [];
  private finishRetryTimer: ReturnType<typeof setInterval> | null = null;
  private persistedFinishIntent: PersistedFinishIntent | null = null;
  private finishIntentReady: Promise<void>;
  private finishIntentWrite: Promise<void> = Promise.resolve();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimeout: ReturnType<typeof setTimeout> | null = null;
  private closedByUser = false;

  constructor(
    private readonly getToken: () => Promise<string | null>,
    private readonly events: GroupSocketEvents
  ) {
    this.finishIntentReady = this.restoreFinishIntent();
  }

  private setStatus(status: GroupConnectionStatus): void {
    this.status = status;
    this.events.onStatusChange(status);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearConnectTimeout(): void {
    if (!this.connectTimeout) return;
    clearTimeout(this.connectTimeout);
    this.connectTimeout = null;
  }

  private clearRoomState(clearPersistedFinish = false): void {
    this.lastAction = null;
    this.joinedRoomCode = null;
    this.pendingActivity = null;
    this.pendingRendezvous = undefined;
    this.pendingHikeEvents = [];
    this.clearFinishRetryTimer();
    if (clearPersistedFinish) {
      this.persistedFinishIntent = null;
      void this.removePersistedFinishIntent();
    }
  }

  private async restoreFinishIntent(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(GROUP_FINISH_INTENT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedFinishIntent>;
      if (
        typeof parsed.roomCode === "string" &&
        parsed.roomCode.trim().length > 0 &&
        typeof parsed.clientHikeId === "string" &&
        parsed.clientHikeId.trim().length > 0
      ) {
        this.persistedFinishIntent = {
          roomCode: parsed.roomCode.trim().toUpperCase(),
          clientHikeId: parsed.clientHikeId.trim(),
        };
      }
    } catch {
      // A malformed/stale local intent must never prevent group reconnect.
    }
  }

  private queueFinishIntentWrite(write: () => Promise<void>): Promise<void> {
    const next = this.finishIntentWrite.then(write, write);
    this.finishIntentWrite = next.catch(() => undefined);
    return next;
  }

  private persistFinishIntent(intent: PersistedFinishIntent): Promise<void> {
    this.persistedFinishIntent = intent;
    return this.queueFinishIntentWrite(() =>
      AsyncStorage.setItem(GROUP_FINISH_INTENT_KEY, JSON.stringify(intent)),
    );
  }

  private removePersistedFinishIntent(): Promise<void> {
    return this.queueFinishIntentWrite(() =>
      AsyncStorage.removeItem(GROUP_FINISH_INTENT_KEY),
    );
  }

  private restoreFinishIntentForRoom(roomCode: string): void {
    const intent = this.persistedFinishIntent;
    this.pendingHikeEvents = this.pendingHikeEvents.filter(
      (event) => event.kind !== "finish",
    );
    if (!intent || intent.roomCode !== roomCode) {
      this.clearFinishRetryTimer();
      return;
    }
    this.pendingHikeEvents.push({
      kind: "finish",
      clientHikeId: intent.clientHikeId,
    });
    this.startFinishRetryTimer();
  }

  private currentRoomCode(): string | null {
    if (this.joinedRoomCode) return this.joinedRoomCode;
    return this.lastAction?.type === "join" ? this.lastAction.code : null;
  }

  private clearFinishRetryTimer(): void {
    if (!this.finishRetryTimer) return;
    clearInterval(this.finishRetryTimer);
    this.finishRetryTimer = null;
  }

  private startFinishRetryTimer(): void {
    if (this.finishRetryTimer) return;
    // Keep one bounded retry loop for the outstanding finish. The queue is
    // deduplicated below, so reconnects/retries never grow it indefinitely.
    this.finishRetryTimer = setInterval(() => {
      const finish = this.pendingHikeEvents.find((event) => event.kind === "finish");
      if (!finish) {
        this.clearFinishRetryTimer();
        return;
      }
      if (this.joinedRoomCode && this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: "hike", event: finish });
      }
    }, 5_000);
  }

  private async openConnection(): Promise<void> {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    // A newly opened socket is not in the room until the server's `joined`
    // response arrives. Keep the finish queued, but do not send it before
    // that rejoin handshake has completed.
    this.joinedRoomCode = null;
    const base = wsBaseUrl();
    if (!base) {
      this.setStatus("fehler");
      this.events.onError("network");
      return;
    }
    const token = await this.getToken();
    if (!token) {
      this.setStatus("fehler");
      this.events.onError("network");
      return;
    }

    this.setStatus("verbindet");
    const url = `${base}/api/groups/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    this.ws = ws;
    this.clearConnectTimeout();
    this.connectTimeout = setTimeout(() => {
      if (this.ws === ws && ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }, 15_000);

    ws.onopen = () => {
      this.clearConnectTimeout();
      this.reconnectAttempt = 0;
      if (this.lastAction) {
        this.send(this.lastAction);
      }
    };

    ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    ws.onerror = () => {
      // onclose folgt und uebernimmt die eigentliche Fehlerbehandlung.
    };

    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.clearConnectTimeout();
      this.ws = null;
      if (this.closedByUser) {
        this.setStatus("getrennt");
        return;
      }
      if (this.reconnectAttempt >= NETWORK_ERROR_THRESHOLD) {
        this.setStatus("fehler");
        this.events.onError("network");
      } else {
        this.setStatus("verbindet");
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const delay =
      RECONNECT_DELAYS_MS[
        Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)
      ];
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      if (!this.closedByUser) void this.openConnection();
    }, delay);
  }

  private handleMessage(raw: unknown): void {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(String(raw));
    } catch {
      return;
    }
    switch (data.type) {
      case "joined": {
        this.setStatus("verbunden");
        const members = normalizeMembers(data.members);
        const code = String(data.code ?? "").trim().toUpperCase();
        if (!code) return;
        this.joinedRoomCode = code;
        this.lastAction = { type: "join", code };
        this.events.onJoined(
          code,
          members,
          (data.rendezvous as GroupLocation | null) ?? null,
          (data.hikeState as { event: HikeSyncEvent; updatedAt: number } | null) ?? null,
        );
        // Hydration may still be in flight when the socket joins. Never flush
        // a durable finish until its original room has been confirmed.
        void this.finishIntentReady.then(() => {
          if (this.joinedRoomCode !== code || this.ws?.readyState !== WebSocket.OPEN) {
            return;
          }
          this.restoreFinishIntentForRoom(code);
          this.flushPendingRoomActions();
        });
        return;
      }
      case "members": {
        const members = normalizeMembers(data.members);
        this.events.onMembers(members);
        return;
      }
      case "closed": {
        this.clearRoomState(true);
        this.events.onClosedByLeader();
        return;
      }
      case "expired": {
        this.clearRoomState(true);
        this.events.onError("expired");
        this.events.onClosedByLeader();
        return;
      }
      case "kicked": {
        this.clearRoomState(true);
        this.events.onKicked();
        return;
      }
      case "hike": {
        const event = data.event as HikeSyncEvent | undefined;
        if (event && typeof event.kind === "string") {
          this.events.onHikeEvent?.(event);
        }
        return;
      }
      case "hike_finish_ack": {
        const clientHikeId =
          typeof data.clientHikeId === "string" && data.clientHikeId.trim().length > 0
            ? data.clientHikeId.trim()
            : null;
        this.pendingHikeEvents = this.pendingHikeEvents.filter((event) => {
          if (event.kind !== "finish") return true;
          // Null is the legacy acknowledgement shape and acknowledges the
          // sole outstanding finish even when the server cannot echo its ID.
          return clientHikeId !== null && event.clientHikeId !== clientHikeId;
        });
        if (!this.pendingHikeEvents.some((event) => event.kind === "finish")) {
          this.clearFinishRetryTimer();
        }
        if (clientHikeId !== null) {
          void this.finishIntentReady.then(async () => {
            if (this.persistedFinishIntent?.clientHikeId !== clientHikeId) return;
            this.persistedFinishIntent = null;
            await this.removePersistedFinishIntent();
          });
        }
        this.events.onHikeFinishAck?.(clientHikeId);
        return;
      }
      case "rendezvous": {
        this.events.onRendezvous?.((data.location as GroupLocation | null) ?? null);
        return;
      }
      case "error": {
        const code = data.code as string;
        // Nicht-fatale Protokollfehler (z.B. ein abgewiesenes Wander-Sync-
        // Ereignis eines Nicht-Leiters) beenden die Sitzung NICHT — das
        // Ereignis wird einfach verworfen, die Verbindung bleibt bestehen.
        if (code === "not_leader" || code === "invalid_message") {
          return;
        }
        if (code === "rate_limited") {
          // Die Verbindung bleibt offen; nur die zu häufige Nachricht wird
          // verworfen.
          return;
        }
        this.closedByUser = true;
        this.clearReconnectTimer();
        this.clearConnectTimeout();
        this.clearRoomState();
        this.ws?.close();
        this.ws = null;
        this.closedByUser = false;
        this.reconnectAttempt = 0;
        this.setStatus("fehler");
        if (
          code === "premium_required" ||
          code === "not_found" ||
          code === "full" ||
          code === "already_in_group"
        ) {
          this.events.onError(code);
        } else {
          this.events.onError("unbekannt");
        }
        return;
      }
      default:
        return;
    }
  }

  private send(action: PendingAction | { type: "leave" | "kick"; targetUserId?: string } | { type: "activity"; activity: GroupActivity } | { type: "rendezvous"; location: GroupLocation | null } | { type: "hike"; event: HikeSyncEvent }): void {
    if (!this.ws || this.ws.readyState !== this.ws.OPEN) return;
    this.ws.send(JSON.stringify(action));
  }

  private flushPendingRoomActions(): void {
    if (!this.joinedRoomCode || !this.ws || this.ws.readyState !== this.ws.OPEN) return;
    if (this.pendingActivity) {
      const activity = this.pendingActivity;
      this.pendingActivity = null;
      this.send({ type: "activity", activity });
    }
    if (this.pendingRendezvous !== undefined) {
      const location = this.pendingRendezvous;
      this.pendingRendezvous = undefined;
      this.send({ type: "rendezvous", location });
    }
    for (const event of this.pendingHikeEvents) {
      this.send({ type: "hike", event });
    }
    // A finish remains queued until the server acknowledges it. All other
    // events are one-shot and can be discarded after the room rejoin.
    this.pendingHikeEvents = this.pendingHikeEvents.filter(
      (event) => event.kind === "finish",
    );
  }

  create(): void {
    void this.finishIntentReady.then(() => {
      this.closedByUser = false;
      this.joinedRoomCode = null;
      this.pendingHikeEvents = this.pendingHikeEvents.filter(
        (event) => event.kind !== "finish",
      );
      this.clearFinishRetryTimer();
      this.persistedFinishIntent = null;
      void this.removePersistedFinishIntent();
      this.lastAction = { type: "create" };
      void this.openConnection();
    });
  }

  join(code: string): void {
    const nextCode = code.trim().toUpperCase();
    void this.finishIntentReady.then(() => {
      this.closedByUser = false;
      if (this.persistedFinishIntent?.roomCode !== nextCode) {
        this.pendingHikeEvents = this.pendingHikeEvents.filter(
          (event) => event.kind !== "finish",
        );
        this.clearFinishRetryTimer();
        this.persistedFinishIntent = null;
        void this.removePersistedFinishIntent();
      }
      this.joinedRoomCode = null;
      this.lastAction = { type: "join", code: nextCode };
      void this.openConnection();
    });
  }

  setActivity(activity: GroupActivity): void {
    if (!this.lastAction && !this.joinedRoomCode) return;
    if (this.joinedRoomCode && this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: "activity", activity });
      return;
    }
    this.pendingActivity = activity;
  }

  setRendezvous(location: GroupLocation | null): void {
    if (!this.lastAction && !this.joinedRoomCode) return;
    if (this.joinedRoomCode && this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: "rendezvous", location });
      return;
    }
    this.pendingRendezvous = location;
  }

  async sendHikeEvent(event: HikeSyncEvent): Promise<void> {
    if (!this.lastAction && !this.joinedRoomCode) return;
    if (event.kind === "finish") {
      await this.finishIntentReady;
      const roomCode = this.currentRoomCode();
      if (!roomCode || !event.clientHikeId?.trim()) return;
      // Persist before enqueueing/sending so clearing ActiveHike immediately
      // after finish cannot lose the process-durable intent.
      await this.persistFinishIntent({
        roomCode,
        clientHikeId: event.clientHikeId.trim(),
      });
      if (this.closedByUser || this.currentRoomCode() !== roomCode) return;
      // Keep at most one outstanding finish (the current hike's stable ID).
      // Re-sending/retrying replaces the queued copy instead of appending it.
      this.pendingHikeEvents = this.pendingHikeEvents.filter(
        (pending) => pending.kind !== "finish",
      );
      this.pendingHikeEvents.push({
        kind: "finish",
        clientHikeId: event.clientHikeId.trim(),
      });
      this.startFinishRetryTimer();
    }
    if (this.joinedRoomCode && this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: "hike", event });
      return;
    }
    if (event.kind !== "finish") {
      const finish = this.pendingHikeEvents.find((pending) => pending.kind === "finish");
      const ordinaryEvents = this.pendingHikeEvents.filter(
        (pending) => pending.kind !== "finish",
      );
      this.pendingHikeEvents = [
        ...ordinaryEvents.slice(-19),
        event,
        ...(finish ? [finish] : []),
      ];
    }
  }

  kick(targetUserId: string): void {
    this.send({ type: "kick", targetUserId });
  }

  leave(): void {
    this.closedByUser = true;
    this.clearReconnectTimer();
    this.clearFinishRetryTimer();
    this.send({ type: "leave" });
    this.clearRoomState(true);
    this.clearConnectTimeout();
    this.ws?.close();
    this.ws = null;
    this.setStatus("getrennt");
  }

  disconnect(): void {
    this.closedByUser = true;
    this.clearReconnectTimer();
    this.clearConnectTimeout();
    this.clearFinishRetryTimer();
    this.ws?.close();
    this.ws = null;
  }
}
