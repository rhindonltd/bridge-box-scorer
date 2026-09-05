import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { Rooms } from "@/socket/rooms";
import { SocketResponse } from "@/socket/socket-response";
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
 */
export function registerRequestStateHandler(socket: Socket, _io: Server) {
  socket.on(
    SocketEvents.REQUEST_STATE_TIMER,
    async (
      payload: unknown,
      cb?: (response: SocketResponse<TimerSnapshot>) => void,
    ) => {
      const parsed = payloadSchema.safeParse(payload);
      if (!parsed.success) {
        console.warn(
          "Invalid REQUEST_STATE_TIMER payload:",
          parsed.error.message,
        );
        cb?.({ success: false, error: "Invalid payload" });
        return;
      }

      const { gameId, section } = parsed.data;

      try {
        // Join first so a push that races the ack still reaches this client.
        socket.join(Rooms.timer(gameId, section));

        const engine = await getEngine(gameId, section);
        const snapshot = engine
          ? buildTimerSyncPayload(section, engine.getState())
          : null;
        cb?.({ success: true, data: snapshot });
      } catch (err) {
        console.error(
          `Failed to load timer state for game ${gameId} section ${section}:`,
          err,
        );
        // Treat an unavailable timer as "no snapshot" rather than a hard error
        // so the client can still render its connecting/empty state.
        cb?.({ success: true, data: null });
      }
    },
  );

  socket.on(SocketEvents.LEAVE_TIMER, (payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) return;
    socket.leave(Rooms.timer(parsed.data.gameId, parsed.data.section));
  });
}
