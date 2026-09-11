import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetIO = vi.fn();
vi.mock("@/socket/websocket", () => ({ getIO: () => mockGetIO() }));

const mockFindGameById = vi.fn();
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: (...a: unknown[]) => mockFindGameById(...a),
}));

import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { broadcastGameStarted } from "./game-broadcast";

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

describe("broadcastGameStarted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindGameById.mockResolvedValue({ gameId: "g1", tables: 4 });
  });

  it("emits GAME_UPDATED with the fresh game to the game room", async () => {
    const { io, emits } = fakeIo();

    await broadcastGameStarted("g1", io as never);

    expect(emits).toEqual([
      {
        room: Rooms.game("g1"),
        event: SocketEvents.GAME_UPDATED,
        payload: { game: { gameId: "g1", tables: 4 } },
      },
    ]);
    expect(mockGetIO).not.toHaveBeenCalled();
  });

  it("falls back to getIO() when no io is passed", async () => {
    const { io, emits } = fakeIo();
    mockGetIO.mockReturnValue(io);

    await broadcastGameStarted("g1");

    expect(mockGetIO).toHaveBeenCalled();
    expect(emits).toHaveLength(1);
  });

  it("no-ops when there is no server", async () => {
    mockGetIO.mockReturnValue(null);
    await broadcastGameStarted("g1");
    expect(mockFindGameById).not.toHaveBeenCalled();
  });
});
