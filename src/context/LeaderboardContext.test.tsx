import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

const mockOn = vi.fn();
const mockOff = vi.fn();
const mockEmitWithAck = vi.fn();
const mockEmitEvent = vi.fn();

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ on: mockOn, off: mockOff }),
  emitWithAck: (...args: unknown[]) => mockEmitWithAck(...args),
  emitEvent: (...args: unknown[]) => mockEmitEvent(...args),
}));

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1", gameType: "PAIRS" } }),
}));

import {
  LeaderboardProvider,
  useLeaderboardContext,
} from "./LeaderboardContext";
import { SocketEvents } from "@/socket/socket-events";

const snapshot = {
  leaderboard: { type: "MP", label: "combined" },
  sections: [{ section: "A", type: "MP" }],
};

function Probe() {
  const { leaderboard, sections, isLoading } = useLeaderboardContext();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="lb">{leaderboard ? "yes" : "no"}</span>
      <span data-testid="sections">{sections.length}</span>
    </div>
  );
}

describe("LeaderboardProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmitWithAck.mockResolvedValue(null);
  });

  it("requests the leaderboard snapshot on mount", async () => {
    render(
      <LeaderboardProvider>
        <Probe />
      </LeaderboardProvider>,
    );

    await waitFor(() =>
      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.REQUEST_STATE_LEADERBOARD,
        { gameId: "g1" },
      ),
    );
  });

  it("subscribes to leaderboard:sync and reconnect", () => {
    render(
      <LeaderboardProvider>
        <Probe />
      </LeaderboardProvider>,
    );

    expect(mockOn).toHaveBeenCalledWith(
      SocketEvents.LEADERBOARD_SYNC,
      expect.any(Function),
    );
    expect(mockOn).toHaveBeenCalledWith(
      SocketEvents.CONNECT,
      expect.any(Function),
    );
  });

  it("seeds state from the request ack", async () => {
    mockEmitWithAck.mockResolvedValue(snapshot);

    render(
      <LeaderboardProvider>
        <Probe />
      </LeaderboardProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("lb").textContent).toBe("yes"));
    expect(screen.getByTestId("sections").textContent).toBe("1");
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  it("applies pushed leaderboard:sync snapshots", async () => {
    render(
      <LeaderboardProvider>
        <Probe />
      </LeaderboardProvider>,
    );

    const syncCall = mockOn.mock.calls.find(
      (c) => c[0] === SocketEvents.LEADERBOARD_SYNC,
    );
    const handler = syncCall![1];

    act(() => {
      handler(snapshot);
    });

    await waitFor(() => expect(screen.getByTestId("lb").textContent).toBe("yes"));
  });

  it("re-requests on reconnect", async () => {
    render(
      <LeaderboardProvider>
        <Probe />
      </LeaderboardProvider>,
    );

    await waitFor(() => expect(mockEmitWithAck).toHaveBeenCalledTimes(1));

    const reconnectCall = mockOn.mock.calls.find(
      (c) => c[0] === SocketEvents.CONNECT,
    );
    act(() => reconnectCall![1]());

    await waitFor(() => expect(mockEmitWithAck).toHaveBeenCalledTimes(2));
  });

  it("emits leave on unmount", () => {
    const { unmount } = render(
      <LeaderboardProvider>
        <Probe />
      </LeaderboardProvider>,
    );

    unmount();

    expect(mockEmitEvent).toHaveBeenCalledWith(SocketEvents.LEAVE_LEADERBOARD, {
      gameId: "g1",
    });
  });
});
