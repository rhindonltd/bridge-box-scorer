"use client";

import TimerPage from "@/components/pages/timer/TimerPage";
import { useGame } from "@/context/GameContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DisplayTimerRoute() {
  const { game, isLoading } = useGame();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !game) {
      router.replace("/display");
    }
  }, [game, isLoading, router]);

  if (!game) {
    return null;
  }

  return <TimerPage />;
}
