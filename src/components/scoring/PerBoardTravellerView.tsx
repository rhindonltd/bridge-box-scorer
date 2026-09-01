"use client";

import { useState } from "react";
import { Toggle } from "@/components/common/Toggle";
import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import { PerBoardScoringPlugin } from "@/scoring/plugins/types";

type Props = {
  plugin: PerBoardScoringPlugin<unknown>;
  scored: unknown;
  highlightAssignmentId?: string;
};

/**
 * Renders a per-board scored traveller using a scoring plugin's views. The
 * component owns the view-selection UI: when a plugin exposes two views it
 * shows a Toggle (view[0] = "on", view[1] = "off"), otherwise it renders the
 * single view directly. All tables render through the shared ScoreTableView.
 */
export function PerBoardTravellerView({
  plugin,
  scored,
  highlightAssignmentId,
}: Props) {
  const views = plugin.views;
  // `on` selects views[0]; `off` selects views[1]. Defaults to the first view.
  const [showFirst, setShowFirst] = useState(true);

  if (views.length <= 1) {
    const view = views[0];
    return (
      <ScoreTableView
        table={view.toTable(scored, { highlightAssignmentId })}
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
        table={activeView.toTable(scored, { highlightAssignmentId })}
        highlightAssignmentId={highlightAssignmentId}
      />
    </div>
  );
}
