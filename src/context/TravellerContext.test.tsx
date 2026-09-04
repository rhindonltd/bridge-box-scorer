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

import { TravellerProvider, useTravellerContext } from "./TravellerContext";
import { SocketEvents } from "@/socket/socket-events";

function Probe() {
  const { instances, isLoading } = useTravellerContext();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="count">{instances.length}</span>
    </div>
  );
}

describe("TravellerProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmitWithAck.mockResolvedValue(null);
  });

  it("requests the board's traveller on mount with the board number", async () => {
    render(
      <TravellerProvider boardNumber={3}>
        <Probe />
      </TravellerProvider>,
    );

    await waitFor(() =>
      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.REQUEST_STATE_TRAVELLER,
        { gameId: "g1", boardNumber: 3 },
      ),
    );
  });

  it("seeds instances from the ack", async () => {
    mockEmitWithAck.mockResolvedValue({
      instances: [{ boardNumber: 3 }, { boardNumber: 3 }],
    });

    render(
      <TravellerProvider boardNumber={3}>
        <Probe />
      </TravellerProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("2"),
    );
  });

  it("applies pushed traveller:sync snapshots", async () => {
    render(
      <TravellerProvider boardNumber={3}>
        <Probe />
      </TravellerProvider>,
    );

    const syncCall = mockOn.mock.calls.find(
      (c) => c[0] === SocketEvents.TRAVELLER_SYNC,
    );
    act(() => syncCall![1]({ instances: [{ boardNumber: 3 }] }));

    await waitFor(() =>
      expect(screen.getByTestId("count").textContent).toBe("1"),
    );
  });

  it("leaves the old board room and requests the new one on board switch", async () => {
    const { rerender } = render(
      <TravellerProvider boardNumber={3}>
        <Probe />
      </TravellerProvider>,
    );

    await waitFor(() =>
      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.REQUEST_STATE_TRAVELLER,
        { gameId: "g1", boardNumber: 3 },
      ),
    );

    rerender(
      <TravellerProvider boardNumber={4}>
        <Probe />
      </TravellerProvider>,
    );

    // Left board 3, requested board 4.
    expect(mockEmitEvent).toHaveBeenCalledWith(SocketEvents.LEAVE_TRAVELLER, {
      gameId: "g1",
      boardNumber: 3,
    });
    await waitFor(() =>
      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.REQUEST_STATE_TRAVELLER,
        { gameId: "g1", boardNumber: 4 },
      ),
    );
  });

  it("emits leave on unmount", () => {
    const { unmount } = render(
      <TravellerProvider boardNumber={3}>
        <Probe />
      </TravellerProvider>,
    );

    unmount();

    expect(mockEmitEvent).toHaveBeenCalledWith(SocketEvents.LEAVE_TRAVELLER, {
      gameId: "g1",
      boardNumber: 3,
    });
  });

  it("re-requests the snapshot on reconnect", async () => {
    render(
      <TravellerProvider boardNumber={3}>
        <Probe />
      </TravellerProvider>,
    );

    await waitFor(() => expect(mockEmitWithAck).toHaveBeenCalledTimes(1));

    const reconnectCall = mockOn.mock.calls.find(
      (c) => c[0] === SocketEvents.CONNECT,
    );
    act(() => reconnectCall![1]());

    await waitFor(() => expect(mockEmitWithAck).toHaveBeenCalledTimes(2));
  });

  it("useTravellerContext throws when used outside a provider", () => {
    function Orphan() {
      useTravellerContext();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(
      /must be used within a TravellerProvider/,
    );
  });
});
