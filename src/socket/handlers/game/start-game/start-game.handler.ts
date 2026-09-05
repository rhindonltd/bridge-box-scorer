import { Server, Socket } from "socket.io";
import { z } from "zod";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { assertDirector } from "@/socket/middleware/director-auth";
import { startGame } from "@/services/start-game-service";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { StartProblem } from "@/model/start-validator";
import { promoteTimerAtGameStart } from "@/timer/promote-timer";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
});

/**
 * Start a game. Re-runs the start-check server-side (never trusting the client)
 * and, only when the seating validly matches the selected movement, materializes
 * the boards and assignments (with any single sit-out applied). Broadcasts
 * GAME_UPDATED on success so clients transition into the running game.
 */
export function registerStartGameHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.START_GAME,
    async (
      payload: unknown,
      cb?: (res: {
        success: boolean;
        error?: string;
        problems?: StartProblem[];
      }) => void,
    ) => {
      const parsed = payloadSchema.safeParse(payload);
      if (!parsed.success) {
        cb?.({ success: false, error: "Invalid payload" });
        return;
      }

      const { gameId, directorToken } = parsed.data;
      if (!assertDirector(directorToken, gameId, cb)) return;

      try {
        const validation = await startGame(gameId);

        if (!validation.canStart) {
          cb?.({
            success: false,
            error: "Game cannot be started",
            problems: validation.problems,
          });
          return;
        }

        // If the director configured a timer during setup, start it running
        // now. Best-effort: never blocks the game from starting.
        await promoteTimerAtGameStart(gameId, io);

        const updatedGame = await findGameById(gameId);
        io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, {
          game: updatedGame,
        });

        cb?.({ success: true });
      } catch (err) {
        console.error(`Failed to start game ${gameId}:`, err);
        cb?.({ success: false, error: "Internal server error" });
      }
    },
  );
}
