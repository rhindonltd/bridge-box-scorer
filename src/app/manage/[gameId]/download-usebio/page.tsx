"use client";

import { DownloadUsebioPage } from "@/components/pages/manage/DownloadUsebioPage";
import { useParams, useRouter } from "next/navigation";

export default function DownloadUsebioRoute() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params.gameId;

  return (
    <DownloadUsebioPage
      onUsebioDownloaded={() => router.replace(`/manage/${gameId}/menu`)}
      onCancel={() => router.replace(`/manage/${gameId}/menu`)}
    />
  );
}
