import { Server } from "socket.io";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { TimerState } from "@/timer/timer-state";
import { SectionLetter } from "@/model/participants";
import { validateStateBreaks } from "@/timer/breaks";

/**
 * Build the `timer:sync` payload for a section's timer state: the full state
 * plus `section` (so clients can ignore syncs for other sections), `serverNow`
 * (for client clock-offset correction), and `breakProblems` (invalid
 * resume-time breaks the director must resolve). Computing break problems at
 * emit time keeps the transient validation out of the persisted state while
 * still surfacing it live to every client.
 */
export function buildTimerSyncPayload(
  section: SectionLetter,
  timerState: TimerState,
) {
  const now = Date.now();
  return {
    ...timerState,
    section,
    serverNow: now,
    breakProblems: validateStateBreaks(timerState, now),
  };
}

/**
 * Broadcast a section's full timer state to that section's timer room.
 */
export function makeTimerBroadcaster(io: Server) {
  return function broadcast(
    gameId: string,
    section: SectionLetter,
    timerState: TimerState,
  ) {
    io.to(Rooms.timer(gameId, section)).emit(
      SocketEvents.TIMER_SYNC,
      buildTimerSyncPayload(section, timerState),
    );
  };
}
