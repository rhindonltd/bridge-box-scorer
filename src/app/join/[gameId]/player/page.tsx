"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { SelectSeatPage } from "@/components/pages/join/SelectSeatPage";

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

  return (
    <SelectSeatPage
      onSeatSelected={(seat) => router.replace(`/play/${game.gameId}/${seat}`)}
    />
  );
}
