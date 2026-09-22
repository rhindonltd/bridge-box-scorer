import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseParams = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => mockUseParams(),
}));

const mockUseRequiredGame = vi.fn();
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => mockUseRequiredGame(),
}));

const mockUsePlayFlow = vi.fn();
vi.mock("@/hooks/play-flow", () => ({
  usePlayFlow: (...a: unknown[]) => mockUsePlayFlow(...a),
}));

vi.mock("@/components/common/Spinner", () => ({
  FullScreenSpinner: () => <div data-testid="spinner" />,
}));

// Stub the two delegates so we assert only PlayPage's own branching + wiring.
vi.mock("@/app/game/[gameId]/play/[initialSeat]/WaitingToStartPage", () => ({
  WaitingToStartPage: ({ gameId, seat }: { gameId: string; seat: string }) => (
    <div data-testid="waiting-to-start">{`${gameId}:${seat}`}</div>
  ),
}));

vi.mock("@/app/game/[gameId]/play/[initialSeat]/PlayStateRouter", () => ({
  PlayStateRouter: ({
    gameId,
    seat,
    scoringType,
    leadCardRequired,
  }: {
    gameId: string;
    seat: string;
    scoringType: string;
    leadCardRequired: boolean;
  }) => (
    <div data-testid="play-state-router">
      {`${gameId}:${seat}:${scoringType}:${leadCardRequired}`}
    </div>
  ),
}));

import { PlayPage } from "./PlayPage";

describe("PlayPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ initialSeat: "A3NS" });
    mockUseRequiredGame.mockReturnValue({
      game: {
        gameId: "g1",
        scoringType: "MP",
        leadCardRequired: true,
        handEntryEnabled: true,
      },
    });
  });

  it("shows the waiting screen while the director has not started the game", () => {
    mockUsePlayFlow.mockReturnValue({
      waitingToStart: true,
      schedule: null,
      playState: { state: "loading" },
    });

    render(<PlayPage />);

    expect(screen.getByTestId("waiting-to-start")).toHaveTextContent("g1:A3NS");
    expect(screen.queryByTestId("play-state-router")).toBeNull();
  });

  it("shows a spinner in the brief gap before the schedule is ready", () => {
    mockUsePlayFlow.mockReturnValue({
      waitingToStart: false,
      schedule: null,
      playState: { state: "loading" },
    });

    render(<PlayPage />);

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("play-state-router")).toBeNull();
  });

  it("delegates to the play-state router with the game's config once ready", () => {
    mockUsePlayFlow.mockReturnValue({
      waitingToStart: false,
      schedule: { assignmentId: "1NS", side: "NS", rounds: [] },
      playState: { state: "roundInfo", roundIndex: 0 },
    });

    render(<PlayPage />);

    expect(screen.getByTestId("play-state-router")).toHaveTextContent(
      "g1:A3NS:MP:true",
    );
    // usePlayFlow is driven by the resolved game id, seat, and the game's
    // hand-entry setting.
    expect(mockUsePlayFlow).toHaveBeenCalledWith("g1", "A3NS", true);
  });
});
