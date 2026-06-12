"use client";

import SelectGameGate from "@/components/gate/SelectGameGate";
import TimerPage from "@/components/pages/timer/TimerPage";
import { useGame } from "@/context/GameContext";

export default function TimerRoute() {
  const { gameSelection } = useGame();

  if (!gameSelection) {
    return <SelectGameGate nextRoute="/join/timer" />;
  }

  return <TimerPage />;
}
