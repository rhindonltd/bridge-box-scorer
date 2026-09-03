"use client";

import { useEffect, useRef, useState } from "react";
import { TimerState } from "@/timer/timer-state";
import { BreakProblem } from "@/timer/breaks";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";

type SyncPayload = TimerState & {
  serverNow: number;
  breakProblems?: BreakProblem[];
};

export function useTimerSync() {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [breakProblems, setBreakProblems] = useState<BreakProblem[]>([]);

  const offsetRef = useRef(0);

  function now() {
    return Date.now() + offsetRef.current;
  }

  useEffect(() => {
    getSocket().on(SocketEvents.TIMER_SYNC, (payload: SyncPayload) => {
      const { serverNow, breakProblems: problems, ...state } = payload;

      setTimerState(state);
      setBreakProblems(problems ?? []);

      offsetRef.current = serverNow - Date.now();
    });
  }, []);

  return {
    timerState,
    breakProblems,
    now,
    isConnected: !!timerState,
  };
}
