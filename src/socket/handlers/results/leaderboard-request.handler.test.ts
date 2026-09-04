import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("./broadcast-results", () => ({
  buildLeaderboardPayload: vi.fn(),
}));

import { getDb } from "@/db/games";
import { buildLeaderboardPayload } from "./broadcast-results";
import { registerLeaderboardRequestHandler } from "./leaderboard-request.handler";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";

function createMockSocket() {
  return { on: vi.fn(), join: vi.fn(), leave: vi.fn() } as any;
}

function handlerFor(socket: any, event: string) {
  const call = socket.on.mock.calls.find((c: unknown[]) => c[0] === event);
  return call[1];
}

describe("registerLeaderboardRequestHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(buildLeaderboardPayload).mockResolvedValue({
      leaderboard: { type: "MP" },
      sections: [],
    } as any);
  });

  it("registers request and leave handlers", () => {
    const socket = createMockSocket();
    registerLeaderboardRequestHandler(socket, {} as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.REQUEST_STATE_LEADERBOARD,
      expect.any(Function),
    );
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.LEAVE_LEADERBOARD,
      expect.any(Function),
    );
  });

  it("joins the leaderboard room and acks the snapshot", async () => {
    const socket = createMockSocket();
    registerLeaderboardRequestHandler(socket, {} as any);

    const handler = handlerFor(socket, SocketEvents.REQUEST_STATE_LEADERBOARD);
    const cb = vi.fn();
    await handler({ gameId: "g1" }, cb);

    expect(socket.join).toHaveBeenCalledWith(Rooms.leaderboard("g1"));
    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: { leaderboard: { type: "MP" }, sections: [] },
    });
  });

  it("acks null data when the game db is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const socket = createMockSocket();
    registerLeaderboardRequestHandler(socket, {} as any);

    const handler = handlerFor(socket, SocketEvents.REQUEST_STATE_LEADERBOARD);
    const cb = vi.fn();
    await handler({ gameId: "g1" }, cb);

    // Still joins the room (so future pushes reach it), but no snapshot.
    expect(socket.join).toHaveBeenCalledWith(Rooms.leaderboard("g1"));
    expect(cb).toHaveBeenCalledWith({ success: true, data: null });
  });

  it("rejects an invalid payload without joining", async () => {
    const socket = createMockSocket();
    registerLeaderboardRequestHandler(socket, {} as any);

    const handler = handlerFor(socket, SocketEvents.REQUEST_STATE_LEADERBOARD);
    const cb = vi.fn();
    await handler({ nope: true }, cb);

    expect(socket.join).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: expect.any(String),
    });
  });

  it("leaves the leaderboard room on leave", async () => {
    const socket = createMockSocket();
    registerLeaderboardRequestHandler(socket, {} as any);

    const leave = handlerFor(socket, SocketEvents.LEAVE_LEADERBOARD);
    leave({ gameId: "g1" });

    expect(socket.leave).toHaveBeenCalledWith(Rooms.leaderboard("g1"));
  });

  it("acks null data if computing the leaderboard throws", async () => {
    vi.mocked(buildLeaderboardPayload).mockRejectedValue(new Error("boom"));
    const socket = createMockSocket();
    registerLeaderboardRequestHandler(socket, {} as any);

    const handler = handlerFor(socket, SocketEvents.REQUEST_STATE_LEADERBOARD);
    const cb = vi.fn();
    await handler({ gameId: "g1" }, cb);

    expect(cb).toHaveBeenCalledWith({ success: true, data: null });
  });
});
