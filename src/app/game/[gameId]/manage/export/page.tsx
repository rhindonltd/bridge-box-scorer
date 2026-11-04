"use client";

import { useParams } from "next/navigation";
import { ExportReadiness } from "@/app/game/[gameId]/manage/export/ExportReadiness";
import { StartedGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function ExportReadinessRoute() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  return (
    <StartedGuard gameId={gameId}>
      <ExportReadiness gameId={gameId} />
    </StartedGuard>
  );
}
