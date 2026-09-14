import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { getDb } from "@/db/games";
import { registerHandler } from "@/socket/handlers/handler-wrapper";
import { buildLeaderboardPayload } from "./broadcast-results";

const payloadSchema = z.object({
  gameId: z.string().min(1),
});

type LeaderboardSnapshot = Awaited<
  ReturnType<typeof buildLeaderboardPayload>
> | null;

/**
 * Read-only request for the current leaderboard snapshot. Returns
 * `{ leaderboard, sections }` (or null when the game db is missing) on the ack,
 * AND joins the socket to the leaderboard room so it receives pushed
 * `leaderboard:sync` updates. Requesting implies "I am now viewing the
 * leaderboard"; a matching `leaderboard:leave` removes the socket on unmount.
 * No director auth — reading the leaderboard is public.
 *
 * A failure computing the leaderboard is treated as "no snapshot yet"
 * (`{ success: true, data: null }`), not an error, so the client stays in its
 * loading/empty state rather than surfacing a failure — hence the handler owns
 * its own try/catch rather than letting the wrapper turn it into a failure ack.
 */
export function registerLeaderboardRequestHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, LeaderboardSnapshot>(
    socket,
    io,
    SocketEvents.REQUEST_STATE_LEADERBOARD,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack, log }) => {
        const { gameId } = payload;

        socket.join(Rooms.leaderboard(gameId));

        try {
          const db = await getDb(gameId);
          const snapshot = db
            ? await buildLeaderboardPayload(db, gameId)
            : null;
          ack({ success: true, data: snapshot });
        } catch (err) {
          log.error({ err, gameId }, "Failed to load leaderboard");
          ack({ success: true, data: null });
        }
      },
    },
  );

  socket.on(SocketEvents.LEAVE_LEADERBOARD, (payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) return;
    socket.leave(Rooms.leaderboard(parsed.data.gameId));
  });
}
