import { z } from "zod";
import { NextResponse } from "next/server";
import { withGameRoute } from "@/lib/api/gameRoute";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { respondToActionError } from "@/lib/api/client-error";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findGameRoster } from "@/db/games/queries/find-game-roster";
import { recordWithdrawal } from "@/db/games/actions/record-withdrawal";
import { resolvePlayState } from "@/services/resolve-play-state";
import type { PairSeat } from "@/model/participants";
import { getIO } from "@/socket/websocket";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";

/** The roster and these actions apply to board-pooled PAIRS events (design §11). */
async function isPairsGame(gameId: string): Promise<boolean> {
  const game = await findGameById(gameId);
  return game?.gameType === "PAIRS" && game.eventFormat !== "SWISS";
}

/**
 * GET /api/games/[gameId]/pairs — the pairs roster: every seat with its status
 * (active / late / withdrawn / substituted / not arrived) and the detail each
 * row's actions need. Empty for a game the roster doesn't apply to.
 */
export const GET = withGameRoute(async ({ db, gameId }) => {
  if (!(await isPairsGame(gameId))) return success({ roster: [] });
  return success({ roster: await findGameRoster(db) });
});

const patchSchema = z.object({
  seat: z.string().min(1),
  action: z.literal("withdraw"),
});

/**
 * PATCH /api/games/[gameId]/pairs — director withdraws a pair from the round it
 * is on. Director-only. Rotates the seat's secret (its device token dies),
 * tells every device its schedule changed (so an opponent is moved on), and
 * refreshes the participant list and leaderboard.
 *
 * Reinstating is NOT a verb here: it hands a device a fresh token, so it goes
 * through the seat-transfer code flow — the director mints a REINSTATE code
 * (see `generateSeatTransferCode`) and the returning device claims it.
 */
export const PATCH = withDirectorRoute(
  async ({ db, gameId, body }) => {
    try {
      if (!(await isPairsGame(gameId))) {
        return NextResponse.json(
          { success: false, error: "This doesn't apply to this event." },
          { status: 400 },
        );
      }
      const seat = body.seat as PairSeat;

      // The round the seat is on now decides which boards it won't play.
      const state = await resolvePlayState(db, gameId, seat);
      const phase = state?.phase;
      if (!state || !phase || !("roundIndex" in phase)) {
        return NextResponse.json(
          {
            success: false,
            error: "There are no boards left for this pair to play.",
          },
          { status: 400 },
        );
      }
      const fromRound = state.rounds[phase.roundIndex].roundNumber;
      const result = await recordWithdrawal(gameId, seat, fromRound);
      if (!result.ok) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 },
        );
      }

      const io = getIO();
      if (io) {
        io.to(Rooms.game(gameId)).emit(SocketEvents.SCHEDULE_CHANGED, {
          gameId,
        });
        const game = await findGameById(gameId);
        if (game)
          io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, { game });
        await broadcastParticipants(gameId, io);
        await broadcastLeaderboardChanged(io, gameId);
      }
      return success({});
    } catch (err) {
      return respondToActionError(
        err,
        `Failed to update pair for game ${gameId}:`,
      );
    }
  },
  { bodySchema: patchSchema },
);
