import { updateTimerState } from "@/db/games/shared/actions/update-timer-state";
import { GameType } from "@/db/games/types/game-type";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { getOrCreateEngine } from "@/timer/game-store";
import { scheduleGame } from "@/timer/scheduler";
import { TimerState } from "@/timer/timer-state";
import { Server, Socket } from "socket.io";

export function registerPauseTimerHandler(socket: Socket, io: Server) {
  function broadcast(gameId: string, timerState: TimerState) {
    io.to(Rooms.game(gameId)).emit("timer:sync", {
      timerState,
      serverNow: Date.now(),
    });
  }

  socket.on(
    SocketEvents.PAUSE_TIMER,
    async ({ gameType, gameId }: { gameType: GameType; gameId: string }) => {
      const engine = await getOrCreateEngine(gameType, gameId);

      engine.pause();

      await updateTimerState(gameType, gameId, engine.getState());
      broadcast(gameId, engine.getState());

      scheduleGame(gameType, gameId, engine, { updateTimerState, broadcast });
    },
  );
}
