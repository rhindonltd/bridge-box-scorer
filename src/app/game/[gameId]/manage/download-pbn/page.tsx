"use client";

import { DownloadPbnPage } from "@/app/game/[gameId]/manage/download-pbn/DownloadPbnPage";
import { useParams } from "next/navigation";
import { useBackNavigation } from "@/hooks/useBackNavigation";

export default function DownloadPbnRoute() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  // Pop back to the export options rather than replacing this entry with a
  // second copy of them (which makes the browser back button loop).
  const { onBack } = useBackNavigation(`/game/${gameId}/manage/export/options`);

  return <DownloadPbnPage onPbnDownloaded={onBack} onCancel={onBack} />;
}
