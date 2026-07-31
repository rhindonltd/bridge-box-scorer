"use client";

import { useRouter, useParams } from "next/navigation";
import { DirectorMenuPage } from "@/components/pages/manage/DirectorMenuPage";

export default function ManageGameMenuRoute() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  return (
    <DirectorMenuPage
      onTimerClick={() => router.push(`/manage/${id}/timer`)}
      onTravellersClick={() => router.push(`/manage/${id}/correct-result`)}
      onChangeStatusClick={() => router.push(`/manage/${id}/change-status`)}
      onMovementClick={() => router.push(`/manage/${id}/movement`)}
      onDownloadUsebioClick={() => router.push(`/manage/${id}/download-usebio`)}
      onDeleteGameClick={() => router.push(`/manage/${id}/delete-game`)}
    />
  );
}
