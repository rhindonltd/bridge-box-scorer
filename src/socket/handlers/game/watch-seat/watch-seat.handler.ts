import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { registerHandler } from "@/socket/handlers/handler-wrapper";
import { findSeatDeviceInfo } from "@/db/games/queries/find-participant-secret";
import { validatePlayerToken } from "@/socket/middleware/participant-auth";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  seat: z.string().min(1),
  token: z.string().optional(),
});

/**
 * What a device learns about its own seat:
 *  - `held`:    its token is still the seat's live secret (it joined the seat's
 *               room, so it will be told if the seat later moves);
 *  - `moved`:   its token is stale because the seat now belongs to another
 *               device (a change-device / handover claim, or a director move) —
 *               it should sign itself out of the seat;
 *  - `unknown`: nothing to conclude (no token, no occupant, or the pair was
 *               withdrawn — the play screen has its own withdrawn state).
 */
export type WatchSeatStatus = "held" | "moved" | "unknown";

/**
 * WATCH_SEAT: a play device asks about its seat on mount and on every socket
 * reconnect. Authed by the seat's own token (a stale token is a normal answer,
 * not an error). A valid token joins the seat's room so `SEAT_TAKEN_OVER` reaches
 * the device live; a stale token is told `moved` straight away. The reconnect
 * check is what catches a phone that was off (or out of signal) when its seat was
 * moved and so missed the live notice.
 */
export function registerWatchSeatHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, { status: WatchSeatStatus }>(
    socket,
    io,
    SocketEvents.WATCH_SEAT,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack }) => {
        const { gameId, seat, token } = payload;
        if (!token) {
          ack({ success: true, data: { status: "unknown" } });
          return;
        }
        if (await validatePlayerToken(gameId, seat, token)) {
          socket.join(Rooms.seat(gameId, seat));
          ack({ success: true, data: { status: "held" } });
          return;
        }
        const info = await findSeatDeviceInfo(gameId, seat);
        // A withdrawn pair's secret is rotated away too, but that is shown by
        // the play screen's own withdrawn state, not as "moved".
        const status: WatchSeatStatus =
          info && info.standing !== "WITHDRAWN" ? "moved" : "unknown";
        ack({ success: true, data: { status } });
      },
    },
  );
}
