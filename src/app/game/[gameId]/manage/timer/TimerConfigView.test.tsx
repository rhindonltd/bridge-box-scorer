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

import { TimerConfigView, TimerConfigViewProps } from "./TimerConfigView";
import { BreakDraft } from "./timer-view-types";

function baseConfig(overrides: Partial<TimerConfigViewProps["config"]> = {}) {
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
  overrides: Partial<TimerConfigViewProps> = {},
): TimerConfigViewProps {
  return {
    config: baseConfig(),
    sessionLength: "20m",
    previewEnd: "20:00",
    breakProblems: [],
    onConfigChange: vi.fn(),
    onAddBreak: vi.fn(),
    onRemoveBreak: vi.fn(),
    onBreakChange: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  };
}

describe("TimerConfigView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the preview panel and a Save button, and fires onSave", () => {
    const onSave = vi.fn();
    render(<TimerConfigView {...makeProps({ onSave })} />);

    expect(screen.getByText("Not started yet")).toBeInTheDocument();
    expect(screen.getByText("Session Length")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalled();
  });

  it("does not render any run controls or live status", () => {
    render(<TimerConfigView {...makeProps()} />);

    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Next phase" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Previous phase" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Apply Changes" }),
    ).toBeNull();
    expect(screen.queryByText("Live End")).toBeNull();
    expect(screen.queryByText("Adjust current phase")).toBeNull();
  });

  it("edits config numeric fields and timing mode", () => {
    const onConfigChange = vi.fn();
    render(<TimerConfigView {...makeProps({ onConfigChange })} />);

    fireEvent.change(screen.getByLabelText("Boards / Round"), {
      target: { value: "4" },
    });
    expect(onConfigChange).toHaveBeenCalledWith("boardsPerRound", 4);

    fireEvent.click(screen.getByLabelText("Per Board"));
    expect(onConfigChange).toHaveBeenCalledWith("timingMode", "perBoard");
  });

  it("adds and removes breaks", () => {
    const durationBreak: BreakDraft = {
      afterRound: 2,
      mode: "duration",
      durationMinutes: 10,
      resumeAt: "",
    };
    const props = makeProps({
      config: baseConfig({ breaks: [durationBreak] }),
    });
    render(<TimerConfigView {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "+ Add break" }));
    expect(props.onAddBreak).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Remove break 1" }));
    expect(props.onRemoveBreak).toHaveBeenCalledWith(0);
  });

  it("renders break problems when present", () => {
    render(
      <TimerConfigView
        {...makeProps({ breakProblems: [{ afterRound: 3, overrunMs: 90_000 }] })}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Break timing is invalid");
    expect(alert).toHaveTextContent("after round 3");
  });

  it("renders embedded without the page header", () => {
    render(<TimerConfigView {...makeProps({ embedded: true })} />);
    expect(screen.queryByText("Timer Setup")).toBeNull();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
