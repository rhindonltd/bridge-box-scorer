import { Server, Socket } from "socket.io";

import { SocketEvents } from "@/socket/socket-events";
import { assertPlayer } from "@/socket/middleware/participant-auth";
import { createSeatTransferCode } from "@/db/system/actions/create-seat-transfer-code";
import { validateAndClaimSeatTransferCode } from "@/db/system/queries/validate-seat-transfer-code";

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
export function registerSeatTransferHandlers(socket: Socket, _io: Server) {
  socket.on(
    SocketEvents.CREATE_SEAT_TRANSFER,
    async (
      {
        gameId,
        seat,
        token,
      }: { gameId: string; seat: string; token?: string },
      cb?: (res: {
        success: boolean;
        data?: { code: string };
        error?: string;
      }) => void,
    ) => {
      if (!(await assertPlayer(gameId, seat, token, cb))) {
        return;
      }

      try {
        const code = await createSeatTransferCode(gameId, seat);
        cb?.({ success: true, data: { code } });
      } catch (err) {
        console.error(
          `Failed to create seat transfer code for seat ${seat} in game ${gameId}`,
          err,
        );
        cb?.({
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );

  socket.on(
    SocketEvents.CLAIM_SEAT_TRANSFER,
    async (
      { code }: { code: string },
      cb?: (res: {
        success: boolean;
        data?: { gameId: string; seat: string; token: string };
        error?: string;
      }) => void,
    ) => {
      try {
        const result = await validateAndClaimSeatTransferCode(code);

        if (!result.valid) {
          cb?.({ success: false, error: result.error });
          return;
        }

        cb?.({
          success: true,
          data: {
            gameId: result.gameId,
            seat: result.seat,
            token: result.token,
          },
        });
      } catch (err) {
        console.error("Failed to claim seat transfer code", err);
        cb?.({
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
  );
}
