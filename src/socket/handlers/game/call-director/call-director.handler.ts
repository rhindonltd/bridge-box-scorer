import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import {
  HandlerError,
  registerHandler,
} from "@/socket/handlers/handler-wrapper";
import { assertPlayer } from "@/socket/middleware/participant-auth";
import { getDb } from "@/db/games";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { locateCaller } from "@/services/call-director/locate-caller";
import { callDirector } from "@/socket/broadcast/director-calls";
import type { CallingTable } from "@/model/director-alert";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  seat: z.string().min(1),
  token: z.string().optional(),
});

/**
 * CALL_DIRECTOR: a seated player asks the director to come to their table.
 * Authed by the seat's own token, so nobody can call on another pair's behalf.
 * Raises a popup on the game's director devices naming the pair's table this
 * round; calling again before a director answers bumps the same popup. The
 * ack says which table the director was sent to.
 */
export function registerCallDirectorHandler(socket: Socket, io: Server) {
  registerHandler<
    z.infer<typeof payloadSchema>,
    { table: CallingTable; calls: number }
  >(socket, io, SocketEvents.CALL_DIRECTOR, {
    schema: payloadSchema,
    blockWhenFinalised: true,
    handler: async ({ payload, ack }) => {
      const { gameId, seat, token } = payload;
      if (!(await assertPlayer(gameId, seat, token, ack))) return;

      const game = await findGameById(gameId);
      const db = await getDb(gameId);
      if (!game || !db) throw new HandlerError("Game not found");

      const { table, players } = await locateCaller(db, gameId, seat);
      const alert = callDirector(
        gameId,
        seat,
        { eventName: game.eventName, table, players },
        io,
      );
      ack({ success: true, data: { table, calls: alert.calls } });
    },
  });
}
