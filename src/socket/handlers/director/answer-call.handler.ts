import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { registerHandler } from "@/socket/handlers/handler-wrapper";
import { assertDirector } from "@/socket/middleware/director-auth";
import { answerCall } from "@/socket/broadcast/director-calls";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().optional(),
  alertId: z.string().min(1),
});

/**
 * DIRECTOR_ANSWER_CALL: a director dismissed a "Call Director" popup. The
 * first director to do so answers the call: the calling pair's device is told
 * the director is on the way, and the pair's next call starts afresh. Other
 * directors keep their own popup until they dismiss it. The ack says whether
 * this director was the one who answered.
 */
export function registerAnswerCallHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, { answered: boolean }>(
    socket,
    io,
    SocketEvents.DIRECTOR_ANSWER_CALL,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack }) => {
        const { gameId, directorToken, alertId } = payload;
        if (!assertDirector(directorToken, gameId, ack)) return;

        const seat = answerCall(gameId, alertId);
        if (seat) {
          io.to(Rooms.seat(gameId, seat)).emit(
            SocketEvents.DIRECTOR_CALL_ANSWERED,
            { gameId, seat },
          );
        }
        ack({ success: true, data: { answered: seat !== null } });
      },
    },
  );
}
