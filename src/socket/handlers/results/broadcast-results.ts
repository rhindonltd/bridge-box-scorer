import "server-only";

import { Server } from "socket.io";
import { getDb } from "@/db/games";
import { Rooms, scorecardRoomPrefix } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { buildLeaderboards } from "@/services/leaderboard-service";
import { buildPairScorecard } from "@/services/scorecard-service";
import {
  getBoardInstances,
  buildTeamTravellerMatches,
} from "@/services/board-service";
import { getAnySectionMovement } from "@/db/games/queries/get-section-movement";
import { getDealHands } from "@/db/games/queries/get-deal";
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
  // Single read of game/boards/pairs, computing both leaderboards from it —
  // rather than two separate full-table reads.
  return buildLeaderboards(db, gameId);
}

/**
 * Push a fresh leaderboard snapshot to the game's leaderboard room, recomputed
 * only when that room is occupied. Used after a change that affects the
 * standings but not a single board's traveller (e.g. drawing the next Swiss
 * round), so — unlike {@link broadcastResultsChanged} — it needs no board
 * number. Same occupancy-as-optimisation caveat applies.
 */
export async function broadcastLeaderboardChanged(
  io: Server,
  gameId: string,
): Promise<void> {
  const leaderboardRoom = Rooms.leaderboard(gameId);
  const wantLeaderboard = roomSize(io, leaderboardRoom) > 0;
  // The same changes (a standing change, a Swiss round drawn) can move a
  // pair's scorecard too — e.g. a withdrawn pair's missed boards now show as
  // averages, or a new round's VP.
  const scorecardSeats = occupiedScorecardSeats(io, gameId);

  if (!wantLeaderboard && scorecardSeats.length === 0) {
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

  await pushScorecards(io, db, gameId, scorecardSeats);
}

/**
 * The seats whose scorecard room is currently occupied in this game. Each
 * seat has its own room (a pair sees only its own scorecard), so they are
 * found by prefix rather than by a single room lookup.
 */
function occupiedScorecardSeats(io: Server, gameId: string): string[] {
  const prefix = scorecardRoomPrefix(gameId);
  const seats: string[] = [];
  for (const [room, members] of io.sockets.adapter.rooms) {
    if (room.startsWith(prefix) && members.size > 0) {
      seats.push(room.slice(prefix.length));
    }
  }
  return seats;
}

/**
 * Recompute and push each occupied seat's scorecard. Any board result can
 * move a pair's score on that board (its matchpoints depend on the whole
 * field), so every open scorecard is refreshed — occupancy keeps it to only
 * the scorecards someone is looking at.
 */
async function pushScorecards(
  io: Server,
  db: Db,
  gameId: string,
  seats: string[],
): Promise<void> {
  for (const seat of seats) {
    const payload = await buildPairScorecard(db, gameId, seat);
    io.to(Rooms.scorecard(gameId, seat)).emit(
      SocketEvents.SCORECARD_SYNC,
      payload,
    );
  }
}

/**
 * Recompute the current traveller snapshot for a single board: the played
 * instances plus the board's deal (the four hands), or `deal: null` when no
 * deal has been entered yet. Shared by the traveller request ack and the
 * pushed `traveller:sync`, so viewers see the hand appear live once entered.
 */
export async function buildTravellerPayload(db: Db, boardNumber: number) {
  const [instances, deal, movement] = await Promise.all([
    getBoardInstances(db, boardNumber),
    getDealHands(db, boardNumber),
    getAnySectionMovement(db),
  ]);

  // For a teams movement, add the team-match framing so the director traveller
  // can present the flat per-table rows as team-vs-team cards (open/closed
  // rooms, team names, per-board IMP margin). A pairs movement gets an empty
  // array — the payload is otherwise byte-for-byte unchanged, so the pairs path
  // and every other `getBoardInstances` consumer are untouched.
  const isTeams =
    movement?.source === "SWISS_TEAMS" ||
    movement?.source === "ROUND_ROBIN_TEAMS";
  const teamMatches = isTeams
    ? await buildTeamTravellerMatches(db, boardNumber)
    : [];

  return { instances, deal, teamMatches };
}

/**
 * One board's instances for the end-of-round team results summary. This is the
 * shape pushed as a `roundResults:sync` when a single board changes; the client
 * merges it into the round's boards it is showing. (The request ack returns the
 * whole requested set — see the round-results request handler.)
 */
export async function buildRoundResultsBoardPayload(
  db: Db,
  boardNumber: number,
) {
  return { boardNumber, instances: await getBoardInstances(db, boardNumber) };
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
  const roundResultsRoom = Rooms.roundResults(gameId);

  const wantLeaderboard = roomSize(io, leaderboardRoom) > 0;
  const wantTraveller = roomSize(io, travellerRoom) > 0;
  const wantRoundResults = roomSize(io, roundResultsRoom) > 0;
  const scorecardSeats = occupiedScorecardSeats(io, gameId);

  if (
    !wantLeaderboard &&
    !wantTraveller &&
    !wantRoundResults &&
    scorecardSeats.length === 0
  ) {
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

  if (wantRoundResults) {
    // The end-of-round summary spans a round; push just the changed board and
    // let each viewer merge it into the boards it is showing (ignoring boards
    // outside its round).
    const payload = await buildRoundResultsBoardPayload(db, boardNumber);
    io.to(roundResultsRoom).emit(SocketEvents.ROUND_RESULTS_SYNC, payload);
  }

  await pushScorecards(io, db, gameId, scorecardSeats);
}
