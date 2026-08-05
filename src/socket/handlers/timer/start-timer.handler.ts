import { updateTimerState } from "@/db/game/actions/update-timer-state";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { scheduleGame } from "@/timer/scheduler";
import { TimerState } from "@/timer/timer-state";
import { Server, Socket } from "socket.io";
import { assertDirector } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { GameTypes } from "@/db/game/types/game-type";

const payloadSchema = z.object({
  gameType: z.enum(GameTypes),
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
});

export function registerStartTimerHandler(socket: Socket, io: Server) {
  function broadcast(gameId: string, timerState: TimerState) {
    io.to(Rooms.game(gameId)).emit(SocketEvents.TIMER_SYNC, {
      ...timerState,
      serverNow: Date.now(),
    });
  }

  socket.on(SocketEvents.START_TIMER, async (payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn("Invalid START_TIMER payload:", parsed.error.message);
      return;
    }

    const { gameType, gameId, directorToken } = parsed.data;
    if (!assertDirector(directorToken, gameId)) return;

    try {
      const engine = await getEngine(gameType, gameId);
      if (!engine) return;

      engine.start();

      await updateTimerState(gameType, gameId, engine.getState());
      broadcast(gameId, engine.getState());

      scheduleGame(gameType, gameId, engine, { updateTimerState, broadcast });
    } catch (err) {
      console.error(`Failed to start timer for game ${gameId}:`, err);
    }
  });
}
