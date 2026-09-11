import "server-only";

import type { Server } from "socket.io";

import { getIO } from "@/socket/websocket";
import { SocketEvents } from "@/socket/socket-events";
import { findJoinableGames } from "@/db/game-index/queries/find-joinable-games";

/**
 * Broadcast the current list of joinable games to every connected client. This
 * is a global broadcast (not room-scoped): the join/lobby screens on all
 * devices show whichever games can currently be joined.
 *
 * Called after a change to joinability (e.g. a game is created). Socket handlers
 * may pass their own `io`; HTTP routes omit it and the running server is
 * resolved via `getIO()`. No-ops when no server is available.
 */
export async function broadcastJoinableGames(
  io: Server | null = getIO(),
): Promise<void> {
  if (!io) return;

  io.emit(SocketEvents.JOINABLE_GAMES, {
    joinableGames: await findJoinableGames(),
  });
}
