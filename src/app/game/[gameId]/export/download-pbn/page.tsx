"use client";

import { DownloadPbnPage } from "@/app/game/[gameId]/export/download-pbn/DownloadPbnPage";
import { useParams } from "next/navigation";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { FinalisedGuard } from "@/app/game/[gameId]/export/FinalisedGuard";

export default function DownloadPbnRoute() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  // Pop back to the export page rather than replacing this entry with a second
  // copy of it (which makes the browser back button loop).
  const { onBack } = useBackNavigation(`/game/${gameId}/export`);
  return (
    <FinalisedGuard gameId={gameId}>
      <DownloadPbnPage onPbnDownloaded={onBack} onCancel={onBack} />
    </FinalisedGuard>
  );
}
