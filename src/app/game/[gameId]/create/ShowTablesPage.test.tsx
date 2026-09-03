import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ---- mocks ----

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: { gameId: "g1", tables: 2 },
    mutateGame: vi.fn(),
  }),
}));

vi.mock("swr", () => ({
  default: () => ({ data: [] }),
}));

vi.mock("@/hooks/socket-swr-sync", () => ({
  useSocketSWRSync: vi.fn(),
}));

vi.mock("@/hooks/sections", () => ({
  useSections: () => ({
    sections: [
      { section: "A", label: "A", tables: 2, ordinal: 0, selectedMovement: null },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ emit: vi.fn() }),
}));

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: () => "token",
}));

const mockUseStartCheck = vi.fn();
vi.mock("@/hooks/start-check", () => ({
  useStartCheck: () => mockUseStartCheck(),
}));

const mockStartGame = vi.fn(async (...args: unknown[]) => {
  void args;
});
vi.mock("@/lib/game-service", () => ({
  startGame: (...args: unknown[]) => mockStartGame(...args),
}));

import { ShowTablesPage } from "./ShowTablesPage";

describe("ShowTablesPage start gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables Start Game and shows reasons when not valid", () => {
    mockUseStartCheck.mockReturnValue({
      canStart: false,
      problems: [
        { code: "MULTIPLE_EMPTY_POSITIONS", message: "More than one pair is missing." },
      ],
      sitOutSeat: null,
    });

    render(<ShowTablesPage />);

    const startButton = screen.getByRole("button", { name: "Start Game" });
    expect(startButton).toBeDisabled();
    expect(
      screen.getByText("More than one pair is missing."),
    ).toBeInTheDocument();
  });

  it("enables Start Game and starts the game when valid", async () => {
    mockUseStartCheck.mockReturnValue({
      canStart: true,
      problems: [],
      sitOutSeat: null,
    });

    render(<ShowTablesPage />);

    const startButton = screen.getByRole("button", { name: "Start Game" });
    expect(startButton).toBeEnabled();

    fireEvent.click(startButton);

    await waitFor(() => expect(mockStartGame).toHaveBeenCalledWith("g1"));
  });

  it("shows the sit-out note when one pair short", () => {
    mockUseStartCheck.mockReturnValue({
      canStart: true,
      problems: [],
      sitOutSeat: "A3EW",
    });

    render(<ShowTablesPage />);

    expect(screen.getByText(/A3EW will sit out/)).toBeInTheDocument();
  });

  it("renders the setup tab bar passed via the tabs slot", () => {
    mockUseStartCheck.mockReturnValue({
      canStart: false,
      problems: [],
      sitOutSeat: null,
    });

    render(<ShowTablesPage tabs={<div>tab bar</div>} />);

    expect(screen.getByText("tab bar")).toBeInTheDocument();
  });
});
