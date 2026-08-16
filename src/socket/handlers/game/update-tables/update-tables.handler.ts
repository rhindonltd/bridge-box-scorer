import { Server, Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { assertDirector } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { updateTableCount } from "@/db/game-index/actions/update-table-count";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findPairs } from "@/db/games/queries/find-pairs";
import { parseSeat } from "@/model/participants";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  tables: z.number().int().min(1),
  directorToken: z.string().min(1),
});

export function registerUpdateTablesHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.UPDATE_TABLES,
    async (
      payload: unknown,
      cb?: (res: { success: boolean; error?: string }) => void,
    ) => {
      const parsed = payloadSchema.safeParse(payload);
      if (!parsed.success) {
        cb?.({ success: false, error: "Invalid payload" });
        return;
      }

      const { gameId, tables, directorToken } = parsed.data;
      if (!assertDirector(directorToken, gameId, cb)) return;

      try {
        const game = await findGameById(gameId);
        if (!game) {
          cb?.({ success: false, error: "Game not found" });
          return;
        }

        // When reducing tables, check that no participants are seated at
        // tables that would be removed (i.e., tables > new count)
        if (tables < game.tables) {
          const highestOccupiedTable = await getHighestOccupiedTable(gameId);

          if (highestOccupiedTable > tables) {
            cb?.({
              success: false,
              error: `Cannot reduce to ${tables} tables: table ${highestOccupiedTable} has seated participants. Evict them first.`,
            });
            return;
          }
        }

        await updateTableCount(gameId, tables);

        const updatedGame = await findGameById(gameId);
        io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, {
          game: updatedGame,
        });

        cb?.({ success: true });
      } catch (err) {
        console.error(`Failed to update tables for game ${gameId}:`, err);
        cb?.({ success: false, error: "Internal server error" });
      }
    },
  );
}

async function getHighestOccupiedTable(gameId: string): Promise<number> {
  const seats = await findPairs(gameId);

  if (seats.length === 0) return 0;

  return Math.max(...seats.map((s) => parseSeat(s.initialSeat).tableNumber));
}
