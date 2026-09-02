import type { WebSocket } from "ws";
import { eq, gt, lt } from "drizzle-orm";
import { db, groupSessionsTable } from "@workspace/db";
import { logger } from "./logger";

/**
 * Persistente Gruppen-Sitzungen. WebSockets bleiben fluechtig, aber Raum,
 * Mitglieder, Leitung, Treffpunkt und der letzte Wanderstand leben in
 * Postgres weiter. Ein Disconnect markiert nur "offline"; nur ein explizites
 * Verlassen entfernt ein Mitglied.
 */

export const GROUP_MAX_MEMBERS = 12;
const GROUP_SESSION_TTL_MS = 72 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

export type GroupActivity =
  | { type: "idle" }
  | {
      type: "wandert";
      sagaTitle: string;
      startedAt: number;
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

export type HikeSyncEvent =
  | { kind: "start"; sagaId: string; routeId: string; routeName: string }
  | { kind: "chapter"; index: number }
  | { kind: "decision"; chapterIndex: number; optionIndex: number }
  | { kind: "finish" };

export interface GroupHikeState {
  event: HikeSyncEvent;
  updatedAt: number;
}

export interface GroupMemberInfo {
  userId: string;
  name: string;
  ageTier: string;
  isLeader: boolean;
  connected: boolean;
  activity: GroupActivity;
  location?: GroupLocation;
}

interface RoomMember {
  userId: string;
  name: string;
  ageTier: string;
  activity: GroupActivity;
  location?: GroupLocation;
  ws?: WebSocket;
}

export interface Room {
  code: string;
  leaderId: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  members: Map<string, RoomMember>;
  rendezvous: GroupLocation | null;
  lastHikeState: GroupHikeState | null;
}

interface PersistedMember {
  userId: string;
  name: string;
  ageTier: string;
  activity: GroupActivity;
  location?: GroupLocation;
}

const rooms = new Map<string, Room>();
const persistenceTails = new Map<string, Promise<void>>();
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let loadPromise: Promise<void> | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function generateUniqueCode(): string {
  let code = randomCode();
  while (rooms.has(code)) code = randomCode();
  return code;
}

function isLocation(value: unknown): value is GroupLocation {
  if (typeof value !== "object" || value === null) return false;
  const l = value as Record<string, unknown>;
  return (
    typeof l.lat === "number" &&
    Number.isFinite(l.lat) &&
    Math.abs(l.lat) <= 90 &&
    typeof l.lng === "number" &&
    Number.isFinite(l.lng) &&
    Math.abs(l.lng) <= 180 &&
    typeof l.updatedAt === "number" &&
    Number.isFinite(l.updatedAt) &&
    (l.accuracy == null ||
      (typeof l.accuracy === "number" &&
        Number.isFinite(l.accuracy) &&
        l.accuracy >= 0))
  );
}

function isActivity(value: unknown): value is GroupActivity {
  if (typeof value !== "object" || value === null) return false;
  const activity = value as Record<string, unknown>;
  if (activity.type === "idle") return true;
  return (
    activity.type === "wandert" &&
    typeof activity.sagaTitle === "string" &&
    typeof activity.startedAt === "number" &&
    Number.isFinite(activity.startedAt) &&
    (activity.location == null || isLocation(activity.location))
  );
}

function parsePersistedMember(value: unknown): PersistedMember | null {
  if (typeof value !== "object" || value === null) return null;
  const member = value as Record<string, unknown>;
  if (
    typeof member.userId !== "string" ||
    typeof member.name !== "string" ||
    typeof member.ageTier !== "string" ||
    !isActivity(member.activity)
  ) {
    return null;
  }
  return {
    userId: member.userId,
    name: member.name,
    ageTier: member.ageTier,
    activity: member.activity,
    ...(isLocation(member.location) ? { location: member.location } : {}),
  };
}

function snapshotRoom(room: Room): {
  members: PersistedMember[];
  rendezvous: GroupLocation | null;
  lastHikeState: GroupHikeState | null;
} {
  return {
    members: Array.from(room.members.values()).map(
      ({ userId, name, ageTier, activity, location }) => ({
        userId,
        name,
        ageTier,
        activity,
        ...(location ? { location } : {}),
      }),
    ),
    rendezvous: room.rendezvous,
    lastHikeState: room.lastHikeState,
  };
}

function queuePersistence(code: string, operation: () => Promise<void>): Promise<void> {
  const previous = persistenceTails.get(code) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(operation)
    .finally(() => {
      if (persistenceTails.get(code) === next) persistenceTails.delete(code);
    });
  persistenceTails.set(code, next);
  return next;
}

function persistRoom(room: Room): Promise<void> {
  const snapshot = snapshotRoom(room);
  const updatedAt = new Date();
  room.updatedAt = updatedAt.getTime();
  room.expiresAt = updatedAt.getTime() + GROUP_SESSION_TTL_MS;
  return queuePersistence(room.code, async () => {
    await db
      .insert(groupSessionsTable)
      .values({
        code: room.code,
        leaderId: room.leaderId,
        members: snapshot.members,
        rendezvous: snapshot.rendezvous,
        lastHikeState: snapshot.lastHikeState,
        createdAt: new Date(room.createdAt),
        updatedAt,
        expiresAt: new Date(room.expiresAt),
      })
      .onConflictDoUpdate({
        target: groupSessionsTable.code,
        set: {
          leaderId: room.leaderId,
          members: snapshot.members,
          rendezvous: snapshot.rendezvous,
          lastHikeState: snapshot.lastHikeState,
          updatedAt,
          expiresAt: new Date(room.expiresAt),
        },
      });
  });
}

function deletePersistedRoom(code: string): Promise<void> {
  return queuePersistence(code, async () => {
    await db.delete(groupSessionsTable).where(eq(groupSessionsTable.code, code));
  });
}

function toMemberInfo(room: Room, member: RoomMember): GroupMemberInfo {
  return {
    userId: member.userId,
    name: member.name,
    ageTier: member.ageTier,
    isLeader: member.userId === room.leaderId,
    connected: !!member.ws,
    activity: member.activity,
    ...(member.location ? { location: member.location } : {}),
  };
}

export function roomMembers(room: Room): GroupMemberInfo[] {
  return Array.from(room.members.values())
    .map((member) => toMemberInfo(room, member))
    .sort((a, b) => {
      if (a.isLeader !== b.isLeader) return a.isLeader ? -1 : 1;
      if (a.connected !== b.connected) return a.connected ? -1 : 1;
      return a.name.localeCompare(b.name, "de");
    });
}

function send(ws: WebSocket | undefined, message: unknown): void {
  if (!ws || ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(message));
}

function broadcastMembers(room: Room): void {
  const members = roomMembers(room);
  for (const member of room.members.values()) {
    send(member.ws, { type: "members", code: room.code, members });
  }
}

function restoreRoom(row: {
  code: string;
  leaderId: string;
  members: unknown;
  rendezvous: unknown;
  lastHikeState: unknown;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}): Room | null {
  const persistedMembers = Array.isArray(row.members)
    ? row.members.map(parsePersistedMember).filter((m): m is PersistedMember => !!m)
    : [];
  if (
    persistedMembers.length === 0 ||
    !persistedMembers.some((member) => member.userId === row.leaderId)
  ) {
    return null;
  }
  const lastHikeState =
    typeof row.lastHikeState === "object" &&
    row.lastHikeState !== null &&
    "event" in row.lastHikeState &&
    "updatedAt" in row.lastHikeState
      ? (row.lastHikeState as GroupHikeState)
      : null;
  const room: Room = {
    code: row.code,
    leaderId: row.leaderId,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    expiresAt: row.expiresAt.getTime(),
    members: new Map(
      persistedMembers.map((member) => [
        member.userId,
        {
          ...member,
          ws: undefined,
        },
      ]),
    ),
    rendezvous: isLocation(row.rendezvous) ? row.rendezvous : null,
    lastHikeState,
  };
  return room;
}

async function removeExpiredRooms(): Promise<void> {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.expiresAt > now) continue;
    for (const member of room.members.values()) {
      send(member.ws, { type: "expired", code: room.code });
    }
    rooms.delete(room.code);
  }
  try {
    await db
      .delete(groupSessionsTable)
      .where(lt(groupSessionsTable.expiresAt, new Date(now)));
  } catch (err) {
    logger.warn({ err }, "Abgelaufene Gruppensitzungen konnten nicht bereinigt werden");
  }
}

/**
 * Lädt persistente Räume genau einmal und startet die TTL-Bereinigung.
 * Der WebSocket-Handler wartet vor der ersten Aktion auf diesen Vorgang.
 */
export function initializeGroupSessions(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const rows = await db
        .select()
        .from(groupSessionsTable)
        .where(gt(groupSessionsTable.expiresAt, new Date()));
      for (const row of rows) {
        const room = restoreRoom(row);
        if (room) rooms.set(room.code, room);
      }
      logger.info({ count: rooms.size }, "Persistente Gruppensitzungen geladen");
    } catch (err) {
      logger.error({ err }, "Persistente Gruppensitzungen konnten nicht geladen werden");
    }
    cleanupTimer = setInterval(() => {
      void removeExpiredRooms();
    }, CLEANUP_INTERVAL_MS);
    cleanupTimer.unref?.();
  })();
  return loadPromise;
}

export async function createRoom(params: {
  userId: string;
  name: string;
  ageTier: string;
  ws: WebSocket;
}): Promise<Room> {
  const existing = findRoomByUser(params.userId);
  if (existing) {
    const member = existing.members.get(params.userId);
    if (member) {
      member.name = params.name;
      member.ageTier = params.ageTier;
      member.ws = params.ws;
      await persistRoom(existing);
      return existing;
    }
  }

  const now = Date.now();
  const room: Room = {
    code: generateUniqueCode(),
    leaderId: params.userId,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + GROUP_SESSION_TTL_MS,
    members: new Map([
      [
        params.userId,
        {
          userId: params.userId,
          name: params.name,
          ageTier: params.ageTier,
          activity: { type: "idle" },
          ws: params.ws,
        },
      ],
    ]),
    rendezvous: null,
    lastHikeState: null,
  };
  rooms.set(room.code, room);
  await persistRoom(room);
  logger.info({ code: room.code, userId: params.userId }, "Gruppensitzung erstellt");
  return room;
}

export type JoinResult =
  | { ok: true; room: Room }
  | { ok: false; reason: "not_found" | "full" | "already_in_group" };

export async function joinRoom(params: {
  code: string;
  userId: string;
  name: string;
  ageTier: string;
  ws: WebSocket;
}): Promise<JoinResult> {
  const room = rooms.get(params.code);
  if (!room) return { ok: false, reason: "not_found" };

  const otherRoom = findRoomByUser(params.userId);
  if (otherRoom && otherRoom.code !== room.code) {
    return { ok: false, reason: "already_in_group" };
  }

  const existing = room.members.get(params.userId);
  if (!existing && room.members.size >= GROUP_MAX_MEMBERS) {
    return { ok: false, reason: "full" };
  }

  room.members.set(params.userId, {
    userId: params.userId,
    name: params.name,
    ageTier: params.ageTier,
    activity: existing?.activity ?? { type: "idle" },
    ...(existing?.location ? { location: existing.location } : {}),
    ws: params.ws,
  });
  await persistRoom(room);
  return { ok: true, room };
}

export function findRoomByUser(userId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.members.has(userId)) return room;
  }
  return undefined;
}

/**
 * Verbindungsabbrüche entfernen keine Mitglieder mehr. So kann derselbe
 * Einladungscode nach App-Neustart oder einem Server-Restart weiterverwendet
 * werden. Nur die aktuell gebundene Verbindung darf offline markiert werden.
 */
export async function disconnectRoom(userId: string, ws: WebSocket): Promise<void> {
  const room = findRoomByUser(userId);
  if (!room) return;
  const member = room.members.get(userId);
  if (!member || member.ws !== ws) return;
  member.ws = undefined;
  await persistRoom(room);
  broadcastMembers(room);
}

export async function leaveRoom(userId: string, ws: WebSocket): Promise<void> {
  const room = findRoomByUser(userId);
  if (!room) return;
  const member = room.members.get(userId);
  if (!member || (member.ws && member.ws !== ws)) return;

  room.members.delete(userId);
  if (userId === room.leaderId) {
    const nextLeader = room.members.values().next().value as RoomMember | undefined;
    if (nextLeader) {
      room.leaderId = nextLeader.userId;
      broadcastMembers(room);
      await persistRoom(room);
      return;
    }
    rooms.delete(room.code);
    await deletePersistedRoom(room.code);
    return;
  }
  broadcastMembers(room);
  await persistRoom(room);
}

export type KickResult =
  | { ok: true }
  | { ok: false; reason: "not_leader" | "not_found" };

export async function kickMember(params: {
  leaderId: string;
  targetUserId: string;
}): Promise<KickResult> {
  const room = findRoomByUser(params.leaderId);
  if (!room) return { ok: false, reason: "not_found" };
  if (room.leaderId !== params.leaderId) return { ok: false, reason: "not_leader" };
  if (params.targetUserId === room.leaderId) return { ok: false, reason: "not_found" };

  const target = room.members.get(params.targetUserId);
  if (!target) return { ok: false, reason: "not_found" };

  room.members.delete(params.targetUserId);
  send(target.ws, { type: "kicked", code: room.code });
  broadcastMembers(room);
  await persistRoom(room);
  return { ok: true };
}

export async function setActivity(userId: string, activity: GroupActivity): Promise<void> {
  const room = findRoomByUser(userId);
  if (!room) return;
  const member = room.members.get(userId);
  if (!member) return;
  member.activity = activity;
  member.location = activity.type === "wandert" ? activity.location : undefined;
  broadcastMembers(room);
  await persistRoom(room);
}

export type RendezvousResult =
  | { ok: true }
  | { ok: false; reason: "not_leader" | "not_found" };

export async function setRendezvous(
  userId: string,
  location: GroupLocation | null,
): Promise<RendezvousResult> {
  const room = findRoomByUser(userId);
  if (!room) return { ok: false, reason: "not_found" };
  if (room.leaderId !== userId) return { ok: false, reason: "not_leader" };
  room.rendezvous = location;
  for (const member of room.members.values()) {
    send(member.ws, { type: "rendezvous", code: room.code, location });
  }
  await persistRoom(room);
  return { ok: true };
}

export type HikeEventResult =
  | { ok: true }
  | { ok: false; reason: "not_leader" | "not_found" };

export async function broadcastHikeEvent(
  senderId: string,
  event: HikeSyncEvent,
): Promise<HikeEventResult> {
  const room = findRoomByUser(senderId);
  if (!room) return { ok: false, reason: "not_found" };
  if (room.leaderId !== senderId) return { ok: false, reason: "not_leader" };
  room.lastHikeState = { event, updatedAt: Date.now() };
  for (const member of room.members.values()) {
    if (member.userId === senderId) continue;
    send(member.ws, { type: "hike", code: room.code, event });
  }
  await persistRoom(room);
  return { ok: true };
}

export function notifyJoined(room: Room, ws: WebSocket): void {
  send(ws, {
    type: "joined",
    code: room.code,
    members: roomMembers(room),
    rendezvous: room.rendezvous,
    hikeState: room.lastHikeState,
  });
  broadcastMembers(room);
}

export function roomCount(): number {
  return rooms.size;
}

export function getRoomMemberIds(leaderId: string): string[] {
  const room = Array.from(rooms.values()).find((candidate) => candidate.leaderId === leaderId);
  if (!room) return [];
  return Array.from(room.members.keys()).filter((id) => id !== leaderId);
}