"use client";

import { DownloadPbnPage } from "@/app/game/[gameId]/manage/download-pbn/DownloadPbnPage";
import { useParams, useRouter } from "next/navigation";

export default function DownloadPbnRoute() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params.gameId;

  return (
    <DownloadPbnPage
      onPbnDownloaded={() => router.replace(`/game/${gameId}/manage`)}
      onCancel={() => router.replace(`/game/${gameId}/manage`)}
    />
  );
}
