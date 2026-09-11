import "server-only";

import type { Server } from "socket.io";

import { getIO } from "@/socket/websocket";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";

/**
 * Broadcast the current participant list to a game's room. Called after a
 * participant mutation (self-seating over the socket, or an HTTP eviction) so
 * every connected device — join screens, the director's tables view — updates
 * live.
 *
 * Socket handlers pass their own `io`; HTTP routes omit it and the running
 * server is resolved via `getIO()`. No-ops when no server or game db is
 * available.
 */
export async function broadcastParticipants(
  gameId: string,
  io: Server | null = getIO(),
): Promise<void> {
  if (!io) return;

  const db = await getDb(gameId);
  if (!db) return;

  io.to(Rooms.game(gameId)).emit(SocketEvents.PARTICIPANTS, {
    participants: await findPairs(db),
  });
}
