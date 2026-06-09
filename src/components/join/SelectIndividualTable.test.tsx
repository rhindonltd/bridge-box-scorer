import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SelectIndividualTable from "./SelectIndividualTable";

describe("SelectIndividualTable", () => {
  const baseProps = {
    tables: 2,
    onSeatSelected: vi.fn(),
    startingPositions: [],
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

  // it("calls selectTable for NS click", () => {
  //   const fn = vi.fn();
  //
  //   render(<SelectIndividualTable {...baseProps} onSeatSelected={fn} />);
  //
  //   fireEvent.click(screen.getAllByRole("button", { name: "NS" })[0]);
  //
  //   expect(fn).toHaveBeenCalledWith(1, "NS");
  // });

  // it("calls selectTable for EW click", () => {
  //   const fn = vi.fn();
  //
  //   render(<SelectIndividualTable {...baseProps} onSeatSelected={fn} />);
  //
  //   fireEvent.click(screen.getAllByRole("button", { name: "EW" })[0]);
  //
  //   expect(fn).toHaveBeenCalledWith(1, "EW");
  // });

  it("disables N button when assigned", () => {
    render(
      <SelectIndividualTable
        tables={1}
        onSeatSelected={vi.fn()}
        startingPositions={[
          {
            tableNumber: 1,
            direction: "N",
            player: { firstName: "FN", lastName: "LN", nationalId: "123" },
          },
        ]}
      />,
    );

    const nsButton = screen.getByRole("button", {
      name: "N",
    });

    expect(nsButton).toBeDisabled();
  });

  it("disables S button when assigned", () => {
    render(
      <SelectIndividualTable
        tables={1}
        onSeatSelected={vi.fn()}
        startingPositions={[
          {
            tableNumber: 1,
            direction: "S",
            player: { firstName: "FN", lastName: "LN", nationalId: "123" },
          },
        ]}
      />,
    );

    const nsButton = screen.getByRole("button", {
      name: "S",
    });

    expect(nsButton).toBeDisabled();
  });

  it("disables E button when assigned", () => {
    render(
      <SelectIndividualTable
        tables={1}
        onSeatSelected={vi.fn()}
        startingPositions={[
          {
            tableNumber: 1,
            direction: "E",
            player: { firstName: "FN", lastName: "LN", nationalId: "123" },
          },
        ]}
      />,
    );

    const ewButton = screen.getByRole("button", {
      name: "E",
    });

    expect(ewButton).toBeDisabled();
  });

  it("disables W button when assigned", () => {
    render(
      <SelectIndividualTable
        tables={1}
        onSeatSelected={vi.fn()}
        startingPositions={[
          {
            tableNumber: 1,
            direction: "W",
            player: { firstName: "FN", lastName: "LN", nationalId: "123" },
          },
        ]}
      />,
    );

    const ewButton = screen.getByRole("button", {
      name: "W",
    });

    expect(ewButton).toBeDisabled();
  });

  it("marks table as full when both directions are assigned", () => {
    const { container } = render(
      <SelectIndividualTable
        tables={1}
        onSeatSelected={vi.fn()}
        startingPositions={[
          {
            tableNumber: 1,
            direction: "N",
            player: { firstName: "FN", lastName: "LN", nationalId: "123" },
          },
          {
            tableNumber: 1,
            direction: "S",
            player: { firstName: "FN", lastName: "LN", nationalId: "123" },
          },
          {
            tableNumber: 1,
            direction: "E",
            player: { firstName: "FN", lastName: "LN", nationalId: "123" },
          },
          {
            tableNumber: 1,
            direction: "W",
            player: { firstName: "FN", lastName: "LN", nationalId: "123" },
          },
        ]}
      />,
    );

    const tableCard = container.querySelector(".opacity-50");

    expect(tableCard).toBeInTheDocument();
  });

  it("does not disable unrelated table buttons", () => {
    render(
      <SelectIndividualTable
        tables={2}
        onSeatSelected={vi.fn()}
        startingPositions={[
          {
            tableNumber: 1,
            direction: "N",
            player: { firstName: "FN", lastName: "LN", nationalId: "123" },
          },
        ]}
      />,
    );

    const secondTableNS = screen.getAllByRole("button", {
      name: "N",
    })[1];

    expect(secondTableNS).not.toBeDisabled();
  });

  it("renders grid structure", () => {
    const { container } = render(<SelectIndividualTable {...baseProps} />);

    expect(container.querySelector(".grid")).toBeInTheDocument();
  });
});
