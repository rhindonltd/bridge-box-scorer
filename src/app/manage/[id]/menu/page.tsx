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
      onCorrectResultClick={() => router.push(`/manage/${id}/correct-result`)}
      onChangeStatusClick={() => router.push(`/manage/${id}/change-status`)}
      onMovementClick={() => alert("Coming soon")}
      onViewRoundStatusClick={() => router.push(`/manage/${id}/round-status`)}
      onLockUnlockRoundClick={() => alert("Coming soon")}
      onExportResultsClick={() => alert("Coming soon")}
      onDeleteGameClick={() => alert("Coming soon")}
    />
  );
}
