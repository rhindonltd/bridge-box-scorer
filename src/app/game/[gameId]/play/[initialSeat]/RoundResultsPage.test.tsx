import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockUseRoundResults = vi.fn();
vi.mock("./useRoundResults", () => ({
  useRoundResults: (...a: unknown[]) => mockUseRoundResults(...a),
}));
const mockBuild = vi.fn();
vi.mock("@/scoring/swiss/team-board-result-view", () => ({
  buildTeamBoardResultTable: (...a: unknown[]) => mockBuild(...a),
}));
vi.mock("@/components/scoring/ScoreTableView", () => ({
  ScoreTableView: () => <div data-testid="score-table" />,
}));

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backAction,
    headerRight,
    actions,
    children,
  }: any) => (
    <div>
      {backAction && (
        <button aria-label="Go back" onClick={backAction}>
          back
        </button>
      )}
      <h1>{headerTitle}</h1>
      {headerRight}
      {children}
      <div>{actions}</div>
    </div>
  ),
}));

import { RoundResultsPage, RoundResultsLoader } from "./RoundResultsPage";

describe("RoundResultsPage", () => {
  it("shows a spinner while loading and continues on click", () => {
    const onContinue = vi.fn();
    render(<RoundResultsPage results={null} onContinue={onContinue} />);
    expect(screen.getByText("Loading team results...")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("round-results-continue"));
    expect(onContinue).toHaveBeenCalled();
  });

  it("renders a table or a fallback per board", () => {
    render(
      <RoundResultsPage
        results={[
          { boardNumber: 1, table: {} as any },
          { boardNumber: 2, table: null },
        ]}
        onContinue={vi.fn()}
        headerRight={<span>menu</span>}
      />,
    );
    expect(screen.getByText("Board 1")).toBeInTheDocument();
    expect(screen.getByTestId("score-table")).toBeInTheDocument();
    expect(
      screen.getByText("No comparable result on this board."),
    ).toBeInTheDocument();
  });
});

describe("RoundResultsLoader", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is loading while the hook returns null", () => {
    mockUseRoundResults.mockReturnValue(null);
    render(
      <RoundResultsLoader
        gameId="g1"
        seat="A1NS"
        boards={[1]}
        onContinue={vi.fn()}
      />,
    );
    expect(screen.getByText("Loading team results...")).toBeInTheDocument();
  });

  it("builds a table per board from the live instances", () => {
    mockBuild.mockReturnValue(null);
    mockUseRoundResults.mockReturnValue(
      new Map([
        [
          1,
          [
            {
              tableNumber: 3,
              participants: { ns: "n", ew: "e" },
              currentResult: "r",
              status: "CONFIRMED",
            },
          ],
        ],
      ]),
    );
    render(
      <RoundResultsLoader
        gameId="g1"
        seat="A1NS"
        boards={[1, 2]}
        onContinue={vi.fn()}
      />,
    );
    expect(mockBuild).toHaveBeenCalledWith(
      [
        {
          tableNumber: 3,
          ns: "n",
          ew: "e",
          result: "r",
          status: "CONFIRMED",
        },
      ],
      1,
      "A1NS",
    );
    expect(mockBuild).toHaveBeenCalledWith([], 2, "A1NS");
    expect(screen.getByText("Board 2")).toBeInTheDocument();
  });
});
