import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetIO = vi.fn();
vi.mock("@/socket/websocket", () => ({ getIO: () => mockGetIO() }));

import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { broadcastGameDeleted } from "./game-deleted-broadcast";

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

describe("broadcastGameDeleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits GAME_DELETED to the game room", () => {
    const { io, emits } = fakeIo();
    broadcastGameDeleted("g1", io as never);
    expect(emits).toEqual([
      {
        room: Rooms.game("g1"),
        event: SocketEvents.GAME_DELETED,
        payload: { gameId: "g1" },
      },
    ]);
    expect(mockGetIO).not.toHaveBeenCalled();
  });

  it("falls back to getIO() when no io is passed", () => {
    const { io, emits } = fakeIo();
    mockGetIO.mockReturnValue(io);
    broadcastGameDeleted("g1");
    expect(emits).toHaveLength(1);
  });

  it("no-ops when there is no server", () => {
    mockGetIO.mockReturnValue(null);
    expect(() => broadcastGameDeleted("g1")).not.toThrow();
  });
});
