import { getApiBaseUrl } from "@/lib/apiConfig";

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
    };

/**
 * Live-Sync-Ereignisse einer Gruppenwanderung. Nur die Gruppenleitung darf
 * sie senden (serverseitig erzwungen); Mitglieder empfangen sie und folgen
 * Kapiteln und Entscheidungen der Leitung.
 */
export type HikeSyncEvent =
  | { kind: "start"; sagaId: string; routeId: string; routeName: string }
  | { kind: "chapter"; index: number }
  | { kind: "decision"; chapterIndex: number; optionIndex: number }
  | { kind: "finish" };

export interface GroupMember {
  id: string;
  name: string;
  ageTier: string;
  isLeader: boolean;
  activity: GroupActivity;
}

export type GroupConnectionStatus =
  | "getrennt"
  | "verbindet"
  | "verbunden"
  | "fehler";

export type GroupSocketError = "premium_required" | "not_found" | "network" | "unbekannt";

export interface GroupSocketEvents {
  onStatusChange: (status: GroupConnectionStatus) => void;
  onJoined: (code: string, members: GroupMember[]) => void;
  onMembers: (members: GroupMember[]) => void;
  onClosedByLeader: () => void;
  onKicked: () => void;
  onError: (error: GroupSocketError) => void;
  onHikeEvent?: (event: HikeSyncEvent) => void;
}

type PendingAction =
  | { type: "create" }
  | { type: "join"; code: string };

interface WireMember {
  userId: string;
  name: string;
  ageTier: string;
  isLeader: boolean;
  activity: GroupActivity;
}

function normalizeMembers(raw: unknown): GroupMember[] {
  if (!Array.isArray(raw)) return [];
  return (raw as WireMember[]).map((m) => ({
    id: m.userId,
    name: m.name,
    ageTier: m.ageTier,
    isLeader: m.isLeader,
    activity: m.activity,
  }));
}

const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];
const NETWORK_ERROR_THRESHOLD = 2;

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
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByUser = false;

  constructor(
    private readonly getToken: () => Promise<string | null>,
    private readonly events: GroupSocketEvents
  ) {}

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

  private async openConnection(): Promise<void> {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
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

    ws.onopen = () => {
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
        const code = data.code as string;
        this.lastAction = { type: "join", code };
        this.events.onJoined(code, members);
        return;
      }
      case "members": {
        const members = normalizeMembers(data.members);
        this.events.onMembers(members);
        return;
      }
      case "closed": {
        this.lastAction = null;
        this.events.onClosedByLeader();
        return;
      }
      case "kicked": {
        this.lastAction = null;
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
      case "error": {
        const code = data.code as string;
        // Nicht-fatale Protokollfehler (z.B. ein abgewiesenes Wander-Sync-
        // Ereignis eines Nicht-Leiters) beenden die Sitzung NICHT — das
        // Ereignis wird einfach verworfen, die Verbindung bleibt bestehen.
        if (code === "not_leader" || code === "invalid_message") {
          return;
        }
        this.closedByUser = true;
        this.clearReconnectTimer();
        this.lastAction = null;
        this.ws?.close();
        this.ws = null;
        this.closedByUser = false;
        this.reconnectAttempt = 0;
        this.setStatus("fehler");
        if (code === "premium_required" || code === "not_found") {
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

  private send(action: PendingAction | { type: "leave" | "kick"; targetUserId?: string } | { type: "activity"; activity: GroupActivity } | { type: "hike"; event: HikeSyncEvent }): void {
    if (!this.ws || this.ws.readyState !== this.ws.OPEN) return;
    this.ws.send(JSON.stringify(action));
  }

  create(): void {
    this.closedByUser = false;
    this.lastAction = { type: "create" };
    void this.openConnection();
  }

  join(code: string): void {
    this.closedByUser = false;
    this.lastAction = { type: "join", code: code.trim().toUpperCase() };
    void this.openConnection();
  }

  setActivity(activity: GroupActivity): void {
    this.send({ type: "activity", activity });
  }

  sendHikeEvent(event: HikeSyncEvent): void {
    this.send({ type: "hike", event });
  }

  kick(targetUserId: string): void {
    this.send({ type: "kick", targetUserId });
  }

  leave(): void {
    this.closedByUser = true;
    this.clearReconnectTimer();
    this.lastAction = null;
    this.send({ type: "leave" });
    this.ws?.close();
    this.ws = null;
    this.setStatus("getrennt");
  }

  disconnect(): void {
    this.closedByUser = true;
    this.clearReconnectTimer();
    this.ws?.close();
    this.ws = null;
  }
}
