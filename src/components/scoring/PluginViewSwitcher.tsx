"use client";

import { useState } from "react";
import { Toggle } from "@/components/common/Toggle";

interface View {
  label: string;
}

/**
 * Shared view-selection scaffolding for the scoring plugin views. A plugin with
 * a single view renders it directly; with two views it shows a right-aligned
 * Toggle (view[0] = "on", view[1] = "off") above the active view. Each caller
 * supplies `renderView` so it can render its own table (the per-board and
 * overall views build their `ScoreTableView` differently).
 */
export function PluginViewSwitcher<V extends View>({
  views,
  renderView,
}: {
  views: V[];
  renderView: (view: V) => React.ReactNode;
}) {
  // `on` selects views[0]; `off` selects views[1]. Defaults to the first view.
  const [showFirst, setShowFirst] = useState(true);

  if (views.length <= 1) {
    return <>{renderView(views[0])}</>;
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
