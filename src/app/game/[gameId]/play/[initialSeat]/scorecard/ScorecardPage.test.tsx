import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { PairScorecard } from "@/model/scorecard";

// Mirrors the real layout's header (an explicit backAction renders a "Go back"
// button), so the page can be rendered without a game context.
vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backAction,
    children,
  }: {
    headerTitle: string;
    backAction?: () => void;
    children: React.ReactNode;
  }) => (
    <div>
      {backAction && (
        <button type="button" aria-label="Go back" onClick={backAction} />
      )}
      <h1>{headerTitle}</h1>
      {children}
    </div>
  ),
}));

import { ScorecardPage } from "./ScorecardPage";

const mpCard: PairScorecard = {
  pairId: "A1NS",
  scoring: "MP",
  boards: [
    {
      roundNumber: 1,
      boardNumber: 1,
      side: "NS",
      opponentId: "A1EW",
      outcome: "3NTN+1",
      score: 430,
      matchpoints: { value: 6, max: 8 },
    },
    {
      roundNumber: 1,
      boardNumber: 2,
      side: "NS",
      opponentId: "A1EW",
      outcome: "PO",
      score: 0,
      matchpoints: { value: 2, max: 8 },
    },
  ],
  roundVps: null,
};

function rows() {
  return screen.getAllByTestId("scorecard-row");
}

describe("ScorecardPage", () => {
  it("shows a spinner while loading", () => {
    const { container } = render(
      <ScorecardPage card={null} loading hideSection onBack={vi.fn()} />,
    );
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("says so when no boards have been played yet", () => {
    render(
      <ScorecardPage
        card={{ ...mpCard, boards: [] }}
        loading={false}
        hideSection
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByText(/No boards played yet/)).toBeInTheDocument();
  });

  it("lists each board plus a total, as a percentage by default", () => {
    render(
      <ScorecardPage
        card={mpCard}
        loading={false}
        hideSection
        onBack={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Scorecard" }),
    ).toBeInTheDocument();
    // Two boards + the Total row.
    expect(rows()).toHaveLength(3);
    expect(within(rows()[0]).getByText("75.00")).toBeInTheDocument();
    expect(within(rows()[0]).getByText("1EW")).toBeInTheDocument();
    expect(within(rows()[2]).getByText("Total")).toBeInTheDocument();
    // 8 of 16 = 50%.
    expect(within(rows()[2]).getByText("50.00")).toBeInTheDocument();
  });

  it("toggles to matchpoints", () => {
    render(
      <ScorecardPage
        card={mpCard}
        loading={false}
        hideSection
        onBack={vi.fn()}
      />,
    );
    // Percentage is selected first, like the leaderboard.
    expect(screen.getByRole("button", { name: "%" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "MP" }));
    expect(within(rows()[0]).getByText("6/8")).toBeInTheDocument();
    expect(within(rows()[2]).getByText("8/16")).toBeInTheDocument();
  });

  it("shows a single IMP view with no toggle", () => {
    render(
      <ScorecardPage
        card={{
          ...mpCard,
          scoring: "IMP",
          boards: mpCard.boards.map((b, i) => ({
            ...b,
            matchpoints: undefined,
            imps: i === 0 ? 5 : -2,
          })),
        }}
        loading={false}
        hideSection
        onBack={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "MP" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("IMPs")).toBeInTheDocument();
    expect(within(rows()[2]).getByText("3")).toBeInTheDocument();
  });

  it("adds a Victory points table for a Swiss event", () => {
    render(
      <ScorecardPage
        card={{
          ...mpCard,
          roundVps: [{ roundNumber: 1, opponentId: "A1EW", vp: 14.52 }],
        }}
        loading={false}
        hideSection
        onBack={vi.fn()}
      />,
    );
    const vp = screen.getByRole("region", { name: "Victory points by round" });
    expect(within(vp).getAllByText("14.52")).toHaveLength(2); // round + total
  });

  it("goes back from the header", () => {
    const onBack = vi.fn();
    render(
      <ScorecardPage
        card={mpCard}
        loading={false}
        hideSection
        onBack={onBack}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(onBack).toHaveBeenCalled();
  });
});
