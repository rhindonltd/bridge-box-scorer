import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { cancelGameSchedule } from "@/timer/scheduler";
import { Server, Socket } from "socket.io";
import { assertDirector } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { makeTimerBroadcaster } from "./broadcast-timer";
import { directorTimerFields } from "./payload";

const payloadSchema = z.object(directorTimerFields);

export function registerPauseTimerHandler(socket: Socket, io: Server) {
  const broadcast = makeTimerBroadcaster(io);

  socket.on(SocketEvents.PAUSE_TIMER, async (payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn("Invalid PAUSE_TIMER payload:", parsed.error.message);
      return;
    }

    const { gameId, directorToken } = parsed.data;
    if (!assertDirector(directorToken, gameId)) return;

    try {
      const engine = await getEngine(gameId);
      if (!engine) return;

      engine.pause();

      // Explicitly cancel any scheduled phase transition since we're now paused
      cancelGameSchedule(gameId);

      await updateTimerState(gameId, engine.getState());
      broadcast(gameId, engine.getState());
    } catch (err) {
      console.error(`Failed to pause timer for game ${gameId}:`, err);
    }
  });
}
