import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { SocketEvents } from "@/socket/socket-events";
import { getEngine } from "@/timer/game-store";
import { scheduleGame } from "@/timer/scheduler";
import { Server, Socket } from "socket.io";
import { assertDirector } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { makeTimerBroadcaster } from "./broadcast-timer";
import {
  directorTimerFields,
  timerConfigExtras,
  toBreakConfigs,
} from "./payload";

const payloadSchema = z.object({
  ...directorTimerFields,
  boardsPerRound: z.number().int().positive(),
  totalRounds: z.number().int().positive(),
  playDuration: z.number().int().positive(),
  moveDuration: z.number().int().positive(),
  ...timerConfigExtras,
});

export function registerUpdateConfigHandler(socket: Socket, io: Server) {
  const broadcast = makeTimerBroadcaster(io);

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
      gameId,
      section,
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
      const engine = await getEngine(gameId, section);
      if (!engine) return;

      engine.updateConfig(boardsPerRound, totalRounds, playDuration, moveDuration, {
        breaks: toBreakConfigs(breaks),
        warningSeconds,
      });

      await updateTimerState(gameId, section, engine.getState());
      broadcast(gameId, section, engine.getState());

      scheduleGame(gameId, section, engine, { updateTimerState, broadcast });
    } catch (err) {
      console.error(`Failed to update timer config for game ${gameId}:`, err);
    }
  });
}
