import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SelectTable from "@/app/game/[gameId]/join/SelectTable";
import { Pair, seatFor } from "@/model/participants";

const makePlayer = (id: number) => ({
  id,
  firstName: "FN",
  lastName: "LN",
  nationalId: "123456",
});

const makePair = (
  section: string,
  tableNumber: number,
  direction: "NS" | "EW",
): Pair => ({
  type: "PAIR",
  initialSeat: seatFor(section, tableNumber, direction),
  player1: makePlayer(1),
  player2: makePlayer(2),
});

const sectionA = (tables: number) => [
  { section: "A", label: "A", tables },
];

describe("SelectTable", () => {
  const baseProps = {
    sections: sectionA(2),
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
    render(<SelectTable {...baseProps} sections={sectionA(3)} />);
    expect(screen.getByText("Table 1")).toBeInTheDocument();
    expect(screen.getByText("Table 2")).toBeInTheDocument();
    expect(screen.getByText("Table 3")).toBeInTheDocument();
  });

  it("selects a section-qualified seat", () => {
    const onSeatSelected = vi.fn();
    render(
      <SelectTable
        sections={sectionA(1)}
        onSeatSelected={onSeatSelected}
        startingPositions={[]}
      />,
    );
    screen.getByRole("button", { name: "NS" }).click();
    expect(onSeatSelected).toHaveBeenCalledWith("A1NS");
  });

  it("disables NS button when assigned", () => {
    render(
      <SelectTable
        sections={sectionA(1)}
        onSeatSelected={vi.fn()}
        startingPositions={[makePair("A", 1, "NS")]}
      />,
    );
    expect(screen.getByRole("button", { name: "NS" })).toBeDisabled();
  });

  it("marks table as full when both directions are assigned", () => {
    const { container } = render(
      <SelectTable
        sections={sectionA(1)}
        onSeatSelected={vi.fn()}
        startingPositions={[makePair("A", 1, "NS"), makePair("A", 1, "EW")]}
      />,
    );
    expect(container.querySelector(".opacity-50")).toBeInTheDocument();
  });

  it("renders multiple sections with headings", () => {
    render(
      <SelectTable
        sections={[
          { section: "A", label: "A", tables: 1 },
          { section: "B", label: "B", tables: 1 },
        ]}
        onSeatSelected={vi.fn()}
        startingPositions={[]}
      />,
    );
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Section B")).toBeInTheDocument();
  });

  it("scopes taken seats to the correct section", () => {
    render(
      <SelectTable
        sections={[
          { section: "A", label: "A", tables: 1 },
          { section: "B", label: "B", tables: 1 },
        ]}
        onSeatSelected={vi.fn()}
        // A1NS taken; B1NS must remain free.
        startingPositions={[makePair("A", 1, "NS")]}
      />,
    );
    const nsButtons = screen.getAllByRole("button", { name: "NS" });
    expect(nsButtons[0]).toBeDisabled();
    expect(nsButtons[1]).not.toBeDisabled();
  });
});
