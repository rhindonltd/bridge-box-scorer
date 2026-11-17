"use client";

import { UploadBridgewebsPage } from "@/app/game/[gameId]/export/upload-bridgewebs/UploadBridgewebsPage";
import { useParams } from "next/navigation";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { DirectorGuard } from "@/app/game/[gameId]/manage/DirectorGuard";
import { FinalisedGuard } from "@/app/game/[gameId]/export/FinalisedGuard";

export default function UploadBridgewebsRoute() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  // Pop back to the export page (see the PBN route for why not replace).
  const { onBack } = useBackNavigation(`/game/${gameId}/export`);
  // Uploads are director-only (also enforced by the API) and need a finalised game.
  return (
    <DirectorGuard gameId={gameId}>
      <FinalisedGuard gameId={gameId}>
        <UploadBridgewebsPage onCancel={onBack} />
      </FinalisedGuard>
    </DirectorGuard>
  );
}
