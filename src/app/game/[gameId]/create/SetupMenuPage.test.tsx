import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// The real layout reads the game from context; the page's own content is what
// matters here.
vi.mock("@/components/layout/PageLayout", () => ({
  PageLayout: ({
    headerTitle,
    children,
  }: {
    headerTitle: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{`draft ${headerTitle}`}</h1>
      {children}
    </div>
  ),
}));

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
      <h1>{headerTitle}</h1>
      {headerRight}
      {children}
    </div>
  ),
}));

import { SetupMenuPage } from "./SetupMenuPage";

function setup() {
  const handlers = {
    onGameDetailsClick: vi.fn(),
    onTablesClick: vi.fn(),
    onMovementClick: vi.fn(),
    onTimerClick: vi.fn(),
    onStartGameClick: vi.fn(),
    onDeleteGameClick: vi.fn(),
  };
  render(
    <SetupMenuPage headerRight={<span>header-right</span>} {...handlers} />,
  );
  return handlers;
}

describe("SetupMenuPage", () => {
  it("is titled Set Up Game and shows the header content", () => {
    setup();
    expect(screen.getByText("Set Up Game")).toBeInTheDocument();
    expect(screen.getByText("header-right")).toBeInTheDocument();
  });

  it.each([
    ["Game Details", "onGameDetailsClick"],
    ["Tables", "onTablesClick"],
    ["Movement", "onMovementClick"],
    ["Timer", "onTimerClick"],
    ["Start Game", "onStartGameClick"],
    ["Delete Game", "onDeleteGameClick"],
  ] as const)("%s calls its handler", async (label, handler) => {
    const handlers = setup();
    await userEvent.click(screen.getByRole("button", { name: label }));
    expect(handlers[handler]).toHaveBeenCalledTimes(1);
  });

  it("for a game not created yet, only Game Details is available", async () => {
    const onGameDetailsClick = vi.fn();
    render(<SetupMenuPage draft onGameDetailsClick={onGameDetailsClick} />);

    // No game yet, so the plain layout is used.
    expect(screen.getByText("draft Set Up Game")).toBeInTheDocument();
    for (const name of [
      "Tables",
      "Movement",
      "Timer",
      "Start Game",
      "Delete Game",
    ]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
    await userEvent.click(screen.getByRole("button", { name: "Game Details" }));
    expect(onGameDetailsClick).toHaveBeenCalledTimes(1);
  });
});
