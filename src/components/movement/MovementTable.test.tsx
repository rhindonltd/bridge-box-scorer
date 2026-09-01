import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MovementTable } from "./MovementTable";
import type { MovementByTable } from "@/movement/movementData";

describe("MovementTable", () => {
  const tableMock: MovementByTable = {
    tableNumber: 5,
    rounds: [
      {
        roundNumber: 1,
        ns: "A",
        ew: "B",
        boardStart: 1,
        boardEnd: 2,
      },
      {
        roundNumber: 2,
        ns: "C",
        ew: "D",
        boardStart: 3,
        boardEnd: 4,
      },
    ],
  };

  it("renders table heading", () => {
    render(<MovementTable table={tableMock} />);
    expect(screen.getByText("Table 5")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<MovementTable table={tableMock} />);
    expect(screen.getByText("Round")).toBeInTheDocument();
    expect(screen.getByText("NS")).toBeInTheDocument();
    expect(screen.getByText("EW")).toBeInTheDocument();
    expect(screen.getByText("Boards")).toBeInTheDocument();
  });

  it("renders participant IDs", () => {
    render(<MovementTable table={tableMock} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("renders board ranges for each round", () => {
    render(<MovementTable table={tableMock} />);
    expect(screen.getByText("1-2")).toBeInTheDocument();
    expect(screen.getByText("3-4")).toBeInTheDocument();
  });

  it("renders a Played column only when progress data is present", () => {
    const { rerender } = render(<MovementTable table={tableMock} />);
    expect(screen.queryByText("Played")).not.toBeInTheDocument();

    rerender(
      <MovementTable
        table={{
          tableNumber: 5,
          rounds: [
            {
              roundNumber: 1,
              ns: "A",
              ew: "B",
              boardStart: 1,
              boardEnd: 2,
              played: 1,
              total: 2,
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("Played")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("applies container styles", () => {
    const { container } = render(<MovementTable table={tableMock} />);
    expect(container.firstChild).toHaveClass(
      "border",
      "rounded-lg",
      "shadow-sm",
      "overflow-x-auto",
    );
  });

  it("renders table structure", () => {
    const { container } = render(<MovementTable table={tableMock} />);
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector("thead")).toBeInTheDocument();
    expect(container.querySelector("tbody")).toBeInTheDocument();
  });
});
