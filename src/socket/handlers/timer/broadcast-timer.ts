import { Server } from "socket.io";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { TimerState } from "@/timer/timer-state";
import { validateStateBreaks } from "@/timer/breaks";

/**
 * Build the `timer:sync` payload for a timer state: the full state plus
 * `serverNow` (for client clock-offset correction) and `breakProblems` (invalid
 * resume-time breaks the director must resolve). Computing break problems at
 * emit time keeps the transient validation out of the persisted state while
 * still surfacing it live to every client.
 */
export function buildTimerSyncPayload(timerState: TimerState) {
  const now = Date.now();
  return {
    ...timerState,
    serverNow: now,
    breakProblems: validateStateBreaks(timerState, now),
  };
}

/**
 * Broadcast the full timer state to a game's room.
 */
export function makeTimerBroadcaster(io: Server) {
  return function broadcast(gameId: string, timerState: TimerState) {
    io.to(Rooms.game(gameId)).emit(
      SocketEvents.TIMER_SYNC,
      buildTimerSyncPayload(timerState),
    );
  };
}
