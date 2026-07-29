import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SelectIndividualTable from "./SelectIndividualTable";
import { Individual } from "@/model/participants";

const makeIndividual = (
  tableNumber: number,
  direction: "N" | "S" | "E" | "W",
): Individual => ({
  type: "INDIVIDUAL",
  initialSeat: `${tableNumber}${direction}` as Individual["initialSeat"],
  player: { id: 1, firstName: "FN", lastName: "LN", nationalId: "123" },
});

describe("SelectIndividualTable", () => {
  const baseProps = {
    tables: 2,
    onSeatSelected: vi.fn(),
    startingPositions: [] as Individual[],
  };

  it("renders instruction text", () => {
    render(<SelectIndividualTable {...baseProps} />);
    expect(
      screen.getByText(
        "Please select the table and direction you are sitting:",
      ),
    ).toBeInTheDocument();
  });

  it("renders correct number of tables", () => {
    render(<SelectIndividualTable {...baseProps} tables={3} />);
    expect(screen.getByText("Table 1")).toBeInTheDocument();
    expect(screen.getByText("Table 2")).toBeInTheDocument();
    expect(screen.getByText("Table 3")).toBeInTheDocument();
  });

  it("disables N button when assigned", () => {
    render(
      <SelectIndividualTable
        tables={1}
        onSeatSelected={vi.fn()}
        startingPositions={[makeIndividual(1, "N")]}
      />,
    );
    expect(screen.getByRole("button", { name: "N" })).toBeDisabled();
  });

  it("disables S button when assigned", () => {
    render(
      <SelectIndividualTable
        tables={1}
        onSeatSelected={vi.fn()}
        startingPositions={[makeIndividual(1, "S")]}
      />,
    );
    expect(screen.getByRole("button", { name: "S" })).toBeDisabled();
  });

  it("disables E button when assigned", () => {
    render(
      <SelectIndividualTable
        tables={1}
        onSeatSelected={vi.fn()}
        startingPositions={[makeIndividual(1, "E")]}
      />,
    );
    expect(screen.getByRole("button", { name: "E" })).toBeDisabled();
  });

  it("disables W button when assigned", () => {
    render(
      <SelectIndividualTable
        tables={1}
        onSeatSelected={vi.fn()}
        startingPositions={[makeIndividual(1, "W")]}
      />,
    );
    expect(screen.getByRole("button", { name: "W" })).toBeDisabled();
  });

  it("marks table as full when all four directions are assigned", () => {
    const { container } = render(
      <SelectIndividualTable
        tables={1}
        onSeatSelected={vi.fn()}
        startingPositions={[
          makeIndividual(1, "N"),
          makeIndividual(1, "S"),
          makeIndividual(1, "E"),
          makeIndividual(1, "W"),
        ]}
      />,
    );
    expect(container.querySelector(".opacity-50")).toBeInTheDocument();
  });

  it("does not disable unrelated table buttons", () => {
    render(
      <SelectIndividualTable
        tables={2}
        onSeatSelected={vi.fn()}
        startingPositions={[makeIndividual(1, "N")]}
      />,
    );
    const secondTableN = screen.getAllByRole("button", { name: "N" })[1];
    expect(secondTableN).not.toBeDisabled();
  });

  it("renders grid structure", () => {
    const { container } = render(<SelectIndividualTable {...baseProps} />);
    expect(container.querySelector(".grid")).toBeInTheDocument();
  });
});
