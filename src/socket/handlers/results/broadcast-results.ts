import "server-only";

import { Server } from "socket.io";
import { getDb } from "@/db/games";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import {
  computeLeaderboard,
  computeSectionLeaderboards,
} from "@/services/leaderboard-service";
import { getBoardInstances } from "@/services/board-service";
import type { Db } from "@/db/games";

/** How many sockets are currently in a room (0 if none / unknown). */
function roomSize(io: Server, room: string): number {
  return io.sockets.adapter.rooms.get(room)?.size ?? 0;
}

/**
 * Compute the combined + per-section leaderboard payload for a game. This is
 * the shape returned by both the leaderboard request ack and the pushed
 * `leaderboard:sync` snapshot, so consumers handle them identically.
 */
export async function buildLeaderboardPayload(db: Db, gameId: string) {
  const [leaderboard, sections] = await Promise.all([
    computeLeaderboard(db, gameId),
    computeSectionLeaderboards(db, gameId),
  ]);
  return { leaderboard, sections };
}

/**
 * Recompute and broadcast the current board instances for a single board to
 * that board's traveller room.
 */
export async function buildTravellerPayload(db: Db, boardNumber: number) {
  return { instances: await getBoardInstances(db, boardNumber) };
}

/**
 * Fan out live updates after a board result changes (player submission or
 * director override). Occupancy-gated: each feature snapshot is recomputed and
 * emitted only when the corresponding room has at least one viewer, so nothing
 * is recomputed when no one is watching.
 *
 * Occupancy is a compute-avoidance optimisation only — never a correctness
 * mechanism. Clients always have `*:requestState` as their source of truth, so
 * a client that joins right after a change still gets the current state.
 */
export async function broadcastResultsChanged(
  io: Server,
  gameId: string,
  boardNumber: number,
): Promise<void> {
  const leaderboardRoom = Rooms.leaderboard(gameId);
  const travellerRoom = Rooms.traveller(gameId, boardNumber);

  const wantLeaderboard = roomSize(io, leaderboardRoom) > 0;
  const wantTraveller = roomSize(io, travellerRoom) > 0;

  if (!wantLeaderboard && !wantTraveller) {
    return;
  }

  const db = await getDb(gameId);
  if (!db) {
    return;
  }

  if (wantLeaderboard) {
    const payload = await buildLeaderboardPayload(db, gameId);
    io.to(leaderboardRoom).emit(SocketEvents.LEADERBOARD_SYNC, payload);
  }

  if (wantTraveller) {
    const payload = await buildTravellerPayload(db, boardNumber);
    io.to(travellerRoom).emit(SocketEvents.TRAVELLER_SYNC, payload);
  }
}
