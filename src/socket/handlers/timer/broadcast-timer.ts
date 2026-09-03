import { Server } from "socket.io";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { TimerState } from "@/timer/timer-state";
import { validateStateBreaks } from "@/timer/breaks";

/**
 * Broadcast the full timer state to a game's room, including `serverNow` (for
 * client clock-offset correction) and any `breakProblems` (invalid resume-time
 * breaks the director must resolve). Computing break problems at broadcast time
 * keeps the transient validation out of the persisted state while still
 * surfacing it live to every client.
 */
export function makeTimerBroadcaster(io: Server) {
  return function broadcast(gameId: string, timerState: TimerState) {
    const now = Date.now();
    io.to(Rooms.game(gameId)).emit(SocketEvents.TIMER_SYNC, {
      ...timerState,
      serverNow: now,
      breakProblems: validateStateBreaks(timerState, now),
    });
  };
}
