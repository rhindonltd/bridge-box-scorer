import { Server, Socket } from "socket.io";
import { z } from "zod";

import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import { handoverSeat } from "@/db/games/actions/handover-seat";
import type { PairSeat } from "@/model/participants";
import { assertDirector } from "@/socket/middleware/director-auth";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";

/** A newly-entered player on the arriving real pair. */
const playerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nationalId: z.string().optional(),
});

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  seat: z.string().min(1),
  realPair: z.object({ player1: playerSchema, player2: playerSchema }),
  treatment: z.enum(["REMOVE", "PENALISED"]),
  finePercent: z.number().min(0).max(40).optional(),
});

/**
 * Director-authed EBU §2.3.3/§2.4.7 stand-in → real-pair handover.
 *
 * The stand-in sitting the seat is demoted to "without standing" over the
 * boards it already played, and the arriving real pair is seated as a §2.4.7
 * LATE arrival over the remaining (unplayed) boards. The split point is derived
 * server-side from the entered results, not supplied by the director. Like a
 * withdrawal this changes both the participant list and the standings, so after
 * the write we fan out BOTH the participant list and a fresh leaderboard
 * snapshot. The arriving pair's device secret is minted here (as the create
 * path does) and returned so the director can hand it to that pair's device.
 */
export function registerHandoverSeatHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, { key: string }>(
    socket,
    io,
    SocketEvents.HANDOVER_SEAT,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack }) => {
        const { gameId, directorToken, seat, realPair, treatment, finePercent } =
          payload;

        if (!assertDirector(directorToken, gameId, ack)) return;

        const db = await getDb(gameId);
        if (!db) {
          throw new HandlerError("Game not found");
        }

        // The same EBU number can't be entered for both arriving players.
        const id1 = realPair.player1.nationalId ?? null;
        const id2 = realPair.player2.nationalId ?? null;
        if (id1 && id2 && id1 === id2) {
          throw new HandlerError(
            `The same EBU number (${id1}) can't be entered for both players.`,
          );
        }

        const key = crypto.randomUUID();
        const result = await handoverSeat(gameId, {
          seat: seat as PairSeat,
          realPair: {
            player1: realPair.player1,
            player2: realPair.player2,
          },
          secretKey: key,
          treatment,
          finePercent,
        });

        if (!result.ok) {
          throw new HandlerError(result.error ?? "Could not hand over the seat.");
        }

        ack({ success: true, data: { key } });

        await broadcastParticipants(gameId, io);
        await broadcastLeaderboardChanged(io, gameId);
      },
    },
  );
}
