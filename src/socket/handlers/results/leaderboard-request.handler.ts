import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { getDb } from "@/db/games";
import { SocketResponse } from "@/socket/socket-response";
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
 */
export function registerLeaderboardRequestHandler(socket: Socket, _io: Server) {
  socket.on(
    SocketEvents.REQUEST_STATE_LEADERBOARD,
    async (
      payload: unknown,
      cb?: (response: SocketResponse<LeaderboardSnapshot>) => void,
    ) => {
      const parsed = payloadSchema.safeParse(payload);
      if (!parsed.success) {
        cb?.({ success: false, error: "Invalid payload" });
        return;
      }

      const { gameId } = parsed.data;

      try {
        socket.join(Rooms.leaderboard(gameId));

        const db = await getDb(gameId);
        const snapshot = db ? await buildLeaderboardPayload(db, gameId) : null;
        cb?.({ success: true, data: snapshot });
      } catch (err) {
        console.error(
          `Failed to load leaderboard for game ${gameId}:`,
          err,
        );
        cb?.({ success: true, data: null });
      }
    },
  );

  socket.on(
    SocketEvents.LEAVE_LEADERBOARD,
    (payload: unknown) => {
      const parsed = payloadSchema.safeParse(payload);
      if (!parsed.success) return;
      socket.leave(Rooms.leaderboard(parsed.data.gameId));
    },
  );
}
