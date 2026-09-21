import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));

vi.mock("@/services/draw-swiss-round-service", () => ({
  drawNextSwissRound: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({ gameId: "g1" })),
}));

vi.mock("@/socket/handlers/results/broadcast-results", () => ({
  broadcastLeaderboardChanged: vi.fn(),
}));

import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { drawNextSwissRound } from "@/services/draw-swiss-round-service";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { registerDrawNextRoundHandler } from "./draw-next-round.handler";
import { SocketEvents } from "@/socket/socket-events";

function createMockSocket() {
  return { on: vi.fn() } as any;
}

/** An io whose rooms report empty (no leaderboard viewers). */
function makeIo() {
  return {
    to: vi.fn(() => ({ emit: vi.fn() })),
    sockets: { adapter: { rooms: new Map() } },
  } as any;
}

const validPayload = {
  gameId: "g1",
  section: "A",
  directorToken: "tok",
};

function handlerFor(socket: any) {
  const call = socket.on.mock.calls.find(
    (c: any[]) => c[0] === SocketEvents.DRAW_NEXT_SWISS_ROUND,
  );
  return call[1] as (payload: unknown, cb?: any) => Promise<void>;
}

describe("registerDrawNextRoundHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("registers the draw handler", () => {
    const socket = createMockSocket();
    registerDrawNextRoundHandler(socket, makeIo());
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.DRAW_NEXT_SWISS_ROUND,
      expect.any(Function),
    );
  });

  it("rejects when the director token is invalid", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const socket = createMockSocket();
    registerDrawNextRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket)(validPayload, ack);

    expect(ack).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(drawNextSwissRound).not.toHaveBeenCalled();
  });

  it("acks the drawn round and its advisories on success", async () => {
    vi.mocked(drawNextSwissRound).mockResolvedValue({
      ok: true,
      roundNumber: 2,
      sitOutPairId: null,
      hadUnavoidableRepeat: false,
      hadStationaryConflict: false,
    });

    const socket = createMockSocket();
    registerDrawNextRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket)(validPayload, ack);

    expect(ack).toHaveBeenCalledWith({
      success: true,
      data: {
        roundNumber: 2,
        sitOutPairId: null,
        hadUnavoidableRepeat: false,
        hadStationaryConflict: false,
      },
    });
  });

  it("acks a failure with a director-facing message when the draw is rejected", async () => {
    vi.mocked(drawNextSwissRound).mockResolvedValue({
      ok: false,
      reason: "ROUND_INCOMPLETE",
    });

    const socket = createMockSocket();
    registerDrawNextRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket)(validPayload, ack);

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining("current round"),
    });
  });

  it("uses a default message for an unmapped rejection reason", async () => {
    vi.mocked(drawNextSwissRound).mockResolvedValue({
      ok: false,
      reason: "SOMETHING_ELSE" as any,
    });

    const socket = createMockSocket();
    registerDrawNextRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket)(validPayload, ack);

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: "Could not draw the next round.",
    });
  });

  it("pushes a fresh leaderboard snapshot on success (occupancy-gated inside the broadcaster)", async () => {
    vi.mocked(drawNextSwissRound).mockResolvedValue({
      ok: true,
      roundNumber: 2,
      sitOutPairId: null,
      hadUnavoidableRepeat: false,
      hadStationaryConflict: false,
    });

    const io = makeIo();
    const socket = createMockSocket();
    registerDrawNextRoundHandler(socket, io);

    const ack = vi.fn();
    await handlerFor(socket)(validPayload, ack);

    // The occupancy-gated leaderboard push is delegated to the shared
    // broadcaster (covered by its own tests); the handler just calls it.
    expect(broadcastLeaderboardChanged).toHaveBeenCalledWith(io, "g1");
    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
  });

  it("does not push a leaderboard snapshot when the draw is rejected", async () => {
    vi.mocked(drawNextSwissRound).mockResolvedValue({
      ok: false,
      reason: "ROUND_INCOMPLETE",
    });

    const socket = createMockSocket();
    registerDrawNextRoundHandler(socket, makeIo());

    await handlerFor(socket)(validPayload, vi.fn());

    expect(broadcastLeaderboardChanged).not.toHaveBeenCalled();
  });
});
