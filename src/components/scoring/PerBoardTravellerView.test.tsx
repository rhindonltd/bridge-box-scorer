import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { PerBoardTravellerView } from "./PerBoardTravellerView";
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

describe("PerBoardTravellerView", () => {
  it("renders a single view directly without a toggle", () => {
    render(<PerBoardTravellerView views={views(1)} scored={[]} />);
    expect(screen.getByText("first-cell")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a toggle for two views and switches the active view", () => {
    render(<PerBoardTravellerView views={views(2)} scored={[]} />);

    // Default = first view.
    expect(screen.getByText("first-cell")).toBeInTheDocument();

    // Clicking the "Second" toggle button (offLabel) switches to views[1].
    fireEvent.click(screen.getByRole("button", { name: "Second" }));
    expect(screen.getByText("second-cell")).toBeInTheDocument();
  });
});
