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

    // Config editing is not available on the live screen.
    expect(screen.queryByLabelText("Total Rounds")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Apply Changes" }),
    ).toBeNull();

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

  it("shows a completion message and no controls when finished", () => {
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

    expect(screen.getByText("Session complete")).toBeInTheDocument();

    // None of the live controls are rendered once the session is finished.
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next phase" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Previous phase" })).toBeNull();
    expect(screen.queryByRole("button", { name: "+1m" })).toBeNull();
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

});
