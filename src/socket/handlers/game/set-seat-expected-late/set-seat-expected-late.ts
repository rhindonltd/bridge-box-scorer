import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { getDb } from "@/db/games";
import {
  addExpectedLateSeat,
  removeExpectedLateSeat,
} from "@/db/games/queries/expected-late-seats";
import { assertDirector } from "@/socket/middleware/director-auth";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { isPairSeat, type PairSeat } from "@/model/participants";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  seat: z.string().min(1),
  /** true to mark the empty seat expected-late; false to clear the mark. */
  expectedLate: z.boolean(),
});

/**
 * Director-authed mark/unmark of an EMPTY seat as "expected late" (§2.4.7), so
 * the game can start short with that seat unfilled. The mark is a lightweight
 * seat-keyed fact (no participant row): start validation treats a marked seat
 * as accounted-for, and scoring indemnifies its opponents AVE+ while it is
 * empty. Fans out the participant list and a leaderboard snapshot so every
 * device reflects the change (the opponents' indemnity and the "running late"
 * round-info both derive from this set).
 */
export function registerSetSeatExpectedLateHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, null>(
    socket,
    io,
    SocketEvents.SET_SEAT_EXPECTED_LATE,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack }) => {
        const { gameId, directorToken, seat, expectedLate } = payload;

        if (!assertDirector(directorToken, gameId, ack)) return;

        if (!isPairSeat(seat as PairSeat)) {
          throw new HandlerError("Invalid seat");
        }

        const db = await getDb(gameId);
        if (!db) {
          throw new HandlerError("Game not found");
        }

        if (expectedLate) {
          await addExpectedLateSeat(db, seat as PairSeat);
        } else {
          await removeExpectedLateSeat(db, seat as PairSeat);
        }

        ack({ success: true, data: null });

        await broadcastParticipants(gameId, io);
        await broadcastLeaderboardChanged(io, gameId);
      },
    },
  );
}
