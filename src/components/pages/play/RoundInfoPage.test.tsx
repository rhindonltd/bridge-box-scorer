import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RoundInfoPage } from "./RoundInfoPage";

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    game: { eventName: "Monday Pairs", gameId: "g1", gameType: "PAIRS", tables: 5 },
  }),
}));

vi.mock("@/context/AssignmentContext", () => ({
  useAssignment: () => ({
    assignment: { type: "PAIR", id: "2" },
  }),
}));

vi.mock("@/components/play/RoundInfo", () => ({
  default: ({ boards, table, players }: any) => (
    <div data-testid="round-info">
      boards:{boards.length}-table:{table}-players:{Object.keys(players).length}
    </div>
  ),
}));

describe("RoundInfoPage", () => {
  const baseProps = {
    round: 2,
    table: 5,
    boards: [1, 2, 3],
    players: {
      N: { id: "n" },
      S: { id: "s" },
      E: { id: "e" },
      W: { id: "w" },
    } as any,
    onEnterRound: vi.fn(),
  };

  it("renders header with event name and pair info", () => {
    render(<RoundInfoPage {...baseProps} />);
    expect(screen.getByText("Monday Pairs")).toBeInTheDocument();
    expect(screen.getByText("Pair 2")).toBeInTheDocument();
  });

  it("renders table and round in header detail", () => {
    render(<RoundInfoPage {...baseProps} />);
    expect(screen.getByText("Table 5, Round 2")).toBeInTheDocument();
  });

  it("renders RoundInfo with correct props", () => {
    render(<RoundInfoPage {...baseProps} />);
    expect(screen.getByText("boards:3-table:5-players:4")).toBeInTheDocument();
  });

  it("renders Enter Round button", () => {
    render(<RoundInfoPage {...baseProps} />);
    expect(
      screen.getByRole("button", { name: "Enter Round" }),
    ).toBeInTheDocument();
  });

  it("calls onEnterRound when button clicked", () => {
    const fn = vi.fn();
    render(<RoundInfoPage {...baseProps} onEnterRound={fn} />);
    fireEvent.click(screen.getByRole("button", { name: "Enter Round" }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("applies layout classes", () => {
    const { container } = render(<RoundInfoPage {...baseProps} />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("flex-1", "flex", "flex-col");
  });

  it("centers RoundInfo container", () => {
    render(<RoundInfoPage {...baseProps} />);
    const wrapper = screen.getByTestId("round-info").parentElement;
    expect(wrapper).toHaveClass(
      "flex-1",
      "flex",
      "items-center",
      "justify-center",
      "p-2",
      "min-h-0",
    );
  });
});
