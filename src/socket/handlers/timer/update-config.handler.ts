import { updateTimerState } from "@/db/games/shared/actions/update-timer-state";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { scheduleGame } from "@/timer/scheduler";
import { TimerState } from "@/timer/timer-state";
import { Server, Socket } from "socket.io";
import { assertDirector } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { GameTypes } from "@/db/games/types/game-type";

const payloadSchema = z.object({
  gameType: z.enum(GameTypes),
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  boardsPerRound: z.number().int().positive(),
  totalRounds: z.number().int().positive(),
  playDuration: z.number().int().positive(),
  moveDuration: z.number().int().positive(),
});

export function registerUpdateConfigHandler(socket: Socket, io: Server) {
  function broadcast(gameId: string, timerState: TimerState) {
    io.to(Rooms.game(gameId)).emit(SocketEvents.TIMER_SYNC, {
      ...timerState,
      serverNow: Date.now(),
    });
  }

  socket.on(SocketEvents.UPDATE_CONFIG_TIMER, async (payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn(
        "Invalid UPDATE_CONFIG_TIMER payload:",
        parsed.error.message,
      );
      return;
    }

    const {
      gameType,
      gameId,
      directorToken,
      boardsPerRound,
      totalRounds,
      playDuration,
      moveDuration,
    } = parsed.data;
    if (!assertDirector(directorToken, gameId)) return;

    try {
      const engine = await getEngine(gameType, gameId);
      if (!engine) return;

      engine.updateConfig(
        boardsPerRound,
        totalRounds,
        playDuration,
        moveDuration,
      );

      await updateTimerState(gameType, gameId, engine.getState());
      broadcast(gameId, engine.getState());

      scheduleGame(gameType, gameId, engine, { updateTimerState, broadcast });
    } catch (err) {
      console.error(`Failed to update timer config for game ${gameId}:`, err);
    }
  });
}
