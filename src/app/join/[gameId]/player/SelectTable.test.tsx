import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SelectTable from "./SelectTable";
import { Pair } from "@/model/participants";

const makePlayer = (id: number) => ({
  id,
  firstName: "FN",
  lastName: "LN",
  nationalId: "123456",
});

const makePair = (tableNumber: number, direction: "NS" | "EW"): Pair => ({
  type: "PAIR",
  initialSeat: `${tableNumber}${direction}` as Pair["initialSeat"],
  player1: makePlayer(1),
  player2: makePlayer(2),
});

describe("SelectPairsTable", () => {
  const baseProps = {
    tables: 2,
    onSeatSelected: vi.fn(),
    startingPositions: [] as Pair[],
  };

  it("renders instruction text", () => {
    render(<SelectTable {...baseProps} />);
    expect(
      screen.getByText(
        "Please select the table and direction you are sitting:",
      ),
    ).toBeInTheDocument();
  });

  it("renders correct number of tables", () => {
    render(<SelectTable {...baseProps} tables={3} />);
    expect(screen.getByText("Table 1")).toBeInTheDocument();
    expect(screen.getByText("Table 2")).toBeInTheDocument();
    expect(screen.getByText("Table 3")).toBeInTheDocument();
  });

  it("disables NS button when assigned", () => {
    render(
      <SelectTable
        tables={1}
        onSeatSelected={vi.fn()}
        startingPositions={[makePair(1, "NS")]}
      />,
    );
    expect(screen.getByRole("button", { name: "NS" })).toBeDisabled();
  });

  it("disables EW button when assigned", () => {
    render(
      <SelectTable
        tables={1}
        onSeatSelected={vi.fn()}
        startingPositions={[makePair(1, "EW")]}
      />,
    );
    expect(screen.getByRole("button", { name: "EW" })).toBeDisabled();
  });

  it("marks table as full when both directions are assigned", () => {
    const { container } = render(
      <SelectTable
        tables={1}
        onSeatSelected={vi.fn()}
        startingPositions={[makePair(1, "NS"), makePair(1, "EW")]}
      />,
    );
    expect(container.querySelector(".opacity-50")).toBeInTheDocument();
  });

  it("does not disable unrelated table buttons", () => {
    render(
      <SelectTable
        tables={2}
        onSeatSelected={vi.fn()}
        startingPositions={[makePair(1, "NS")]}
      />,
    );
    const secondTableNS = screen.getAllByRole("button", { name: "NS" })[1];
    expect(secondTableNS).not.toBeDisabled();
  });

  it("renders grid structure", () => {
    const { container } = render(<SelectTable {...baseProps} />);
    expect(container.querySelector(".grid")).toBeInTheDocument();
  });
});
