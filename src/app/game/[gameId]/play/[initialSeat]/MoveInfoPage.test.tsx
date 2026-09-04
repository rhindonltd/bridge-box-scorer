import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MoveInfoPage } from "@/app/game/[gameId]/play/[initialSeat]/MoveInfoPage";

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

describe("MoveInfoPage", () => {
  it("shows the destination table when not sitting out", () => {
    const onContinue = vi.fn();
    render(
      <MoveInfoPage
        roundNumber={3}
        tableNumber={4}
        sitOut={false}
        onMoveInfoContinue={onContinue}
      />,
    );

    expect(screen.getByText("Move to")).toBeInTheDocument();
    expect(screen.getByText("Table 4")).toBeInTheDocument();
    expect(screen.getByText("Round 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("shows a sit-out screen when the next round is a sit-out", () => {
    const onContinue = vi.fn();
    render(
      <MoveInfoPage
        roundNumber={5}
        tableNumber={2}
        sitOut={true}
        onMoveInfoContinue={onContinue}
      />,
    );

    expect(screen.getByText("Sit Out")).toBeInTheDocument();
    expect(screen.getByText("Round 5")).toBeInTheDocument();
    expect(screen.queryByText("Move to")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
