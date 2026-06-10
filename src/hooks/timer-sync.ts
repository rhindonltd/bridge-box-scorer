"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { TimerState } from "@/timer/timer-state";

type SyncPayload = TimerState & {
  serverNow: number;
};

export function useTimerSync(gameId: string) {
  const socketRef = useRef<Socket | null>(null);

  const [timerState, setTimerState] = useState<TimerState | null>(null);

  /**
   * Zero-jitter clock offset
   */
  const offsetRef = useRef(0);

  function now() {
    return Date.now() + offsetRef.current;
  }

  /* ---------------- SOCKET ---------------- */

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.emit("game:join", { gameId });

    socket.on("timer:sync", (payload: SyncPayload) => {
      const { serverNow, ...state } = payload;

      setTimerState(state);

      // 🔥 zero-jitter alignment
      offsetRef.current = serverNow - Date.now();
    });

    return () => {
      socket.disconnect();
    };
  }, [gameId]);

  return {
    timerState,
    now,
    isConnected: !!timerState,
  };
}
