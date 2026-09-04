"use client";

import { ShareDirectorAccessPage } from "@/app/game/[gameId]/manage/share-access/ShareDirectorAccessPage";
import { useParams, useRouter } from "next/navigation";

export default function ShareDirectorAccessRoute() {
  const params = useParams<{ gameId: string }>();
  const router = useRouter();
  const gameId = params.gameId;

  return (
    <ShareDirectorAccessPage
      gameId={gameId}
      onBack={() => router.replace(`/game/${gameId}/manage`)}
    />
  );
}
