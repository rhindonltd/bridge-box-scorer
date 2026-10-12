import { Server } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { resumeTimerAfterDraw } from "@/socket/handlers/swiss/resume-timer-after-draw";
import type { SectionLetter } from "@/model/participants";

/**
 * The live-update fan-out every Swiss / Swiss Teams draw commit performs, in
 * order:
 *
 *  1. `GAME_UPDATED` to the whole game room, so every device re-reads its
 *     schedule into the newly-drawn round (a teams away pair learns where it is
 *     moving).
 *  2. A fresh leaderboard snapshot to the leaderboard room (occupancy-gated).
 *  3. Resume the section's timer, which parks in `awaitingDraw` between rounds
 *     — committing the draw starts the new round's clock.
 *
 * Both the pairs and the teams draw handlers call this identically after a
 * successful commit, so it is the single owner of the sequence. The caller
 * still sends its own (format-specific) success ack.
 */
export async function broadcastAfterDrawCommit(
  io: Server,
  gameId: string,
  section: SectionLetter,
): Promise<void> {
  const game = await findGameById(gameId);
  io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, { game });

  await broadcastLeaderboardChanged(io, gameId);

  await resumeTimerAfterDraw(io, gameId, section);
}

/**
 * The rejection reasons shared by both Swiss draw handlers. Each format extends
 * this with its own structural-invalidity message (`INVALID_SEATING` for pairs,
 * `INVALID_MATCHES` / `ODD_TEAM_COUNT` for teams) and its own "not this
 * movement" message.
 */
export const COMMON_DRAW_REJECTION_MESSAGE: Record<string, string> = {
  ROUND_INCOMPLETE:
    "All results for the current round must be in before drawing the next round.",
  EVENT_COMPLETE: "All rounds have already been drawn.",
};

/** The fallback message when a rejection reason has no specific text. */
export const DEFAULT_DRAW_REJECTION = "Could not draw the next round.";
