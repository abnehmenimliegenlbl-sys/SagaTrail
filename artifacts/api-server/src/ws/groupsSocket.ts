import type { Server as HttpServer } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { verifyToken } from "@clerk/express";
import { eq, inArray } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { istPremiumAktiv } from "../lib/premiumStatus";
import {
  broadcastHikeEvent,
  createRoom,
  getRoomMemberIds,
  joinRoom,
  kickMember,
  leaveRoom,
  notifyJoined,
  setActivity,
  type GroupActivity,
  type HikeSyncEvent,
} from "../lib/groupSessions";

export const GROUPS_WS_PATH = "/api/groups/ws";

interface AuthedProfile {
  userId: string;
  name: string;
  ageTier: string;
  premium: boolean;
}

async function authenticate(token: string | null): Promise<AuthedProfile | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!token || !secretKey) {
    logger.warn({ hasToken: !!token, hasSecretKey: !!secretKey }, "Gruppen-WS: fehlender Token oder Secret Key");
    return null;
  }

  let userId: string;
  try {
    const payload = await verifyToken(token, { secretKey });
    if (!payload.sub) {
      logger.warn("Gruppen-WS: Token ohne sub-Claim");
      return null;
    }
    userId = payload.sub;
  } catch (err) {
    logger.warn({ err }, "Gruppen-WS: verifyToken fehlgeschlagen");
    return null;
  }

  const [row] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));
  if (!row) {
    logger.warn({ userId }, "Gruppen-WS: kein Profil fuer userId gefunden");
    return null;
  }

  return {
    userId,
    name: row.name,
    ageTier: row.ageTier,
    premium: istPremiumAktiv(row),
  };
}

async function sendStartPushToMembers(
  leaderId: string,
  leaderName: string,
  routeName: string
): Promise<void> {
  try {
    const memberIds = getRoomMemberIds(leaderId);
    if (memberIds.length === 0) return;
    const rows = await db
      .select({ id: profilesTable.id, pushToken: profilesTable.pushToken })
      .from(profilesTable)
      .where(inArray(profilesTable.id, memberIds));
    await Promise.allSettled(
      rows
        .filter((r) => r.pushToken)
        .map((r) =>
          fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              to: r.pushToken,
              title: "🥾 Wanderung startet!",
              body: `${leaderName} startet jetzt: ${routeName}`,
              sound: "default",
            }),
          })
        )
    );
  } catch {
    // Push-Fehler sind nicht kritisch
  }
}

async function sendJoinPush(leaderId: string, memberName: string): Promise<void> {
  try {
    const [row] = await db
      .select({ pushToken: profilesTable.pushToken })
      .from(profilesTable)
      .where(eq(profilesTable.id, leaderId));
    const token = row?.pushToken;
    if (!token) return;
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: token,
        title: "Neue Mitglied",
        body: `${memberName} ist deiner Gruppe beigetreten`,
        sound: "default",
      }),
    });
  } catch {
    // Push-Fehler sind nicht kritisch
  }
}

function send(ws: WebSocket, message: unknown): void {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(message));
}

type ClientMessage =
  | { type: "create" }
  | { type: "join"; code: string }
  | { type: "leave" }
  | { type: "kick"; targetUserId: string }
  | { type: "activity"; activity: GroupActivity }
  | { type: "hike"; event: HikeSyncEvent };

function parseHikeEvent(raw: unknown): HikeSyncEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const e = raw as Record<string, unknown>;
  switch (e.kind) {
    case "start":
      if (
        typeof e.sagaId !== "string" ||
        typeof e.routeId !== "string" ||
        typeof e.routeName !== "string"
      ) {
        return null;
      }
      return {
        kind: "start",
        sagaId: e.sagaId,
        routeId: e.routeId,
        routeName: e.routeName,
      };
    case "chapter":
      if (typeof e.index !== "number" || !Number.isInteger(e.index) || e.index < 0) {
        return null;
      }
      return { kind: "chapter", index: e.index };
    case "decision":
      if (
        typeof e.chapterIndex !== "number" ||
        !Number.isInteger(e.chapterIndex) ||
        e.chapterIndex < 0 ||
        typeof e.optionIndex !== "number" ||
        !Number.isInteger(e.optionIndex) ||
        e.optionIndex < 0
      ) {
        return null;
      }
      return { kind: "decision", chapterIndex: e.chapterIndex, optionIndex: e.optionIndex };
    case "finish":
      return { kind: "finish" };
    default:
      return null;
  }
}

function parseClientMessage(raw: unknown): ClientMessage | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  switch (data.type) {
    case "create":
      return { type: "create" };
    case "join":
      if (typeof data.code !== "string") return null;
      return { type: "join", code: data.code.trim().toUpperCase() };
    case "leave":
      return { type: "leave" };
    case "kick":
      if (typeof data.targetUserId !== "string") return null;
      return { type: "kick", targetUserId: data.targetUserId };
    case "activity": {
      const activity = data.activity;
      if (typeof activity !== "object" || activity === null) return null;
      const a = activity as Record<string, unknown>;
      if (a.type === "idle") return { type: "activity", activity: { type: "idle" } };
      if (a.type === "wandert" && typeof a.sagaTitle === "string") {
        return {
          type: "activity",
          activity: {
            type: "wandert",
            sagaTitle: a.sagaTitle,
            startedAt: Date.now(),
            ...(typeof a.sagaId === "string" ? { sagaId: a.sagaId } : {}),
            ...(typeof a.routeId === "string" ? { routeId: a.routeId } : {}),
          },
        };
      }
      return null;
    }
    case "hike": {
      const event = parseHikeEvent(data.event);
      if (!event) return null;
      return { type: "hike", event };
    }
    default:
      return null;
  }
}

/**
 * Haengt den Gruppen-WebSocket-Server an den bestehenden HTTP-Server.
 * Auth erfolgt per `?token=<Clerk-Session-Token>` in der Verbindungs-URL, da
 * das native `WebSocket` in Expo/React Native keine custom Header beim
 * Handshake unterstuetzt.
 */
export function attachGroupsSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ server, path: GROUPS_WS_PATH });

  wss.on("connection", (ws, req) => {
    void (async () => {
      const url = new URL(req.url ?? "", "http://internal");
      const token = url.searchParams.get("token");
      const profile = await authenticate(token);
      if (!profile) {
        send(ws, { type: "error", code: "unauthorized" });
        ws.close(4401, "unauthorized");
        return;
      }

      ws.on("message", (raw) => {
        void (async () => {
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw.toString());
          } catch {
            send(ws, { type: "error", code: "invalid_message" });
            return;
          }
          const message = parseClientMessage(parsed);
          if (!message) {
            send(ws, { type: "error", code: "invalid_message" });
            return;
          }

          switch (message.type) {
            case "create": {
              if (!profile.premium) {
                send(ws, { type: "error", code: "premium_required" });
                return;
              }
              const room = createRoom({
                userId: profile.userId,
                name: profile.name,
                ageTier: profile.ageTier,
                ws,
              });
              notifyJoined(room, ws);
              return;
            }
            case "join": {
              const result = joinRoom({
                code: message.code,
                userId: profile.userId,
                name: profile.name,
                ageTier: profile.ageTier,
                ws,
              });
              if (!result.ok) {
                send(ws, { type: "error", code: result.reason });
                return;
              }
              notifyJoined(result.room, ws);
              // Push-Benachrichtigung an Gruppenleitung (nicht-blockierend)
              void sendJoinPush(result.room.leaderId, profile.name);
              return;
            }
            case "leave": {
              leaveRoom(profile.userId, ws);
              return;
            }
            case "kick": {
              const result = kickMember({
                leaderId: profile.userId,
                targetUserId: message.targetUserId,
              });
              if (!result.ok) {
                send(ws, { type: "error", code: result.reason });
              }
              return;
            }
            case "activity": {
              setActivity(profile.userId, message.activity);
              return;
            }
            case "hike": {
              // Nur die Gruppenleitung darf Wander-Sync-Ereignisse (inkl.
              // Entscheidungen) senden — wird in broadcastHikeEvent erzwungen.
              const result = broadcastHikeEvent(profile.userId, message.event);
              if (!result.ok) {
                send(ws, { type: "error", code: result.reason });
              }
              // Beim Wanderstart Push an alle Mitglieder (nicht-blockierend)
              if (message.event.kind === "start") {
                void sendStartPushToMembers(
                  profile.userId,
                  profile.name,
                  message.event.routeName
                );
              }
              return;
            }
          }
        })().catch((err) => {
          logger.error({ err }, "Fehler bei der Verarbeitung einer Gruppen-Nachricht");
        });
      });

      ws.on("close", () => {
        leaveRoom(profile.userId, ws);
      });
    })().catch((err) => {
      logger.error({ err }, "Fehler beim Aufbau einer Gruppen-WebSocket-Verbindung");
      ws.close(1011, "internal_error");
    });
  });

  logger.info({ path: GROUPS_WS_PATH }, "Gruppen-WebSocket-Server bereit");
}
