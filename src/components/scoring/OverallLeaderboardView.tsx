"use client";

import { useState } from "react";
import { Toggle } from "@/components/common/Toggle";
import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import { OverallScoringPlugin } from "@/scoring/plugins/types";
import { AssignedPair } from "@/model/participants";

type Props = {
  plugin: OverallScoringPlugin<unknown, unknown>;
  lines: unknown;
  participants: AssignedPair[];
  highlightAssignmentId?: string;
};

/**
 * Renders an overall (leaderboard) scoring result using a scoring plugin's
 * views. Mirrors PerBoardTravellerView: a plugin with two views shows a Toggle
 * (view[0] = "on", view[1] = "off"); a single-view plugin renders directly.
 */
export function OverallLeaderboardView({
  plugin,
  lines,
  participants,
  highlightAssignmentId,
}: Props) {
  const views = plugin.views;
  const [showFirst, setShowFirst] = useState(true);

  if (views.length <= 1) {
    return (
      <ScoreTableView
        table={views[0].toTable(lines, participants, { highlightAssignmentId })}
        highlightAssignmentId={highlightAssignmentId}
      />
    );
  }

  const activeView = showFirst ? views[0] : views[1];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex justify-end">
        <Toggle
          value={showFirst}
          offLabel={views[1].label}
          onLabel={views[0].label}
          onChange={(isOn) => setShowFirst(isOn)}
        />
      </div>
      <ScoreTableView
        table={activeView.toTable(lines, participants, {
          highlightAssignmentId,
        })}
        highlightAssignmentId={highlightAssignmentId}
      />
    </div>
  );
}
