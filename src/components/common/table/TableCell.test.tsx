import { render, screen } from "@testing-library/react";
import { TableCell } from "./TableCell";
import { describe, it, expect } from "vitest";

describe("TableCell", () => {
  it("renders the cell with provided value", () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell value="Hello" className="" />
          </tr>
        </tbody>
      </table>,
    );

    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies the provided className", () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell value="Styled" className="text-red-500" />
          </tr>
        </tbody>
      </table>,
    );

    const cell = screen.getByText("Styled");
    expect(cell).toHaveClass("text-red-500");
  });

  it("includes default classes", () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell value="Default" className="" />
          </tr>
        </tbody>
      </table>,
    );

    const cell = screen.getByText("Default");

    expect(cell).toHaveClass("px-1");
    expect(cell).toHaveClass("py-2");
    expect(cell).toHaveClass("text-center");
  });

  it("renders ReactNode content", () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell
              value={<span data-testid="custom-node">Custom</span>}
              className=""
            />
          </tr>
        </tbody>
      </table>,
    );

    expect(screen.getByTestId("custom-node")).toBeInTheDocument();
  });
});
