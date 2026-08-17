"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { SelectSeatPage } from "@/app/join/[gameId]/player/SelectSeatPage";

export default function JoinGameAsPlayerRoute() {
  const { game, isLoading } = useGame();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !game) {
      router.replace("/join/select-game");
    }
  }, [game, isLoading, router]);

  if (!game) {
    return null;
  }

  return (
    <SelectSeatPage
      onSeatSelected={(seat) => router.replace(`/play/${game.gameId}/${seat}`)}
    />
  );
}
