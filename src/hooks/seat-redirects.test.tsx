import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

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
  useRouter: () => ({ replace: mockReplace }),
}));

const mockGetPlayerToken = vi.fn();
const mockSetPlayerToken = vi.fn();
const mockClearPlayerToken = vi.fn();
vi.mock("@/lib/player-token", () => ({
  getPlayerToken: (...a: unknown[]) => mockGetPlayerToken(...a),
  setPlayerToken: (...a: unknown[]) => mockSetPlayerToken(...a),
  clearPlayerToken: (...a: unknown[]) => mockClearPlayerToken(...a),
}));

import {
  useSeatEvictedRedirect,
  useSeatRenumberedRedirect,
} from "./seat-redirects";

function fire(event: string, payload: unknown) {
  handlers.get(event)?.(payload);
}

beforeEach(() => {
  vi.clearAllMocks();
  handlers.clear();
  mockGetPlayerToken.mockReturnValue({
    startingPosition: "A5NS",
    token: "secret-123",
  });
});

describe("useSeatEvictedRedirect", () => {
  it("clears the token and returns to seat selection when this seat is evicted", () => {
    renderHook(() => useSeatEvictedRedirect("g1", "A5NS"));
    fire(SocketEvents.SEAT_EVICTED, { gameId: "g1", seat: "A5NS" });
    expect(mockClearPlayerToken).toHaveBeenCalledWith("g1");
    expect(mockReplace).toHaveBeenCalledWith("/game/g1/join");
  });

  it("ignores an eviction of another seat or another game", () => {
    renderHook(() => useSeatEvictedRedirect("g1", "A5NS"));
    fire(SocketEvents.SEAT_EVICTED, { gameId: "g1", seat: "A1NS" });
    fire(SocketEvents.SEAT_EVICTED, { gameId: "g2", seat: "A5NS" });
    expect(mockClearPlayerToken).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe("useSeatRenumberedRedirect", () => {
  it("adopts the new seat and moves to its play screen", () => {
    renderHook(() => useSeatRenumberedRedirect("g1", "A5NS"));
    fire(SocketEvents.SEAT_RENUMBERED, {
      gameId: "g1",
      moves: [{ from: "A5NS", to: "B1NS" }],
    });
    expect(mockSetPlayerToken).toHaveBeenCalledWith("g1", {
      startingPosition: "B1NS",
      token: "secret-123",
    });
    expect(mockReplace).toHaveBeenCalledWith("/game/g1/play/B1NS");
  });

  it("ignores a renumber that does not move this seat", () => {
    renderHook(() => useSeatRenumberedRedirect("g1", "A5NS"));
    fire(SocketEvents.SEAT_RENUMBERED, {
      gameId: "g1",
      moves: [{ from: "A1NS", to: "B1NS" }],
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
