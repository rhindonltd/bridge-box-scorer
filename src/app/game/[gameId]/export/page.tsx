"use client";

import { useParams } from "next/navigation";
import { ExportGame } from "@/app/game/[gameId]/export/ExportGame";
import { FinalisedGuard } from "@/app/game/[gameId]/export/FinalisedGuard";

export default function ExportGameRoute() {
  const params = useParams<{ gameId: string }>();
  return (
    <FinalisedGuard gameId={params.gameId}>
      <ExportGame gameId={params.gameId} />
    </FinalisedGuard>
  );
}
