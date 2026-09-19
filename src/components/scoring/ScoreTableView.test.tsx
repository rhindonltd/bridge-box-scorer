import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ScoreTableView } from "./ScoreTableView";
import {
  textCell,
  numberCell,
  contractCell,
  multilineCell,
  expandableCell,
  type ScoreTable,
} from "@/scoring/table/score-table";
import type { BoardOutcome } from "@/model/score";

function table(): ScoreTable {
  return {
    columns: [
      { label: "Rank" },
      { label: "Pair" },
      { label: "Contract" },
      { label: "Score" },
    ],
    rows: [
      {
        highlightIds: ["A1"],
        cells: [
          textCell("1"),
          multilineCell(["Alice Adams", "Bob Brown"]),
          contractCell("3NTN=" as BoardOutcome),
          numberCell(400),
        ],
      },
      {
        highlightIds: ["A2"],
        cells: [
          textCell("2"),
          multilineCell(["Carol Clark", "Dan Day"]),
          contractCell("4SS=" as BoardOutcome),
          numberCell(420),
        ],
      },
    ],
  };
}

describe("ScoreTableView", () => {
  it("renders column headers and every row's cells", () => {
    render(<ScoreTableView table={table()} />);

    expect(screen.getByText("Rank")).toBeInTheDocument();
    expect(screen.getByText("Contract")).toBeInTheDocument();

    expect(screen.getByText("Alice Adams")).toBeInTheDocument();
    expect(screen.getByText("Bob Brown")).toBeInTheDocument();
    expect(screen.getByText("Carol Clark")).toBeInTheDocument();
    expect(screen.getByText("400")).toBeInTheDocument();
    expect(screen.getByText("420")).toBeInTheDocument();
  });

  it("highlights the matching row when highlightAssignmentId is provided", () => {
    render(
      <ScoreTableView
        table={table()}
        highlightAssignmentId="A1"
        rowTestId="row"
      />,
    );

    const rows = screen.getAllByTestId("row");
    // Row 0 has highlightIds ["A1"] -> highlighted; row 1 has ["A2"] -> not.
    expect(rows[0]).toHaveClass("bg-blue-100", "font-semibold");
    expect(rows[1]).not.toHaveClass("bg-blue-100");
  });

  it("renders contract cells via BoardResult (suit symbol for suited contracts)", () => {
    const { container } = render(<ScoreTableView table={table()} />);
    expect(container.textContent).toContain("♠"); // 4S
    expect(container.textContent).toContain("NT"); // 3NT
  });

  it("spreads rows across multiple side-by-side tables when splitColumns > 1", () => {
    // Six rows across two columns -> two tables, each repeating the header.
    const rows = Array.from({ length: 6 }, (_, i) => ({
      highlightIds: [`A${i}`],
      cells: [textCell(String(i + 1)), numberCell((i + 1) * 100)],
    }));
    const wide: ScoreTable = {
      columns: [{ label: "Rank" }, { label: "Score" }],
      rows,
    };

    render(<ScoreTableView table={wide} splitColumns={2} rowTestId="row" />);

    // Header repeats once per column table.
    expect(screen.getAllByText("Rank")).toHaveLength(2);
    // All six rows still render (three per column).
    expect(screen.getAllByTestId("row")).toHaveLength(6);
    expect(screen.getByText("600")).toBeInTheDocument();
  });

  it("pads with empty column tables when there are fewer rows than columns", () => {
    // One row, three columns -> three tables (two of them empty), so the
    // layout width stays consistent.
    const single: ScoreTable = {
      columns: [{ label: "Rank" }],
      rows: [{ highlightIds: ["A1"], cells: [textCell("1")] }],
    };

    render(<ScoreTableView table={single} splitColumns={3} rowTestId="row" />);

    // Header repeats per column (including the padded empty ones).
    expect(screen.getAllByText("Rank")).toHaveLength(3);
    // Only the one real row renders.
    expect(screen.getAllByTestId("row")).toHaveLength(1);
  });

  it("renders an expandable cell as a collapsed label, revealing lines on click", () => {
    const expandable: ScoreTable = {
      columns: [{ label: "Team" }],
      rows: [
        {
          highlightIds: ["A1"],
          cells: [
            expandableCell("Sharks", [
              "Alice Adams",
              "Bob Brown",
              "Carol Clark",
              "Dan Day",
            ]),
          ],
        },
      ],
    };

    render(<ScoreTableView table={expandable} />);

    const toggle = screen.getByRole("button", { name: "Sharks" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Alice Adams")).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Alice Adams")).toBeInTheDocument();
    expect(screen.getByText("Dan Day")).toBeInTheDocument();
  });
});
