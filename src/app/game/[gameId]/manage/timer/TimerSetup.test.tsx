import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: { gameId: "g1", gameType: "PAIRS" },
  }),
}));

let mockTimerState: unknown = null;
vi.mock("@/hooks/timer-sync", () => ({
  useTimerSync: () => ({
    timerState: mockTimerState,
    breakProblems: [],
    now: () => Date.now(),
    isConnected: !!mockTimerState,
  }),
}));

const mockEmit = vi.fn();
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ emit: mockEmit }),
}));

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: () => "token",
}));

import { TimerSetup } from "./TimerSetup";

describe("TimerSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimerState = null;
  });

  it("creates a timer with the current config when no session exists", () => {
    render(<TimerSetup />);

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.CREATE_TIMER,
      expect.objectContaining({
        gameId: "g1",
        gameType: "PAIRS",
        directorToken: "token",
        boardsPerRound: 3,
        totalRounds: 8,
        // defaults: play 2m0s = 120s (perRound), move 1m30s = 90s
        playDuration: 120,
        moveDuration: 90,
      }),
    );
  });

  it("reflects config edits in the create payload", () => {
    render(<TimerSetup />);

    fireEvent.change(screen.getByLabelText("Total Rounds"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Play minutes"), {
      target: { value: "7" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.CREATE_TIMER,
      expect.objectContaining({
        totalRounds: 10,
        playDuration: 420,
      }),
    );
  });

  it("emits pause and apply events for a running session", () => {
    mockTimerState = {
      phase: "play",
      round: 1,
      totalRounds: 8,
      board: 1,
      boardsPerRound: 3,
      isRunning: true,
      playDuration: 120,
      moveDuration: 90,
      phaseStartedAt: Date.now(),
      remainingMs: null,
    };

    render(<TimerSetup />);

    fireEvent.click(screen.getByRole("button", { name: "Apply Changes" }));
    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.UPDATE_CONFIG_TIMER,
      expect.objectContaining({ gameId: "g1" }),
    );

    // While running, the primary action is Pause (Start/Resume is hidden).
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.PAUSE_TIMER,
      expect.objectContaining({ gameId: "g1", directorToken: "token" }),
    );
  });

  it("emits start and control events for a paused session", () => {
    mockTimerState = {
      phase: "play",
      round: 1,
      totalRounds: 8,
      board: 1,
      boardsPerRound: 3,
      isRunning: false,
      playDuration: 120,
      moveDuration: 90,
      phaseStartedAt: null,
      remainingMs: null,
    };

    render(<TimerSetup />);

    // Not running and no remaining -> the primary action reads "Start".
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.START_TIMER,
      expect.objectContaining({ gameId: "g1", directorToken: "token" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Next phase" }));
    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.NEXT_ROUND_TIMER,
      expect.objectContaining({ gameId: "g1", directorToken: "token" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Previous phase" }));
    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.PREVIOUS_TIMER,
      expect.objectContaining({ gameId: "g1", directorToken: "token" }),
    );
  });

  it("renders without the page header when embedded", () => {
    render(<TimerSetup embedded />);

    // Standalone mode shows the "Timer Controls" page title; embedded omits it.
    expect(screen.queryByText("Timer Controls")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});
