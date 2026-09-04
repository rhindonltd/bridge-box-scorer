"use client";

import { useState } from "react";
import { OverallScoreAndParticipant } from "@/model/leaderboard";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import {
  LeaderboardProvider,
  useLeaderboardContext,
} from "@/context/LeaderboardContext";

type View = "combined" | string; // "combined" or a section letter

function DisplayLeaderboardContent() {
  const { leaderboard: combined, sections, isLoading } =
    useLeaderboardContext();

  const [view, setView] = useState<View>("combined");

  const multiSection = sections.length > 1;

  // Resolve the leaderboard for the active view.
  const active: OverallScoreAndParticipant | null =
    view === "combined"
      ? combined
      : (sections.find((s) => s.section === view) ?? combined);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <GamePageLayout headerTitle="Leaderboard" centerContent={true}>
      <div className="flex flex-col flex-1 min-h-0">
        {multiSection && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            <ViewTab
              label="Combined"
              active={view === "combined"}
              onClick={() => setView("combined")}
            />
            {sections.map((s) => (
              <ViewTab
                key={s.section}
                label={`Section ${s.section}`}
                active={view === s.section}
                onClick={() => setView(s.section)}
              />
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0">
          {active ? (
            <Leaderboard overallScoreAndParticipant={active} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <div className="text-xl font-bold text-gray-900 mb-2">
                No Results Yet
              </div>
              <div className="text-base text-gray-500 text-center">
                Results will appear here once boards have been played.
              </div>
            </div>
          )}
        </div>
      </div>
    </GamePageLayout>
  );
}

export function DisplayLeaderboardPage() {
  return (
    <LeaderboardProvider>
      <DisplayLeaderboardContent />
    </LeaderboardProvider>
  );
}

function ViewTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
