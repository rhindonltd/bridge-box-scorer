"use client";

import { UploadBridgewebsPage } from "@/app/game/[gameId]/manage/upload-bridgewebs/UploadBridgewebsPage";
import { useParams } from "next/navigation";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { ResultsCompleteGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function UploadBridgewebsRoute() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  // Pop back to the export options (see the PBN route for why not replace).
  const { onBack } = useBackNavigation(`/game/${gameId}/manage/export/options`);

  return (
    <ResultsCompleteGuard gameId={gameId}>
      <UploadBridgewebsPage onCancel={onBack} />
    </ResultsCompleteGuard>
  );
}
