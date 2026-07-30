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
      onCorrectResultClick={() => alert("Coming soon")}
      onChangeStatusClick={() => alert("Coming soon")}
      onMovementClick={() => alert("Coming soon")}
      onViewRoundStatusClick={() => alert("Coming soon")}
      onLockUnlockRoundClick={() => alert("Coming soon")}
      onExportResultsClick={() => alert("Coming soon")}
      onDeleteGameClick={() => alert("Coming soon")}
    />
  );
}
