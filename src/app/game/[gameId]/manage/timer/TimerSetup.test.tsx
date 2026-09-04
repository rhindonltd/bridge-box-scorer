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

import { TimerSetup, msToLabel, resumeAtToMs } from "./TimerSetup";

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

  it("emits previous and adjust events for a paused session", () => {
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

    render(<TimerSetup />);

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

    // Toggle "apply to future" and adjust again.
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

  it("uses per-board timing to multiply the play duration when creating", () => {
    render(<TimerSetup />);

    fireEvent.click(screen.getByLabelText("Per Board"));
    // default play 2m = 120s, boardsPerRound 3 -> 360s per round.
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(mockEmit).toHaveBeenCalledWith(
      SocketEvents.CREATE_TIMER,
      expect.objectContaining({ playDuration: 360 }),
    );
  });

  it("adds, edits (duration + resume) and removes breaks, feeding them to the payload", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T09:00:00").getTime());
    try {
      render(<TimerSetup />);

      // Fire the seed + interval tick so tick-derived memos (breakConfigs,
      // computed lengths, preview end) execute.
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Add a break (duration mode by default).
      fireEvent.click(screen.getByRole("button", { name: "+ Add break" }));
      fireEvent.change(screen.getByLabelText("Break 1 after round"), {
        target: { value: "2" },
      });
      fireEvent.change(screen.getByLabelText("Break 1 duration minutes"), {
        target: { value: "5" },
      });

      // Switch the break to resume-time mode and set a time -> computed length.
      fireEvent.click(
        screen.getByRole("radio", { name: "Resume at time" }),
      );
      fireEvent.change(screen.getByLabelText("Break 1 resume time"), {
        target: { value: "23:59" },
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      fireEvent.click(screen.getByRole("button", { name: "Create" }));
      const createCall = mockEmit.mock.calls.find(
        (c) => c[0] === SocketEvents.CREATE_TIMER,
      );
      expect(createCall).toBeTruthy();
      expect(createCall![1].breaks).toHaveLength(1);
      expect(createCall![1].breaks[0]).toMatchObject({
        afterRound: 2,
        mode: "resumeTime",
      });

      // Switch back to duration mode, then remove the break.
      fireEvent.click(screen.getByRole("radio", { name: "Duration" }));
      fireEvent.change(screen.getByLabelText("Break 1 duration minutes"), {
        target: { value: "8" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Remove break 1" }));
      expect(
        screen.getByText("No breaks scheduled."),
      ).toBeInTheDocument();
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
    // Break row exists with an after-round input.
    expect(screen.getByLabelText("Break 1 after round")).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    const call = mockEmit.mock.calls.find(
      (c) => c[0] === SocketEvents.CREATE_TIMER,
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

  it("formats a session length in minutes and seconds", () => {
    render(<TimerSetup />);

    // 2 rounds, play 1m0s, move 0m30s (perRound) ->
    // 2*60 + 1*30 = 150s -> "2m 30s" (minutes>0, hours==0).
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

    // 1 round, play 0m30s, no move (totalRounds-1 = 0) -> 30s -> "30s".
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

  it("msToLabel formats durations across the zero/minutes/hours branches", () => {
    // Direct unit coverage of the pure label helper. Driving the hours branch
    // purely through the tick-derived UI is timing-sensitive, so this asserts
    // every branch deterministically.
    expect(msToLabel(0)).toBe("0m"); // totalMinutes <= 0
    expect(msToLabel(-5000)).toBe("0m"); // negative rounds to <= 0
    expect(msToLabel(20 * 60_000)).toBe("20m"); // minutes only (h === 0)
    expect(msToLabel(75 * 60_000)).toBe("1h 15m"); // hours branch (line 41)
    expect(msToLabel(2 * 60 * 60_000)).toBe("2h 0m"); // whole hours
  });

  it("resumeAtToMs parses HH:MM against a reference, rolling past times to the next day", () => {
    const noon = new Date("2024-06-01T12:00:00").getTime();

    // Malformed input returns the reference unchanged.
    expect(resumeAtToMs("bad", noon)).toBe(noon);
    expect(resumeAtToMs("12:xx", noon)).toBe(noon);

    // A time later the same day stays on that day.
    const sameDay = resumeAtToMs("14:30", noon);
    const d1 = new Date(sameDay);
    expect(d1.getDate()).toBe(1);
    expect(d1.getHours()).toBe(14);
    expect(d1.getMinutes()).toBe(30);

    // A time earlier than the reference rolls to the next day (line 30 branch).
    const nextDay = resumeAtToMs("08:00", noon);
    const d2 = new Date(nextDay);
    expect(d2.getDate()).toBe(2);
    expect(d2.getHours()).toBe(8);
    expect(nextDay).toBeGreaterThan(noon);
  });

  it("computes a minutes-only break length (under an hour)", async () => {
    // Noon reference. Two short rounds so the prior play-end for the break
    // after round 1 is close to noon, and a resume time a few minutes later
    // yields a sub-hour break -> msToLabel's minutes-only return branch.
    const noon = new Date("2024-06-01T12:00:00").getTime();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(noon);

    render(<TimerSetup />);

    // Keep the play duration tiny so play for round 1 ends ~ noon.
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

    // Resume at 12:20 -> ~20 minute break (h === 0 -> "20m break").
    fireEvent.change(screen.getByLabelText("Break 1 resume time"), {
      target: { value: "12:20" },
    });

    await waitFor(() =>
      expect(screen.getByText(/20m break/)).toBeInTheDocument(),
    );

    nowSpy.mockRestore();
  });

  it("falls back to the reference time when a break's round is out of range", async () => {
    const noon = new Date("2024-06-01T12:00:00").getTime();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(noon);

    render(<TimerSetup />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add break" }));
    // afterRound 0 is not present in playEndByRound (rounds are 1..totalRounds)
    // so `playEndByRound.get(0) ?? reference` takes the reference fallback.
    fireEvent.change(screen.getByLabelText("Break 1 after round"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Resume at time" }));
    fireEvent.change(screen.getByLabelText("Break 1 resume time"), {
      target: { value: "12:10" },
    });

    // Length measured from the reference (noon) -> "10m break".
    await waitFor(() =>
      expect(screen.getByText(/10m break/)).toBeInTheDocument(),
    );

    nowSpy.mockRestore();
  });

  it("changes only the targeted break when several exist", () => {
    render(<TimerSetup />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add break" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add break" }));

    // Editing the second break must leave the first untouched (the map's
    // `i === index ? ... : b` false branch).
    fireEvent.change(screen.getByLabelText("Break 2 after round"), {
      target: { value: "5" },
    });

    expect(screen.getByLabelText("Break 2 after round")).toHaveValue(5);
    // First break keeps its original afterRound (1).
    expect(screen.getByLabelText("Break 1 after round")).toHaveValue(1);
  });
});
