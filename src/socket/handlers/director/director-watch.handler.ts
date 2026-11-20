import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { DirectorRooms } from "@/socket/rooms";
import { registerHandler } from "@/socket/handlers/handler-wrapper";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import {
  recentAlertsFor,
  type DirectorScope,
} from "@/socket/broadcast/director-alerts";
import type { DirectorAlert } from "@/model/director-alert";

const payloadSchema = z.object({
  directors: z
    .array(
      z.object({
        gameId: z.string().min(1),
        directorToken: z.string().min(1),
      }),
    )
    .max(100),
});

/**
 * DIRECTOR_WATCH: a device lists the director tokens it holds. Each one the
 * server accepts puts the device in that game's director room, and any accepted
 * token puts it in the room shared by all directors. The device's previous
 * director rooms are left first, so a lost or removed token stops alerts.
 *
 * Sent on connect, on every reconnect, and after the device becomes a director.
 * The acknowledgement carries the recent alerts it may have missed: only those
 * raised since it became a director, so a new director gets no backlog.
 */
export function registerDirectorWatchHandler(socket: Socket, io: Server) {
  registerHandler<
    z.infer<typeof payloadSchema>,
    { gameIds: string[]; alerts: DirectorAlert[] }
  >(socket, io, SocketEvents.DIRECTOR_WATCH, {
    schema: payloadSchema,
    handler: async ({ payload, ack }) => {
      for (const room of socket.rooms) {
        if (room.startsWith(DirectorRooms.prefix)) socket.leave(room);
      }

      // Each game this device really directs, and since when: a session
      // with no creation time (made before that was recorded) counts from the
      // start, which is fine because alerts are only kept in memory.
      const scopes = new Map<string, number>();
      for (const d of payload.directors) {
        if (!validateDirectorToken(d.directorToken, d.gameId)) continue;
        const createdAt = findLoginSession(d.directorToken)?.createdAt;
        const since = createdAt ? Date.parse(createdAt) : 0;
        const known = scopes.get(d.gameId);
        scopes.set(
          d.gameId,
          known === undefined ? since : Math.min(known, since),
        );
      }
      const gameIds = [...scopes.keys()];
      if (gameIds.length === 0) {
        ack({ success: true, data: { gameIds, alerts: [] } });
        return;
      }

      socket.join(DirectorRooms.all);
      for (const gameId of gameIds) socket.join(DirectorRooms.game(gameId));
      ack({
        success: true,
        data: {
          gameIds,
          alerts: recentAlertsFor(
            [...scopes].map(([gameId, since]): DirectorScope => ({
              gameId,
              since,
            })),
          ),
        },
      });
    },
  });
}
