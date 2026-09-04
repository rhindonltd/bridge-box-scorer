import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { WaitingForConfirmation } from "@/app/game/[gameId]/play/[initialSeat]/WaitingForConfirmation";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    children,
  }: {
    headerTitle: string;
    children: React.ReactNode;
  }) => (
    <div>
      <div data-testid="header">{headerTitle}</div>
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
});
