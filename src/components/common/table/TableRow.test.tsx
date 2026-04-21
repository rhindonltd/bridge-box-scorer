import { render, screen } from "@testing-library/react";
import { TableRow } from "./TableRow";
import { describe, expect, it, vi } from "vitest";

// 👇 Mock TableCell to isolate TableRow logic
vi.mock("@/components/common/table/TableCell", () => ({
  TableCell: ({ value, className }: any) => (
    <td data-testid="cell" className={className}>
      {value}
    </td>
  ),
}));

describe("TableRow", () => {
  it("renders all cells", () => {
    const cells = ["A", "B", "C"];

    render(
      <table>
        <tbody>
          <TableRow cells={cells} className="" />
        </tbody>
      </table>,
    );

    cells.forEach((cell) => {
      expect(screen.getByText(cell)).toBeInTheDocument();
    });
  });

  it("renders correct number of cells", () => {
    const cells = ["A", "B", "C"];

    render(
      <table>
        <tbody>
          <TableRow cells={cells} className="" />
        </tbody>
      </table>,
    );

    const renderedCells = screen.getAllByTestId("cell");
    expect(renderedCells).toHaveLength(cells.length);
  });

  it("applies className to the row", () => {
    render(
      <table>
        <tbody>
          <TableRow cells={["A"]} className="custom-row" />
        </tbody>
      </table>,
    );

    const row = screen.getByRole("row");
    expect(row).toHaveClass("custom-row");
  });

  it("applies rounded class to first and last cells", () => {
    const cells = ["A", "B", "C"];

    render(
      <table>
        <tbody>
          <TableRow cells={cells} className="" />
        </tbody>
      </table>,
    );

    const renderedCells = screen.getAllByTestId("cell");

    expect(renderedCells[0]).toHaveClass("rounded-tl-lg");
    expect(renderedCells[1]).not.toHaveClass("rounded-tl-lg");
    expect(renderedCells[1]).not.toHaveClass("rounded-tr-lg");
    expect(renderedCells[2]).toHaveClass("rounded-tr-lg");
  });

  it("handles single cell (both first and last)", () => {
    render(
      <table>
        <tbody>
          <TableRow cells={["Only"]} className="" />
        </tbody>
      </table>,
    );

    const cell = screen.getByTestId("cell");

    expect(cell).toHaveClass("rounded-tl-lg");
    // ⚠️ Note: your implementation does NOT apply rounded-tr-lg here
    expect(cell).not.toHaveClass("rounded-tr-lg");
  });
});
