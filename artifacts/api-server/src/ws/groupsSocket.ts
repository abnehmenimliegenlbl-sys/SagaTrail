import type { Server as HttpServer } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { verifyToken } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  createRoom,
  joinRoom,
  kickMember,
  leaveRoom,
  notifyJoined,
  setActivity,
  type GroupActivity,
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
    premium: row.premium,
  };
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
  | { type: "activity"; activity: GroupActivity };

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
          },
        };
      }
      return null;
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
