import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ShowTables, { type Table } from "./ShowTables";
import type { Player } from "@/db/games/tables/players";

function player(firstName: string): Player {
  return { id: 1, firstName, lastName: "Test", nationalId: null };
}

const tables: Table[] = [
  {
    tableNumber: 1,
    players: { N: player("Ada"), S: null, E: null, W: null },
  },
  {
    tableNumber: 2,
    players: { N: null, S: null, E: null, W: null },
  },
];

describe("ShowTables", () => {
  it("renders a CardTable for each table", () => {
    render(<ShowTables tables={tables} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    // Empty seats render an "Empty" placeholder.
    expect(screen.getAllByText("Empty").length).toBeGreaterThan(0);
  });
});
