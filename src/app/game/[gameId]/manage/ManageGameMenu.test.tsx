import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
}));

const mockUseGameStarted = vi.fn();
const mockUseResultsComplete = vi.fn();
vi.mock("@/hooks/game-started", () => ({
  useGameStarted: () => mockUseGameStarted(),
}));
vi.mock("@/hooks/results-complete", () => ({
  useResultsComplete: () => mockUseResultsComplete(),
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
    mockUseGameStarted.mockReturnValue({ started: true, isLoading: false });
    mockUseResultsComplete.mockReturnValue({
      allResultsIn: false,
      isLoading: false,
    });
  });

  it("routes each menu action to the correct path", () => {
    render(<ManageGameMenu gameId="g1" />);

    fireEvent.click(screen.getByRole("button", { name: "onSetUpGameClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/create");

    fireEvent.click(screen.getByRole("button", { name: "onTravellersClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/travellers");

    fireEvent.click(screen.getByRole("button", { name: "onMovementClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/movement");

    fireEvent.click(
      screen.getByRole("button", { name: "onShareDirectorAccessClick" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/share-access");

    fireEvent.click(
      screen.getByRole("button", { name: "onDownloadUsebioClick" }),
    );
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/download-usebio");

    fireEvent.click(screen.getByRole("button", { name: "onDeleteGameClick" }));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/delete-game");
  });

  it("before start: shows Set Up Game, hides Travellers/Movement/USEBIO", () => {
    mockUseGameStarted.mockReturnValue({ started: false, isLoading: false });
    render(<ManageGameMenu gameId="g1" />);

    expect(flag("showSetUpGame")).toBe("true");
    expect(flag("showTravellers")).toBe("false");
    expect(flag("showMovement")).toBe("false");
    expect(flag("showDownloadUsebio")).toBe("false");
  });

  it("while started state is loading: hides all state-gated buttons", () => {
    mockUseGameStarted.mockReturnValue({ started: false, isLoading: true });
    render(<ManageGameMenu gameId="g1" />);

    expect(flag("showSetUpGame")).toBe("false");
    expect(flag("showTravellers")).toBe("false");
    expect(flag("showMovement")).toBe("false");
    expect(flag("showDownloadUsebio")).toBe("false");
  });

  it("after start, results incomplete: shows Travellers/Movement and USEBIO disabled", () => {
    mockUseGameStarted.mockReturnValue({ started: true, isLoading: false });
    mockUseResultsComplete.mockReturnValue({
      allResultsIn: false,
      isLoading: false,
    });
    render(<ManageGameMenu gameId="g1" />);

    expect(flag("showSetUpGame")).toBe("false");
    expect(flag("showTravellers")).toBe("true");
    expect(flag("showMovement")).toBe("true");
    expect(flag("showDownloadUsebio")).toBe("true");
    expect(flag("downloadUsebioDisabled")).toBe("true");
  });

  it("after start, completion loading: shows USEBIO disabled", () => {
    mockUseGameStarted.mockReturnValue({ started: true, isLoading: false });
    mockUseResultsComplete.mockReturnValue({
      allResultsIn: false,
      isLoading: true,
    });
    render(<ManageGameMenu gameId="g1" />);

    expect(flag("showDownloadUsebio")).toBe("true");
    expect(flag("downloadUsebioDisabled")).toBe("true");
  });

  it("after start, results complete: shows USEBIO enabled", () => {
    mockUseGameStarted.mockReturnValue({ started: true, isLoading: false });
    mockUseResultsComplete.mockReturnValue({
      allResultsIn: true,
      isLoading: false,
    });
    render(<ManageGameMenu gameId="g1" />);

    expect(flag("showDownloadUsebio")).toBe("true");
    expect(flag("downloadUsebioDisabled")).toBe("false");
  });
});
