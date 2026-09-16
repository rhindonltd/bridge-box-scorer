import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));

vi.mock("@/services/draw-swiss-teams-round-service", () => ({
  drawNextSwissTeamsRound: vi.fn(),
}));

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({ gameId: "g1" })),
}));

vi.mock("@/socket/handlers/results/broadcast-results", () => ({
  buildLeaderboardPayload: vi.fn(),
}));

import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { drawNextSwissTeamsRound } from "@/services/draw-swiss-teams-round-service";
import { registerDrawNextTeamsRoundHandler } from "./draw-next-teams-round.handler";
import { SocketEvents } from "@/socket/socket-events";

function createMockSocket() {
  return { on: vi.fn() } as any;
}

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
    (c: any[]) => c[0] === SocketEvents.DRAW_NEXT_SWISS_TEAMS_ROUND,
  );
  return call[1] as (payload: unknown, cb?: any) => Promise<void>;
}

describe("registerDrawNextTeamsRoundHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("registers the draw handler", () => {
    const socket = createMockSocket();
    registerDrawNextTeamsRoundHandler(socket, makeIo());
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.DRAW_NEXT_SWISS_TEAMS_ROUND,
      expect.any(Function),
    );
  });

  it("rejects when the director token is invalid", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const socket = createMockSocket();
    registerDrawNextTeamsRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket)(validPayload, ack);

    expect(ack).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(drawNextSwissTeamsRound).not.toHaveBeenCalled();
  });

  it("acks the drawn round and its advisory on success", async () => {
    vi.mocked(drawNextSwissTeamsRound).mockResolvedValue({
      ok: true,
      roundNumber: 2,
      hadUnavoidableRepeat: false,
    });

    const socket = createMockSocket();
    registerDrawNextTeamsRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket)(validPayload, ack);

    expect(ack).toHaveBeenCalledWith({
      success: true,
      data: { roundNumber: 2, hadUnavoidableRepeat: false },
    });
  });

  it("acks a failure with a director-facing message when the draw is rejected", async () => {
    vi.mocked(drawNextSwissTeamsRound).mockResolvedValue({
      ok: false,
      reason: "ROUND_INCOMPLETE",
    });

    const socket = createMockSocket();
    registerDrawNextTeamsRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket)(validPayload, ack);

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining("current round"),
    });
  });
});
