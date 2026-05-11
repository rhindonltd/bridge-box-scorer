import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MovementRounds from "./MovementRounds";

// Mock MovementRound to avoid deep rendering dependencies
vi.mock("@/components/movement/MovementRound", () => ({
  default: ({ round }: any) => (
    <div data-testid="movement-round">{round.round}</div>
  ),
}));

describe("MovementRounds", () => {
  const roundsMock = {
    rounds: [
      { round: 1, tables: [] },
      { round: 2, tables: [] },
      { round: 3, tables: [] },
    ],
  } as any;

  it("renders all rounds", () => {
    render(<MovementRounds rounds={roundsMock} />);

    const items = screen.getAllByTestId("movement-round");

    expect(items).toHaveLength(3);
  });

  it("passes correct round numbers", () => {
    render(<MovementRounds rounds={roundsMock} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders container", () => {
    const { container } = render(<MovementRounds rounds={roundsMock} />);

    const root = container.firstChild as HTMLElement;

    expect(root).toHaveClass("p-6", "space-y-4");
  });

  it("renders no rounds when empty", () => {
    render(<MovementRounds rounds={{ rounds: [] } as any} />);

    expect(screen.queryAllByTestId("movement-round")).toHaveLength(0);
  });
});
