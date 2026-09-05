import { SocketEvents } from "@/socket/socket-events";
import { Server, Socket } from "socket.io";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { assertDirector } from "@/socket/middleware/director-auth";
import { z } from "zod";
import { makeTimerBroadcaster } from "./broadcast-timer";
import { timerConfigExtras, toBreakConfigs } from "./payload";
import { buildConfiguredTimerState } from "@/timer/timer-state";

const payloadSchema = z.object({
  gameId: z.string().min(1),
  directorToken: z.string().min(1),
  boardsPerRound: z.number().int().positive(),
  totalRounds: z.number().int().positive(),
  playDuration: z.number().int().positive(),
  moveDuration: z.number().int().positive(),
  ...timerConfigExtras,
});

/**
 * Save a timer configuration during game setup without starting it.
 *
 * Persists a "configured but not started" timer state (phase null, not running)
 * to the game's timer metadata and broadcasts it so the setup UI reflects the
 * saved config. Unlike `timer:create`, this never creates a running engine or
 * schedules any phase transitions — the configured timer is promoted to a live
 * timer only when the game is started. Re-saving overwrites the previous config.
 */
export function registerSaveConfigHandler(socket: Socket, io: Server) {
  const broadcast = makeTimerBroadcaster(io);

  socket.on(SocketEvents.SAVE_CONFIG_TIMER, async (payload: unknown) => {
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success) {
      console.warn("Invalid SAVE_CONFIG_TIMER payload:", parsed.error.message);
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
      const timerState = buildConfiguredTimerState({
        boardsPerRound,
        totalRounds,
        playDuration,
        moveDuration,
        breaks: toBreakConfigs(breaks),
        warningSeconds,
      });

      await updateTimerState(gameId, timerState);
      broadcast(gameId, timerState);
    } catch (err) {
      console.error(`Failed to save timer config for game ${gameId}:`, err);
    }
  });
}
