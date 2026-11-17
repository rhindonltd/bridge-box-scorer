"use client";

import { DownloadUsebioPage } from "@/app/game/[gameId]/export/download-usebio/DownloadUsebioPage";
import { useParams } from "next/navigation";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { FinalisedGuard } from "@/app/game/[gameId]/export/FinalisedGuard";

export default function DownloadUsebioRoute() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  // Pop back to the export page (see the PBN route for why not replace).
  const { onBack } = useBackNavigation(`/game/${gameId}/export`);
  return (
    <FinalisedGuard gameId={gameId}>
      <DownloadUsebioPage onUsebioDownloaded={onBack} onCancel={onBack} />
    </FinalisedGuard>
  );
}
