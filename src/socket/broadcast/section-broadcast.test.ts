import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetIO = vi.fn();
vi.mock("@/socket/websocket", () => ({ getIO: () => mockGetIO() }));

const mockGetDb = vi.fn();
vi.mock("@/db/games", () => ({ getDb: (...a: unknown[]) => mockGetDb(...a) }));

const mockFindSections = vi.fn();
vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: (...a: unknown[]) => mockFindSections(...a),
}));

const mockGetSectionMovement = vi.fn();
vi.mock("@/db/games/queries/get-section-movement", () => ({
  getSectionMovement: (...a: unknown[]) => mockGetSectionMovement(...a),
}));

const mockClearTimerState = vi.fn();
vi.mock("@/db/games/actions/clear-timer-state", () => ({
  clearTimerState: (...a: unknown[]) => mockClearTimerState(...a),
}));

const mockClearEngine = vi.fn();
vi.mock("@/timer/game-store", () => ({
  clearEngine: (...a: unknown[]) => mockClearEngine(...a),
}));

const mockBroadcastTimerCleared = vi.fn();
vi.mock("@/socket/handlers/timer/broadcast-timer", () => ({
  broadcastTimerCleared: (...a: unknown[]) => mockBroadcastTimerCleared(...a),
}));

import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import {
  broadcastSections,
  broadcastSectionMovementChanged,
} from "./section-broadcast";

/** A fake io whose `.to(room).emit(event, payload)` calls are recorded. */
function fakeIo() {
  const emits: { room: string; event: string; payload: unknown }[] = [];
  const io = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) =>
        emits.push({ room, event, payload }),
    }),
  };
  return { io, emits };
}

describe("broadcastSections", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emits GAME_UPDATED with the section list to the game room", async () => {
    const { io, emits } = fakeIo();
    mockGetIO.mockReturnValue(io);
    mockGetDb.mockResolvedValue({});
    mockFindSections.mockResolvedValue([{ section: "A" }, { section: "B" }]);

    await broadcastSections("g1");

    expect(emits).toEqual([
      {
        room: Rooms.game("g1"),
        event: SocketEvents.GAME_UPDATED,
        payload: { gameId: "g1", sections: [{ section: "A" }, { section: "B" }] },
      },
    ]);
  });

  it("no-ops when the server is not running", async () => {
    mockGetIO.mockReturnValue(null);
    await broadcastSections("g1");
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it("no-ops when the game db is missing", async () => {
    const { io, emits } = fakeIo();
    mockGetIO.mockReturnValue(io);
    mockGetDb.mockResolvedValue(null);

    await broadcastSections("g1");

    expect(mockFindSections).not.toHaveBeenCalled();
    expect(emits).toEqual([]);
  });
});

describe("broadcastSectionMovementChanged", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears the timer and emits section + game updates when the movement changed", async () => {
    const { io, emits } = fakeIo();
    mockGetIO.mockReturnValue(io);

    const previous = { source: "SPEC" as const, specId: 1, boardsPerRound: 3 };
    const next = {
      source: "MITCHELL" as const,
      mitchell: { tables: 3, rounds: 3, boardsPerRound: 2 },
    };

    await broadcastSectionMovementChanged("g1", "A", previous, next);

    expect(mockClearTimerState).toHaveBeenCalledWith("g1", "A");
    expect(mockClearEngine).toHaveBeenCalledWith("g1", "A");
    expect(mockBroadcastTimerCleared).toHaveBeenCalledWith(io, "g1", "A");

    expect(emits).toEqual([
      {
        room: Rooms.section("g1", "A"),
        event: SocketEvents.SECTION_UPDATED,
        payload: { gameId: "g1", section: "A" },
      },
      {
        room: Rooms.game("g1"),
        event: SocketEvents.GAME_UPDATED,
        payload: { gameId: "g1" },
      },
    ]);
  });

  it("does not clear the timer when the movement is unchanged", async () => {
    const { io } = fakeIo();
    mockGetIO.mockReturnValue(io);

    const same = {
      source: "MITCHELL" as const,
      mitchell: { tables: 3, rounds: 3, boardsPerRound: 2 },
    };

    await broadcastSectionMovementChanged("g1", "A", same, same);

    expect(mockClearTimerState).not.toHaveBeenCalled();
    expect(mockClearEngine).not.toHaveBeenCalled();
    expect(mockBroadcastTimerCleared).not.toHaveBeenCalled();
  });

  it("no-ops when the server is not running", async () => {
    mockGetIO.mockReturnValue(null);
    await broadcastSectionMovementChanged("g1", "A", null, null);
    expect(mockClearTimerState).not.toHaveBeenCalled();
  });
});
