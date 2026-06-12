"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/context/GameContext";
import { useTimerSync } from "@/hooks/timer-sync";
import { useTimerDerived } from "@/hooks/timer-derived";

/* ---------------- UI ---------------- */

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/* ---------------- COMPONENT ---------------- */

export default function TimerPage() {
  const { gameSelection } = useGame();

  if (!gameSelection) {
    return null;
  }

  const { timerState, now } = useTimerSync();

  const {
    remaining,
    phase,
    round,
    boardLabel,
    title,
    isRunning,
    projectedEndDate,
  } = useTimerDerived(timerState, now());

  /* ---------------- LOCAL TICK (render only) ---------------- */

  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /* ---------------- LOADING ---------------- */

  if (!timerState) {
    return (
      <div className="h-screen w-screen bg-black text-white flex items-center justify-center">
        Connecting…
      </div>
    );
  }

  /* ---------------- RENDER ---------------- */

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center">
      {/* HEADER */}
      <div className="absolute top-10 text-center w-full">
        <div className="text-6xl font-bold">{title}</div>

        {boardLabel && (
          <div className="text-3xl mt-4 opacity-80">{boardLabel}</div>
        )}
      </div>

      {/* TIMER */}
      <div className="text-[30vw] font-bold tabular-nums">
        {phase === "finished" ? "00:00" : formatTime(remaining)}
      </div>

      {/* PAUSED */}
      {!isRunning && phase !== "finished" && (
        <div className="mt-8 text-yellow-400 text-3xl">PAUSED</div>
      )}

      <div className="text-white/70 text-sm mt-4">
        Projected end:{" "}
        {projectedEndDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  );
}
