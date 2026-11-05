import { Server, Socket } from "socket.io";
import { z } from "zod";

import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { assertPlayer } from "@/socket/middleware/participant-auth";
import { createSeatTransferCode } from "@/db/system/actions/create-seat-transfer-code";
import {
  validateAndClaimSeatTransferCode,
  inspectSeatTransferCode,
} from "@/db/system/queries/validate-seat-transfer-code";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";

const createSchema = z.object({
  gameId: z.string().min(1),
  seat: z.string().min(1),
  token: z.string().optional(),
  // The claim intent, decided at mint time. CHANGE_DEVICE (default): the same
  // pair on a new device. HANDOVER: a different arriving pair takes over, so the
  // claim will collect their names.
  kind: z.enum(["CHANGE_DEVICE", "HANDOVER", "REINSTATE"]).optional(),
});

const inspectSchema = z.object({
  code: z.string().min(1),
});

/** A newly-entered player on the arriving real pair (handover claims only). */
const playerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nationalId: z.string().optional(),
});

const claimSchema = z.object({
  code: z.string().min(1),
  // Present only when claiming a HANDOVER code: the arriving pair's names.
  // Omitted for a plain change-device transfer (same pair, new device).
  realPair: z
    .object({ player1: playerSchema, player2: playerSchema })
    .optional(),
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
        const { gameId, seat, token, kind } = payload;
        if (!(await assertPlayer(gameId, seat, token, ack))) {
          return;
        }

        const code = await createSeatTransferCode(
          gameId,
          seat,
          kind ?? "CHANGE_DEVICE",
        );

        // Join this (old) device to the seat's room so it is notified when the
        // code is claimed on another device. The claiming device never joins
        // this room, so the takeover notice reaches only the device being
        // signed out.
        socket.join(Rooms.seat(gameId, seat));

        ack({ success: true, data: { code } });
      },
    },
  );

  // INSPECT_SEAT_TRANSFER: validate a code WITHOUT consuming it and report
  // whether it is a HANDOVER code (its `kind`), so the claim UI knows whether to
  // collect the arriving pair's names first. No auth — the code is the
  // credential.
  registerHandler<
    z.infer<typeof inspectSchema>,
    { gameId: string; seat: string; isHandover: boolean }
  >(socket, io, SocketEvents.INSPECT_SEAT_TRANSFER, {
    schema: inspectSchema,
    handler: async ({ payload, ack }) => {
      const result = await inspectSeatTransferCode(payload.code);
      if (!result.valid) {
        throw new HandlerError(result.error);
      }
      ack({
        success: true,
        data: {
          gameId: result.gameId,
          seat: result.seat,
          isHandover: result.isHandover,
        },
      });
    },
  });

  registerHandler<
    z.infer<typeof claimSchema>,
    { gameId: string; seat: string; token: string; isHandover: boolean }
  >(socket, io, SocketEvents.CLAIM_SEAT_TRANSFER, {
    schema: claimSchema,
    handler: async ({ payload, ack }) => {
      const result = await validateAndClaimSeatTransferCode(
        payload.code,
        payload.realPair,
      );

      if (!result.valid) {
        // A stale / wrong code (or a handover claim missing names) is a
        // user-facing failure, not an internal error.
        throw new HandlerError(result.error);
      }

      // Tell the device that previously held this seat it has been signed out,
      // so it can leave the play screen and return home. Only the old device
      // is in the seat room (it joined when minting the code); the claiming
      // socket has not joined it, so it is not notified of its own takeover.
      // This applies to both a plain transfer and a handover (the stand-in's
      // old device is signed out either way).
      io.to(Rooms.seat(result.gameId, result.seat)).emit(
        SocketEvents.SEAT_TAKEN_OVER,
        { gameId: result.gameId, seat: result.seat },
      );

      ack({
        success: true,
        data: {
          gameId: result.gameId,
          seat: result.seat,
          token: result.token,
          isHandover: result.isHandover,
        },
      });
    },
  });
}
