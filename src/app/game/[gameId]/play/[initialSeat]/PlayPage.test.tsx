import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { SocketEvents } from "@/socket/socket-events";

// Capture each useSocketEvent(event, handler) registration so a test can fire
// the handler for a given event, standing in for a server push.
const handlers = new Map<string, (payload: unknown) => void>();
vi.mock("@/hooks/socket-event", () => ({
  useSocketEvent: (event: string, handler: (payload: unknown) => void) => {
    handlers.set(event, handler);
  },
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ initialSeat: "A5NS" }),
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: {
      gameId: "g1",
      handEntryEnabled: false,
      gameType: "PAIRS",
      scoringType: "MP",
      leadCardRequired: true,
    },
  }),
}));

// Keep the play container in its simplest branch: still waiting to start, so it
// renders the waiting screen and we don't need to mock the whole play router.
let mockFlow: Record<string, unknown> = {
  waitingToStart: true,
  schedule: null,
  playState: {},
};
vi.mock("@/hooks/play-flow", () => ({
  usePlayFlow: () => mockFlow,
}));
let mockTakenOver = false;
vi.mock("@/hooks/seat-taken-over", () => ({
  useSeatTakenOver: () => mockTakenOver,
}));
vi.mock("@/components/common/Spinner", () => ({
  FullScreenSpinner: () => <div>spinner</div>,
}));

vi.mock("@/app/game/[gameId]/play/[initialSeat]/WaitingToStartPage", () => ({
  WaitingToStartPage: () => <div>waiting</div>,
}));
vi.mock("@/app/game/[gameId]/play/[initialSeat]/SeatTakenOverPage", () => ({
  SeatTakenOverPage: () => <div>taken-over</div>,
}));
vi.mock("@/app/game/[gameId]/play/[initialSeat]/PlayStateRouter", () => ({
  PlayStateRouter: () => <div>play</div>,
}));

const mockGetPlayerToken = vi.fn();
const mockSetPlayerToken = vi.fn();
vi.mock("@/lib/player-token", () => ({
  getPlayerToken: (...a: unknown[]) => mockGetPlayerToken(...a),
  setPlayerToken: (...a: unknown[]) => mockSetPlayerToken(...a),
}));

import { PlayPage } from "./PlayPage";

function fire(event: string, payload: unknown) {
  handlers.get(event)?.(payload);
}

describe("PlayPage SEAT_RENUMBERED handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    mockFlow = { waitingToStart: true, schedule: null, playState: {} };
    mockTakenOver = false;
    mockGetPlayerToken.mockReturnValue({
      startingPosition: "A5NS",
      token: "secret-123",
    });
  });

  it("re-routes and rewrites the stored token when this seat is renumbered", () => {
    render(<PlayPage />);

    fire(SocketEvents.SEAT_RENUMBERED, {
      gameId: "g1",
      moves: [
        { from: "A5NS", to: "B1NS" },
        { from: "A5EW", to: "B1EW" },
      ],
    });

    // The stored token keeps its secret but points at the new seat.
    expect(mockSetPlayerToken).toHaveBeenCalledWith("g1", {
      startingPosition: "B1NS",
      token: "secret-123",
    });
    expect(mockReplace).toHaveBeenCalledWith("/game/g1/play/B1NS");
  });

  it("ignores a renumber that does not include this device's seat", () => {
    render(<PlayPage />);

    fire(SocketEvents.SEAT_RENUMBERED, {
      gameId: "g1",
      moves: [{ from: "A6NS", to: "B2NS" }],
    });

    expect(mockSetPlayerToken).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("ignores a renumber for a different game", () => {
    render(<PlayPage />);

    fire(SocketEvents.SEAT_RENUMBERED, {
      gameId: "other",
      moves: [{ from: "A5NS", to: "B1NS" }],
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("still re-routes when there is no stored token (URL is the source of truth)", () => {
    mockGetPlayerToken.mockReturnValue(null);
    render(<PlayPage />);

    fire(SocketEvents.SEAT_RENUMBERED, {
      gameId: "g1",
      moves: [{ from: "A5NS", to: "B1NS" }],
    });

    expect(mockSetPlayerToken).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/game/g1/play/B1NS");
  });
});
describe("PlayPage screen selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    mockTakenOver = false;
    mockFlow = { waitingToStart: true, schedule: null, playState: {} };
  });
  it("shows the seat-moved screen once another device takes the seat", () => {
    mockTakenOver = true;
    render(<PlayPage />);
    expect(screen.getByText("taken-over")).toBeInTheDocument();
  });
  it("shows a spinner while the schedule is still loading", () => {
    mockFlow = { waitingToStart: false, schedule: null, playState: {} };
    render(<PlayPage />);
    expect(screen.getByText("spinner")).toBeInTheDocument();
  });
  it("delegates to the state router once the schedule is loaded", () => {
    mockFlow = { waitingToStart: false, schedule: {}, playState: {} };
    render(<PlayPage />);
    expect(screen.getByText("play")).toBeInTheDocument();
  });
});
