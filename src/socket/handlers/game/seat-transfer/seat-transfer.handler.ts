import { Server, Socket } from "socket.io";
import { z } from "zod";

import { SocketEvents } from "@/socket/socket-events";
import { assertPlayer } from "@/socket/middleware/participant-auth";
import { createSeatTransferCode } from "@/db/system/actions/create-seat-transfer-code";
import { validateAndClaimSeatTransferCode } from "@/db/system/queries/validate-seat-transfer-code";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";

const createSchema = z.object({
  gameId: z.string().min(1),
  seat: z.string().min(1),
  token: z.string().optional(),
});

const claimSchema = z.object({
  code: z.string().min(1),
});

/**
 * Seat handoff between devices ("change device"), available any time.
 *
 * - CREATE_SEAT_TRANSFER: the device currently holding a seat mints a short,
 *   single-use code. Player-authed (the seat's own token).
 * - CLAIM_SEAT_TRANSFER: a new device submits the code. No auth — the code is
 *   the credential. Claiming rotates the seat's secret (invalidating the old
 *   device) and returns the fresh token + resolved game/seat so the claimer can
 *   store it and route into play.
 */
export function registerSeatTransferHandlers(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof createSchema>, { code: string }>(
    socket,
    io,
    SocketEvents.CREATE_SEAT_TRANSFER,
    {
      schema: createSchema,
      handler: async ({ payload, ack }) => {
        const { gameId, seat, token } = payload;
        if (!(await assertPlayer(gameId, seat, token, ack))) {
          return;
        }

        const code = await createSeatTransferCode(gameId, seat);
        ack({ success: true, data: { code } });
      },
    },
  );

  registerHandler<
    z.infer<typeof claimSchema>,
    { gameId: string; seat: string; token: string }
  >(socket, io, SocketEvents.CLAIM_SEAT_TRANSFER, {
    schema: claimSchema,
    handler: async ({ payload, ack }) => {
      const result = await validateAndClaimSeatTransferCode(payload.code);

      if (!result.valid) {
        // A stale / wrong code is a user-facing failure, not an internal error.
        throw new HandlerError(result.error);
      }

      ack({
        success: true,
        data: {
          gameId: result.gameId,
          seat: result.seat,
          token: result.token,
        },
      });
    },
  });
}
