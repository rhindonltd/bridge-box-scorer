import { Server, Socket } from "socket.io";
import { z } from "zod";

import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { drawNextSwissRound } from "@/services/draw-swiss-round-service";
import { getDb } from "@/db/games";
import { buildLeaderboardPayload } from "@/socket/handlers/results/broadcast-results";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  section: z.string().min(1),
  directorToken: z.string().min(1),
});

type Payload = z.infer<typeof payloadSchema>;

/** What the director's device learns about the drawn round. */
interface DrawAck {
  roundNumber: number;
  sitOutPairId: number | null;
  hadUnavoidableRepeat: boolean;
  hadStationaryConflict: boolean;
}

/** Human-facing messages for the reasons a draw can be refused. */
const REJECTION_MESSAGE: Record<string, string> = {
  NOT_SWISS: "This section is not a Swiss Pairs movement.",
  ROUND_INCOMPLETE:
    "All results for the current round must be in before drawing the next round.",
  EVENT_COMPLETE: "All rounds have already been drawn.",
};

/**
 * Director-only handler for drawing the next Swiss Pairs round.
 *
 * Validates the director token, then delegates to {@link drawNextSwissRound},
 * which enforces the preconditions (Swiss section, current round fully scored,
 * rounds remaining) and materializes the next round from current standings.
 *
 * On success it fans out the live updates: a `GAME_UPDATED` to the game room so
 * every device re-reads its schedule for the new round, and a fresh leaderboard
 * snapshot to the leaderboard room when occupied. The acknowledgement carries
 * the drawn round number and the draw's advisories so the director can be
 * warned about an unavoidable repeat or a stationary-pair conflict.
 */
export function registerDrawNextRoundHandler(socket: Socket, io: Server) {
  registerHandler<Payload, DrawAck>(socket, io, SocketEvents.DRAW_NEXT_SWISS_ROUND, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      const { gameId, section, directorToken } = payload;

      if (!validateDirectorToken(directorToken, gameId)) {
        throw new HandlerError("Unauthorized");
      }

      const result = await drawNextSwissRound(gameId, section);

      if (!result.ok) {
        throw new HandlerError(
          REJECTION_MESSAGE[result.reason] ?? "Could not draw the next round.",
        );
      }

      // Notify the whole game room so player/display schedules refresh into the
      // newly-drawn round.
      const game = await findGameById(gameId);
      io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, { game });

      // Push a fresh leaderboard snapshot to viewers (occupancy-gated).
      const leaderboardRoom = Rooms.leaderboard(gameId);
      if ((io.sockets.adapter.rooms.get(leaderboardRoom)?.size ?? 0) > 0) {
        const db = await getDb(gameId);
        if (db) {
          const payloadLb = await buildLeaderboardPayload(db, gameId);
          io.to(leaderboardRoom).emit(SocketEvents.LEADERBOARD_SYNC, payloadLb);
        }
      }

      ack({
        success: true,
        data: {
          roundNumber: result.roundNumber,
          sitOutPairId: result.sitOutPairId,
          hadUnavoidableRepeat: result.hadUnavoidableRepeat,
          hadStationaryConflict: result.hadStationaryConflict,
        },
      });
    },
  });
}
