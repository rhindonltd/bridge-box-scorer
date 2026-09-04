import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockIsDirectorFor = vi.fn();
vi.mock("@/lib/director-token", () => ({
  isDirectorFor: (...args: unknown[]) => mockIsDirectorFor(...args),
}));

// Capture ManageSelectGamePage's onGameSelected so tests can drive it.
let selectHandler: ((id: string, name?: string) => void) | null = null;
vi.mock("@/app/manage/ManageSelectGamePage", () => ({
  default: ({
    onGameSelected,
  }: {
    onGameSelected: (id: string, name?: string) => void;
  }) => {
    selectHandler = onGameSelected;
    return <div>select-game-page</div>;
  },
}));

vi.mock("@/app/manage/ClaimDirectorCode", () => ({
  ClaimDirectorCode: ({
    gameId,
    gameName,
    onSuccess,
    onCancel,
  }: {
    gameId: string;
    gameName: string;
    onSuccess: () => void;
    onCancel: () => void;
  }) => (
    <div>
      <span>{`claim-${gameId}-${gameName}`}</span>
      <button onClick={onSuccess}>claim-success</button>
      <button onClick={onCancel}>claim-cancel</button>
    </div>
  ),
}));

import { ManageSelectGameFlow } from "./ManageSelectGameFlow";

describe("ManageSelectGameFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectHandler = null;
  });

  it("navigates straight to manage when already a director", () => {
    mockIsDirectorFor.mockReturnValue(true);
    render(<ManageSelectGameFlow />);

    selectHandler!("g1");
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage");
  });

  it("shows the claim screen with the game name when not a director", () => {
    mockIsDirectorFor.mockReturnValue(false);
    render(<ManageSelectGameFlow />);

    act(() => selectHandler!("g1", "Tuesday Pairs"));
    expect(screen.getByText("claim-g1-Tuesday Pairs")).toBeInTheDocument();
  });

  it("falls back to a default game name when none is provided", () => {
    mockIsDirectorFor.mockReturnValue(false);
    render(<ManageSelectGameFlow />);

    act(() => selectHandler!("g1"));
    expect(screen.getByText("claim-g1-this game")).toBeInTheDocument();
  });

  it("navigates to manage after a successful claim", () => {
    mockIsDirectorFor.mockReturnValue(false);
    render(<ManageSelectGameFlow />);

    act(() => selectHandler!("g1", "Tuesday"));
    fireEvent.click(screen.getByText("claim-success"));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage");
  });

  it("returns to the game list when the claim is cancelled", () => {
    mockIsDirectorFor.mockReturnValue(false);
    render(<ManageSelectGameFlow />);

    act(() => selectHandler!("g1", "Tuesday"));
    expect(screen.getByText("claim-g1-Tuesday")).toBeInTheDocument();

    fireEvent.click(screen.getByText("claim-cancel"));
    expect(screen.getByText("select-game-page")).toBeInTheDocument();
  });
});
