import { SocketEvents } from "@/socket/socket-events";
import { createEngine } from "@/timer/game-store";
import { Server, Socket } from "socket.io";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { scheduleGame } from "@/timer/scheduler";
import { assertDirector } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { makeTimerBroadcaster } from "./broadcast-timer";
import { timerConfigExtras, toBreakConfigs } from "./payload";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  boardsPerRound: z.number().int().positive(),
  totalRounds: z.number().int().positive(),
  playDuration: z.number().int().positive(),
  moveDuration: z.number().int().positive(),
  ...timerConfigExtras,
});

export function registerCreateTimerHandler(socket: Socket, io: Server) {
  const broadcast = makeTimerBroadcaster(io);

  socket.on(SocketEvents.CREATE_TIMER, async (payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn("Invalid CREATE_TIMER payload:", parsed.error.message);
      return;
    }

    const {
      gameId,
      directorToken,
      boardsPerRound,
      totalRounds,
      playDuration,
      moveDuration,
      breaks,
      warningSeconds,
    } = parsed.data;
    if (!assertDirector(directorToken, gameId)) return;

    try {
      const engine = await createEngine(
        gameId,
        boardsPerRound,
        totalRounds,
        playDuration,
        moveDuration,
        { breaks: toBreakConfigs(breaks), warningSeconds },
      );

      await updateTimerState(gameId, engine.getState());
      broadcast(gameId, engine.getState());

      scheduleGame(gameId, engine, { updateTimerState, broadcast });
    } catch (err) {
      console.error(`Failed to create timer for game ${gameId}:`, err);
    }
  });
}
