"use client";

import { ShareDirectorAccessPage } from "@/components/pages/manage/ShareDirectorAccessPage";
import { useParams, useRouter } from "next/navigation";

export default function ShareDirectorAccessRoute() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params.gameId;

  return (
    <ShareDirectorAccessPage
      gameId={gameId}
      onBack={() => router.replace(`/manage/${gameId}/menu`)}
    />
  );
}
