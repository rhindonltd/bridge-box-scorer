import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { SocketResponse } from "@/socket/socket-response";
import { buildTimerSyncPayload } from "./broadcast-timer";

const payloadSchema = z.object({
  gameId: z.string().min(1),
});

type TimerSnapshot = ReturnType<typeof buildTimerSyncPayload> | null;

/**
 * Read-only request for the current timer snapshot. Returns the current timer
 * state (same shape as a `timer:sync` broadcast) on the acknowledgement
 * callback, or `null` when no timer exists for the game. Used by the
 * TimerProvider to load initial state on mount / reconnect without waiting for
 * the next broadcast. No director auth: reading timer state is public.
 *
 * `io` is accepted for signature consistency with the other timer handlers but
 * is unused — the response goes on the ack, not a broadcast.
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

      try {
        const engine = await getEngine(parsed.data.gameId);
        const snapshot = engine
          ? buildTimerSyncPayload(engine.getState())
          : null;
        cb?.({ success: true, data: snapshot });
      } catch (err) {
        console.error(
          `Failed to load timer state for game ${parsed.data.gameId}:`,
          err,
        );
        // Treat an unavailable timer as "no snapshot" rather than a hard error
        // so the client can still render its connecting/empty state.
        cb?.({ success: true, data: null });
      }
    },
  );
}
