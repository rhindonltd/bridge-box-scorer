"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

type TimerControls = {
  start: () => void;
  pause: () => void;
  reset: () => void;
  nextPhase: () => void;
  skipRound: () => void;
};

export function useTimerControls(gameId: string): TimerControls {
  const socketRef = useRef<Socket | null>(null);

  /* ---------------- SOCKET INIT ---------------- */

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.emit("game:join", { gameId });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [gameId]);

  function emit(event: string, payload?: any) {
    socketRef.current?.emit(event, {
      gameId,
      ...payload,
    });
  }

  /* ---------------- CONTROLS ---------------- */

  function start() {
    emit("timer:start");
  }

  function pause() {
    emit("timer:pause");
  }

  function reset() {
    emit("timer:reset");
  }

  function nextPhase() {
    emit("timer:next-phase");
  }

  function skipRound() {
    emit("timer:skip-round");
  }

  return {
    start,
    pause,
    reset,
    nextPhase,
    skipRound,
  };
}
