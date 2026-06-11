"use client";

import { useEffect, useRef, useState } from "react";
import { TimerState } from "@/timer/timer-state";
import { getSocket } from "@/lib/socket";

type SyncPayload = TimerState & {
  serverNow: number;
};

export function useTimerSync() {
  const [timerState, setTimerState] = useState<TimerState | null>(null);

  const offsetRef = useRef(0);

  function now() {
    return Date.now() + offsetRef.current;
  }

  useEffect(() => {
    getSocket().on("timer:sync", (payload: SyncPayload) => {
      const { serverNow, ...state } = payload;

      setTimerState(state);

      offsetRef.current = serverNow - Date.now();
    });
  }, []);

  return {
    timerState,
    now,
    isConnected: !!timerState,
  };
}
