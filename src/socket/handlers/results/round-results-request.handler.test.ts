import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/services/board-service", () => ({
  getBoardInstances: vi.fn(),
}));

import { getDb } from "@/db/games";
import { getBoardInstances } from "@/services/board-service";
import { registerRoundResultsRequestHandler } from "./round-results-request.handler";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";

function createMockSocket() {
  return { on: vi.fn(), join: vi.fn(), leave: vi.fn() } as any;
}

function handlerFor(socket: any, event: string) {
  const call = socket.on.mock.calls.find((c: unknown[]) => c[0] === event);
  return call[1];
}

describe("registerRoundResultsRequestHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(getBoardInstances).mockImplementation(
      async (_db: unknown, boardNumber: number) =>
        [{ boardNumber, tableNumber: 1 }] as any,
    );
  });

  it("registers request and leave handlers", () => {
    const socket = createMockSocket();
    registerRoundResultsRequestHandler(socket, {} as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.REQUEST_STATE_ROUND_RESULTS,
      expect.any(Function),
    );
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.LEAVE_ROUND_RESULTS,
      expect.any(Function),
    );
  });

  it("joins the round-results room and acks each requested board's instances", async () => {
    const socket = createMockSocket();
    registerRoundResultsRequestHandler(socket, {} as any);

    const handler = handlerFor(
      socket,
      SocketEvents.REQUEST_STATE_ROUND_RESULTS,
    );
    const cb = vi.fn();
    await handler({ gameId: "g1", boardNumbers: [1, 2] }, cb);

    expect(socket.join).toHaveBeenCalledWith(Rooms.roundResults("g1"));
    expect(getBoardInstances).toHaveBeenCalledWith(expect.anything(), 1);
    expect(getBoardInstances).toHaveBeenCalledWith(expect.anything(), 2);
    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: {
        boards: [
          { boardNumber: 1, instances: [{ boardNumber: 1, tableNumber: 1 }] },
          { boardNumber: 2, instances: [{ boardNumber: 2, tableNumber: 1 }] },
        ],
      },
    });
  });

  it("joins the room and acks null when the game db is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const socket = createMockSocket();
    registerRoundResultsRequestHandler(socket, {} as any);

    const handler = handlerFor(
      socket,
      SocketEvents.REQUEST_STATE_ROUND_RESULTS,
    );
    const cb = vi.fn();
    await handler({ gameId: "g1", boardNumbers: [1] }, cb);

    expect(socket.join).toHaveBeenCalledWith(Rooms.roundResults("g1"));
    expect(cb).toHaveBeenCalledWith({ success: true, data: null });
  });

  it("rejects an invalid payload (empty boardNumbers) without joining", async () => {
    const socket = createMockSocket();
    registerRoundResultsRequestHandler(socket, {} as any);

    const handler = handlerFor(
      socket,
      SocketEvents.REQUEST_STATE_ROUND_RESULTS,
    );
    const cb = vi.fn();
    await handler({ gameId: "g1", boardNumbers: [] }, cb);

    expect(socket.join).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: expect.any(String),
    });
  });

  it("leaves the round-results room on leave", () => {
    const socket = createMockSocket();
    registerRoundResultsRequestHandler(socket, {} as any);

    const leave = handlerFor(socket, SocketEvents.LEAVE_ROUND_RESULTS);
    leave({ gameId: "g1" });

    expect(socket.leave).toHaveBeenCalledWith(Rooms.roundResults("g1"));
  });
});
