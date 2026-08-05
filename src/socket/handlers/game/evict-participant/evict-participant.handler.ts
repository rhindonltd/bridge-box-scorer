import { Server, Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { assertDirector } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { deleteParticipant as deletePairParticipant } from "@/db/game/actions/delete-participant";
import { findPairs } from "@/db/game/queries/find-pairs";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { PairSeat } from "@/model/participants";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  seat: z.string().min(1),
  directorToken: z.string().min(1),
});

export function registerEvictParticipantHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.EVICT_PARTICIPANT,
    async (
      payload: unknown,
      cb?: (res: { success: boolean; error?: string }) => void,
    ) => {
      const parsed = payloadSchema.safeParse(payload);
      if (!parsed.success) {
        cb?.({ success: false, error: "Invalid payload" });
        return;
      }

      const { gameId, seat, directorToken } = parsed.data;
      if (!assertDirector(directorToken, gameId, cb)) return;

      try {
        const game = await findGameById(gameId);
        if (!game) {
          cb?.({ success: false, error: "Game not found" });
          return;
        }

        await deletePairParticipant(gameId, seat as PairSeat);
        io.to(Rooms.game(gameId)).emit(SocketEvents.PARTICIPANTS, {
          participants: await findPairs(gameId),
        });

        cb?.({ success: true });
      } catch (err) {
        console.error(
          `Failed to evict participant at seat ${seat} in game ${gameId}:`,
          err,
        );
        cb?.({ success: false, error: "Internal server error" });
      }
    },
  );
}
