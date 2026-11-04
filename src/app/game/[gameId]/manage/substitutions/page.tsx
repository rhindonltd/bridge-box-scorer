"use client";

import { useParams } from "next/navigation";
import { Substitutions } from "@/app/game/[gameId]/manage/substitutions/Substitutions";
import { StartedGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function SubstitutionsRoute() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  return (
    <StartedGuard gameId={gameId}>
      <Substitutions gameId={gameId} />
    </StartedGuard>
  );
}
