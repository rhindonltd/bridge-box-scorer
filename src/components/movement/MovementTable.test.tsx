import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MovementTable } from "./MovementTable";

// Mock formatter for deterministic output
vi.mock("@/movement/shared", () => ({
  formatBoards: vi.fn((boards: number[]) => boards.join(",")),
}));

describe("MovementTable", () => {
  const tableMock = {
    table: 5,
    rounds: [
      {
        participants: { nsId: "A", ewId: "B" },
        boards: [1, 2],
      },
      {
        participants: { nsId: "C", ewId: "D" },
        boards: [3, 4],
      },
    ],
  } as any;

  it("renders table heading", () => {
    render(<MovementTable table={tableMock} />);

    expect(screen.getByText("Table 5")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<MovementTable table={tableMock} />);

    expect(screen.getByText("Round")).toBeInTheDocument();
    expect(screen.getByText("NS")).toBeInTheDocument();
    expect(screen.getByText("EW")).toBeInTheDocument();
    expect(screen.getByText("Boards")).toBeInTheDocument();
  });

  it("renders correct number of rows", () => {
    render(<MovementTable table={tableMock} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders participant IDs", () => {
    render(<MovementTable table={tableMock} />);

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("calls formatBoards for each round", async () => {
    const { formatBoards } = await import("@/movement/shared");

    render(<MovementTable table={tableMock} />);

    expect(formatBoards).toHaveBeenCalledWith([1, 2]);
    expect(formatBoards).toHaveBeenCalledWith([3, 4]);
  });

  it("renders formatted boards", () => {
    render(<MovementTable table={tableMock} />);

    expect(screen.getByText("1,2")).toBeInTheDocument();
    expect(screen.getByText("3,4")).toBeInTheDocument();
  });

  it("renders row index starting from 1", () => {
    render(<MovementTable table={tableMock} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("applies container styles", () => {
    const { container } = render(<MovementTable table={tableMock} />);

    expect(container.firstChild).toHaveClass(
      "w-full",
      "border",
      "rounded-lg",
      "shadow-md",
      "overflow-hidden",
    );
  });

  it("renders table structure", () => {
    const { container } = render(<MovementTable table={tableMock} />);

    expect(container.querySelector("table")).toBeInTheDocument();
    expect(container.querySelector("thead")).toBeInTheDocument();
    expect(container.querySelector("tbody")).toBeInTheDocument();
  });
});
