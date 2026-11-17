"use client";

import { GameStateGuard } from "@/app/game/[gameId]/manage/GameStateGuard";
import { useGameStarted } from "@/hooks/game-started";
import { useRequiredGame } from "@/context/GameContext";

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

/**
 * Only allow the page before the game has started. Redirects to the manage menu
 * by default; the setup flow passes `/` so that starting the game always lands
 * on the main menu (the Start Game screen navigates there, and this guard would
 * otherwise race it to the manage menu when GAME_UPDATED arrives first).
 */
export function NotStartedGuard({
  gameId,
  redirectTo,
  children,
}: {
  gameId: string;
  redirectTo?: string;
  children: React.ReactNode;
}) {
  const { started, isLoading } = useGameStarted(gameId);

  return (
    <GameStateGuard
      allowed={!started}
      loading={isLoading}
      redirectTo={redirectTo ?? manageHref(gameId)}
    >
      {children}
    </GameStateGuard>
  );
}

/**
 * Keeps a finalised game out of the manage screens. A finalised game is
 * read-only and lives under Export Game, so anyone who lands on a manage URL
 * (an old link, the back button) is sent to its export page.
 */
export function NotFinalisedGuard({
  gameId,
  children,
}: {
  gameId: string;
  children: React.ReactNode;
}) {
  const { game } = useRequiredGame();
  return (
    <GameStateGuard
      allowed={!game.finalisedAt}
      loading={false}
      redirectTo={`/game/${gameId}/export`}
    >
      {children}
    </GameStateGuard>
  );
}
