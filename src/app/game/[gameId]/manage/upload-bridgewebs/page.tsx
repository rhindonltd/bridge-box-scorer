"use client";

import { UploadBridgewebsPage } from "@/app/game/[gameId]/manage/upload-bridgewebs/UploadBridgewebsPage";
import { useParams, useRouter } from "next/navigation";
import { ResultsCompleteGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function UploadBridgewebsRoute() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params.gameId;

  return (
    <ResultsCompleteGuard gameId={gameId}>
      <UploadBridgewebsPage
        onCancel={() => router.replace(`/game/${gameId}/manage`)}
      />
    </ResultsCompleteGuard>
  );
}
