"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "play" | "move" | "finished";

type Config = {
  totalRounds: number;
  playDuration: number;
  moveDuration: number;
};

export function useBridgeSessionTimer({
  totalRounds,
  playDuration,
  moveDuration,
}: Config) {
  const [phase, setPhase] = useState<Phase>("play");
  const [round, setRound] = useState(1);
  const [remaining, setRemaining] = useState(playDuration);
  const [isRunning, setIsRunning] = useState(false);

  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const phaseRef = useRef<Phase>("play");
  const transitionLockRef = useRef(false);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  /* ---------------- KEEP PHASE IN SYNC ---------------- */

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /* ---------------- TICK ---------------- */

  const tick = useCallback(() => {
    if (!endTimeRef.current) return;

    const diff = Math.ceil((endTimeRef.current - Date.now()) / 1000);
    const safeRemaining = Math.max(diff, 0);

    setRemaining(safeRemaining);

    if (safeRemaining > 0) return;
    if (transitionLockRef.current) return;

    transitionLockRef.current = true;

    clearTimer();

    // 🔥 IMPORTANT: DO NOT call startPlay/startMove here

    setTimeout(() => {
      const currentPhase = phaseRef.current;

      if (currentPhase === "play") {
        if (round >= totalRounds) {
          setPhase("finished");
          setIsRunning(false);
          return;
        }

        setPhase("move");
        transitionLockRef.current = false;

        endTimeRef.current = Date.now() + moveDuration * 1000;
        setRemaining(moveDuration);

        intervalRef.current = setInterval(tick, 250);
        return;
      }

      if (currentPhase === "move") {
        const nextRound = round + 1;

        setRound(nextRound);
        setPhase("play");

        transitionLockRef.current = false;

        endTimeRef.current = Date.now() + playDuration * 1000;
        setRemaining(playDuration);

        intervalRef.current = setInterval(tick, 250);
      }
    }, 0);
  }, [round, totalRounds, playDuration, moveDuration]);

  /* ---------------- START ---------------- */

  const start = useCallback(() => {
    clearTimer();

    transitionLockRef.current = false;

    endTimeRef.current = Date.now() + playDuration * 1000;
    setRemaining(playDuration);

    setPhase("play");
    setIsRunning(true);

    intervalRef.current = setInterval(tick, 250);
  }, [tick, playDuration]);

  /* ---------------- PAUSE ---------------- */

  const pause = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, []);

  /* ---------------- RESET ---------------- */

  const reset = useCallback(() => {
    clearTimer();

    setRound(1);
    setPhase("play");

    setRemaining(playDuration);
    endTimeRef.current = null;

    setIsRunning(false);
    transitionLockRef.current = false;
  }, [playDuration]);

  /* ---------------- CLEANUP ---------------- */

  useEffect(() => {
    return () => clearTimer();
  }, []);

  return {
    phase,
    round,
    remaining,
    isRunning,
    start,
    pause,
    reset,
  };
}
