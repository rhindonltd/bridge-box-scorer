import "server-only";

import type { Server } from "socket.io";

import { getIO } from "@/socket/websocket";
import { makeTimerBroadcaster } from "@/socket/handlers/timer/broadcast-timer";
import type { TimerState } from "@/timer/timer-state";
import type { SectionLetter } from "@/model/participants";

/**
 * Live-broadcast helper for a saved timer configuration, decoupled from the
 * transport that triggered the write. The HTTP route calls this after
 * persisting a "configured but not started" timer state; it emits `timer:sync`
 * to the section's timer room so the setup UI reflects the saved config.
 *
 * Socket handlers pass their own `io`; the HTTP route omits it and the running
 * server is resolved via `getIO()`. No-ops when no server is available (e.g. in
 * a unit test).
 */
export function broadcastTimerConfigSaved(
  gameId: string,
  section: SectionLetter,
  timerState: TimerState,
  io: Server | null = getIO(),
): void {
  if (!io) return;
  makeTimerBroadcaster(io)(gameId, section, timerState);
}
