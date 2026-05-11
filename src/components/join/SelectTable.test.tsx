import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SelectTable from "./SelectTable";

describe("SelectTable", () => {
  const baseProps = {
    tables: 2,
    selectTable: vi.fn(),
    assigned: [],
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

  it("calls selectTable for NS click", () => {
    const fn = vi.fn();

    render(<SelectTable {...baseProps} selectTable={fn} />);

    fireEvent.click(screen.getAllByRole("button", { name: "NS" })[0]);

    expect(fn).toHaveBeenCalledWith(1, "NS");
  });

  it("calls selectTable for EW click", () => {
    const fn = vi.fn();

    render(<SelectTable {...baseProps} selectTable={fn} />);

    fireEvent.click(screen.getAllByRole("button", { name: "EW" })[0]);

    expect(fn).toHaveBeenCalledWith(1, "EW");
  });

  it("disables NS button when assigned", () => {
    render(
      <SelectTable
        tables={1}
        selectTable={vi.fn()}
        assigned={[{ table: 1, direction: "NS" }]}
      />,
    );

    const nsButton = screen.getByRole("button", {
      name: "NS",
    });

    expect(nsButton).toBeDisabled();
  });

  it("disables EW button when assigned", () => {
    render(
      <SelectTable
        tables={1}
        selectTable={vi.fn()}
        assigned={[{ table: 1, direction: "EW" }]}
      />,
    );

    const ewButton = screen.getByRole("button", {
      name: "EW",
    });

    expect(ewButton).toBeDisabled();
  });

  it("marks table as full when both directions are assigned", () => {
    const { container } = render(
      <SelectTable
        tables={1}
        selectTable={vi.fn()}
        assigned={[
          { table: 1, direction: "NS" },
          { table: 1, direction: "EW" },
        ]}
      />,
    );

    const tableCard = container.querySelector(".opacity-50");

    expect(tableCard).toBeInTheDocument();
  });

  it("does not disable unrelated table buttons", () => {
    render(
      <SelectTable
        tables={2}
        selectTable={vi.fn()}
        assigned={[{ table: 1, direction: "NS" }]}
      />,
    );

    const secondTableNS = screen.getAllByRole("button", {
      name: "NS",
    })[1];

    expect(secondTableNS).not.toBeDisabled();
  });

  it("renders grid structure", () => {
    const { container } = render(<SelectTable {...baseProps} />);

    expect(container.querySelector(".grid")).toBeInTheDocument();
  });
});
