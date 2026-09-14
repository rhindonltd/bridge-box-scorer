"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  ReactNode,
} from "react";
import { TimerState } from "@/timer/timer-state";
import { BreakProblem } from "@/timer/breaks";
import { SocketEvents } from "@/socket/socket-events";
import { useRequiredGame } from "@/context/GameContext";
import { useFeatureSnapshot } from "@/hooks/use-feature-snapshot";

type TimerSyncPayload = TimerState & {
  section: string;
  serverNow: number;
  breakProblems?: BreakProblem[];
};

interface TimerContextType {
  timerState: TimerState | null;
  breakProblems: BreakProblem[];
  /** Server-clock-corrected current time (ms). */
  now: () => number;
  isConnected: boolean;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

/**
 * Feature-scoped provider for the bridge session timer. On mount (and on socket
 * reconnect) it requests the current timer snapshot via the acknowledged
 * `timer:requestState` event, seeding its state without waiting for the next
 * broadcast, then applies live `timer:sync` events on top. This keeps `game:join`
 * dumb: initial timer state is a timer concern, not a room-join concern.
 */
export function TimerProvider({
  section,
  children,
}: {
  /** The section whose timer this provider tracks. */
  section: string;
  children: ReactNode;
}) {
  const { game } = useRequiredGame();
  const gameId = game.gameId;

  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [breakProblems, setBreakProblems] = useState<BreakProblem[]>([]);

  const offsetRef = useRef(0);

  function now() {
    return Date.now() + offsetRef.current;
  }

  // The section's timer was cleared server-side (e.g. its movement changed,
  // invalidating the derived round structure). Drop our state so the config
  // view falls back to defaults / the empty state.
  const handleCleared = (payload: { section: string }) => {
    if (payload.section !== section) return;
    setTimerState(null);
    setBreakProblems([]);
  };

  useFeatureSnapshot<TimerSyncPayload, TimerSyncPayload>({
    requestEvent: SocketEvents.REQUEST_STATE_TIMER,
    syncEvent: SocketEvents.TIMER_SYNC,
    leaveEvent: SocketEvents.LEAVE_TIMER,
    params: { gameId, section },
    apply: (payload) => {
      if (!payload) return;
      // Defensive: ignore syncs for a different section (the room already
      // scopes delivery, but a shared socket could receive multiple sections).
      if (payload.section !== section) return;
      const { serverNow, breakProblems: problems, section: _s, ...state } =
        payload;
      setTimerState(state);
      setBreakProblems(problems ?? []);
      offsetRef.current = serverNow - Date.now();
    },
    extraListeners: [[SocketEvents.TIMER_CLEARED, handleCleared]],
    deps: [gameId, section],
  });

  return (
    <TimerContext.Provider
      value={{ timerState, breakProblems, now, isConnected: !!timerState }}
    >
      {children}
    </TimerContext.Provider>
  );
}

/**
 * Consume the timer context. Returns the same shape the former `useTimerSync`
 * hook returned so existing consumers change only their import.
 */
export function useTimerContext(): TimerContextType {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    throw new Error("useTimerContext must be used within a TimerProvider");
  }
  return ctx;
}
