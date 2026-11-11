import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/services/leaderboard-service", () => ({
  buildLeaderboards: vi.fn(),
}));

vi.mock("@/services/board-service", () => ({
  getBoardInstances: vi.fn(),
  buildTeamTravellerMatches: vi.fn(),
}));

vi.mock("@/db/games/queries/get-deal", () => ({
  getDealHands: vi.fn(),
}));

vi.mock("@/db/games/queries/get-section-movement", () => ({
  getAnySectionMovement: vi.fn(),
}));

vi.mock("@/services/scorecard-service", () => ({
  buildPairScorecard: vi.fn(),
}));

import { getDb } from "@/db/games";
import { buildLeaderboards } from "@/services/leaderboard-service";
import {
  getBoardInstances,
  buildTeamTravellerMatches,
} from "@/services/board-service";
import { getDealHands } from "@/db/games/queries/get-deal";
import { getAnySectionMovement } from "@/db/games/queries/get-section-movement";
import { buildPairScorecard } from "@/services/scorecard-service";
import {
  broadcastLeaderboardChanged,
  broadcastResultsChanged,
} from "./broadcast-results";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";

function makeIo(roomSizes: Record<string, number>) {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  // Like Socket.IO's adapter: a Map of room name -> member set (iterable, so
  // the per-seat scorecard rooms can be found by prefix).
  const rooms = new Map<string, Set<number>>(
    Object.entries(roomSizes)
      .filter(([, size]) => size > 0)
      .map(([room, size]) => [
        room,
        new Set(Array.from({ length: size }, (_, i) => i)),
      ]),
  );
  return {
    to,
    _emit: emit,
    sockets: { adapter: { rooms } },
  } as any;
}

describe("broadcastResultsChanged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(buildLeaderboards).mockResolvedValue({
      leaderboard: { type: "MP" },
      sections: [],
    } as any);
    vi.mocked(getBoardInstances).mockResolvedValue([{ boardNumber: 3 }] as any);
    vi.mocked(getDealHands).mockResolvedValue(null);
    // Default: a pairs game (no section teams movement), so buildTravellerPayload
    // adds no team framing.
    vi.mocked(getAnySectionMovement).mockResolvedValue(null);
    vi.mocked(buildTeamTravellerMatches).mockResolvedValue([]);
  });

  it("recomputes and emits the leaderboard when its room is occupied", async () => {
    const io = makeIo({ [Rooms.leaderboard("g1")]: 2 });

    await broadcastResultsChanged(io, "g1", 3);

    expect(buildLeaderboards).toHaveBeenCalled();
    expect(io.to).toHaveBeenCalledWith(Rooms.leaderboard("g1"));
    expect(io._emit).toHaveBeenCalledWith(
      SocketEvents.LEADERBOARD_SYNC,
      expect.objectContaining({ leaderboard: expect.anything() }),
    );
  });

  it("emits the traveller snapshot to the per-board room when occupied", async () => {
    const io = makeIo({ [Rooms.traveller("g1", 3)]: 1 });

    await broadcastResultsChanged(io, "g1", 3);

    expect(getBoardInstances).toHaveBeenCalledWith(expect.anything(), 3);
    expect(io.to).toHaveBeenCalledWith(Rooms.traveller("g1", 3));
    expect(io._emit).toHaveBeenCalledWith(
      SocketEvents.TRAVELLER_SYNC,
      expect.objectContaining({ instances: expect.any(Array) }),
    );
  });

  it("only emits the traveller for the board that changed, not other boards", async () => {
    // Board 5 is being viewed, but board 3 changed → no traveller emit.
    const io = makeIo({ [Rooms.traveller("g1", 5)]: 1 });

    await broadcastResultsChanged(io, "g1", 3);

    expect(getBoardInstances).not.toHaveBeenCalled();
    expect(io._emit).not.toHaveBeenCalled();
  });

  it("does nothing (no db access) when no rooms are occupied", async () => {
    const io = makeIo({});

    await broadcastResultsChanged(io, "g1", 3);

    expect(getDb).not.toHaveBeenCalled();
    expect(io._emit).not.toHaveBeenCalled();
  });

  it("no-ops when the game db is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const io = makeIo({ [Rooms.leaderboard("g1")]: 1 });

    await broadcastResultsChanged(io, "g1", 3);

    expect(buildLeaderboards).not.toHaveBeenCalled();
    expect(io._emit).not.toHaveBeenCalled();
  });
  it("adds the team-match framing to the traveller for a teams movement", async () => {
    vi.mocked(getAnySectionMovement).mockResolvedValue({
      source: "SWISS_TEAMS",
    } as any);
    vi.mocked(buildTeamTravellerMatches).mockResolvedValue([
      { match: 1 },
    ] as any);
    const io = makeIo({ [Rooms.traveller("g1", 3)]: 1 });
    await broadcastResultsChanged(io, "g1", 3);
    expect(buildTeamTravellerMatches).toHaveBeenCalledWith(
      expect.anything(),
      3,
    );
    expect(io._emit).toHaveBeenCalledWith(
      SocketEvents.TRAVELLER_SYNC,
      expect.objectContaining({ teamMatches: [{ match: 1 }] }),
    );
  });
  it("adds the team-match framing for a round-robin teams movement too", async () => {
    vi.mocked(getAnySectionMovement).mockResolvedValue({
      source: "ROUND_ROBIN_TEAMS",
    } as any);
    const io = makeIo({ [Rooms.traveller("g1", 3)]: 1 });
    await broadcastResultsChanged(io, "g1", 3);
    expect(buildTeamTravellerMatches).toHaveBeenCalled();
  });
  it("pushes just the changed board to an occupied round-results room", async () => {
    const io = makeIo({ [Rooms.roundResults("g1")]: 1 });
    await broadcastResultsChanged(io, "g1", 3);
    expect(io.to).toHaveBeenCalledWith(Rooms.roundResults("g1"));
    expect(io._emit).toHaveBeenCalledWith(SocketEvents.ROUND_RESULTS_SYNC, {
      boardNumber: 3,
      instances: [{ boardNumber: 3 }],
    });
    expect(buildLeaderboards).not.toHaveBeenCalled();
  });
});

describe("broadcastLeaderboardChanged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(buildLeaderboards).mockResolvedValue({
      leaderboard: { type: "MP" },
      sections: [],
    } as any);
  });
  it("pushes a fresh snapshot when the leaderboard room is occupied", async () => {
    const io = makeIo({ [Rooms.leaderboard("g1")]: 1 });
    await broadcastLeaderboardChanged(io, "g1");
    expect(io.to).toHaveBeenCalledWith(Rooms.leaderboard("g1"));
    expect(io._emit).toHaveBeenCalledWith(
      SocketEvents.LEADERBOARD_SYNC,
      expect.objectContaining({ leaderboard: expect.anything() }),
    );
  });
  it("does nothing (no db access) when the room is empty", async () => {
    const io = makeIo({});
    await broadcastLeaderboardChanged(io, "g1");
    expect(getDb).not.toHaveBeenCalled();
    expect(io._emit).not.toHaveBeenCalled();
  });
  it("no-ops when the game db is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const io = makeIo({ [Rooms.leaderboard("g1")]: 1 });
    await broadcastLeaderboardChanged(io, "g1");
    expect(buildLeaderboards).not.toHaveBeenCalled();
    expect(io._emit).not.toHaveBeenCalled();
  });
});

describe("scorecard pushes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(buildPairScorecard).mockImplementation(
      async (_db, _gameId, seat) => ({ pairId: seat }) as any,
    );
  });

  it("pushes a fresh scorecard to every occupied scorecard room after a result", async () => {
    const io = makeIo({
      [Rooms.scorecard("g1", "A1NS")]: 1,
      [Rooms.scorecard("g1", "A2EW")]: 2,
      // Another game's scorecard room is not touched.
      [Rooms.scorecard("g2", "A1NS")]: 1,
    });

    await broadcastResultsChanged(io, "g1", 3);

    expect(buildPairScorecard).toHaveBeenCalledTimes(2);
    expect(buildPairScorecard).toHaveBeenCalledWith(
      expect.anything(),
      "g1",
      "A1NS",
    );
    expect(buildPairScorecard).toHaveBeenCalledWith(
      expect.anything(),
      "g1",
      "A2EW",
    );
    expect(io.to).toHaveBeenCalledWith(Rooms.scorecard("g1", "A1NS"));
    expect(io.to).toHaveBeenCalledWith(Rooms.scorecard("g1", "A2EW"));
    expect(io._emit).toHaveBeenCalledWith(SocketEvents.SCORECARD_SYNC, {
      pairId: "A1NS",
    });
    // Nobody is on the leaderboard, so it is not recomputed.
    expect(buildLeaderboards).not.toHaveBeenCalled();
  });

  it("pushes scorecards after a standings change too", async () => {
    const io = makeIo({ [Rooms.scorecard("g1", "A1NS")]: 1 });
    await broadcastLeaderboardChanged(io, "g1");
    expect(buildPairScorecard).toHaveBeenCalledWith(
      expect.anything(),
      "g1",
      "A1NS",
    );
    expect(buildLeaderboards).not.toHaveBeenCalled();
  });

  it("computes no scorecards when none are open", async () => {
    const io = makeIo({ [Rooms.leaderboard("g1")]: 1 });
    vi.mocked(buildLeaderboards).mockResolvedValue({
      leaderboard: null,
      sections: [],
    } as any);
    await broadcastResultsChanged(io, "g1", 3);
    expect(buildPairScorecard).not.toHaveBeenCalled();
  });
});
