import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockMutateGame = vi.fn();
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1" }, mutateGame: mockMutateGame }),
}));

let mockStartCheck: {
  canStart: boolean;
  problems: {
    code: string;
    message: string;
    section?: string;
  }[];
  sitOutSeat: string | null;
} = { canStart: false, problems: [], sitOutSeat: null };
vi.mock("@/hooks/start-check", () => ({
  useStartCheck: () => mockStartCheck,
}));

const mockStartGame = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/game-service", () => ({
  startGame: (...args: unknown[]) => mockStartGame(...args),
}));

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerRight,
    actions,
    children,
  }: {
    headerRight?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      {headerRight}
      {children}
      <div>{actions}</div>
    </div>
  ),
}));

import { StartGameScreen } from "./StartGameScreen";

describe("StartGameScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartCheck = { canStart: false, problems: [], sitOutSeat: null };
  });

  it("disables Start Game and lists issues when the game cannot start", () => {
    mockStartCheck = {
      canStart: false,
      problems: [
        { code: "NO_PAIRS_SEATED", message: "No pairs are seated yet." },
      ],
      sitOutSeat: null,
    };

    render(<StartGameScreen />);

    expect(screen.getByText("No pairs are seated yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Game" })).toBeDisabled();
  });

  it("groups issues under section headings for a multi-section game", () => {
    mockStartCheck = {
      canStart: false,
      problems: [
        { code: "NO_PAIRS_SEATED", message: "No pairs are seated yet.", section: "A" },
        { code: "MULTIPLE_EMPTY_POSITIONS", message: "More than one pair is missing.", section: "B" },
      ],
      sitOutSeat: null,
    };

    render(<StartGameScreen />);

    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Section B")).toBeInTheDocument();
    expect(screen.getByText("No pairs are seated yet.")).toBeInTheDocument();
    expect(
      screen.getByText("More than one pair is missing."),
    ).toBeInTheDocument();
  });

  it("does not show a section heading for a single-section game", () => {
    mockStartCheck = {
      canStart: false,
      problems: [
        { code: "NO_PAIRS_SEATED", message: "No pairs are seated yet.", section: "A" },
      ],
      sitOutSeat: null,
    };

    render(<StartGameScreen />);

    expect(screen.queryByText("Section A")).toBeNull();
    expect(screen.getByText("No pairs are seated yet.")).toBeInTheDocument();
  });

  it("shows the ready state and enables Start Game when startable", () => {
    mockStartCheck = { canStart: true, problems: [], sitOutSeat: null };

    render(<StartGameScreen />);

    expect(screen.getByRole("status")).toHaveTextContent("Everything’s ready");
    expect(screen.getByRole("button", { name: "Start Game" })).toBeEnabled();
  });

  it("shows the sit-out note when one pair short but startable", () => {
    mockStartCheck = { canStart: true, problems: [], sitOutSeat: "A3EW" };

    render(<StartGameScreen />);

    expect(screen.getByText(/A3EW will sit out/)).toBeInTheDocument();
  });

  it("starts the game when the button is clicked", async () => {
    mockStartCheck = { canStart: true, problems: [], sitOutSeat: null };

    render(<StartGameScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Start Game" }));

    await waitFor(() => expect(mockStartGame).toHaveBeenCalledWith("g1"));
    await waitFor(() => expect(mockMutateGame).toHaveBeenCalled());
  });

  it("alerts when starting the game fails", async () => {
    mockStartCheck = { canStart: true, problems: [], sitOutSeat: null };
    mockStartGame.mockRejectedValueOnce(new Error("nope"));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<StartGameScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Start Game" }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("nope"));
  });
});
