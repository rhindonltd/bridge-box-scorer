import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MovementDetailsPage } from "./MovementDetailsPage";

vi.mock("@/components/common/GameInfo", () => ({
  GameInfo: () => <div data-testid="game-info" />,
}));

vi.mock("@/components/movement/MovementTables", () => ({
  default: ({ tables }: any) => (
    <div data-testid="movement-tables">
      Tables: {tables?.tables?.length ?? 0}
    </div>
  ),
}));

describe("MovementDetailsPage", () => {
  const baseProps = {
    movementName: "Mitchell Movement",
    tables: { tables: [{ table: 1 }, { table: 2 }] } as any,
    onCreate: vi.fn(),
  };

  it("renders GameInfo", () => {
    render(<MovementDetailsPage {...baseProps} />);
    expect(screen.getByTestId("game-info")).toBeInTheDocument();
  });

  it("renders movement name", () => {
    render(<MovementDetailsPage {...baseProps} />);
    expect(screen.getByText("Mitchell Movement")).toBeInTheDocument();
  });

  it("passes tables to MovementTables", () => {
    render(<MovementDetailsPage {...baseProps} />);
    expect(screen.getByText("Tables: 2")).toBeInTheDocument();
  });

  it("renders Create button", () => {
    render(<MovementDetailsPage {...baseProps} />);
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("calls onCreate when Create button is clicked", () => {
    const fn = vi.fn();
    render(<MovementDetailsPage {...baseProps} onCreate={fn} />);
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("applies layout structure classes", () => {
    const { container } = render(<MovementDetailsPage {...baseProps} />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("h-dvh", "flex", "flex-col", "bg-gray-100");
  });

  it("wraps movement name in styled header", () => {
    render(<MovementDetailsPage {...baseProps} />);
    const name = screen.getByText("Mitchell Movement").parentElement;
    expect(name?.parentElement).toHaveClass("bg-blue-300", "py-2");
  });

  it("scrollable table section exists", () => {
    render(<MovementDetailsPage {...baseProps} />);
    const scrollArea = screen.getByTestId("movement-tables").parentElement;
    expect(scrollArea).toHaveClass("flex-1", "min-h-0", "overflow-y-auto");
  });
});
