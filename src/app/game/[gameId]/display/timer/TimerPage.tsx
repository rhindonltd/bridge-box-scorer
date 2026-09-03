"use client";

import { useEffect, useState } from "react";
import { useTimerSync } from "@/hooks/timer-sync";
import { useTimerDerived } from "@/hooks/timer-derived";
import { DisplayTimerPage } from "@/app/game/[gameId]/display/timer/DisplayTimerPage";

/* ---------------- COMPONENT ---------------- */

export default function TimerPage() {
  const { timerState, now } = useTimerSync();

  const {
    remaining,
    phase,
    boardLabel,
    title,
    isRunning,
    projectedEndDate,
    warningSeconds,
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
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
        Connecting…
      </div>
    );
  }

  /* ---------------- RENDER ---------------- */

  return (
    <DisplayTimerPage
      title={title}
      boardLabel={boardLabel}
      remaining={remaining}
      phase={phase}
      isRunning={isRunning}
      projectedEndDate={projectedEndDate}
      warningSeconds={warningSeconds}
    />
  );
}
