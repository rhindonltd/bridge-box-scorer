import { Server, Socket } from "socket.io";
import { z } from "zod";

import { SocketEvents } from "@/socket/socket-events";
import { assertPlayer } from "@/socket/middleware/participant-auth";
import { isGameStarted } from "@/db/games/queries/is-game-started";
import { deleteParticipant } from "@/db/games/actions/delete-participant";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { PairSeat } from "@/model/participants";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  seat: z.string().min(1),
  token: z.string().optional(),
});

/**
 * LEAVE_TABLE — a seated player vacates their seat before the game starts,
 * freeing it for someone else.
 *
 * Player-authed: the caller must present the seat's own token (validated
 * against the participant's stored secret). Setup-only: once the game has
 * started (its movement is materialized), seating is fixed and leaving is
 * refused. On success the participant + its player rows are removed and the
 * updated participant list is broadcast, so every join screen shows the seat as
 * free again.
 */
export function registerLeaveTableHandler(socket: Socket, io: Server) {
  registerHandler(socket, io, SocketEvents.LEAVE_TABLE, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      const { gameId, seat, token } = payload;

      // assertPlayer acks its own {success:false,error:"Unauthorized"} via the
      // guarded ack, then we stop.
      if (!(await assertPlayer(gameId, seat, token, ack))) {
        return;
      }

      if (await isGameStarted(gameId)) {
        throw new HandlerError(
          "The game has already started; you can no longer leave your seat.",
        );
      }

      await deleteParticipant(gameId, seat as PairSeat);
      await broadcastParticipants(gameId, io);
      ack({ success: true, data: undefined });
    },
  });
}
