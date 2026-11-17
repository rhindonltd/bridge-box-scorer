"use client";

import { useParams } from "next/navigation";
import { FinaliseGameScreen } from "@/app/game/[gameId]/manage/finalise/FinaliseGameScreen";
import { StartedGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function FinaliseGameRoute() {
  const params = useParams<{ gameId: string }>();
  return (
    <StartedGuard gameId={params.gameId}>
      <FinaliseGameScreen />
    </StartedGuard>
  );
}
