import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    actions,
    children,
  }: {
    headerTitle: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
      {children}
      <div>{actions}</div>
    </div>
  ),
}));

import {
  TimerControlsView,
  TimerControlsViewProps,
  BreakDraft,
} from "./TimerControlsView";

function baseConfig(overrides: Partial<TimerControlsViewProps["config"]> = {}) {
  return {
    boardsPerRound: 3,
    totalRounds: 8,
    playMinutes: 2,
    playSeconds: 0,
    moveMinutes: 1,
    moveSeconds: 30,
    timingMode: "perRound" as const,
    warningSeconds: 60,
    breaks: [] as BreakDraft[],
    ...overrides,
  };
}

function makeProps(
  overrides: Partial<TimerControlsViewProps> = {},
): TimerControlsViewProps {
  return {
    hasSession: false,
    timer: null,
    config: baseConfig(),
    sessionLength: "20m",
    previewEnd: "20:00",
    breakProblems: [],
    onConfigChange: vi.fn(),
    onAddBreak: vi.fn(),
    onRemoveBreak: vi.fn(),
    onBreakChange: vi.fn(),
    onCreate: vi.fn(),
    onApplyChanges: vi.fn(),
    onStart: vi.fn(),
    onPause: vi.fn(),
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    onAdjustTime: vi.fn(),
    adjustApplyToFuture: false,
    onAdjustApplyToFutureChange: vi.fn(),
    ...overrides,
  };
}

describe("TimerControlsView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows Create when there is no session and fires onCreate", () => {
    const onCreate = vi.fn();
    render(<TimerControlsView {...makeProps({ onCreate })} />);

    expect(screen.getByText("No active session")).toBeInTheDocument();
    expect(screen.getByText("Session Length")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onCreate).toHaveBeenCalled();
  });

  it("edits config numeric fields and timing mode", () => {
    const onConfigChange = vi.fn();
    render(<TimerControlsView {...makeProps({ onConfigChange })} />);

    fireEvent.change(screen.getByLabelText("Boards / Round"), {
      target: { value: "4" },
    });
    expect(onConfigChange).toHaveBeenCalledWith("boardsPerRound", 4);

    fireEvent.change(screen.getByLabelText("Total Rounds"), {
      target: { value: "9" },
    });
    expect(onConfigChange).toHaveBeenCalledWith("totalRounds", 9);

    fireEvent.change(screen.getByLabelText("Play minutes"), {
      target: { value: "3" },
    });
    expect(onConfigChange).toHaveBeenCalledWith("playMinutes", 3);

    fireEvent.change(screen.getByLabelText("Play seconds"), {
      target: { value: "15" },
    });
    expect(onConfigChange).toHaveBeenCalledWith("playSeconds", 15);

    fireEvent.change(screen.getByLabelText("Move minutes"), {
      target: { value: "2" },
    });
    expect(onConfigChange).toHaveBeenCalledWith("moveMinutes", 2);

    fireEvent.change(screen.getByLabelText("Move seconds"), {
      target: { value: "45" },
    });
    expect(onConfigChange).toHaveBeenCalledWith("moveSeconds", 45);

    fireEvent.change(screen.getByLabelText("Warning at (seconds before end of play)"), {
      target: { value: "30" },
    });
    expect(onConfigChange).toHaveBeenCalledWith("warningSeconds", 30);

    fireEvent.click(screen.getByLabelText("Per Board"));
    expect(onConfigChange).toHaveBeenCalledWith("timingMode", "perBoard");
  });

  it("selects per-round timing mode from a per-board starting config", () => {
    const onConfigChange = vi.fn();
    render(
      <TimerControlsView
        {...makeProps({
          onConfigChange,
          config: baseConfig({ timingMode: "perBoard" }),
        })}
      />,
    );
    fireEvent.click(screen.getByLabelText("Per Round"));
    expect(onConfigChange).toHaveBeenCalledWith("timingMode", "perRound");
  });

  it("shows session controls when running: pause, next, prev, adjust", () => {
    const props = makeProps({
      hasSession: true,
      timer: {
        isRunning: true,
        phase: "play",
        remaining: 90,
        round: 2,
        projectedEndDate: new Date("2024-01-01T20:30:00"),
      },
    });
    render(<TimerControlsView {...props} />);

    // Status shows the running phase and projected end.
    expect(screen.getByText("play")).toBeInTheDocument();
    expect(screen.getByText("Live End")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply Changes" }));
    expect(props.onApplyChanges).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(props.onPause).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Next phase" }));
    expect(props.onNext).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Previous phase" }));
    expect(props.onPrevious).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "−1m" }));
    expect(props.onAdjustTime).toHaveBeenCalledWith(-60);
    fireEvent.click(screen.getByRole("button", { name: "−15s" }));
    expect(props.onAdjustTime).toHaveBeenCalledWith(-15);
    fireEvent.click(screen.getByRole("button", { name: "+15s" }));
    expect(props.onAdjustTime).toHaveBeenCalledWith(15);
    fireEvent.click(screen.getByRole("button", { name: "+1m" }));
    expect(props.onAdjustTime).toHaveBeenCalledWith(60);

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /Apply to all subsequent phases/,
      }),
    );
    expect(props.onAdjustApplyToFutureChange).toHaveBeenCalledWith(true);
  });

  it("shows Start (not Pause) when a session exists but is paused", () => {
    const props = makeProps({
      hasSession: true,
      timer: {
        isRunning: false,
        phase: "finished",
        remaining: 0,
        round: 8,
        projectedEndDate: null,
      },
    });
    render(<TimerControlsView {...props} />);

    // Paused status label.
    expect(screen.getByText("paused")).toBeInTheDocument();
    // finished phase shows 00:00 remaining and no Live End row.
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.queryByText("Live End")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(props.onStart).toHaveBeenCalled();
  });

  it("formats remaining time for a non-finished phase", () => {
    const props = makeProps({
      hasSession: true,
      timer: {
        isRunning: true,
        phase: "play",
        remaining: 125,
        round: 1,
        projectedEndDate: null,
      },
    });
    render(<TimerControlsView {...props} />);
    expect(screen.getByText("02:05")).toBeInTheDocument();
  });

  it("renders break problems when present", () => {
    const props = makeProps({
      breakProblems: [{ afterRound: 3, overrunMs: 90_000 }],
    });
    render(<TimerControlsView {...props} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Break timing is invalid");
    expect(alert).toHaveTextContent("after round 3");
    expect(alert).toHaveTextContent("about 2 min");
  });

  it("adds, edits and removes duration and resume-time breaks", () => {
    const durationBreak: BreakDraft = {
      afterRound: 2,
      mode: "duration",
      durationMinutes: 10,
      resumeAt: "",
    };
    const resumeBreak: BreakDraft = {
      afterRound: 4,
      mode: "resumeTime",
      durationMinutes: 0,
      resumeAt: "13:00",
      computedLength: "15m",
    };
    const props = makeProps({
      config: baseConfig({ breaks: [durationBreak, resumeBreak] }),
    });
    render(<TimerControlsView {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add break" }));
    expect(props.onAddBreak).toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Break 1 after round"), {
      target: { value: "3" },
    });
    expect(props.onBreakChange).toHaveBeenCalledWith(0, "afterRound", 3);

    fireEvent.change(screen.getByLabelText("Break 1 duration minutes"), {
      target: { value: "12" },
    });
    expect(props.onBreakChange).toHaveBeenCalledWith(0, "durationMinutes", 12);

    // switch break 1 (currently duration) to resume mode
    const resumeRadios = screen.getAllByRole("radio", {
      name: "Resume at time",
    });
    fireEvent.click(resumeRadios[0]);
    expect(props.onBreakChange).toHaveBeenCalledWith(0, "mode", "resumeTime");

    // break 2 is resume-time: edit its time + shows computed length
    fireEvent.change(screen.getByLabelText("Break 2 resume time"), {
      target: { value: "13:30" },
    });
    expect(props.onBreakChange).toHaveBeenCalledWith(1, "resumeAt", "13:30");
    expect(screen.getByText(/15m break/)).toBeInTheDocument();

    // switch break 2 back to duration mode
    const break2DurationRadios = screen.getAllByRole("radio", {
      name: "Duration",
    });
    fireEvent.click(break2DurationRadios[1]);
    expect(props.onBreakChange).toHaveBeenCalledWith(1, "mode", "duration");

    fireEvent.click(screen.getByRole("button", { name: "Remove break 1" }));
    expect(props.onRemoveBreak).toHaveBeenCalledWith(0);
  });

  it("shows the empty-breaks hint when there are no breaks", () => {
    render(<TimerControlsView {...makeProps()} />);
    expect(screen.getByText("No breaks scheduled.")).toBeInTheDocument();
  });

  it("hides the resume-time computed length when it is null", () => {
    const resumeBreak: BreakDraft = {
      afterRound: 4,
      mode: "resumeTime",
      durationMinutes: 0,
      resumeAt: "13:00",
      computedLength: null,
    };
    render(
      <TimerControlsView
        {...makeProps({ config: baseConfig({ breaks: [resumeBreak] }) })}
      />,
    );
    expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
  });

  it("renders embedded (no page header) when embedded is true", () => {
    render(<TimerControlsView {...makeProps({ embedded: true })} />);
    expect(screen.queryByText("Timer Controls")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});
