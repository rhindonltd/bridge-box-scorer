import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));

vi.mock("@/services/draw-swiss-teams-round-service", () => ({
  previewNextSwissTeamsRound: vi.fn(),
  commitNextSwissTeamsRound: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({ gameId: "g1" })),
}));

vi.mock("@/socket/handlers/results/broadcast-results", () => ({
  broadcastLeaderboardChanged: vi.fn(),
}));

import { validateDirectorToken } from "@/socket/middleware/director-auth";
import {
  previewNextSwissTeamsRound,
  commitNextSwissTeamsRound,
} from "@/services/draw-swiss-teams-round-service";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import {
  registerDrawNextTeamsRoundHandler,
  registerPreviewNextTeamsRoundHandler,
} from "./draw-next-teams-round.handler";
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

const matches = [
  { a: 1, b: 3 },
  { a: 2, b: 4 },
];
const previewPayload = { gameId: "g1", section: "A", directorToken: "tok" };
const commitPayload = { ...previewPayload, matches, byeTeamId: null, triple: null };

function handlerFor(socket: any, event: string) {
  const call = socket.on.mock.calls.find((c: any[]) => c[0] === event);
  return call[1] as (payload: unknown, cb?: any) => Promise<void>;
}

describe("registerPreviewNextTeamsRoundHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("registers the preview handler", () => {
    const socket = createMockSocket();
    registerPreviewNextTeamsRoundHandler(socket, makeIo());
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.PREVIEW_NEXT_SWISS_TEAMS_ROUND,
      expect.any(Function),
    );
  });

  it("rejects an invalid director token without previewing", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const socket = createMockSocket();
    registerPreviewNextTeamsRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket, SocketEvents.PREVIEW_NEXT_SWISS_TEAMS_ROUND)(
      previewPayload,
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(previewNextSwissTeamsRound).not.toHaveBeenCalled();
  });

  it("acks the proposed matches + names and broadcasts nothing", async () => {
    const named = { matches: [], bye: null, triple: null };
    const standings = [
      { id: 1, name: "Sharks", total: 30, rank: 1, tied: false },
    ];
    vi.mocked(previewNextSwissTeamsRound).mockResolvedValue({
      ok: true,
      roundNumber: 2,
      teams: 4,
      matches,
      byeTeamId: null,
      triple: null,
      named,
      standings,
      repeatMatchKeys: [],
      advisoryInputs: { teams: 4, playedOpponents: [] },
      hadUnavoidableRepeat: false,
    } as any);

    const io = makeIo();
    const socket = createMockSocket();
    registerPreviewNextTeamsRoundHandler(socket, io);

    const ack = vi.fn();
    await handlerFor(socket, SocketEvents.PREVIEW_NEXT_SWISS_TEAMS_ROUND)(
      previewPayload,
      ack,
    );

    expect(ack).toHaveBeenCalledWith({
      success: true,
      data: {
        roundNumber: 2,
        teams: 4,
        matches,
        byeTeamId: null,
        triple: null,
        named,
        standings,
        repeatMatchKeys: [],
        advisoryInputs: { teams: 4, playedOpponents: [] },
        hadUnavoidableRepeat: false,
      },
    });
    expect(io.to).not.toHaveBeenCalled();
    expect(broadcastLeaderboardChanged).not.toHaveBeenCalled();
  });

  it("acks a director-facing message when the preview is rejected", async () => {
    vi.mocked(previewNextSwissTeamsRound).mockResolvedValue({
      ok: false,
      reason: "ROUND_INCOMPLETE",
    } as any);

    const socket = createMockSocket();
    registerPreviewNextTeamsRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket, SocketEvents.PREVIEW_NEXT_SWISS_TEAMS_ROUND)(
      previewPayload,
      ack,
    );

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: expect.stringContaining("current round"),
    });
  });
});

describe("registerDrawNextTeamsRoundHandler (commit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("registers the commit handler", () => {
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
    await handlerFor(socket, SocketEvents.DRAW_NEXT_SWISS_TEAMS_ROUND)(
      commitPayload,
      ack,
    );

    expect(ack).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(commitNextSwissTeamsRound).not.toHaveBeenCalled();
  });

  it("commits the passed matches, broadcasts, and acks the round on success", async () => {
    vi.mocked(commitNextSwissTeamsRound).mockResolvedValue({
      ok: true,
      roundNumber: 2,
    } as any);

    const io = makeIo();
    const socket = createMockSocket();
    registerDrawNextTeamsRoundHandler(socket, io);

    const ack = vi.fn();
    await handlerFor(socket, SocketEvents.DRAW_NEXT_SWISS_TEAMS_ROUND)(
      commitPayload,
      ack,
    );

    expect(commitNextSwissTeamsRound).toHaveBeenCalledWith(
      "g1",
      "A",
      matches,
      null,
      null,
    );
    expect(io.to).toHaveBeenCalled();
    expect(broadcastLeaderboardChanged).toHaveBeenCalledWith(io, "g1");
    expect(ack).toHaveBeenCalledWith({
      success: true,
      data: { roundNumber: 2 },
    });
  });

  it("acks a director-facing message when the commit is rejected", async () => {
    vi.mocked(commitNextSwissTeamsRound).mockResolvedValue({
      ok: false,
      reason: "INVALID_MATCHES",
    } as any);

    const socket = createMockSocket();
    registerDrawNextTeamsRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket, SocketEvents.DRAW_NEXT_SWISS_TEAMS_ROUND)(
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
    vi.mocked(commitNextSwissTeamsRound).mockResolvedValue({
      ok: false,
      reason: "SOMETHING_ELSE" as any,
    } as any);

    const socket = createMockSocket();
    registerDrawNextTeamsRoundHandler(socket, makeIo());

    const ack = vi.fn();
    await handlerFor(socket, SocketEvents.DRAW_NEXT_SWISS_TEAMS_ROUND)(
      commitPayload,
      ack,
    );

    expect(ack).toHaveBeenCalledWith({
      success: false,
      error: "Could not draw the next round.",
    });
  });
});
