import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultMismatch } from "@/app/game/[gameId]/play/[initialSeat]/ResultMismatch";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    actions,
    children,
  }: {
    headerTitle: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div data-testid="header">{headerTitle}</div>
      {children}
      <div data-testid="actions">{actions}</div>
    </div>
  ),
}));

vi.mock("@/components/traveller/BoardResult", () => ({
  BoardResult: ({ boardOutcome }: { boardOutcome: string }) => (
    <span data-testid="board-result">{boardOutcome}</span>
  ),
}));

describe("ResultMismatch", () => {
  it("renders a same-board result mismatch (boards match)", () => {
    const onReenter = vi.fn();
    render(
      <ResultMismatch
        nsBoardNumber={5}
        nsResult="3NTN="
        ewBoardNumber={5}
        ewResult="3NTN+1"
        onReenter={onReenter}
      />,
    );

    // Header uses the board number when both boards match.
    expect(screen.getByTestId("header")).toHaveTextContent("Board 5");
    expect(
      screen.getByText(/entered different results/),
    ).toBeInTheDocument();
    // No per-board "Board N:" prefixes rendered.
    expect(screen.queryByText(/Board 5:/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Re-enter Result" }));
    expect(onReenter).toHaveBeenCalledTimes(1);
  });

  it("renders a board mismatch (boards differ)", () => {
    render(
      <ResultMismatch
        nsBoardNumber={5}
        nsResult="3NTN="
        ewBoardNumber={6}
        ewResult="4SE="
        onReenter={vi.fn()}
      />,
    );

    expect(screen.getByTestId("header")).toHaveTextContent("Mismatch");
    expect(
      screen.getByText(/results for different boards/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Board 5:/)).toBeInTheDocument();
    expect(screen.getByText(/Board 6:/)).toBeInTheDocument();
  });
});
