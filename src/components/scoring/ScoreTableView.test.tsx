import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { ScoreTableView } from "./ScoreTableView";
import {
  textCell,
  numberCell,
  contractCell,
  multilineCell,
  type ScoreTable,
} from "@/scoring/table/score-table";
import type { BoardOutcome } from "@/model/score";

function table(): ScoreTable {
  return {
    columns: [{ label: "Rank" }, { label: "Pair" }, { label: "Contract" }, { label: "Score" }],
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
});
