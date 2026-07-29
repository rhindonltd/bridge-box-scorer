import { GameType } from "@/db/games/types/game-type";
import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { Server, Socket } from "socket.io";
import { updateTimerState } from "@/db/games/shared/actions/update-timer-state";
import { Rooms } from "@/socket/rooms";
import { scheduleGame } from "@/timer/scheduler";
import { TimerState } from "@/timer/timer-state";
import { assertDirector } from "@/socket/middleware/director-auth";

export function registerNextRoundHandler(socket: Socket, io: Server) {
  function broadcast(gameId: string, timerState: TimerState) {
    io.to(Rooms.game(gameId)).emit("timer:sync", {
      ...timerState,
      serverNow: Date.now(),
    });
  }

  socket.on(
    SocketEvents.NEXT_ROUND_TIMER,
    async ({ gameType, gameId }: { gameType: GameType; gameId: string }) => {
      if (!assertDirector(socket)) return;
      const engine = await getEngine(gameType, gameId);

      if (engine) {
        engine.nextPhase();

        await updateTimerState(gameType, gameId, engine.getState());
        broadcast(gameId, engine.getState());

        scheduleGame(gameType, gameId, engine, { updateTimerState, broadcast });
      }
    },
  );
}
