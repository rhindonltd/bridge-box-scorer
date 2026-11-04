import { Server, Socket } from "socket.io";
import { z } from "zod";

import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import { handoverSeat } from "@/db/games/actions/handover-seat";
import { isTeamsGame } from "@/db/game-index/queries/is-teams-game";
import type { PairSeat } from "@/model/participants";
import { assertPlayer } from "@/socket/middleware/participant-auth";
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
  seat: z.string().min(1),
  /** The seat's own device token — proves this device holds the stand-in seat. */
  token: z.string().min(1),
  realPair: z.object({ player1: playerSchema, player2: playerSchema }),
});

/**
 * PLAYER-authed EBU §2.3.3/§2.4.7 stand-in → real-pair handover, SAME-DEVICE
 * variant (the real pair takes over the stand-in's own device).
 *
 * Unlike the director-authed {@link import("../handover-seat/handover-seat").registerHandoverSeatHandler},
 * this is initiated from the stand-in's device: it proves it owns the seat with
 * its player token (`assertPlayer`), enters only the arriving pair's names (no
 * options — those are deferred to the director's "Substitutions" screen), and
 * the minted secret is returned so the SAME device can keep authenticating as
 * the now-primary real pair. The handover engine rotates the stand-in's old
 * secret, so the device MUST store the returned key (the client service does).
 */
export function registerHandoverSameDeviceHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, { key: string }>(
    socket,
    io,
    SocketEvents.HANDOVER_SAME_DEVICE,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack }) => {
        const { gameId, seat, token, realPair } = payload;

        if (!(await assertPlayer(gameId, seat, token, ack))) return;

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
          // Options deferred to the director's "Substitutions" screen.
          teamsGame: await isTeamsGame(gameId),
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
