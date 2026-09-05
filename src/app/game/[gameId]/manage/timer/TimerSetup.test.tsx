import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: { gameId: "g1", gameType: "PAIRS" },
  }),
}));

let mockTimerState: unknown = null;
vi.mock("@/context/TimerContext", () => ({
  TimerProvider: ({ children }: { children: React.ReactNode }) => children,
  useTimerContext: () => ({
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

import {
  TimerSetup,
  TimerManager,
  msToLabel,
  resumeAtToMs,
} from "./TimerSetup";

describe("TimerSetup (config screen)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimerState = null;
  });

  it("saves the current config with timer:saveConfig and shows no run controls", () => {
    render(<TimerSetup />);

    // Config-only: no Create/Start/Pause on the setup screen.
    expect(screen.queryByRole("button", { name: "Create" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.SAVE_CONFIG_TIMER,
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

  it("reflects config edits in the save payload", () => {
    render(<TimerSetup />);

    fireEvent.change(screen.getByLabelText("Total Rounds"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Play minutes"), {
      target: { value: "7" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.SAVE_CONFIG_TIMER,
      expect.objectContaining({
        totalRounds: 10,
        playDuration: 420,
      }),
    );
  });

  it("uses per-board timing to multiply the play duration when saving", () => {
    render(<TimerSetup />);

    fireEvent.click(screen.getByLabelText("Per Board"));
    // default play 2m = 120s, boardsPerRound 3 -> 360s per round.
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.SAVE_CONFIG_TIMER,
      expect.objectContaining({ playDuration: 360 }),
    );
  });

  it("routes every config field through the onConfigChange switch", () => {
    render(<TimerSetup />);

    fireEvent.change(screen.getByLabelText("Boards / Round"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("Play seconds"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Move minutes"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Move seconds"), {
      target: { value: "20" },
    });
    fireEvent.change(
      screen.getByLabelText("Warning at (seconds before end of play)"),
      { target: { value: "45" } },
    );
    fireEvent.click(screen.getByLabelText("Per Board"));

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const call = mockEmit.mock.calls.find(
      (c) => c[0] === SocketEvents.SAVE_CONFIG_TIMER,
    );
    expect(call![1]).toMatchObject({
      boardsPerRound: 4,
      warningSeconds: 45,
      // per board: play (2m10s = 130s) * 4 boards = 520
      playDuration: 520,
      // move 2m20s = 140s
      moveDuration: 140,
    });
  });

  it("seeds the form from a saved (configured, not-started) timer state", () => {
    mockTimerState = {
      version: 1,
      phase: null,
      board: 1,
      round: 1,
      boardsPerRound: 2,
      totalRounds: 11,
      playDuration: 300, // 5m
      moveDuration: 120, // 2m
      breaks: [],
      warningSeconds: 30,
      isRunning: false,
      phaseStartedAt: null,
      remainingMs: null,
      breakDurationMs: null,
    };

    render(<TimerSetup />);

    expect(screen.getByLabelText("Total Rounds")).toHaveValue(11);
    expect(screen.getByLabelText("Boards / Round")).toHaveValue(2);
    expect(screen.getByLabelText("Play minutes")).toHaveValue(5);
    expect(screen.getByLabelText("Move minutes")).toHaveValue(2);
    expect(
      screen.getByLabelText("Warning at (seconds before end of play)"),
    ).toHaveValue(30);
  });

  it("renders without the page header when embedded", () => {
    render(<TimerSetup embedded />);

    expect(screen.queryByText("Timer Setup")).toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("adds, edits (duration + resume) and removes breaks, feeding them to the payload", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T09:00:00").getTime());
    try {
      render(<TimerSetup />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      fireEvent.click(screen.getByRole("button", { name: "+ Add break" }));
      fireEvent.change(screen.getByLabelText("Break 1 after round"), {
        target: { value: "2" },
      });
      fireEvent.change(screen.getByLabelText("Break 1 duration minutes"), {
        target: { value: "5" },
      });

      fireEvent.click(
        screen.getByRole("radio", { name: "Resume at time" }),
      );
      fireEvent.change(screen.getByLabelText("Break 1 resume time"), {
        target: { value: "23:59" },
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      const saveCall = mockEmit.mock.calls.find(
        (c) => c[0] === SocketEvents.SAVE_CONFIG_TIMER,
      );
      expect(saveCall).toBeTruthy();
      expect(saveCall![1].breaks).toHaveLength(1);
      expect(saveCall![1].breaks[0]).toMatchObject({
        afterRound: 2,
        mode: "resumeTime",
      });

      fireEvent.click(screen.getByRole("radio", { name: "Duration" }));
      fireEvent.change(screen.getByLabelText("Break 1 duration minutes"), {
        target: { value: "8" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Remove break 1" }));
      expect(screen.getByText("No breaks scheduled.")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("adds a break when totalRounds is 1 (afterRound clamps to 1)", () => {
    render(<TimerSetup />);
    fireEvent.change(screen.getByLabelText("Total Rounds"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Add break" }));
    expect(screen.getByLabelText("Break 1 after round")).toBeInTheDocument();
  });

  it("formats a session length in minutes and seconds", () => {
    render(<TimerSetup />);

    fireEvent.change(screen.getByLabelText("Total Rounds"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Play minutes"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Play seconds"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Move minutes"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Move seconds"), {
      target: { value: "30" },
    });

    expect(screen.getByText("2m 30s")).toBeInTheDocument();
  });

  it("formats a session length in seconds only", () => {
    render(<TimerSetup />);

    fireEvent.change(screen.getByLabelText("Total Rounds"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Play minutes"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Play seconds"), {
      target: { value: "30" },
    });

    expect(screen.getByText("30s")).toBeInTheDocument();
  });

  it("computes a minutes-only break length (under an hour)", async () => {
    const noon = new Date("2024-06-01T12:00:00").getTime();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(noon);

    render(<TimerSetup />);

    fireEvent.change(screen.getByLabelText("Total Rounds"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Play minutes"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Play seconds"), {
      target: { value: "0" },
    });

    fireEvent.click(screen.getByRole("button", { name: "+ Add break" }));
    fireEvent.change(screen.getByLabelText("Break 1 after round"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Resume at time" }));
    fireEvent.change(screen.getByLabelText("Break 1 resume time"), {
      target: { value: "12:20" },
    });

    await waitFor(() =>
      expect(screen.getByText(/20m break/)).toBeInTheDocument(),
    );

    nowSpy.mockRestore();
  });

  it("changes only the targeted break when several exist", () => {
    render(<TimerSetup />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add break" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add break" }));

    fireEvent.change(screen.getByLabelText("Break 2 after round"), {
      target: { value: "5" },
    });

    expect(screen.getByLabelText("Break 2 after round")).toHaveValue(5);
    expect(screen.getByLabelText("Break 1 after round")).toHaveValue(1);
  });
});

describe("TimerManager (routes by started state)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimerState = null;
  });

  it("shows the config screen when the game has not started", () => {
    render(<TimerManager started={false} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply Changes" })).toBeNull();
  });

  it("shows the live controls when the game is in progress", () => {
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

    render(<TimerManager started={true} />);

    fireEvent.click(screen.getByRole("button", { name: "Apply Changes" }));
    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.UPDATE_CONFIG_TIMER,
      expect.objectContaining({ gameId: "g1" }),
    );

    // Running -> primary action is Pause.
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.PAUSE_TIMER,
      expect.objectContaining({ gameId: "g1", directorToken: "token" }),
    );
  });

  it("emits start, next, previous and adjust for a paused live session", () => {
    mockTimerState = {
      phase: "play",
      round: 2,
      totalRounds: 8,
      board: 1,
      boardsPerRound: 3,
      isRunning: false,
      playDuration: 120,
      moveDuration: 90,
      phaseStartedAt: null,
      remainingMs: null,
    };

    render(<TimerManager started={true} />);

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

    fireEvent.click(screen.getByRole("button", { name: "+1m" }));
    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.ADJUST_TIME_TIMER,
      expect.objectContaining({
        gameId: "g1",
        deltaSeconds: 60,
        applyToFutureSameType: false,
      }),
    );

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /Apply to all subsequent phases/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "−15s" }));
    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.ADJUST_TIME_TIMER,
      expect.objectContaining({
        deltaSeconds: -15,
        applyToFutureSameType: true,
      }),
    );
  });
});

describe("timer config helpers", () => {
  it("msToLabel formats durations across the zero/minutes/hours branches", () => {
    expect(msToLabel(0)).toBe("0m");
    expect(msToLabel(-5000)).toBe("0m");
    expect(msToLabel(20 * 60_000)).toBe("20m");
    expect(msToLabel(75 * 60_000)).toBe("1h 15m");
    expect(msToLabel(2 * 60 * 60_000)).toBe("2h 0m");
  });

  it("resumeAtToMs parses HH:MM against a reference, rolling past times to the next day", () => {
    const noon = new Date("2024-06-01T12:00:00").getTime();

    expect(resumeAtToMs("bad", noon)).toBe(noon);
    expect(resumeAtToMs("12:xx", noon)).toBe(noon);

    const sameDay = resumeAtToMs("14:30", noon);
    const d1 = new Date(sameDay);
    expect(d1.getDate()).toBe(1);
    expect(d1.getHours()).toBe(14);
    expect(d1.getMinutes()).toBe(30);

    const nextDay = resumeAtToMs("08:00", noon);
    const d2 = new Date(nextDay);
    expect(d2.getDate()).toBe(2);
    expect(d2.getHours()).toBe(8);
    expect(nextDay).toBeGreaterThan(noon);
  });
});
