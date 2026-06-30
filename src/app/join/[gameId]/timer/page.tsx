"use client";

import TimerPage from "@/components/pages/timer/TimerPage";
import { useGame } from "@/context/GameContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TimerRoute() {
  const { game } = useGame();
  const router = useRouter();

  useEffect(() => {
    if (!game) {
      router.replace("/join/select-game");
    }
  }, [game, router]);

  if (!game) {
    return null;
  }

  return <TimerPage />;
}
