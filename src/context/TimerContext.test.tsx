import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

const mockOn = vi.fn();
const mockOff = vi.fn();
const mockEmitWithAck = vi.fn();

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ on: mockOn, off: mockOff }),
  emitWithAck: (...args: unknown[]) => mockEmitWithAck(...args),
}));

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1", gameType: "PAIRS" } }),
}));

import { TimerProvider, useTimerContext } from "./TimerContext";
import { SocketEvents } from "@/socket/socket-events";

const snapshot = {
  version: 1,
  phase: "play" as const,
  board: 1,
  round: 2,
  boardsPerRound: 3,
  totalRounds: 5,
  playDuration: 420,
  moveDuration: 60,
  isRunning: false,
  phaseStartedAt: null,
  remainingMs: 300_000,
  serverNow: Date.now(),
  breakProblems: [],
};

function Probe() {
  const { timerState, isConnected, now } = useTimerContext();
  return (
    <div>
      <span data-testid="connected">{String(isConnected)}</span>
      <span data-testid="round">{timerState?.round ?? "none"}</span>
      <span data-testid="phase">{timerState?.phase ?? "none"}</span>
      <span data-testid="now">{now()}</span>
    </div>
  );
}

describe("TimerProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmitWithAck.mockResolvedValue(null);
  });

  it("requests the timer snapshot on mount", async () => {
    render(
      <TimerProvider>
        <Probe />
      </TimerProvider>,
    );

    await waitFor(() =>
      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.REQUEST_STATE_TIMER,
        { gameId: "g1" },
      ),
    );
  });

  it("subscribes to timer:sync and reconnect", () => {
    render(
      <TimerProvider>
        <Probe />
      </TimerProvider>,
    );

    expect(mockOn).toHaveBeenCalledWith(
      SocketEvents.TIMER_SYNC,
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
      <TimerProvider>
        <Probe />
      </TimerProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("round").textContent).toBe("2"),
    );
    expect(screen.getByTestId("connected").textContent).toBe("true");
  });

  it("applies live timer:sync events on top", async () => {
    render(
      <TimerProvider>
        <Probe />
      </TimerProvider>,
    );

    // Find the timer:sync listener that was registered.
    const syncCall = mockOn.mock.calls.find(
      (c) => c[0] === SocketEvents.TIMER_SYNC,
    );
    const handler = syncCall![1];

    // Omit breakProblems so the `problems ?? []` fallback branch is taken.
    const noProblems = { ...snapshot, breakProblems: undefined };
    act(() => {
      handler({ ...noProblems, phase: "move", round: 3 });
    });

    await waitFor(() =>
      expect(screen.getByTestId("phase").textContent).toBe("move"),
    );
    expect(screen.getByTestId("round").textContent).toBe("3");
  });

  it("re-requests the snapshot on reconnect", async () => {
    render(
      <TimerProvider>
        <Probe />
      </TimerProvider>,
    );

    await waitFor(() => expect(mockEmitWithAck).toHaveBeenCalledTimes(1));

    const reconnectCall = mockOn.mock.calls.find(
      (c) => c[0] === SocketEvents.CONNECT,
    );
    const reconnect = reconnectCall![1];

    act(() => {
      reconnect();
    });

    await waitFor(() => expect(mockEmitWithAck).toHaveBeenCalledTimes(2));
  });

  it("exposes a server-clock-corrected now() that seeds its offset from serverNow", async () => {
    const fixed = 1_000_000;
    vi.spyOn(Date, "now").mockReturnValue(fixed);
    // serverNow ahead of the client clock by 5s => now() should be +5s.
    mockEmitWithAck.mockResolvedValue({ ...snapshot, serverNow: fixed + 5_000 });

    render(
      <TimerProvider>
        <Probe />
      </TimerProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("now").textContent).toBe(String(fixed + 5_000)),
    );
    vi.restoreAllMocks();
  });

  it("ignores a snapshot that resolves after unmount", async () => {
    let resolve!: (value: unknown) => void;
    mockEmitWithAck.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );

    const { unmount } = render(
      <TimerProvider>
        <Probe />
      </TimerProvider>,
    );

    // Unmount first (sets cancelled = true), then let the request resolve.
    unmount();
    await act(async () => {
      resolve(snapshot);
      await Promise.resolve();
    });
    // apply() short-circuits on cancelled, so no state update / act warning.
  });

  it("useTimerContext throws when used outside a provider", () => {
    function Orphan() {
      useTimerContext();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(
      /must be used within a TimerProvider/,
    );
  });
});
