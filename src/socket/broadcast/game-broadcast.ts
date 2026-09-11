import "server-only";

import type { Server } from "socket.io";

import { getIO } from "@/socket/websocket";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";

/**
 * Broadcast that a game has started (its boards/assignments are materialized)
 * to the game's room, so every connected client transitions into the running
 * game. Emits `GAME_UPDATED` with the fresh game row.
 *
 * Socket handlers may pass their own `io`; HTTP routes omit it and the running
 * server is resolved via `getIO()`. No-ops when no server is available.
 */
export async function broadcastGameStarted(
  gameId: string,
  io: Server | null = getIO(),
): Promise<void> {
  if (!io) return;

  const game = await findGameById(gameId);
  io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, { game });
}
