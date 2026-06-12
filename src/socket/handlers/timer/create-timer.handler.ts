import { GameType } from "@/db/games/types/game-type";
import { SocketEvents } from "@/socket/socket-events";
import { createEngine } from "@/timer/game-store";
import { Server, Socket } from "socket.io";
import { updateTimerState } from "@/db/games/shared/actions/update-timer-state";
import { Rooms } from "@/socket/rooms";
import { scheduleGame } from "@/timer/scheduler";
import { TimerState } from "@/timer/timer-state";

export function registerCreateTimerHandler(socket: Socket, io: Server) {
  function broadcast(gameId: string, timerState: TimerState) {
    io.to(Rooms.game(gameId)).emit("timer:sync", {
      ...timerState,
      serverNow: Date.now(),
    });
  }

  socket.on(
    SocketEvents.CREATE_TIMER,
    async ({
      gameType,
      gameId,
      boardsPerRound,
      totalRounds,
      playDuration,
      moveDuration,
    }: {
      gameType: GameType;
      gameId: string;
      boardsPerRound: number;
      totalRounds: number;
      playDuration: number;
      moveDuration: number;
    }) => {
      const engine = await createEngine(
        gameType,
        gameId,
        boardsPerRound,
        totalRounds,
        playDuration,
        moveDuration,
      );

      engine.pause();

      await updateTimerState(gameType, gameId, engine.getState());
      broadcast(gameId, engine.getState());

      scheduleGame(gameType, gameId, engine, { updateTimerState, broadcast });
    },
  );
}
