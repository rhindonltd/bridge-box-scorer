import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/game/[gameId]/display/timer/TeaCupIcon", () => ({
  TeaCupIcon: () => <span data-testid="teacup" />,
}));

import { DisplayTimerPage } from "./DisplayTimerPage";

const endDate = new Date("2024-01-01T20:30:00");

function baseProps() {
  return {
    title: "Round 1 of 8",
    boardLabel: "Board 1 of 3" as string | null,
    remaining: 125,
    phase: "play" as
      | "play"
      | "move"
      | "break"
      | "finished"
      | null,
    isRunning: true,
    projectedEndDate: endDate,
    warningSeconds: 60,
  };
}

describe("DisplayTimerPage", () => {
  it("renders a running play phase with a formatted time and board label", () => {
    render(<DisplayTimerPage {...baseProps()} />);
    expect(screen.getByText("Round 1 of 8")).toBeInTheDocument();
    expect(screen.getByText("Board 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("02:05")).toBeInTheDocument();
    // Running -> no PAUSED banner.
    expect(screen.queryByText("PAUSED")).not.toBeInTheDocument();
    // Not finished -> projected end shown.
    expect(screen.getByText(/Projected end:/)).toBeInTheDocument();
  });

  it("highlights the last minute of play", () => {
    const { container } = render(
      <DisplayTimerPage {...baseProps()} remaining={30} />,
    );
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders the move phase in cyan", () => {
    const { container } = render(
      <DisplayTimerPage
        {...baseProps()}
        phase="move"
        boardLabel={null}
      />,
    );
    expect(container.querySelector(".text-cyan-400")).toBeTruthy();
  });

  it("renders a break with the teacup and next-round time", () => {
    render(<DisplayTimerPage {...baseProps()} phase="break" />);
    expect(screen.getByTestId("teacup")).toBeInTheDocument();
    expect(screen.getByText(/Next round starts at/)).toBeInTheDocument();
  });

  it("renders the finished phase with 00:00 and no projected end", () => {
    render(
      <DisplayTimerPage
        {...baseProps()}
        phase="finished"
        isRunning={false}
      />,
    );
    expect(screen.getByText("00:00")).toBeInTheDocument();
    // Finished -> projected end hidden and no PAUSED banner.
    expect(screen.queryByText(/Projected end:/)).not.toBeInTheDocument();
    expect(screen.queryByText("PAUSED")).not.toBeInTheDocument();
  });

  it("shows PAUSED when not running and not finished", () => {
    render(<DisplayTimerPage {...baseProps()} isRunning={false} />);
    expect(screen.getByText("PAUSED")).toBeInTheDocument();
  });

  it("hides the board label for a play phase when none is provided", () => {
    render(<DisplayTimerPage {...baseProps()} boardLabel={null} />);
    expect(screen.queryByText("Board 1 of 3")).not.toBeInTheDocument();
  });

  it("uses the default warning window when warningSeconds is omitted", () => {
    const { warningSeconds: _omit, ...rest } = baseProps();
    const { container } = render(
      <DisplayTimerPage {...rest} remaining={30} />,
    );
    // remaining 30 < default 60 during play -> last-minute pulse.
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });
});
