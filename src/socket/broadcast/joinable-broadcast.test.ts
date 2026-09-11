import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetIO = vi.fn();
vi.mock("@/socket/websocket", () => ({ getIO: () => mockGetIO() }));

const mockFindJoinableGames = vi.fn();
vi.mock("@/db/game-index/queries/find-joinable-games", () => ({
  findJoinableGames: (...a: unknown[]) => mockFindJoinableGames(...a),
}));

import { SocketEvents } from "@/socket/socket-events";
import { broadcastJoinableGames } from "./joinable-broadcast";

describe("broadcastJoinableGames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindJoinableGames.mockResolvedValue([{ gameId: "g1" }]);
  });

  it("global-emits JOINABLE_GAMES using the given io", async () => {
    const emit = vi.fn();

    await broadcastJoinableGames({ emit } as never);

    expect(emit).toHaveBeenCalledWith(SocketEvents.JOINABLE_GAMES, {
      joinableGames: [{ gameId: "g1" }],
    });
    expect(mockGetIO).not.toHaveBeenCalled();
  });

  it("falls back to getIO() when no io is passed", async () => {
    const emit = vi.fn();
    mockGetIO.mockReturnValue({ emit });

    await broadcastJoinableGames();

    expect(mockGetIO).toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(
      SocketEvents.JOINABLE_GAMES,
      expect.objectContaining({ joinableGames: [{ gameId: "g1" }] }),
    );
  });

  it("no-ops when there is no server", async () => {
    mockGetIO.mockReturnValue(null);
    await broadcastJoinableGames();
    expect(mockFindJoinableGames).not.toHaveBeenCalled();
  });
});
