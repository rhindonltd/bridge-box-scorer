"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  LeaderboardProvider,
  useLeaderboardContext,
} from "@/context/LeaderboardContext";
import { useRequiredGame } from "@/context/GameContext";
import {
  DisplayLeaderboardView,
  type LeaderboardScoringMode,
} from "./DisplayLeaderboardView";

/**
 * Parse the `?mode=` query param into a scoring mode. Falls back to
 * "percentage" (the long-standing default) when missing or unrecognised, so the
 * display always has a fixed view and never falls back to the in-screen toggle
 * — even when the page is reached directly without going through the chooser.
 */
function parseScoringMode(value: string | null): LeaderboardScoringMode {
  return value === "matchpoints" ? "matchpoints" : "percentage";
}

function DisplayLeaderboardContent() {
  const { game } = useRequiredGame();
  const { leaderboard, sections, isLoading } = useLeaderboardContext();

  // MP games carry the %/matchpoints choice made on the preceding chooser
  // screen as `?mode=`. Non-MP games have a single view and ignore it.
  const searchParams = useSearchParams();
  const scoringMode = parseScoringMode(searchParams.get("mode"));

  return (
    <DisplayLeaderboardView
      eventName={game.eventName}
      leaderboard={leaderboard}
      sections={sections}
      isLoading={isLoading}
      scoringMode={scoringMode}
    />
  );
}

export function DisplayLeaderboardPage() {
  return (
    <LeaderboardProvider>
      {/* useSearchParams (in the content) requires a Suspense boundary under
          the App Router. */}
      <Suspense>
        <DisplayLeaderboardContent />
      </Suspense>
    </LeaderboardProvider>
  );
}
