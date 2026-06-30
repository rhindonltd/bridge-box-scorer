"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import JoinAsPlayerPage from "@/components/pages/join/JoinAsPlayerPage";
import { useGame } from "@/context/GameContext";

export default function JoinAsPlayer() {
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

  return <JoinAsPlayerPage />;
}
