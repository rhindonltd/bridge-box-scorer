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

/**
 * Tell a section's timer room that its timer has been cleared, so any connected
 * client drops its stale state. The payload carries `section` so a client on a
 * shared socket can ignore clears for other sections.
 */
export function broadcastTimerCleared(
  io: Server,
  gameId: string,
  section: SectionLetter,
) {
  io.to(Rooms.timer(gameId, section)).emit(SocketEvents.TIMER_CLEARED, {
    section,
  });
}
