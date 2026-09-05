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

import { TimerLiveView, TimerLiveViewProps } from "./TimerLiveView";
import { BreakDraft } from "./timer-view-types";

function baseConfig(overrides: Partial<TimerLiveViewProps["config"]> = {}) {
  return {
    boardsPerRound: 3,
    totalRounds: 8,
    playMinutes: 7,
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
  overrides: Partial<TimerLiveViewProps> = {},
): TimerLiveViewProps {
  return {
    timer: {
      isRunning: true,
      phase: "play",
      remaining: 90,
      round: 2,
      projectedEndDate: new Date("2024-01-01T20:30:00"),
    },
    config: baseConfig(),
    breakProblems: [],
    onConfigChange: vi.fn(),
    onAddBreak: vi.fn(),
    onRemoveBreak: vi.fn(),
    onBreakChange: vi.fn(),
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

describe("TimerLiveView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the running status and run controls", () => {
    const props = makeProps();
    render(<TimerLiveView {...props} />);

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
    fireEvent.click(screen.getByRole("button", { name: "+1m" }));
    expect(props.onAdjustTime).toHaveBeenCalledWith(60);

    fireEvent.click(
      screen.getByRole("checkbox", {
        name: /Apply to all subsequent phases/,
      }),
    );
    expect(props.onAdjustApplyToFutureChange).toHaveBeenCalledWith(true);
  });

  it("shows Start (not Pause) when paused", () => {
    const props = makeProps({
      timer: {
        isRunning: false,
        phase: "play",
        remaining: 180,
        round: 5,
        projectedEndDate: null,
      },
    });
    render(<TimerLiveView {...props} />);

    expect(screen.getByText("paused")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(props.onStart).toHaveBeenCalled();
  });

  it("shows 00:00 and no Live End for a finished phase", () => {
    render(
      <TimerLiveView
        {...makeProps({
          timer: {
            isRunning: false,
            phase: "finished",
            remaining: 0,
            round: 8,
            projectedEndDate: null,
          },
        })}
      />,
    );
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.queryByText("Live End")).toBeNull();
  });

  it("formats remaining time for a non-finished phase", () => {
    render(
      <TimerLiveView
        {...makeProps({
          timer: {
            isRunning: true,
            phase: "play",
            remaining: 125,
            round: 1,
            projectedEndDate: null,
          },
        })}
      />,
    );
    expect(screen.getByText("02:05")).toBeInTheDocument();
  });

  it("edits config through the shared fields", () => {
    const onConfigChange = vi.fn();
    render(<TimerLiveView {...makeProps({ onConfigChange })} />);

    fireEvent.change(screen.getByLabelText("Total Rounds"), {
      target: { value: "9" },
    });
    expect(onConfigChange).toHaveBeenCalledWith("totalRounds", 9);
  });
});
