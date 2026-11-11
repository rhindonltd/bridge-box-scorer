import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1" }, mutateGame: vi.fn() }),
}));

const mockGetPlayerToken = vi.fn();
const mockClearPlayerToken = vi.fn();
vi.mock("@/lib/player-token", () => ({
  getPlayerToken: (...args: unknown[]) => mockGetPlayerToken(...args),
  clearPlayerToken: (...args: unknown[]) => mockClearPlayerToken(...args),
}));

const mockVerifySeatHeld = vi.fn();
vi.mock("@/lib/game-service", () => ({
  verifySeatHeld: (...args: unknown[]) => mockVerifySeatHeld(...args),
}));

vi.mock("@/components/common/Spinner", () => ({
  FullScreenSpinner: () => <div data-testid="spinner" />,
}));

// Stub SelectSeatPage to expose a button that invokes onSeatSelected with a
// fixed seat, so we assert the container's routing behaviour in isolation.
vi.mock("@/app/game/[gameId]/join/SelectSeatPage", () => ({
  SelectSeatPage: ({
    onSeatSelected,
  }: {
    onSeatSelected: (seat: string) => void;
  }) => (
    <button data-testid="select-seat" onClick={() => onSeatSelected("A3NS")}>
      select
    </button>
  ),
}));

import JoinGameAsPlayer from "./JoinGameAsPlayer";

describe("JoinGameAsPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: this device holds no seat yet.
    mockGetPlayerToken.mockReturnValue(null);
    mockVerifySeatHeld.mockResolvedValue(false);
  });

  it("shows seat selection and routes to the chosen seat's play screen", () => {
    render(<JoinGameAsPlayer />);

    // No stored token -> seat selection straight away, no verification call.
    expect(screen.getByTestId("select-seat")).toBeInTheDocument();
    expect(mockVerifySeatHeld).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("select-seat"));
    expect(mockReplace).toHaveBeenCalledWith("/game/g1/play/A3NS");
  });

  it("redirects to the held seat when the server confirms it is still held", async () => {
    mockGetPlayerToken.mockReturnValue({
      startingPosition: "A5NS",
      token: "secret",
    });
    mockVerifySeatHeld.mockResolvedValue(true);

    render(<JoinGameAsPlayer />);

    // Spinner while verifying; then a redirect to the held seat.
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/game/g1/play/A5NS"),
    );
    expect(mockVerifySeatHeld).toHaveBeenCalledWith("g1", "A5NS");
    expect(mockClearPlayerToken).not.toHaveBeenCalled();
    expect(screen.queryByTestId("select-seat")).not.toBeInTheDocument();
  });

  it("clears the stale token and shows seat selection when the seat is no longer held", async () => {
    mockGetPlayerToken.mockReturnValue({
      startingPosition: "A5NS",
      token: "secret",
    });
    mockVerifySeatHeld.mockResolvedValue(false);

    render(<JoinGameAsPlayer />);

    // Verification says the seat isn't ours -> drop the token, show the picker.
    await waitFor(() =>
      expect(screen.getByTestId("select-seat")).toBeInTheDocument(),
    );
    expect(mockClearPlayerToken).toHaveBeenCalledWith("g1");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders the spinner on the server, where the stored token is unknown", () => {
    mockGetPlayerToken.mockReturnValue({
      startingPosition: "A5NS",
      token: "secret",
    });
    const html = renderToString(<JoinGameAsPlayer />);
    expect(html).toContain('data-testid="spinner"');
    expect(html).not.toContain("select-seat");
  });

  it("falls through to the picker when the token vanishes before verification", async () => {
    // The first read (the external-store snapshot) sees a token; by the time
    // the effect re-reads it, it has been cleared.
    mockGetPlayerToken
      .mockReturnValueOnce({ startingPosition: "A5NS", token: "secret" })
      .mockReturnValue(null);
    render(<JoinGameAsPlayer />);
    expect(mockVerifySeatHeld).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("ignores a verification result that arrives after unmount", async () => {
    mockGetPlayerToken.mockReturnValue({
      startingPosition: "A5NS",
      token: "secret",
    });
    let resolve!: (held: boolean) => void;
    mockVerifySeatHeld.mockReturnValue(
      new Promise<boolean>((r) => (resolve = r)),
    );
    const { unmount } = render(<JoinGameAsPlayer />);
    unmount();
    resolve(true);
    await Promise.resolve();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockClearPlayerToken).not.toHaveBeenCalled();
  });
});
