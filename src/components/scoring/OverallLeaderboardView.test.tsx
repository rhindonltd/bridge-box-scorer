import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { OverallLeaderboardView } from "./OverallLeaderboardView";
import type { ScoreTable } from "@/scoring/table/score-table";
import type { OverallScoringPlugin } from "@/scoring/plugins/types";
import type { AssignedPair } from "@/model/participants";

function tableWith(label: string): ScoreTable {
  return {
    columns: [{ label: "Col" }],
    rows: [{ highlightIds: [], cells: [{ kind: "text", value: label }] }],
  };
}

function plugin(viewCount: 1 | 2): OverallScoringPlugin<unknown, unknown> {
  const views = [
    { id: "v1", label: "First", toTable: vi.fn(() => tableWith("first-cell")) },
    {
      id: "v2",
      label: "Second",
      toTable: vi.fn(() => tableWith("second-cell")),
    },
  ].slice(0, viewCount);
  return { id: "MP", score: vi.fn(), views } as never;
}

const participants: AssignedPair[] = [];

describe("OverallLeaderboardView", () => {
  it("renders a single-view plugin directly without a toggle", () => {
    render(
      <OverallLeaderboardView
        plugin={plugin(1)}
        lines={[]}
        participants={participants}
      />,
    );
    expect(screen.getByText("first-cell")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows a toggle for a two-view plugin and switches the active view", () => {
    render(
      <OverallLeaderboardView
        plugin={plugin(2)}
        lines={[]}
        participants={participants}
      />,
    );

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
