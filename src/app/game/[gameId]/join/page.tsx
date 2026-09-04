"use client";

import { useRouter } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { SelectSeatPage } from "@/app/game/[gameId]/join/SelectSeatPage";

export default function JoinGameAsPlayerRoute() {
  const { game } = useRequiredGame();
  const router = useRouter();

  return (
    <SelectSeatPage
      onSeatSelected={(seat) =>
        router.replace(`/game/${game.gameId}/play/${seat}`)
      }
    />
  );
}
