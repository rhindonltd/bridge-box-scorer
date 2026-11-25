"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  isDirectorFor,
  verifyDirectorTokenWithServer,
} from "@/lib/director-token";
import { ClaimDirectorCode } from "@/app/manage/ClaimDirectorCode";
import ManageSelectGamePage from "@/app/manage/ManageSelectGamePage";

export function ManageSelectGameFlow() {
  const router = useRouter();
  const [claimingGame, setClaimingGame] = useState<{
    gameId: string;
    name: string;
  } | null>(null);

  async function onGameSelected(gameId: string, gameName?: string) {
    // If already a director for this game, go straight to manage. A stored
    // token is only a hint: the server must still accept it. An out-of-date one
    // is cleared by the check, and the device is offered Become Director.
    if (
      isDirectorFor(gameId) &&
      (await verifyDirectorTokenWithServer(gameId))
    ) {
      router.push(`/game/${gameId}/manage`);
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
        onSuccess={() => router.push(`/game/${claimingGame.gameId}/manage`)}
        onCancel={() => setClaimingGame(null)}
      />
    );
  }

  return <ManageSelectGamePage onGameSelected={onGameSelected} />;
}
