import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));

vi.mock("@/services/draw-swiss-round-service", () => ({
  previewNextSwissRound: vi.fn(),
  commitNextSwissRound: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({ gameId: "g1" })),
}));

vi.mock("@/socket/handlers/results/broadcast-results", () => ({
  broadcastLeaderboardChanged: vi.fn(),
}));

import { validateDirectorToken } from "@/socket/middleware/director-auth";
import {
  previewNextSwissRound,
  commitNextSwissRound,
} from "@/services/draw-swiss-round-service";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import {
  registerDrawNextRoundHandler,
  registerPreviewNextRoundHandler,
} from "./draw-next-round.handler";
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

const seating = [
  { tableNumber: 1, ns: 1, ew: 3 },
  { tableNumber: 2, ns: 2, ew: 4 },
];

const previewPayload = { gameId: "g1", section: "A", directorToken: "tok" };
const commitPayload = { ...previewPayload, seating, sitOutPairId: null };

function handlerFor(socket: any, event: string) {
  const call = socket.on.mock.calls.find((c: any[]) => c[0] === event);
  return call[1] as (payload: unknown, cb?: any) => Promise<void>;
}

describe("registerPreviewNextRoundHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("registers the preview handler", () => {
    const socket = createMockSocket();
    registerPreviewNextRoundHandler(socket, makeIo());
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.PREVIEW_NEXT_SWISS_ROUND,
      expect.any(Function),
    );
  });

  it("rejects an invalid director token without previewing", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const socket = createMockSocket();
    registerPreviewNextRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket, SocketEvents.PREVIEW_NEXT_SWISS_ROUND)(
      previewPayload,
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(previewNextSwissRound).not.toHaveBeenCalled();
  });

  it("acks the proposed seating + advisories and writes/broadcasts nothing", async () => {
    const named = { tables: [], bye: null };
    const advisoryInputs = {
      tables: 2,
      playedOpponents: [],
      hadBye: [],
      directionCounts: [],
      stationary: [],
    };
    const standings = [
      { id: 1, name: "Alice N / Bob S", total: 30, rank: 1, tied: false },
    ];
    vi.mocked(previewNextSwissRound).mockResolvedValue({
      ok: true,
      roundNumber: 2,
      tables: 2,
      seating,
      sitOutPairId: null,
      named,
      advisoryInputs,
      standings,
      hadUnavoidableRepeat: false,
      hadStationaryConflict: false,
    } as any);

    const io = makeIo();
    const socket = createMockSocket();
    registerPreviewNextRoundHandler(socket, io);

    const ack = vi.fn();
    await handlerFor(socket, SocketEvents.PREVIEW_NEXT_SWISS_ROUND)(
      previewPayload,
      ack,
    );

    expect(ack).toHaveBeenCalledWith({
      success: true,
      data: {
        roundNumber: 2,
        tables: 2,
        seating,
        sitOutPairId: null,
        named,
        advisoryInputs,
        standings,
        hadUnavoidableRepeat: false,
        hadStationaryConflict: false,
      },
    });
    // A preview never broadcasts.
    expect(io.to).not.toHaveBeenCalled();
    expect(broadcastLeaderboardChanged).not.toHaveBeenCalled();
  });

  it("acks a director-facing message when the preview is rejected", async () => {
    vi.mocked(previewNextSwissRound).mockResolvedValue({
      ok: false,
      reason: "ROUND_INCOMPLETE",
    } as any);

    const socket = createMockSocket();
    registerPreviewNextRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket, SocketEvents.PREVIEW_NEXT_SWISS_ROUND)(
      previewPayload,
      ack,
    );

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining("current round"),
    });
  });
});

describe("registerDrawNextRoundHandler (commit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("registers the commit handler", () => {
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
    await handlerFor(socket, SocketEvents.DRAW_NEXT_SWISS_ROUND)(
      commitPayload,
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(commitNextSwissRound).not.toHaveBeenCalled();
  });

  it("commits the passed seating, broadcasts, and acks the round on success", async () => {
    vi.mocked(commitNextSwissRound).mockResolvedValue({
      ok: true,
      roundNumber: 2,
    } as any);

    const io = makeIo();
    const socket = createMockSocket();
    registerDrawNextRoundHandler(socket, io);

    const ack = vi.fn();
    await handlerFor(socket, SocketEvents.DRAW_NEXT_SWISS_ROUND)(
      commitPayload,
      ack,
    );

    expect(commitNextSwissRound).toHaveBeenCalledWith("g1", "A", seating, null);
    expect(io.to).toHaveBeenCalled();
    expect(broadcastLeaderboardChanged).toHaveBeenCalledWith(io, "g1");
    expect(ack).toHaveBeenCalledWith({
      success: true,
      data: { roundNumber: 2 },
    });
  });

  it("acks a director-facing message when the commit is rejected", async () => {
    vi.mocked(commitNextSwissRound).mockResolvedValue({
      ok: false,
      reason: "INVALID_SEATING",
    } as any);

    const socket = createMockSocket();
    registerDrawNextRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket, SocketEvents.DRAW_NEXT_SWISS_ROUND)(
      commitPayload,
      ack,
    );

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining("valid"),
    });
    expect(broadcastLeaderboardChanged).not.toHaveBeenCalled();
  });

  it("uses a default message for an unmapped rejection reason", async () => {
    vi.mocked(commitNextSwissRound).mockResolvedValue({
      ok: false,
      reason: "SOMETHING_ELSE" as any,
    } as any);

    const socket = createMockSocket();
    registerDrawNextRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket, SocketEvents.DRAW_NEXT_SWISS_ROUND)(
      commitPayload,
      ack,
    );

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: "Could not draw the next round.",
    });
  });
});
