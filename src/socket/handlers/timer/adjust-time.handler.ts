import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { Server, Socket } from "socket.io";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { scheduleGame } from "@/timer/scheduler";
import { assertDirector } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { makeTimerBroadcaster } from "./broadcast-timer";
import { directorTimerFields } from "./payload";

/**
 * Add or subtract time on the current phase. `deltaSeconds` may be negative.
 * When `applyToFutureSameType` is true the change also adjusts the stored
 * play/move duration so all subsequent phases of that type inherit it; phases
 * that have already elapsed are never modified.
 */
const payloadSchema = z.object({
  ...directorTimerFields,
  deltaSeconds: z.number().int(),
  applyToFutureSameType: z.boolean().optional(),
});

export function registerAdjustTimeHandler(socket: Socket, io: Server) {
  const broadcast = makeTimerBroadcaster(io);

  socket.on(SocketEvents.ADJUST_TIME_TIMER, async (payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn("Invalid ADJUST_TIME_TIMER payload:", parsed.error.message);
      return;
    }

    const { gameId, directorToken, deltaSeconds, applyToFutureSameType } =
      parsed.data;
    if (!assertDirector(directorToken, gameId)) return;

    try {
      const engine = await getEngine(gameId);
      if (!engine) return;

      engine.adjustTime(deltaSeconds * 1000, applyToFutureSameType ?? false);

      await updateTimerState(gameId, engine.getState());
      broadcast(gameId, engine.getState());

      scheduleGame(gameId, engine, { updateTimerState, broadcast });
    } catch (err) {
      console.error(`Failed to adjust timer time for game ${gameId}:`, err);
    }
  });
}
