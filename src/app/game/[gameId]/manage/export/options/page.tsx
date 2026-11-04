"use client";

import { useParams } from "next/navigation";
import { ExportMenu } from "@/app/game/[gameId]/manage/export/options/ExportMenu";
import { StartedGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function ExportOptionsRoute() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  return (
    <StartedGuard gameId={gameId}>
      <ExportMenu gameId={gameId} />
    </StartedGuard>
  );
}
