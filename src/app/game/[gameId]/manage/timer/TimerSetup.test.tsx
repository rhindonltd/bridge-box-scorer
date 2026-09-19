import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
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

// Timer controls emit via emitWithAck (awaiting the server's ack). Resolve it so
// runControl's `.catch` never fires in tests.
const mockEmitWithAck = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/socket", () => ({
  emitWithAck: (...args: unknown[]) => mockEmitWithAck(...args),
}));

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: () => "token",
}));

const mockSaveTimerConfig = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/timer-service", () => ({
  saveTimerConfig: (...args: unknown[]) => mockSaveTimerConfig(...args),
}));

/** Latest fields passed to saveTimerConfig(gameId, section, fields). */
function lastSave() {
  return mockSaveTimerConfig.mock.calls.at(-1);
}
/** Saves recorded for a given section. */
function savesForSection(section: string) {
  return mockSaveTimerConfig.mock.calls.filter((c) => c[1] === section);
}

// A MITCHELL movement resolves its round structure inline (no fetch), so the
// timer config renders with derived boards/round (3) and total rounds (8).
const mitchellMovement = {
  source: "MITCHELL" as const,
  mitchell: { tables: 4, rounds: 8, boardsPerRound: 3 },
};

// Section list drives the section picker. Default: a single section A with a
// selected movement so the timer config is enabled.
type MockSection = {
  section: string;
  label: string;
  selectedMovement: typeof mitchellMovement | null;
};
let mockSections: MockSection[] = [
  { section: "A", label: "A", selectedMovement: mitchellMovement },
];
vi.mock("@/hooks/sections", () => ({
  useSections: () => ({ sections: mockSections, isLoading: false }),
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
    mockSections = [
      { section: "A", label: "A", selectedMovement: mitchellMovement },
    ];
  });

  it("auto-saves config edits (PUT via the service) and shows no run controls", async () => {
    render(<TimerSetup />);

    // Config-only: no Create/Start/Pause and no Save button on the setup screen.
    expect(screen.queryByRole("button", { name: "Create" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();

    // Editing any field triggers a (debounced) auto-save carrying the config.
    fireEvent.change(
      screen.getByLabelText("Warning at (seconds before end of play)"),
      { target: { value: "45" } },
    );

    await waitFor(() =>
      expect(mockSaveTimerConfig).toHaveBeenLastCalledWith(
        "g1",
        "A",
        expect.objectContaining({
          boardsPerRound: 3,
          totalRounds: 8,
          // defaults: play 7m30s = 450s per board (perBoard) * 3 boards = 1350s,
          // move 1m30s = 90s
          playDuration: 1350,
          moveDuration: 90,
          warningSeconds: 45,
        }),
      ),
    );
  });

  it("reflects editable config edits in the auto-save payload", async () => {
    render(<TimerSetup />);

    fireEvent.change(screen.getByLabelText("Play minutes"), {
      target: { value: "8" },
    });

    await waitFor(() =>
      expect(mockSaveTimerConfig).toHaveBeenLastCalledWith(
        "g1",
        "A",
        expect.objectContaining({
          // Structure comes from the selected movement (read-only).
          totalRounds: 8,
          boardsPerRound: 3,
          // Default is Per Board with 30s of play seconds; setting minutes to 8
          // gives 8m30s = 510s per board * 3 boards = 1530s.
          playDuration: 1530,
        }),
      ),
    );
  });

  it("shows movement-derived boards/round and total rounds in the summary (not as inputs)", () => {
    render(<TimerSetup />);

    // Structure is derived from the movement, so it is shown read-only in the
    // summary panel rather than as editable inputs.
    expect(screen.queryByLabelText("Boards / Round")).toBeNull();
    expect(screen.queryByLabelText("Total Rounds")).toBeNull();

    const boardsRow = screen.getByText("Boards / Round").closest("div")!;
    expect(boardsRow).toHaveTextContent("3");
    const roundsRow = screen.getByText("Rounds").closest("div")!;
    expect(roundsRow).toHaveTextContent("8");
  });

  it("disables the timer config and emits nothing when the section has no movement", () => {
    mockSections = [{ section: "A", label: "A", selectedMovement: null }];
    render(<TimerSetup />);

    expect(screen.getByRole("note")).toHaveTextContent(
      "Select a movement first",
    );
    expect(screen.queryByLabelText("Total Rounds")).toBeNull();
    // No config to save while no movement is selected.
    expect(mockSaveTimerConfig).not.toHaveBeenCalled();
  });

  it("switching to per-round timing stores the entered play time as the round total", async () => {
    render(<TimerSetup />);

    // Default is Per Board (play 7m30s = 450s per board). Switching to Per
    // Round stores the entered play time directly, without multiplying by
    // boards/round: 450s.
    fireEvent.click(screen.getByLabelText("Per Round"));
    await waitFor(() =>
      expect(mockSaveTimerConfig).toHaveBeenLastCalledWith(
        "g1",
        "A",
        expect.objectContaining({ timingMode: "perRound", playDuration: 450 }),
      ),
    );
  });

  it("routes the editable config fields through the onConfigChange switch", async () => {
    render(<TimerSetup />);

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

    // The burst of edits debounces into a single save with the final values.
    await waitFor(() => {
      const call = lastSave();
      expect(call![2]).toMatchObject({
        // Boards/round is derived from the movement (3), not edited here.
        boardsPerRound: 3,
        warningSeconds: 45,
        // Per Board (the default): play (7m10s = 430s) * 3 boards = 1290
        playDuration: 1290,
        // move 2m20s = 140s
        moveDuration: 140,
      });
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

    // Durations/warning seed from the saved state...
    expect(screen.getByLabelText("Play minutes")).toHaveValue(5);
    expect(screen.getByLabelText("Move minutes")).toHaveValue(2);
    expect(
      screen.getByLabelText("Warning at (seconds before end of play)"),
    ).toHaveValue(30);
    // ...but the structure comes from the movement, overriding the saved 11/2,
    // and is shown in the summary panel rather than as inputs.
    const roundsRow = screen.getByText("Rounds").closest("div")!;
    expect(roundsRow).toHaveTextContent("8");
    const boardsRow = screen.getByText("Boards / Round").closest("div")!;
    expect(boardsRow).toHaveTextContent("3");
  });

  it("renders without the page header when embedded", () => {
    render(<TimerSetup embedded />);

    expect(screen.queryByText("Timer Setup")).toBeNull();
    // Config card is present; no Save button (auto-save).
    expect(screen.getByText("Session Length")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
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

      fireEvent.click(screen.getByRole("radio", { name: "Resume at time" }));
      fireEvent.change(screen.getByLabelText("Break 1 resume time"), {
        target: { value: "23:59" },
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Auto-save fires as breaks are edited; inspect the latest save payload.
      const saveCall = lastSave();
      expect(saveCall).toBeTruthy();
      expect(saveCall![2].breaks).toHaveLength(1);
      expect(saveCall![2].breaks[0]).toMatchObject({
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
    // A one-round movement drives totalRounds = 1 (the field is read-only).
    mockSections = [
      {
        section: "A",
        label: "A",
        selectedMovement: {
          source: "MITCHELL",
          mitchell: { tables: 4, rounds: 1, boardsPerRound: 3 },
        },
      },
    ];
    render(<TimerSetup />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add break" }));
    expect(screen.getByLabelText("Break 1 after round")).toBeInTheDocument();
  });

  it("formats a session length in minutes and seconds", () => {
    // 2-round movement: 2 * 1m play + 1 * 30s move = 2m 30s.
    mockSections = [
      {
        section: "A",
        label: "A",
        selectedMovement: {
          source: "MITCHELL",
          mitchell: { tables: 4, rounds: 2, boardsPerRound: 3 },
        },
      },
    ];
    render(<TimerSetup />);

    // Per Round so play time is taken as the whole round's play, not per board.
    fireEvent.click(screen.getByLabelText("Per Round"));
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
    // 1-round movement: a single 30s play phase, no moves.
    mockSections = [
      {
        section: "A",
        label: "A",
        selectedMovement: {
          source: "MITCHELL",
          mitchell: { tables: 4, rounds: 1, boardsPerRound: 3 },
        },
      },
    ];
    render(<TimerSetup />);

    // Per Round so play time is taken as the whole round's play, not per board.
    fireEvent.click(screen.getByLabelText("Per Round"));
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

    mockSections = [
      {
        section: "A",
        label: "A",
        selectedMovement: {
          source: "MITCHELL",
          mitchell: { tables: 4, rounds: 2, boardsPerRound: 3 },
        },
      },
    ];
    render(<TimerSetup />);

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
    mockSections = [
      { section: "A", label: "A", selectedMovement: mitchellMovement },
    ];
  });

  it("renders nothing when there are no sections", () => {
    mockSections = [];
    const { container } = render(<TimerManager started={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the config screen when the game has not started", () => {
    render(<TimerManager started={false} />);
    // Config screen: summary panel, no Apply Changes and no Save button.
    expect(screen.getByText("Session Length")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply Changes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
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
    expect(mockEmitWithAck).toHaveBeenCalledWith(
      SocketEvents.UPDATE_CONFIG_TIMER,
      expect.objectContaining({ gameId: "g1" }),
    );

    // Running -> primary action is Pause.
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(mockEmitWithAck).toHaveBeenCalledWith(
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
    expect(mockEmitWithAck).toHaveBeenCalledWith(
      SocketEvents.START_TIMER,
      expect.objectContaining({ gameId: "g1", directorToken: "token" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Next phase" }));
    expect(mockEmitWithAck).toHaveBeenCalledWith(
      SocketEvents.NEXT_ROUND_TIMER,
      expect.objectContaining({ gameId: "g1", directorToken: "token" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Previous phase" }));
    expect(mockEmitWithAck).toHaveBeenCalledWith(
      SocketEvents.PREVIOUS_TIMER,
      expect.objectContaining({ gameId: "g1", directorToken: "token" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "+1m" }));
    expect(mockEmitWithAck).toHaveBeenCalledWith(
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
    expect(mockEmitWithAck).toHaveBeenCalledWith(
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

describe("per-section timer UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimerState = null;
    mockSections = [
      { section: "A", label: "A", selectedMovement: mitchellMovement },
    ];
  });

  it("shows the section pill and no Apply-to-all for a single-section game", () => {
    mockSections = [
      { section: "A", label: "A", selectedMovement: mitchellMovement },
    ];
    render(<TimerSetup />);

    // Single-section: no "Section A" pill, just a "Split into sections" pill.
    expect(screen.queryByRole("tab", { name: "Section A" })).toBeNull();
    expect(
      screen.getByRole("button", { name: /Split into sections/ }),
    ).toBeInTheDocument();
    // Apply-to-all has been removed in favour of per-section pills.
    expect(
      screen.queryByRole("button", { name: "Apply to all sections" }),
    ).toBeNull();
  });

  it("auto-saves config for the selected section", async () => {
    mockSections = [
      { section: "A", label: "A", selectedMovement: mitchellMovement },
      { section: "B", label: "B", selectedMovement: mitchellMovement },
    ];
    render(<TimerSetup />);

    // Defaults to the first section: editing a field auto-saves for section A.
    // (Per Board is the default, so toggle to Per Round to register a change.)
    fireEvent.click(screen.getByLabelText("Per Round"));

    // Switching sections unmounts the A container, flushing its pending save.
    fireEvent.click(screen.getByRole("tab", { name: /Section B/ }));
    await waitFor(() => expect(savesForSection("A").length).toBeGreaterThan(0));

    // Editing section B auto-saves for section B.
    fireEvent.click(screen.getByLabelText("Per Round"));
    await waitFor(() => {
      const call = lastSave();
      expect(call![1]).toBe("B");
    });
  });

  it("renders nothing when there are no sections to select", () => {
    mockSections = [];
    const { container } = render(<TimerSetup />);
    expect(container).toBeEmptyDOMElement();
  });

  it("collapses a burst of edits into a single debounced save", async () => {
    render(<TimerSetup />);

    // Two quick edits before the debounce fires -> the first pending timer is
    // cleared and only the latest values are saved once.
    fireEvent.change(screen.getByLabelText("Play minutes"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText("Play minutes"), {
      target: { value: "9" },
    });

    await waitFor(() => expect(mockSaveTimerConfig).toHaveBeenCalled());
    // Debounced: a single save carrying the final play time (9m30s * 3 = 1710s).
    expect(savesForSection("A")).toHaveLength(1);
    expect(lastSave()![2]).toMatchObject({ playDuration: 1710 });
  });

  it("logs when an auto-save fails", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSaveTimerConfig.mockRejectedValue(new Error("save failed"));

    render(<TimerSetup />);
    fireEvent.click(screen.getByLabelText("Per Round"));

    await waitFor(() =>
      expect(errSpy).toHaveBeenCalledWith(
        "Failed to save timer config:",
        expect.any(Error),
      ),
    );
    errSpy.mockRestore();
  });

  it("logs when a live timer control fails", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockEmitWithAck.mockRejectedValueOnce(new Error("ack failed"));
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

    render(<TimerManager started={true} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    await waitFor(() =>
      expect(errSpy).toHaveBeenCalledWith(
        expect.stringContaining("Timer control"),
        expect.any(Error),
      ),
    );
    errSpy.mockRestore();
  });

  it("ticks the live status down each second", () => {
    vi.useFakeTimers();
    try {
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

      // The seed timeout (0ms) and the 1s interval both drive setTick, keeping
      // the derived status live between server syncs.
      act(() => {
        vi.advanceTimersByTime(0);
      });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("live controls target the selected section", () => {
    mockSections = [
      { section: "A", label: "A", selectedMovement: mitchellMovement },
      { section: "B", label: "B", selectedMovement: mitchellMovement },
    ];
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

    render(<TimerManager started={true} />);

    fireEvent.click(screen.getByRole("tab", { name: /Section B/ }));
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(mockEmitWithAck).toHaveBeenCalledWith(
      SocketEvents.START_TIMER,
      expect.objectContaining({ section: "B" }),
    );
  });
});
