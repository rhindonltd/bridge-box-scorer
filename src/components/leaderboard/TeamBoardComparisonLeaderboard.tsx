"use client";

import { useState } from "react";
import { Toggle } from "@/components/common/Toggle";
import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import {
  TeamBamOverallScore,
  TeamPabOverallScore,
} from "@/model/leaderboard";
import { AssignedTeam } from "@/model/participants";
import { buildTeamsBoardComparisonTable } from "@/scoring/swiss/teams-board-comparison-view";

type Props = {
  leaderboard: TeamBamOverallScore | TeamPabOverallScore;
  teams: AssignedTeam[];
  highlightAssignmentId?: string;
  /** Spread the standings across this many side-by-side columns (default 1). */
  splitColumns?: number;
};

/**
 * Board-comparison teams leaderboard (Board-a-Match or Point-a-Board). Mirrors
 * the matchpoint presentation: a toggle switches between the percentage view
 * (default "on") and the raw points fraction ("off"). The scale (BAM 1 point
 * per board, PAB 2) and the table layout (per-round for a barometer Swiss Teams
 * movement, cumulative for Round Robin) are chosen by
 * `buildTeamsBoardComparisonTable` from the score's `scoring` and `barometer`.
 */
export function TeamBoardComparisonLeaderboard({
  leaderboard,
  teams,
  highlightAssignmentId,
  splitColumns,
}: Props) {
  const [showPercentage, setShowPercentage] = useState(true);

  const table = buildTeamsBoardComparisonTable(
    leaderboard,
    teams,
    showPercentage ? "percentage" : "fraction",
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex justify-end">
        <Toggle
          value={showPercentage}
          offLabel="Points"
          onLabel="%"
          onChange={setShowPercentage}
        />
      </div>
      <ScoreTableView
        table={table}
        highlightAssignmentId={highlightAssignmentId}
        rowTestId="leaderboard-row"
        splitColumns={splitColumns}
      />
    </div>
  );
}
