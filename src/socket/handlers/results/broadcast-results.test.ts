import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/services/leaderboard-service", () => ({
  computeLeaderboard: vi.fn(),
  computeSectionLeaderboards: vi.fn(),
}));

vi.mock("@/services/board-service", () => ({
  getBoardInstances: vi.fn(),
}));

import { getDb } from "@/db/games";
import {
  computeLeaderboard,
  computeSectionLeaderboards,
} from "@/services/leaderboard-service";
import { getBoardInstances } from "@/services/board-service";
import { broadcastResultsChanged } from "./broadcast-results";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";

function makeIo(roomSizes: Record<string, number>) {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return {
    to,
    _emit: emit,
    sockets: {
      adapter: {
        rooms: {
          get: (room: string) =>
            roomSizes[room] ? new Set(Array(roomSizes[room]).fill(0)) : undefined,
        },
      },
    },
  } as any;
}

describe("broadcastResultsChanged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(computeLeaderboard).mockResolvedValue({ type: "MP" } as any);
    vi.mocked(computeSectionLeaderboards).mockResolvedValue([] as any);
    vi.mocked(getBoardInstances).mockResolvedValue([{ boardNumber: 3 }] as any);
  });

  it("recomputes and emits the leaderboard when its room is occupied", async () => {
    const io = makeIo({ [Rooms.leaderboard("g1")]: 2 });

    await broadcastResultsChanged(io, "g1", 3);

    expect(computeLeaderboard).toHaveBeenCalled();
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

    expect(computeLeaderboard).not.toHaveBeenCalled();
    expect(io._emit).not.toHaveBeenCalled();
  });
});
