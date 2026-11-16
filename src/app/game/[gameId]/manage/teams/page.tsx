"use client";

import { useParams } from "next/navigation";
import { TeamsRoster } from "@/app/game/[gameId]/manage/teams/TeamsRoster";
import { StartedGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function TeamsRoute() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  return (
    <StartedGuard gameId={gameId}>
      <TeamsRoster gameId={gameId} />
    </StartedGuard>
  );
}
