import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Server } from "socket.io";

import { registerScorecardRequestHandler } from "./scorecard-request.handler";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/services/scorecard-service", () => ({
  buildPairScorecard: vi.fn(),
}));

import { getDb } from "@/db/games";
import { buildPairScorecard } from "@/services/scorecard-service";

function createMockSocket() {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();
  const socket = {
    id: "sock-1",
    on: vi.fn((event: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(event, handler);
    }),
    join: vi.fn(),
    leave: vi.fn(),
    emit: vi.fn(),
  };
  const trigger = async (event: string, ...args: unknown[]) => {
    const handler = handlers.get(event);
    if (!handler) throw new Error(`No handler for ${event}`);
    return handler(...args);
  };
  return { socket, trigger };
}

const mockIo = {} as unknown as Server;

describe("scorecard request handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ db: true } as never);
  });

  it("joins the seat's scorecard room and acks its scorecard", async () => {
    const card = { pairId: "A1NS", scoring: "MP", boards: [], roundVps: null };
    vi.mocked(buildPairScorecard).mockResolvedValue(card as never);
    const { socket, trigger } = createMockSocket();
    registerScorecardRequestHandler(socket as never, mockIo);

    const ack = vi.fn();
    await trigger(
      SocketEvents.REQUEST_STATE_SCORECARD,
      { gameId: "g1", seat: "A1NS" },
      ack,
    );

    expect(socket.join).toHaveBeenCalledWith(Rooms.scorecard("g1", "A1NS"));
    expect(buildPairScorecard).toHaveBeenCalledWith({ db: true }, "g1", "A1NS");
    expect(ack).toHaveBeenCalledWith({ success: true, data: card });
  });

  it("acks null (not a failure) when the scorecard cannot be built", async () => {
    vi.mocked(buildPairScorecard).mockRejectedValue(new Error("boom"));
    const { socket, trigger } = createMockSocket();
    registerScorecardRequestHandler(socket as never, mockIo);

    const ack = vi.fn();
    await trigger(
      SocketEvents.REQUEST_STATE_SCORECARD,
      { gameId: "g1", seat: "A1NS" },
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ success: true, data: null });
  });

  it("leaves the seat's scorecard room on scorecard:leave", async () => {
    const { socket, trigger } = createMockSocket();
    registerScorecardRequestHandler(socket as never, mockIo);

    await trigger(SocketEvents.LEAVE_SCORECARD, { gameId: "g1", seat: "A1NS" });

    expect(socket.leave).toHaveBeenCalledWith(Rooms.scorecard("g1", "A1NS"));
  });
});
