"use client";

import { UploadEbuPage } from "@/app/game/[gameId]/manage/upload-ebu/UploadEbuPage";
import { useParams } from "next/navigation";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { ResultsCompleteGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function UploadEbuRoute() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  // Pop back to the export options (see the PBN route for why not replace).
  const { onBack } = useBackNavigation(`/game/${gameId}/manage/export/options`);

  return (
    <ResultsCompleteGuard gameId={gameId}>
      <UploadEbuPage onCancel={onBack} />
    </ResultsCompleteGuard>
  );
}
