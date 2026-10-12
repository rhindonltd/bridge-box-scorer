import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import {
  withdrawParticipant,
  type StandingChange,
} from "@/db/games/actions/withdraw-participant";
import { assertDirector } from "@/socket/middleware/director-auth";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";

/** The §2.4.5 treatment + optional fine shared by WITHDRAWN and LATE. */
const treatmentSchema = z.object({
  treatment: z.enum(["REMOVE", "PENALISED"]),
  finePercent: z.number().min(0).max(40).optional(),
});

/**
 * The lifecycle change, mirroring {@link StandingChange}. A discriminated union
 * on `standing` so each variant's extra fields (the withdrawal/late round +
 * treatment) are validated, not passed through blind.
 */
const changeSchema = z.discriminatedUnion("standing", [
  z
    .object({ standing: z.literal("WITHDRAWN"), withdrawnInRound: z.number().int().min(1) })
    .merge(treatmentSchema),
  z
    .object({ standing: z.literal("LATE"), arrivedInRound: z.number().int().min(1) })
    .merge(treatmentSchema),
  z.object({ standing: z.literal("WITHOUT_STANDING") }),
  z.object({ standing: z.literal("ACTIVE") }),
]);

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  seat: z.string().min(1),
  change: changeSchema,
});

/**
 * Director-authed change of a seated contestant's EBU §2.4 standing (withdraw /
 * mark late / without standing / reactivate). A withdrawal is a SCORED event —
 * it changes both the participant list (its standing fields) and the standings
 * (ranking exclusion + opponent indemnity) — so after writing it we fan out
 * BOTH the participant list and a fresh leaderboard snapshot. The actual
 * scoring consequences are derived at scoring time from the stored standing
 * (see `resolveStandings` / `withdrawalCreditBoards` / `applyTeamWithdrawalRulings`),
 * never persisted per-board.
 */
export function registerSetParticipantStandingHandler(
  socket: Socket,
  io: Server,
) {
  registerHandler<z.infer<typeof payloadSchema>, null>(
    socket,
    io,
    SocketEvents.SET_PARTICIPANT_STANDING,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack }) => {
        const { gameId, directorToken, seat, change } = payload;

        if (!assertDirector(directorToken, gameId, ack)) return;

        const db = await getDb(gameId);
        if (!db) {
          throw new HandlerError("Game not found");
        }

        const updated = await withdrawParticipant(
          gameId,
          seat,
          change as StandingChange,
        );
        if (!updated) {
          throw new HandlerError("No contestant is seated at that seat");
        }

        ack({ success: true, data: null });

        await broadcastParticipants(gameId, io);
        await broadcastLeaderboardChanged(io, gameId);
      },
    },
  );
}
