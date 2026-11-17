"use client";

import { GameStateGuard } from "@/app/game/[gameId]/manage/GameStateGuard";
import { useRequiredGame } from "@/context/GameContext";
import { useIsDirector } from "@/hooks/use-is-director";

/**
 * Only shows the export screens for a FINALISED game. Anyone else is sent away:
 * a director to the Finalise Game check (where they can finalise it), everyone
 * else to the main menu. The game row is live (GAME_UPDATED), so a game that is
 * reopened while someone is on an export screen bounces them out.
 */
export function FinalisedGuard({
  gameId,
  children,
}: {
  gameId: string;
  children: React.ReactNode;
}) {
  const { game } = useRequiredGame();
  const isDirector = useIsDirector(gameId);
  return (
    <GameStateGuard
      allowed={!!game.finalisedAt}
      loading={false}
      redirectTo={isDirector ? `/game/${gameId}/manage/finalise` : "/"}
    >
      {children}
    </GameStateGuard>
  );
}
