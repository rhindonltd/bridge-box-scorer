import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetIO = vi.fn();
vi.mock("@/socket/websocket", () => ({ getIO: () => mockGetIO() }));

const mockGetDb = vi.fn();
vi.mock("@/db/games", () => ({ getDb: (...a: unknown[]) => mockGetDb(...a) }));

const mockFindPairs = vi.fn();
vi.mock("@/db/games/queries/find-pairs", () => ({
  findPairs: (...a: unknown[]) => mockFindPairs(...a),
}));

import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { broadcastParticipants } from "./participant-broadcast";

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

describe("broadcastParticipants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockResolvedValue({});
    mockFindPairs.mockResolvedValue([{ initialSeat: "A1NS" }]);
  });

  it("emits PARTICIPANTS with the pair list to the game room using the given io", async () => {
    const { io, emits } = fakeIo();

    await broadcastParticipants("g1", io as never);

    expect(emits).toEqual([
      {
        room: Rooms.game("g1"),
        event: SocketEvents.PARTICIPANTS,
        payload: { participants: [{ initialSeat: "A1NS" }] },
      },
    ]);
    // The explicit io was used; getIO() was not consulted.
    expect(mockGetIO).not.toHaveBeenCalled();
  });

  it("falls back to getIO() when no io is passed", async () => {
    const { io, emits } = fakeIo();
    mockGetIO.mockReturnValue(io);

    await broadcastParticipants("g1");

    expect(mockGetIO).toHaveBeenCalled();
    expect(emits).toHaveLength(1);
  });

  it("no-ops when there is no server", async () => {
    mockGetIO.mockReturnValue(null);
    await broadcastParticipants("g1");
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it("no-ops when the game db is missing", async () => {
    const { io, emits } = fakeIo();
    mockGetDb.mockResolvedValue(null);

    await broadcastParticipants("g1", io as never);

    expect(mockFindPairs).not.toHaveBeenCalled();
    expect(emits).toEqual([]);
  });
});
