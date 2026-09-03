import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ---- mocks ----

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1" } }),
}));

const mockGoTo = vi.fn();
let currentStep = "tables";
vi.mock("@/hooks/flow", () => ({
  createFlow: () => ({}),
  useFlow: () => ({ step: currentStep, goTo: mockGoTo }),
}));

vi.mock("./ShowTablesPage", () => ({
  ShowTablesPage: ({ tabs }: { tabs?: React.ReactNode }) => (
    <div>
      {tabs}
      <div>tables-view</div>
    </div>
  ),
}));

vi.mock("@/components/manage/sections/SectionManagerContainer", () => ({
  SectionManagerContainer: () => <div>sections-view</div>,
}));

vi.mock("@/app/game/[gameId]/manage/timer/TimerSetup", () => ({
  TimerSetup: ({ embedded }: { embedded?: boolean }) => (
    <div>timer-view {embedded ? "embedded" : "standalone"}</div>
  ),
}));

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { SetupGamePage } from "./SetupGamePage";

describe("SetupGamePage tab bar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentStep = "tables";
  });

  it("renders the tab bar on the tables step", () => {
    render(<SetupGamePage />);

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tables" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("tables-view")).toBeInTheDocument();
  });

  it("navigates to the movements step when the Movement tab is clicked", () => {
    render(<SetupGamePage />);

    fireEvent.click(screen.getByRole("tab", { name: "Movement" }));
    expect(mockGoTo).toHaveBeenCalledWith("movements");
  });

  it("shows the sections view and tab bar on the movements step", () => {
    currentStep = "movements";
    render(<SetupGamePage />);

    expect(screen.getByText("sections-view")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Movement" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("navigates to the timer step when the Timer tab is clicked", () => {
    render(<SetupGamePage />);

    fireEvent.click(screen.getByRole("tab", { name: "Timer" }));
    expect(mockGoTo).toHaveBeenCalledWith("timer");
  });

  it("renders the embedded timer view and tab bar on the timer step", () => {
    currentStep = "timer";
    render(<SetupGamePage />);

    expect(screen.getByText(/timer-view/)).toHaveTextContent("embedded");
    expect(screen.getByRole("tab", { name: "Timer" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });
});
