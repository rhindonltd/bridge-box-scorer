"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isDirectorFor } from "@/lib/director-token";
import { ClaimDirectorCode } from "@/app/manage/ClaimDirectorCode";
import CreateSelectGamePage from "@/app/create/CreateSelectGamePage";

/**
 * "Create Game" flow: pick a not-started game to carry on setting it up. A
 * device that is already the game's director goes straight to its setup
 * screens; any other device must first claim a director share code, as on
 * Manage Game.
 */
export function CreateSelectGameFlow() {
  const router = useRouter();
  const [claimingGame, setClaimingGame] = useState<{
    gameId: string;
    name: string;
  } | null>(null);

  const setupHref = (gameId: string) => `/game/${gameId}/create`;

  function onGameSelected(gameId: string, gameName?: string) {
    if (isDirectorFor(gameId)) {
      router.push(setupHref(gameId));
      return;
    }
    setClaimingGame({ gameId, name: gameName ?? "this game" });
  }

  if (claimingGame) {
    return (
      <ClaimDirectorCode
        gameId={claimingGame.gameId}
        gameName={claimingGame.name}
        onSuccess={() => router.push(setupHref(claimingGame.gameId))}
        onCancel={() => setClaimingGame(null)}
      />
    );
  }

  return <CreateSelectGamePage onGameSelected={onGameSelected} />;
}
