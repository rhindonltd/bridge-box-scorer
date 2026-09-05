"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { TimerState } from "@/timer/timer-state";
import { BreakProblem } from "@/timer/breaks";
import { getSocket, emitWithAck } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { useRequiredGame } from "@/context/GameContext";

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

  useEffect(() => {
    const socket = getSocket();
    let cancelled = false;

    function apply(payload: TimerSyncPayload | null) {
      if (cancelled || !payload) return;
      // Defensive: ignore syncs for a different section (the room already
      // scopes delivery, but a shared socket could receive multiple sections).
      if (payload.section !== section) return;
      const { serverNow, breakProblems: problems, section: _s, ...state } =
        payload;
      setTimerState(state);
      setBreakProblems(problems ?? []);
      offsetRef.current = serverNow - Date.now();
    }

    async function requestSnapshot() {
      try {
        const snapshot = await emitWithAck<TimerSyncPayload | null>(
          SocketEvents.REQUEST_STATE_TIMER,
          { gameId, section },
        );
        apply(snapshot);
      } catch {
        // No snapshot available yet; the display stays in its connecting/empty
        // state until the first live event arrives.
      }
    }

    // Live updates.
    const handleSync = (payload: TimerSyncPayload) => apply(payload);
    socket.on(SocketEvents.TIMER_SYNC, handleSync);

    // Initial load, and re-load on reconnect (recovers state missed while
    // disconnected).
    const handleReconnect = () => {
      void requestSnapshot();
    };
    socket.on(SocketEvents.CONNECT, handleReconnect);

    void requestSnapshot();

    return () => {
      cancelled = true;
      socket.off(SocketEvents.TIMER_SYNC, handleSync);
      socket.off(SocketEvents.CONNECT, handleReconnect);
      // Leave this section's timer room so we stop receiving its updates.
      socket.emit(SocketEvents.LEAVE_TIMER, { gameId, section });
    };
  }, [gameId, section]);

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
