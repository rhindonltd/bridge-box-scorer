import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { AwaitingNextRoundPage } from "@/app/game/[gameId]/play/[initialSeat]/AwaitingNextRoundPage";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    headerRight,
    children,
  }: {
    headerTitle: string;
    headerRight?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div data-testid="header">{headerTitle}</div>
      <div data-testid="header-right">{headerRight}</div>
      {children}
    </div>
  ),
}));

describe("AwaitingNextRoundPage", () => {
  it("shows the exact waiting copy and the completed round", () => {
    render(<AwaitingNextRoundPage completedRound={3} />);

    expect(
      screen.getByText("Waiting for the director to draw the next round"),
    ).toBeInTheDocument();
    expect(screen.getByText("Round 3 complete")).toBeInTheDocument();
  });

  it("announces the wait politely for assistive tech", () => {
    render(<AwaitingNextRoundPage completedRound={1} />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(
      "Waiting for the director to draw the next round",
    );
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("offers no Continue button (the player can't advance until the draw)", () => {
    render(<AwaitingNextRoundPage completedRound={2} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the headerRight slot (the play menu)", () => {
    render(
      <AwaitingNextRoundPage
        completedRound={2}
        headerRight={<span data-testid="play-menu">menu</span>}
      />,
    );
    expect(screen.getByTestId("play-menu")).toBeInTheDocument();
  });
});
