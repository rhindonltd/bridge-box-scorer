import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { Rooms } from "@/socket/rooms";
import { registerHandler } from "@/socket/handlers/handler-wrapper";
import { buildTimerSyncPayload } from "./broadcast-timer";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  section: z.string().min(1),
});

type TimerSnapshot = ReturnType<typeof buildTimerSyncPayload> | null;

/**
 * Read-only request for a section's current timer snapshot. Joins that
 * section's timer room (so future `timer:sync` pushes reach this client) and
 * returns the current timer state on the acknowledgement callback, or `null`
 * when no timer exists for that section. Used by the TimerProvider to load
 * initial state on mount / reconnect. No director auth: reading timer state is
 * public. A matching `timer:leave` leaves the room on unmount / section change.
 *
 * A failure loading the engine is treated as "no snapshot yet"
 * (`{ success: true, data: null }`), not an error, so the client can still
 * render its connecting/empty state — hence the handler owns its own try/catch
 * rather than letting the wrapper turn it into a failure ack.
 */
export function registerRequestStateHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, TimerSnapshot>(
    socket,
    io,
    SocketEvents.REQUEST_STATE_TIMER,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack, log }) => {
        const { gameId, section } = payload;

        // Join first so a push that races the ack still reaches this client.
        socket.join(Rooms.timer(gameId, section));

        try {
          const engine = await getEngine(gameId, section);
          const snapshot = engine
            ? buildTimerSyncPayload(section, engine.getState())
            : null;
          ack({ success: true, data: snapshot });
        } catch (err) {
          log.error({ err, gameId, section }, "Failed to load timer state");
          ack({ success: true, data: null });
        }
      },
    },
  );

  socket.on(SocketEvents.LEAVE_TIMER, (payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) return;
    socket.leave(Rooms.timer(parsed.data.gameId, parsed.data.section));
  });
}
