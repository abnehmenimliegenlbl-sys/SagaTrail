import type { WebSocket } from "ws";
import { logger } from "./logger";

/**
 * In-memory Gruppensitzungen (Presence/Status-Sync fuer Task #6). Wie die
 * bereits bestehenden In-Memory-Caches (z.B. Kanton-Routenindex) ist dies
 * bewusst nicht persistiert: eine Gruppensitzung ist ein kurzlebiges,
 * gemeinsames Erlebnis fuer eine Wanderung und muss keinen Serverneustart
 * ueberleben. Ein einzelner Server-Prozess reicht fuer den aktuellen
 * Deployment-Rahmen.
 */

export type GroupActivity =
  | { type: "idle" }
  | { type: "wandert"; sagaTitle: string; startedAt: number };

export interface GroupMemberInfo {
  userId: string;
  name: string;
  ageTier: string;
  isLeader: boolean;
  activity: GroupActivity;
}

interface RoomMember {
  userId: string;
  name: string;
  ageTier: string;
  activity: GroupActivity;
  ws: WebSocket;
}

interface Room {
  code: string;
  leaderId: string;
  createdAt: number;
  members: Map<string, RoomMember>;
}

const rooms = new Map<string, Room>();
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function generateUniqueCode(): string {
  let code = randomCode();
  while (rooms.has(code)) {
    code = randomCode();
  }
  return code;
}

function toMemberInfo(room: Room, member: RoomMember): GroupMemberInfo {
  return {
    userId: member.userId,
    name: member.name,
    ageTier: member.ageTier,
    isLeader: member.userId === room.leaderId,
    activity: member.activity,
  };
}

export function roomMembers(room: Room): GroupMemberInfo[] {
  return Array.from(room.members.values())
    .map((m) => toMemberInfo(room, m))
    .sort((a, b) => {
      if (a.isLeader !== b.isLeader) return a.isLeader ? -1 : 1;
      return 0;
    });
}

function send(ws: WebSocket, message: unknown): void {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(message));
}

function broadcastMembers(room: Room): void {
  const members = roomMembers(room);
  for (const member of room.members.values()) {
    send(member.ws, { type: "members", code: room.code, members });
  }
}

/**
 * Erstellt eine neue Gruppensitzung mit dem verbindenden Nutzer als Leitung.
 * Aufrufer muss den Premium-Status vorher geprueft haben.
 */
export function createRoom(params: {
  userId: string;
  name: string;
  ageTier: string;
  ws: WebSocket;
}): Room {
  const code = generateUniqueCode();
  const room: Room = {
    code,
    leaderId: params.userId,
    createdAt: Date.now(),
    members: new Map(),
  };
  room.members.set(params.userId, {
    userId: params.userId,
    name: params.name,
    ageTier: params.ageTier,
    activity: { type: "idle" },
    ws: params.ws,
  });
  rooms.set(code, room);
  logger.info({ code, userId: params.userId }, "Gruppensitzung erstellt");
  return room;
}

export type JoinResult =
  | { ok: true; room: Room }
  | { ok: false; reason: "not_found" };

/**
 * Fuegt einen Nutzer einer bestehenden Sitzung hinzu (oder aktualisiert
 * dessen Verbindung bei einem Reconnect). Die Leitungsrolle bleibt an die
 * urspruengliche `leaderId` gebunden, unabhaengig davon, wer beitritt.
 */
export function joinRoom(params: {
  code: string;
  userId: string;
  name: string;
  ageTier: string;
  ws: WebSocket;
}): JoinResult {
  const room = rooms.get(params.code);
  if (!room) return { ok: false, reason: "not_found" };

  const existing = room.members.get(params.userId);
  room.members.set(params.userId, {
    userId: params.userId,
    name: params.name,
    ageTier: params.ageTier,
    activity: existing?.activity ?? { type: "idle" },
    ws: params.ws,
  });
  return { ok: true, room };
}

export function findRoomByUser(userId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.members.has(userId)) return room;
  }
  return undefined;
}

/**
 * Entfernt einen Nutzer aus seiner Sitzung (explizites Verlassen oder
 * Verbindungsabbruch). Nur wenn `ws` noch die aktuell registrierte
 * Verbindung dieses Nutzers ist, wird tatsaechlich entfernt — verhindert,
 * dass eine bereits ersetzte (reconnectete) Verbindung den neuen Zustand
 * loescht. Verlaesst die Leitung die Sitzung, wird die gesamte Sitzung fuer
 * alle beendet.
 */
export function leaveRoom(userId: string, ws: WebSocket): void {
  const room = findRoomByUser(userId);
  if (!room) return;
  const member = room.members.get(userId);
  if (!member || member.ws !== ws) return;

  if (userId === room.leaderId) {
    for (const other of room.members.values()) {
      if (other.userId !== userId) {
        send(other.ws, { type: "closed", code: room.code });
      }
    }
    rooms.delete(room.code);
    logger.info({ code: room.code }, "Gruppensitzung von Leitung beendet");
    return;
  }

  room.members.delete(userId);
  broadcastMembers(room);
}

export type KickResult =
  | { ok: true }
  | { ok: false; reason: "not_leader" | "not_found" };

export function kickMember(params: {
  leaderId: string;
  targetUserId: string;
}): KickResult {
  const room = findRoomByUser(params.leaderId);
  if (!room) return { ok: false, reason: "not_found" };
  if (room.leaderId !== params.leaderId) return { ok: false, reason: "not_leader" };
  if (params.targetUserId === room.leaderId) return { ok: false, reason: "not_found" };

  const target = room.members.get(params.targetUserId);
  if (!target) return { ok: false, reason: "not_found" };

  room.members.delete(params.targetUserId);
  send(target.ws, { type: "kicked", code: room.code });
  broadcastMembers(room);
  return { ok: true };
}

export function setActivity(userId: string, activity: GroupActivity): void {
  const room = findRoomByUser(userId);
  if (!room) return;
  const member = room.members.get(userId);
  if (!member) return;
  member.activity = activity;
  broadcastMembers(room);
}

export function notifyJoined(room: Room, ws: WebSocket): void {
  send(ws, {
    type: "joined",
    code: room.code,
    members: roomMembers(room),
  });
  broadcastMembers(room);
}

export function roomCount(): number {
  return rooms.size;
}
