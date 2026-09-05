"use client";

import { ManageMovementPage } from "@/app/game/[gameId]/manage/movement/ManageMovementPage";
import { useParams } from "next/navigation";
import { StartedGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function ManageMovementRoute() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  return (
    <StartedGuard gameId={gameId}>
      <ManageMovementPage backHref={`/game/${gameId}/manage`} />
    </StartedGuard>
  );
}
