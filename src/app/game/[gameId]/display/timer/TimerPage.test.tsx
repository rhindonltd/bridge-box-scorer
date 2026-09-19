import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1" } }),
}));

let mockSections: { section: string; label: string }[] = [
  { section: "A", label: "A" },
];
vi.mock("@/hooks/sections", () => ({
  useSections: () => ({ sections: mockSections, isLoading: false }),
}));

let mockTimerState: unknown = null;
vi.mock("@/context/TimerContext", () => ({
  TimerProvider: ({ children }: { children: React.ReactNode }) => children,
  useTimerContext: () => ({
    timerState: mockTimerState,
    now: () => 1000,
  }),
}));

const mockDerived = vi.fn();
vi.mock("@/hooks/timer-derived", () => ({
  useTimerDerived: (...args: unknown[]) => mockDerived(...args),
}));

const displaySpy = vi.fn();
vi.mock("@/app/game/[gameId]/display/timer/DisplayTimerPage", () => ({
  DisplayTimerPage: (props: Record<string, unknown>) => {
    displaySpy(props);
    return <div data-testid="display-timer">{String(props.title)}</div>;
  },
}));

import TimerPage from "./TimerPage";

describe("TimerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimerState = null;
    mockSections = [{ section: "A", label: "A" }];
    mockDerived.mockReturnValue({
      remaining: 120,
      phase: "play",
      boardLabel: "Board 1",
      title: "Round 1",
      isRunning: true,
      projectedEndDate: new Date(),
      warningSeconds: 60,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a connecting state until timer state arrives", () => {
    render(<TimerPage />);
    expect(screen.getByText("Connecting…")).toBeInTheDocument();
  });

  it("defaults to section A when no sections are loaded yet", () => {
    // Empty sections -> `sections[0]?.section ?? "A"` fallback; single-section
    // path renders the timer directly (no chooser).
    mockSections = [];
    mockTimerState = { phase: "play" };

    render(<TimerPage />);

    expect(screen.getByTestId("display-timer")).toBeInTheDocument();
    expect(screen.queryByText("Choose a section")).toBeNull();
  });

  it("renders the display timer once state is present and ticks each second", () => {
    vi.useFakeTimers();
    mockTimerState = { phase: "play" };

    render(<TimerPage />);

    expect(screen.getByTestId("display-timer")).toBeInTheDocument();
    expect(displaySpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Round 1", phase: "play" }),
    );

    // The render-only tick interval fires without throwing.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId("display-timer")).toBeInTheDocument();
  });

  it("shows a section chooser for a multi-section game", () => {
    mockSections = [
      { section: "A", label: "A" },
      { section: "B", label: "B" },
    ];
    mockTimerState = { phase: "play" };

    render(<TimerPage />);

    // No timer yet — the chooser is shown instead.
    expect(screen.getByText("Choose a section")).toBeInTheDocument();
    expect(screen.queryByTestId("display-timer")).toBeNull();
  });

  it("shows the chosen section's timer after picking a section", () => {
    mockSections = [
      { section: "A", label: "A" },
      { section: "B", label: "B" },
    ];
    mockTimerState = { phase: "play" };

    render(<TimerPage />);

    act(() => {
      screen.getByRole("button", { name: /Section B/ }).click();
    });

    expect(screen.getByTestId("display-timer")).toBeInTheDocument();
    expect(screen.queryByText("Choose a section")).toBeNull();
  });

  it("returns to the section chooser via the back button", () => {
    mockSections = [
      { section: "A", label: "A" },
      { section: "B", label: "B" },
    ];
    mockTimerState = { phase: "play" };

    render(<TimerPage />);

    act(() => {
      screen.getByRole("button", { name: /Section B/ }).click();
    });
    expect(screen.getByTestId("display-timer")).toBeInTheDocument();

    // The "← Sections" back button resets the chosen section to null.
    act(() => {
      screen.getByRole("button", { name: /Sections/ }).click();
    });
    expect(screen.getByText("Choose a section")).toBeInTheDocument();
    expect(screen.queryByTestId("display-timer")).toBeNull();
  });

  it("appends the section label when it differs from the section letter", () => {
    mockSections = [
      { section: "A", label: "Open" },
      { section: "B", label: "B" },
    ];
    mockTimerState = { phase: "play" };

    render(<TimerPage />);

    // A has a distinct label -> "Section A — Open"; B matches -> "Section B".
    expect(
      screen.getByRole("button", { name: /Section A — Open/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Section B" }),
    ).toBeInTheDocument();
  });
});
