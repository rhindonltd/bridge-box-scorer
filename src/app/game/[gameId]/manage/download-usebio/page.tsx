"use client";

import { DownloadUsebioPage } from "@/app/game/[gameId]/manage/download-usebio/DownloadUsebioPage";
import { useParams, useRouter } from "next/navigation";
import { ResultsCompleteGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function DownloadUsebioRoute() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params.gameId;

  return (
    <ResultsCompleteGuard gameId={gameId}>
      <DownloadUsebioPage
        onUsebioDownloaded={() => router.replace(`/game/${gameId}/manage`)}
        onCancel={() => router.replace(`/game/${gameId}/manage`)}
      />
    </ResultsCompleteGuard>
  );
}
