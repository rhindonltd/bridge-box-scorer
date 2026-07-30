import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RoundInfoPage } from "./RoundInfoPage";

vi.mock("@/components/common/GameInfo", () => ({
  GameInfo: () => <div data-testid="game-info" />,
}));

vi.mock("@/components/common/ParticipantInfo", () => ({
  ParticipantInfo: () => <div data-testid="participant-info" />,
}));

vi.mock("@/components/common/TableRoundPairBoardInfo", () => ({
  TableRoundPairBoardInfo: ({ round, table }: any) => (
    <div data-testid="table-info">
      R{round}-T{table}
    </div>
  ),
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

  it("renders GameInfo and ParticipantInfo", () => {
    render(<RoundInfoPage {...baseProps} />);
    expect(screen.getByTestId("game-info")).toBeInTheDocument();
    expect(screen.getByTestId("participant-info")).toBeInTheDocument();
  });

  it("renders table round info", () => {
    render(<RoundInfoPage {...baseProps} />);
    expect(screen.getByText("R2-T5")).toBeInTheDocument();
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
    expect(root).toHaveClass("h-dvh", "flex", "flex-col", "bg-gray-100");
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
