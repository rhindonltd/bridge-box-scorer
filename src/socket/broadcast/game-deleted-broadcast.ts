import "server-only";

import type { Server } from "socket.io";

import { getIO } from "@/socket/websocket";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";

/**
 * Tell everyone in a game's room that the game has been deleted, so their
 * screen can show the "not found" state live instead of waiting for a refresh.
 *
 * Emitting only needs the room name (not the game db), so this is safe to call
 * either side of the actual deletion; the delete route calls it just before
 * removing the row/file. HTTP routes have no `io` of their own, so the running
 * server is resolved via `getIO()`. No-ops when no server is available.
 */
export function broadcastGameDeleted(
  gameId: string,
  io: Server | null = getIO(),
): void {
  if (!io) return;

  io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_DELETED, { gameId });
}
