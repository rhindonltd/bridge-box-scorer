import { Server, Socket } from "socket.io";
import { z } from "zod";

import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { getDb } from "@/db/games";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { isGameStarted } from "@/db/games/queries/is-game-started";
import { recordWithdrawal } from "@/db/games/actions/record-withdrawal";
import { resolvePlayState } from "@/services/resolve-play-state";
import type { PairSeat } from "@/model/participants";
import { assertPlayer } from "@/socket/middleware/participant-auth";
import {
  registerHandler,
  HandlerError,
} from "@/socket/handlers/handler-wrapper";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  seat: z.string().min(1),
  /** The seat's own device token — proves this device holds the seat. */
  token: z.string().min(1),
});

/**
 * PLAYER-authed self-service withdrawal (design §11). The pair holding `seat`
 * withdraws from the round it is on: every board it has not yet scored from
 * that round onward is marked ABSENT. How those boards score (AVE−/AVE+ or
 * removed) is the director's choice afterwards; until then they score
 * AVE−/AVE+.
 *
 * Pairs events only (not Swiss, not teams — those keep their own handling).
 *
 * After writing, every device in the game is told its schedule changed (so an
 * opponent is moved past boards it can no longer play), and the participant
 * list, leaderboard and results summary are refreshed.
 */
export function registerWithdrawPairHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, null>(
    socket,
    io,
    SocketEvents.WITHDRAW_PAIR,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack }) => {
        const { gameId, seat, token } = payload;
        if (!(await assertPlayer(gameId, seat, token, ack))) return;

        const game = await findGameById(gameId);
        if (!game) throw new HandlerError("Game not found");
        if (game.gameType !== "PAIRS" || game.eventFormat === "SWISS") {
          throw new HandlerError(
            "Withdrawing isn't available for this event. Please ask the director.",
          );
        }
        if (!(await isGameStarted(gameId))) {
          throw new HandlerError(
            "The game hasn't started yet. Leave the table instead.",
          );
        }

        const db = await getDb(gameId);
        if (!db) throw new HandlerError("Game not found");

        // Withdraw from the round this pair is on now.
        const state = await resolvePlayState(db, gameId, seat);
        const phase = state?.phase;
        if (!state || !phase || !("roundIndex" in phase)) {
          throw new HandlerError(
            "There are no boards left for this pair to play.",
          );
        }
        const fromRound = state.rounds[phase.roundIndex].roundNumber;

        const result = await recordWithdrawal(
          gameId,
          seat as PairSeat,
          fromRound,
        );
        if (!result.ok) {
          throw new HandlerError(result.error ?? "Could not withdraw.");
        }

        ack({ success: true, data: null });

        io.to(Rooms.game(gameId)).emit(SocketEvents.SCHEDULE_CHANGED, {
          gameId,
        });
        io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, { game });
        await broadcastParticipants(gameId, io);
        await broadcastLeaderboardChanged(io, gameId);
      },
    },
  );
}
