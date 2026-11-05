"use client";

import { useParams } from "next/navigation";
import { PairsRoster } from "@/app/game/[gameId]/manage/pairs/PairsRoster";
import { StartedGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function PairsRoute() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  return (
    <StartedGuard gameId={gameId}>
      <PairsRoster gameId={gameId} />
    </StartedGuard>
  );
}
