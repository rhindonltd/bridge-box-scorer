import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
}));

let gameData: unknown = { eventFormat: "STANDARD" };

// Key-aware SWR mock: the game key returns the game (for the Swiss check); the
// A null key (the not-started gate) yields no data.
vi.mock("swr", () => ({
  default: (key: string | null) => {
    if (key === null) return { data: undefined };
    return { data: gameData };
  },
}));
vi.mock("@/lib/fetcher", () => ({
  fetcher: vi.fn(),
  unwrapFetcher: () => vi.fn(),
}));
vi.mock("@/swr/swr-keys", () => ({
  swrKeys: {
    game: (gameId: string) => `/api/games/${gameId}`,
  },
}));

const mockUseGameStarted = vi.fn();
vi.mock("@/hooks/game-started", () => ({
  useGameStarted: () => mockUseGameStarted(),
}));

// The mock renders a button for each function prop (so we can click and assert
// routing) and a data-flag element for each boolean prop (so we can assert the
// derived visibility flags).
vi.mock("@/app/game/[gameId]/manage/ManageGameMenuPage", () => ({
  ManageGameMenuPage: (props: Record<string, unknown>) => (
    <div>
      {Object.entries(props).map(([name, value]) =>
        typeof value === "function" ? (
          <button key={name} onClick={value as () => void}>
            {name}
          </button>
        ) : (
          <span key={name} data-testid={`flag-${name}`}>
            {String(value)}
          </span>
        ),
      )}
    </div>
  ),
}));

import { ManageGameMenu } from "./ManageGameMenu";

function flag(name: string) {
  return screen.getByTestId(`flag-${name}`).textContent;
}

describe("ManageGameMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameData = { eventFormat: "STANDARD" };
    mockUseGameStarted.mockReturnValue({ started: true, isLoading: false });
  });

  it("routes each menu action to the correct path", () => {
    render(<ManageGameMenu gameId="g1" />);

    fireEvent.click(screen.getByRole("button", { name: "onSetUpGameClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/create");

    // "Manage Tables" is a post-start action, so it must NOT route to the
    // not-started-guarded setup flow (which would bounce straight back to the
    // menu); it has its own started-guarded route.
    fireEvent.click(
      screen.getByRole("button", { name: "onManageTablesClick" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/tables");

    fireEvent.click(screen.getByRole("button", { name: "onTravellersClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/travellers");

    fireEvent.click(screen.getByRole("button", { name: "onEnterDealsClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/deals");

    fireEvent.click(screen.getByRole("button", { name: "onMovementClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/movement");

    fireEvent.click(screen.getByRole("button", { name: "onTimerClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/timer");

    fireEvent.click(screen.getByRole("button", { name: "onPairsClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/pairs");

    fireEvent.click(screen.getByRole("button", { name: "onExportClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/export");

    fireEvent.click(screen.getByRole("button", { name: "onDeleteGameClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/delete-game");
  });

  it("shows Export & Publish once started and hides it before start", () => {
    mockUseGameStarted.mockReturnValue({ started: true, isLoading: false });
    const { rerender } = render(<ManageGameMenu gameId="g1" />);
    expect(flag("showExport")).toBe("true");

    mockUseGameStarted.mockReturnValue({ started: false, isLoading: false });
    rerender(<ManageGameMenu gameId="g1" />);
    expect(flag("showExport")).toBe("false");
  });

  it("shows Timer once the game has started (setup has its own Timer tab)", () => {
    mockUseGameStarted.mockReturnValue({ started: true, isLoading: false });
    const { rerender } = render(<ManageGameMenu gameId="g1" />);
    expect(flag("showTimer")).toBe("true");

    mockUseGameStarted.mockReturnValue({ started: false, isLoading: false });
    rerender(<ManageGameMenu gameId="g1" />);
    expect(flag("showTimer")).toBe("false");
  });

  it("shows Pairs once the game has started", () => {
    mockUseGameStarted.mockReturnValue({ started: true, isLoading: false });
    const { rerender } = render(<ManageGameMenu gameId="g1" />);
    expect(flag("showPairs")).toBe("true");

    mockUseGameStarted.mockReturnValue({ started: false, isLoading: false });
    rerender(<ManageGameMenu gameId="g1" />);
    expect(flag("showPairs")).toBe("false");
  });

  it("before start: shows Set Up Game, hides Travellers/Movement/Export", () => {
    mockUseGameStarted.mockReturnValue({ started: false, isLoading: false });
    render(<ManageGameMenu gameId="g1" />);

    expect(flag("showSetUpGame")).toBe("true");
    expect(flag("showTravellers")).toBe("false");
    expect(flag("showMovement")).toBe("false");
    expect(flag("showExport")).toBe("false");
  });

  it("while started state is loading: hides all state-gated buttons", () => {
    mockUseGameStarted.mockReturnValue({ started: false, isLoading: true });
    render(<ManageGameMenu gameId="g1" />);

    expect(flag("showSetUpGame")).toBe("false");
    expect(flag("showTravellers")).toBe("false");
    expect(flag("showMovement")).toBe("false");
    expect(flag("showExport")).toBe("false");
  });

  it("after start: shows Travellers/Movement/Export", () => {
    mockUseGameStarted.mockReturnValue({ started: true, isLoading: false });
    render(<ManageGameMenu gameId="g1" />);

    expect(flag("showSetUpGame")).toBe("false");
    expect(flag("showTravellers")).toBe("true");
    expect(flag("showMovement")).toBe("true");
    expect(flag("showExport")).toBe("true");
  });

  it("shows Review Mismatches only for a started Swiss game and routes it", () => {
    gameData = { eventFormat: "SWISS" };
    mockUseGameStarted.mockReturnValue({ started: true, isLoading: false });
    render(<ManageGameMenu gameId="g1" />);

    expect(flag("showReviewMismatches")).toBe("true");
    fireEvent.click(
      screen.getByRole("button", { name: "onReviewMismatchesClick" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/mismatches");
  });

  it("hides Review Mismatches for a non-Swiss game", () => {
    gameData = { eventFormat: "STANDARD" };
    render(<ManageGameMenu gameId="g1" />);
    expect(flag("showReviewMismatches")).toBe("false");
  });
});
