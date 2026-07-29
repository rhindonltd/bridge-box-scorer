import { SocketEvents } from "@/socket/socket-events";
import { createEngine } from "@/timer/game-store";
import { Server, Socket } from "socket.io";
import { updateTimerState } from "@/db/games/shared/actions/update-timer-state";
import { Rooms } from "@/socket/rooms";
import { scheduleGame } from "@/timer/scheduler";
import { TimerState } from "@/timer/timer-state";
import { assertDirector } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { GameTypes } from "@/db/games/types/game-type";

const payloadSchema = z.object({
  gameType: z.enum(GameTypes),
  gameId: z.string().min(1),
  boardsPerRound: z.number().int().positive(),
  totalRounds: z.number().int().positive(),
  playDuration: z.number().int().positive(),
  moveDuration: z.number().int().positive(),
});

export function registerCreateTimerHandler(socket: Socket, io: Server) {
  function broadcast(gameId: string, timerState: TimerState) {
    io.to(Rooms.game(gameId)).emit(SocketEvents.TIMER_SYNC, {
      ...timerState,
      serverNow: Date.now(),
    });
  }

  socket.on(SocketEvents.CREATE_TIMER, async (payload: unknown) => {
    if (!assertDirector(socket)) return;

    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn("Invalid CREATE_TIMER payload:", parsed.error.message);
      return;
    }

    const { gameType, gameId, boardsPerRound, totalRounds, playDuration, moveDuration } = parsed.data;

    try {
      const engine = await createEngine(
        gameType,
        gameId,
        boardsPerRound,
        totalRounds,
        playDuration,
        moveDuration,
      );

      await updateTimerState(gameType, gameId, engine.getState());
      broadcast(gameId, engine.getState());

      scheduleGame(gameType, gameId, engine, { updateTimerState, broadcast });
    } catch (err) {
      console.error(`Failed to create timer for game ${gameId}:`, err);
    }
  });
}
