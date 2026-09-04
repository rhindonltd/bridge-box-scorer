import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MovementDetailView } from "./MovementDetailView";
import type { MovementByTable } from "@/movement/movementData";

const tables: MovementByTable[] = [
  {
    tableNumber: 1,
    rounds: [
      { roundNumber: 1, ns: "1", ew: "5", boardStart: 1, boardEnd: 3 },
      { roundNumber: 2, ns: "1", ew: "6", boardStart: 4, boardEnd: 6 },
    ],
  },
  {
    tableNumber: 2,
    rounds: [
      { roundNumber: 1, ns: "2", ew: "6", boardStart: 4, boardEnd: 6 },
      { roundNumber: 2, ns: "2", ew: "7", boardStart: 7, boardEnd: 9 },
    ],
  },
];

describe("MovementDetailView", () => {
  it("defaults to the By Round view", () => {
    render(<MovementDetailView tables={tables} />);
    // By Round renders "Round N" headings and a "Table" column header.
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getByText("Round 2")).toBeInTheDocument();
    expect(screen.getAllByText("Table").length).toBeGreaterThan(0);
  });

  it("switches to the By Table view and back to By Round", () => {
    render(<MovementDetailView tables={tables} />);

    fireEvent.click(screen.getByRole("button", { name: "By Table" }));
    // By Table renders "Table N" headings and a "Round" column header.
    expect(screen.getByText("Table 1")).toBeInTheDocument();
    expect(screen.getByText("Table 2")).toBeInTheDocument();
    expect(screen.getAllByText("Round").length).toBeGreaterThan(0);
    expect(screen.queryByText("Round 1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "By Round" }));
    expect(screen.getByText("Round 1")).toBeInTheDocument();
  });
});
