"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import type { LeaderboardScoringMode } from "./DisplayLeaderboardView";

export interface LeaderboardModePageProps {
  /** Chosen how the standings should be shown, then opens the leaderboard. */
  onSelect: (mode: LeaderboardScoringMode) => void;
  /** Return to the display menu. */
  onBack: () => void;
}

/**
 * A small step shown before the room-display leaderboard for matchpoint (MP)
 * pairs games, where the standings can be shown either as a percentage or as
 * raw matchpoints. Making the choice here (rather than with an on-screen toggle
 * on the display itself) keeps the live board hands-free and lets the standings
 * scroll cleanly beneath a fixed heading. Non-MP games skip this step.
 */
export function LeaderboardModePage({
  onSelect,
  onBack,
}: LeaderboardModePageProps) {
  const buttonClass =
    "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

  return (
    <GamePageLayout
      headerTitle="Show standings as"
      backAction={onBack}
      centerContent={true}
    >
      <div className="flex flex-col gap-3 px-6 pb-8 pt-6 max-w-sm w-full mx-auto">
        <button
          onClick={() => onSelect("percentage")}
          className={buttonClass}
        >
          Percentage
        </button>

        <button
          onClick={() => onSelect("matchpoints")}
          className={buttonClass}
        >
          Matchpoints
        </button>
      </div>
    </GamePageLayout>
  );
}
