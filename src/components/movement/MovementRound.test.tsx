import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MovementRound } from "./MovementRound";
import type { MovementByRound } from "@/movement/movementData";

describe("MovementRound", () => {
  const roundMock: MovementByRound = {
    roundNumber: 1,
    tables: [
      {
        tableNumber: 1,
        ns: "A",
        ew: "B",
        boardStart: 1,
        boardEnd: 2,
      },
      {
        tableNumber: 2,
        ns: "C",
        ew: "D",
        boardStart: 3,
        boardEnd: 4,
      },
    ],
  };

  it("renders round title", () => {
    render(<MovementRound round={roundMock} />);
    expect(screen.getByText("Round 1")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<MovementRound round={roundMock} />);
    expect(screen.getByText("Table")).toBeInTheDocument();
    expect(screen.getByText("NS")).toBeInTheDocument();
    expect(screen.getByText("EW")).toBeInTheDocument();
    expect(screen.getByText("Boards")).toBeInTheDocument();
  });

  it("renders participant IDs", () => {
    render(<MovementRound round={roundMock} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("renders board ranges for each row", () => {
    render(<MovementRound round={roundMock} />);
    expect(screen.getByText("1-2")).toBeInTheDocument();
    expect(screen.getByText("3-4")).toBeInTheDocument();
  });

  it("renders a Played column only when progress data is present", () => {
    const { rerender } = render(<MovementRound round={roundMock} />);
    expect(screen.queryByText("Played")).not.toBeInTheDocument();

    rerender(
      <MovementRound
        round={{
          roundNumber: 1,
          tables: [
            {
              tableNumber: 1,
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

  it("applies table structure", () => {
    const { container } = render(<MovementRound round={roundMock} />);
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector("thead")).toBeInTheDocument();
    expect(container.querySelector("tbody")).toBeInTheDocument();
  });

  it("applies container styling classes", () => {
    const { container } = render(<MovementRound round={roundMock} />);
    expect(container.firstChild).toHaveClass(
      "border",
      "rounded-lg",
      "shadow-sm",
      "overflow-x-auto",
    );
  });
});
