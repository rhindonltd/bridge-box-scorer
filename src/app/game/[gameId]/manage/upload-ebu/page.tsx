"use client";

import { UploadEbuPage } from "@/app/game/[gameId]/manage/upload-ebu/UploadEbuPage";
import { useParams, useRouter } from "next/navigation";
import { ResultsCompleteGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function UploadEbuRoute() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params.gameId;

  return (
    <ResultsCompleteGuard gameId={gameId}>
      <UploadEbuPage
        onCancel={() => router.replace(`/game/${gameId}/manage`)}
      />
    </ResultsCompleteGuard>
  );
}
