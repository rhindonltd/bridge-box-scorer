"use client";

import type { ReactNode } from "react";

import { GamePageLayout } from "@/components/layout/GamePageLayout";

export interface SetupMenuPageProps {
  /** Header right-hand content: the hamburger with the less common actions. */
  headerRight?: ReactNode;
  /** Open Game Details (the create-form options, prefilled). */
  onGameDetailsClick: () => void;
  onTablesClick: () => void;
  onMovementClick: () => void;
  onTimerClick: () => void;
  onStartGameClick: () => void;
  onDeleteGameClick: () => void;
}

const standardButtonClass =
  "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 pl-4";

const deleteButtonClass =
  "w-full py-3.5 text-lg font-semibold bg-red-100 text-red-700 rounded-xl hover:bg-red-200 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 pl-4";

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
}: SetupMenuPageProps) {
  return (
    <GamePageLayout
      headerTitle="Set Up Game"
      // Back to the list of games still being set up.
      backHref="/create"
      centerContent={true}
      headerRight={headerRight}
    >
      <div className="flex flex-col gap-3 px-6 pb-8 pt-6 max-w-sm w-full mx-auto">
        <button onClick={onGameDetailsClick} className={standardButtonClass}>
          Game Details
        </button>
        <button onClick={onTablesClick} className={standardButtonClass}>
          Tables
        </button>
        <button onClick={onMovementClick} className={standardButtonClass}>
          Movement
        </button>
        <button onClick={onTimerClick} className={standardButtonClass}>
          Timer
        </button>
        <button onClick={onStartGameClick} className={standardButtonClass}>
          Start Game
        </button>

        <div className="mt-6">
          <button onClick={onDeleteGameClick} className={deleteButtonClass}>
            Delete Game
          </button>
        </div>
      </div>
    </GamePageLayout>
  );
}
