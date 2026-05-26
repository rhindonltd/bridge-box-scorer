import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SelectPairsTable from "./SelectPairsTable";

describe("SelectPairsTable", () => {
  const baseProps = {
    tables: 2,
    setStartingPosition: vi.fn(),
    startingPositions: [],
  };

  it("renders instruction text", () => {
    render(<SelectPairsTable {...baseProps} />);

    expect(
      screen.getByText(
        "Please select the table and direction you are sitting:",
      ),
    ).toBeInTheDocument();
  });

  it("renders correct number of tables", () => {
    render(<SelectPairsTable {...baseProps} tables={3} />);

    expect(screen.getByText("Table 1")).toBeInTheDocument();
    expect(screen.getByText("Table 2")).toBeInTheDocument();
    expect(screen.getByText("Table 3")).toBeInTheDocument();
  });

  it("calls selectTable for NS click", () => {
    const fn = vi.fn();

    render(<SelectPairsTable {...baseProps} setStartingPosition={fn} />);

    fireEvent.click(screen.getAllByRole("button", { name: "NS" })[0]);

    expect(fn).toHaveBeenCalledWith(1, "NS");
  });

  it("calls selectTable for EW click", () => {
    const fn = vi.fn();

    render(<SelectPairsTable {...baseProps} setStartingPosition={fn} />);

    fireEvent.click(screen.getAllByRole("button", { name: "EW" })[0]);

    expect(fn).toHaveBeenCalledWith(1, "EW");
  });

  it("disables NS button when assigned", () => {
    render(
      <SelectPairsTable
        tables={1}
        setStartingPosition={vi.fn()}
        startingPositions={[
          {
            tableNumber: 1,
            direction: "NS",
            pair: {
              player1: {
                firstName: "FN",
                lastName: "LN",
                nationalId: "123456",
              },
              player2: {
                firstName: "FN",
                lastName: "LN",
                nationalId: "123456",
              },
            },
          },
        ]}
      />,
    );

    const nsButton = screen.getByRole("button", {
      name: "NS",
    });

    expect(nsButton).toBeDisabled();
  });

  it("disables EW button when assigned", () => {
    render(
      <SelectPairsTable
        tables={1}
        setStartingPosition={vi.fn()}
        startingPositions={[
          {
            tableNumber: 1,
            direction: "EW",
            pair: {
              player1: {
                firstName: "FN",
                lastName: "LN",
                nationalId: "123456",
              },
              player2: {
                firstName: "FN",
                lastName: "LN",
                nationalId: "123456",
              },
            },
          },
        ]}
      />,
    );

    const ewButton = screen.getByRole("button", {
      name: "EW",
    });

    expect(ewButton).toBeDisabled();
  });

  it("marks table as full when both directions are assigned", () => {
    const { container } = render(
      <SelectPairsTable
        tables={1}
        setStartingPosition={vi.fn()}
        startingPositions={[
          {
            tableNumber: 1,
            direction: "NS",
            pair: {
              player1: {
                firstName: "FN",
                lastName: "LN",
                nationalId: "123456",
              },
              player2: {
                firstName: "FN",
                lastName: "LN",
                nationalId: "123456",
              },
            },
          },
          {
            tableNumber: 1,
            direction: "EW",
            pair: {
              player1: {
                firstName: "FN",
                lastName: "LN",
                nationalId: "123456",
              },
              player2: {
                firstName: "FN",
                lastName: "LN",
                nationalId: "123456",
              },
            },
          },
        ]}
      />,
    );

    const tableCard = container.querySelector(".opacity-50");

    expect(tableCard).toBeInTheDocument();
  });

  it("does not disable unrelated table buttons", () => {
    render(
      <SelectPairsTable
        tables={2}
        setStartingPosition={vi.fn()}
        startingPositions={[
          {
            tableNumber: 1,
            direction: "NS",
            pair: {
              player1: {
                firstName: "FN",
                lastName: "LN",
                nationalId: "123456",
              },
              player2: {
                firstName: "FN",
                lastName: "LN",
                nationalId: "123456",
              },
            },
          },
        ]}
      />,
    );

    const secondTableNS = screen.getAllByRole("button", {
      name: "NS",
    })[1];

    expect(secondTableNS).not.toBeDisabled();
  });

  it("renders grid structure", () => {
    const { container } = render(<SelectPairsTable {...baseProps} />);

    expect(container.querySelector(".grid")).toBeInTheDocument();
  });
});
