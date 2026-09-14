import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { WaitingForConfirmation } from "@/app/game/[gameId]/play/[initialSeat]/WaitingForConfirmation";

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

describe("WaitingForConfirmation", () => {
  it("renders the board number in the header and the waiting message", () => {
    render(<WaitingForConfirmation boardNumber={7} />);
    expect(screen.getByText("Board 7")).toBeInTheDocument();
    expect(screen.getByText("Waiting for confirmation")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The other pair needs to enter their result for this board.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the headerRight slot content", () => {
    render(
      <WaitingForConfirmation
        boardNumber={7}
        headerRight={<span data-testid="play-menu">menu</span>}
      />,
    );
    expect(screen.getByTestId("play-menu")).toBeInTheDocument();
  });
});
