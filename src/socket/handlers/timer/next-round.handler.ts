import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { Server, Socket } from "socket.io";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { scheduleGame } from "@/timer/scheduler";
import { assertDirector } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { makeTimerBroadcaster } from "./broadcast-timer";
import { directorTimerFields } from "./payload";

const payloadSchema = z.object(directorTimerFields);

export function registerNextRoundHandler(socket: Socket, io: Server) {
  const broadcast = makeTimerBroadcaster(io);

  socket.on(SocketEvents.NEXT_ROUND_TIMER, async (payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn("Invalid NEXT_ROUND_TIMER payload:", parsed.error.message);
      return;
    }

    const { gameId, section, directorToken } = parsed.data;
    if (!assertDirector(directorToken, gameId)) return;

    try {
      const engine = await getEngine(gameId, section);
      if (!engine) return;

      engine.nextPhase();

      await updateTimerState(gameId, section, engine.getState());
      broadcast(gameId, section, engine.getState());

      scheduleGame(gameId, section, engine, { updateTimerState, broadcast });
    } catch (err) {
      console.error(`Failed to advance timer for game ${gameId}:`, err);
    }
  });
}
