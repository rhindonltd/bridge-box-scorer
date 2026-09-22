"use client";

import { useState } from "react";
import { Toggle } from "@/components/common/Toggle";

interface View {
  id: string;
  label: string;
}

/**
 * Shared view-selection scaffolding for the scoring plugin views. A plugin with
 * a single view renders it directly; with two views it shows a right-aligned
 * Toggle (view[0] = "on", view[1] = "off") above the active view. Each caller
 * supplies `renderView` so it can render its own table (the per-board and
 * overall views build their `ScoreTableView` differently).
 *
 * When `selectedViewId` is supplied and matches a view, that view is rendered
 * directly with NO toggle — the choice was made elsewhere (e.g. the room
 * display picks MP vs % on a preceding screen, so the standings scroll cleanly
 * with nothing above them but the pinned column header).
 */
export function PluginViewSwitcher<V extends View>({
  views,
  renderView,
  selectedViewId,
}: {
  views: V[];
  renderView: (view: V) => React.ReactNode;
  /**
   * Render the view with this id and hide the toggle. Ignored when no view
   * matches (falls back to the interactive toggle). Use when an upstream
   * screen has already chosen the view.
   */
  selectedViewId?: string;
}) {
  // `on` selects views[0]; `off` selects views[1]. Defaults to the first view.
  const [showFirst, setShowFirst] = useState(true);

  if (views.length <= 1) {
    return <>{renderView(views[0])}</>;
  }

  // A pre-chosen view short-circuits the toggle entirely.
  const fixedView =
    selectedViewId !== undefined
      ? views.find((v) => v.id === selectedViewId)
      : undefined;
  if (fixedView) {
    return <>{renderView(fixedView)}</>;
  }

  const activeView = showFirst ? views[0] : views[1];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex justify-end">
        <Toggle
          value={showFirst}
          offLabel={views[1].label}
          onLabel={views[0].label}
          onChange={setShowFirst}
        />
      </div>
      {renderView(activeView)}
    </div>
  );
}
