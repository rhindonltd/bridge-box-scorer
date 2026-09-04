import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("./broadcast-results", () => ({
  buildTravellerPayload: vi.fn(),
}));

import { getDb } from "@/db/games";
import { buildTravellerPayload } from "./broadcast-results";
import { registerTravellerRequestHandler } from "./traveller-request.handler";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";

function createMockSocket() {
  return { on: vi.fn(), join: vi.fn(), leave: vi.fn() } as any;
}

function handlerFor(socket: any, event: string) {
  const call = socket.on.mock.calls.find((c: unknown[]) => c[0] === event);
  return call[1];
}

describe("registerTravellerRequestHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(buildTravellerPayload).mockResolvedValue({
      instances: [{ boardNumber: 3 }],
    } as any);
  });

  it("registers request and leave handlers", () => {
    const socket = createMockSocket();
    registerTravellerRequestHandler(socket, {} as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.REQUEST_STATE_TRAVELLER,
      expect.any(Function),
    );
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.LEAVE_TRAVELLER,
      expect.any(Function),
    );
  });

  it("joins the per-board room and acks the snapshot", async () => {
    const socket = createMockSocket();
    registerTravellerRequestHandler(socket, {} as any);

    const handler = handlerFor(socket, SocketEvents.REQUEST_STATE_TRAVELLER);
    const cb = vi.fn();
    await handler({ gameId: "g1", boardNumber: 3 }, cb);

    expect(socket.join).toHaveBeenCalledWith(Rooms.traveller("g1", 3));
    expect(buildTravellerPayload).toHaveBeenCalledWith(expect.anything(), 3);
    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: { instances: [{ boardNumber: 3 }] },
    });
  });

  it("acks null data when the game db is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const socket = createMockSocket();
    registerTravellerRequestHandler(socket, {} as any);

    const handler = handlerFor(socket, SocketEvents.REQUEST_STATE_TRAVELLER);
    const cb = vi.fn();
    await handler({ gameId: "g1", boardNumber: 3 }, cb);

    expect(socket.join).toHaveBeenCalledWith(Rooms.traveller("g1", 3));
    expect(cb).toHaveBeenCalledWith({ success: true, data: null });
  });

  it("rejects an invalid payload (missing boardNumber) without joining", async () => {
    const socket = createMockSocket();
    registerTravellerRequestHandler(socket, {} as any);

    const handler = handlerFor(socket, SocketEvents.REQUEST_STATE_TRAVELLER);
    const cb = vi.fn();
    await handler({ gameId: "g1" }, cb);

    expect(socket.join).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: expect.any(String),
    });
  });

  it("leaves the per-board room on leave", async () => {
    const socket = createMockSocket();
    registerTravellerRequestHandler(socket, {} as any);

    const leave = handlerFor(socket, SocketEvents.LEAVE_TRAVELLER);
    leave({ gameId: "g1", boardNumber: 3 });

    expect(socket.leave).toHaveBeenCalledWith(Rooms.traveller("g1", 3));
  });
});
