import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// The real layout reads the game from context; the page's own content is what
// matters here.
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

import { SetupMenuPage } from "./SetupMenuPage";

function setup() {
  const handlers = {
    onGameDetailsClick: vi.fn(),
    onTablesClick: vi.fn(),
    onMovementClick: vi.fn(),
    onTimerClick: vi.fn(),
    onStartGameClick: vi.fn(),
    onShareAccessClick: vi.fn(),
    onDeleteGameClick: vi.fn(),
  };
  render(<SetupMenuPage {...handlers} />);
  return handlers;
}

describe("SetupMenuPage", () => {
  it("is titled Set Up Game", () => {
    setup();
    expect(screen.getByText("Set Up Game")).toBeInTheDocument();
  });

  it.each([
    ["Game Details", "onGameDetailsClick"],
    ["Tables", "onTablesClick"],
    ["Movement", "onMovementClick"],
    ["Timer", "onTimerClick"],
    ["Start Game", "onStartGameClick"],
    ["Share Director Access", "onShareAccessClick"],
    ["Delete Game", "onDeleteGameClick"],
  ] as const)("%s calls its handler", async (label, handler) => {
    const handlers = setup();
    await userEvent.click(screen.getByRole("button", { name: label }));
    expect(handlers[handler]).toHaveBeenCalledTimes(1);
  });
});
