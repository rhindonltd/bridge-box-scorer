"use client";

import type { ReactNode } from "react";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { PageLayout } from "@/components/layout/PageLayout";

export interface SetupMenuPageProps {
  /** Header right-hand content: the hamburger with the less common actions. */
  headerRight?: ReactNode;
  /** Open Game Details (the create-form options, prefilled). */
  onGameDetailsClick: () => void;
  onTablesClick?: () => void;
  onMovementClick?: () => void;
  onTimerClick?: () => void;
  onStartGameClick?: () => void;
  onDeleteGameClick?: () => void;
  /**
   * A game not created yet (the other handlers may then be omitted): only Game Details is available. The rest unlock
   * once its details are saved and the game exists.
   */
  draft?: boolean;
}

const standardButtonClass =
  "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 pl-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:bg-gray-200";

const deleteButtonClass =
  "w-full py-3.5 text-lg font-semibold bg-red-100 text-red-700 rounded-xl hover:bg-red-200 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 pl-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:bg-red-100";

/**
 * The menu a director lands on after creating a game, or after picking a game
 * that is still being set up. Each button opens the same page as the matching
 * entry in the setup screens' hamburger menu. Presentational only: the wiring
 * is in {@link SetupGamePage}.
 */
export function SetupMenuPage({
  headerRight,
  onGameDetailsClick,
  onTablesClick,
  onMovementClick,
  onTimerClick,
  onStartGameClick,
  onDeleteGameClick,
  draft = false,
}: SetupMenuPageProps) {
  const buttons = (
    <div className="flex flex-col gap-3 px-6 pb-8 pt-6 max-w-sm w-full mx-auto">
      <button onClick={onGameDetailsClick} className={standardButtonClass}>
        Game Details
      </button>
      <button
        onClick={onTablesClick}
        disabled={draft}
        className={standardButtonClass}
      >
        Tables
      </button>
      <button
        onClick={onMovementClick}
        disabled={draft}
        className={standardButtonClass}
      >
        Movement
      </button>
      <button
        onClick={onTimerClick}
        disabled={draft}
        className={standardButtonClass}
      >
        Timer
      </button>
      <button
        onClick={onStartGameClick}
        disabled={draft}
        className={standardButtonClass}
      >
        Start Game
      </button>

      <div className="mt-6">
        <button
          onClick={onDeleteGameClick}
          disabled={draft}
          className={deleteButtonClass}
        >
          Delete Game
        </button>
      </div>
    </div>
  );

  // A draft has no game yet, so the game-aware layout (which shows the event
  // name) can't be used.
  const Layout = draft ? PageLayout : GamePageLayout;
  return (
    <Layout
      headerTitle="Set Up Game"
      // Back to the list of games still being set up.
      backHref="/create"
      centerContent={true}
      headerRight={headerRight}
    >
      {buttons}
    </Layout>
  );
}
