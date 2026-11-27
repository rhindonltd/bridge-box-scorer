import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScoreBreakPage } from "@/app/game/[gameId]/play/[initialSeat]/ScoreBreakPage";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    headerRight,
    actions,
    children,
  }: {
    headerTitle: string;
    headerRight?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div data-testid="header">{headerTitle}</div>
      <div data-testid="header-right">{headerRight}</div>
      {children}
      <div data-testid="actions">{actions}</div>
    </div>
  ),
}));

describe("ScoreBreakPage", () => {
  it("sends the away pair back to its home table and wires continue", () => {
    const onContinue = vi.fn();
    render(
      <ScoreBreakPage
        homeTable={3}
        away
        onContinue={onContinue}
        headerRight={<span data-testid="play-menu">menu</span>}
      />,
    );
    expect(screen.getByTestId("header")).toHaveTextContent("Score Break");
    expect(screen.getByTestId("play-menu")).toBeInTheDocument();
    expect(screen.getByText("Go back to your home table")).toBeInTheDocument();
    expect(screen.getByText("Table 3")).toBeInTheDocument();
    expect(
      screen.getByText("to score up with your team-mates."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("tells the home pair its team-mates are coming back", () => {
    render(<ScoreBreakPage homeTable={2} away={false} onContinue={vi.fn()} />);
    expect(
      screen.getByText("Your team-mates are coming back to"),
    ).toBeInTheDocument();
    expect(screen.getByText("Table 2")).toBeInTheDocument();
    expect(screen.getByText("to score up.")).toBeInTheDocument();
    expect(
      screen.queryByText("Go back to your home table"),
    ).not.toBeInTheDocument();
  });
});
