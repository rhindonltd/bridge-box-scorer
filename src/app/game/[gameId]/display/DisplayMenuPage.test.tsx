import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    children,
  }: {
    headerTitle: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
      {children}
    </div>
  ),
}));

import { DisplayMenuPage } from "./DisplayMenuPage";

describe("DisplayMenuPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders both menu buttons and wires their handlers", () => {
    const onTimerClick = vi.fn();
    const onLeaderboardClick = vi.fn();
    render(
      <DisplayMenuPage
        onTimerClick={onTimerClick}
        onLeaderboardClick={onLeaderboardClick}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Display Menu" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Timer" }));
    expect(onTimerClick).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Leaderboard" }));
    expect(onLeaderboardClick).toHaveBeenCalled();
  });
});
