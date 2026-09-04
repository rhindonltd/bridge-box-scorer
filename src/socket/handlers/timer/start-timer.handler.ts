import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { scheduleGame } from "@/timer/scheduler";
import { Server, Socket } from "socket.io";
import { assertDirector } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { makeTimerBroadcaster } from "./broadcast-timer";
import { directorTimerFields } from "./payload";

const payloadSchema = z.object(directorTimerFields);

export function registerStartTimerHandler(socket: Socket, io: Server) {
  const broadcast = makeTimerBroadcaster(io);

  socket.on(SocketEvents.START_TIMER, async (payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn("Invalid START_TIMER payload:", parsed.error.message);
      return;
    }

    const { gameId, directorToken } = parsed.data;
    if (!assertDirector(directorToken, gameId)) return;

    try {
      const engine = await getEngine(gameId);
      if (!engine) return;

      engine.start();

      await updateTimerState(gameId, engine.getState());
      broadcast(gameId, engine.getState());

      scheduleGame(gameId, engine, { updateTimerState, broadcast });
    } catch (err) {
      console.error(`Failed to start timer for game ${gameId}:`, err);
    }
  });
}
