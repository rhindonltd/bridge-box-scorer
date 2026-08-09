"use client";

import { ManageGameMenuPage } from "@/components/pages/manage/ManageGameMenuPage";
import { useRouter, useParams } from "next/navigation";

export default function ManageGameMenuRoute() {
  const router = useRouter();
  const params = useParams<{ gameId: string }>();
  const id = params.gameId;

  return (
    <ManageGameMenuPage
      onTimerClick={() => router.push(`/manage/${id}/timer`)}
      onTravellersClick={() => router.push(`/manage/${id}/correct-result`)}
      onChangeStatusClick={() => router.push(`/manage/${id}/change-status`)}
      onMovementClick={() => router.push(`/manage/${id}/movement`)}
      onDownloadUsebioClick={() => router.push(`/manage/${id}/download-usebio`)}
      onDeleteGameClick={() => router.push(`/manage/${id}/delete-game`)}
    />
  );
}
