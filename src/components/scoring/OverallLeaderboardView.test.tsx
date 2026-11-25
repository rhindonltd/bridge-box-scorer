import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { OverallLeaderboardView } from "./OverallLeaderboardView";
import type { ScoreTable } from "@/modules/results-views/table/score-table";
import type { TableView } from "@/modules/results-views/view-types";

function tableWith(label: string): ScoreTable {
  return {
    columns: [{ label: "Col" }],
    rows: [{ highlightIds: [], cells: [{ kind: "text", value: label }] }],
  };
}

function views(viewCount: 1 | 2): TableView<unknown>[] {
  return [
    { id: "v1", label: "First", toTable: vi.fn(() => tableWith("first-cell")) },
    {
      id: "v2",
      label: "Second",
      toTable: vi.fn(() => tableWith("second-cell")),
    },
  ].slice(0, viewCount);
}

describe("OverallLeaderboardView", () => {
  it("renders a single view directly without a toggle", () => {
    render(<OverallLeaderboardView views={views(1)} standings={[]} />);
    expect(screen.getByText("first-cell")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows a toggle for two views and switches the active view", () => {
    render(<OverallLeaderboardView views={views(2)} standings={[]} />);

    // Default = first view (showFirst = true).
    expect(screen.getByText("first-cell")).toBeInTheDocument();

    // Clicking the "Second" toggle (offLabel) flips showFirst -> false.
    fireEvent.click(screen.getByRole("button", { name: "Second" }));
    expect(screen.getByText("second-cell")).toBeInTheDocument();

    // Toggle back to the first view.
    fireEvent.click(screen.getByRole("button", { name: "First" }));
    expect(screen.getByText("first-cell")).toBeInTheDocument();
  });
});
