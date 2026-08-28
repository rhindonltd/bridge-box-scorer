"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isDirectorFor } from "@/lib/director-token";
import { ClaimDirectorCode } from "@/app/manage/ClaimDirectorCode";
import ManageSelectGamePage from "@/app/manage/ManageSelectGamePage";

export default function ManageSelectGame() {
  const router = useRouter();
  const [claimingGame, setClaimingGame] = useState<{
    gameId: string;
    name: string;
  } | null>(null);

  function onGameSelected(gameId: string, gameName?: string) {
    // If already a director for this game, go straight to manage
    if (isDirectorFor(gameId)) {
      router.push(`/manage/${gameId}/menu`);
      return;
    }

    // Otherwise, show the claim code screen
    setClaimingGame({ gameId, name: gameName ?? "this game" });
  }

  if (claimingGame) {
    return (
      <ClaimDirectorCode
        gameId={claimingGame.gameId}
        gameName={claimingGame.name}
        onSuccess={() => router.push(`/manage/${claimingGame.gameId}/menu`)}
        onCancel={() => setClaimingGame(null)}
      />
    );
  }

  return <ManageSelectGamePage onGameSelected={onGameSelected} />;
}
