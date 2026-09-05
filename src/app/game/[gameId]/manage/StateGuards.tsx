"use client";

import { GameStateGuard } from "@/app/game/[gameId]/manage/GameStateGuard";
import { useGameStarted } from "@/hooks/game-started";
import { useResultsComplete } from "@/hooks/results-complete";

/**
 * Feature-specific guards that map live game state onto GameStateGuard. Each
 * one redirects back to the game's manage menu when its state does not apply.
 */

const manageHref = (gameId: string) => `/game/${gameId}/manage`;

/** Only allow the page once the game has started (boards materialized). */
export function StartedGuard({
  gameId,
  children,
}: {
  gameId: string;
  children: React.ReactNode;
}) {
  const { started, isLoading } = useGameStarted(gameId);

  return (
    <GameStateGuard
      allowed={started}
      loading={isLoading}
      redirectTo={manageHref(gameId)}
    >
      {children}
    </GameStateGuard>
  );
}

/** Only allow the page before the game has started. */
export function NotStartedGuard({
  gameId,
  children,
}: {
  gameId: string;
  children: React.ReactNode;
}) {
  const { started, isLoading } = useGameStarted(gameId);

  return (
    <GameStateGuard
      allowed={!started}
      loading={isLoading}
      redirectTo={manageHref(gameId)}
    >
      {children}
    </GameStateGuard>
  );
}

/** Only allow the page once every playable board has a final result. */
export function ResultsCompleteGuard({
  gameId,
  children,
}: {
  gameId: string;
  children: React.ReactNode;
}) {
  const { allResultsIn, isLoading } = useResultsComplete(gameId);

  return (
    <GameStateGuard
      allowed={allResultsIn}
      loading={isLoading}
      redirectTo={manageHref(gameId)}
    >
      {children}
    </GameStateGuard>
  );
}
