import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1" } }),
}));

const mockUseGameStarted = vi.fn();
vi.mock("@/hooks/game-started", () => ({
  useGameStarted: () => mockUseGameStarted(),
}));

vi.mock("./TimerSetup", () => ({
  TimerManager: ({ started }: { started: boolean }) => (
    <div data-testid="timer-manager">{started ? "live" : "config"}</div>
  ),
}));

import ManageTimerPage from "./ManageTimerPage";

describe("ManageTimerPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes started=false to the manager before the game starts", () => {
    mockUseGameStarted.mockReturnValue({ started: false });
    render(<ManageTimerPage />);
    expect(screen.getByTestId("timer-manager")).toHaveTextContent("config");
  });

  it("passes started=true to the manager once the game is in progress", () => {
    mockUseGameStarted.mockReturnValue({ started: true });
    render(<ManageTimerPage />);
    expect(screen.getByTestId("timer-manager")).toHaveTextContent("live");
  });
});
