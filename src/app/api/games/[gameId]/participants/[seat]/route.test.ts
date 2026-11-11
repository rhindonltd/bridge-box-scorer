import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/games/actions/delete-participant", () => ({
  deleteParticipant: vi.fn(),
}));
vi.mock("@/db/games/queries/is-game-started", () => ({
  isGameStarted: vi.fn(),
}));
vi.mock("@/socket/broadcast/participant-broadcast", () => ({
  broadcastParticipants: vi.fn(),
}));
vi.mock("@/socket/handlers/results/broadcast-results", () => ({
  broadcastLeaderboardChanged: vi.fn().mockResolvedValue(undefined),
}));
// A minimal Socket.IO server: `to(room).emit(...)` records the emit.
const { mockIo, mockTo, mockEmit } = vi.hoisted(() => {
  const mockEmit = vi.fn();
  const mockTo = vi.fn(() => ({ emit: mockEmit }));
  return { mockIo: { marker: "io", to: mockTo }, mockTo, mockEmit };
});
vi.mock("@/socket/websocket", () => ({
  getIO: vi.fn(() => mockIo),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { deleteParticipant } from "@/db/games/actions/delete-participant";
import { isGameStarted } from "@/db/games/queries/is-game-started";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { DELETE } from "./route";

function invoke(gameId: string, seat: string) {
  const req = new Request(
    `http://localhost/api/games/${gameId}/participants/${encodeURIComponent(seat)}`,
    { method: "DELETE", headers: { "x-director-token": "tok" } },
  );
  return DELETE(req, { params: Promise.resolve({ gameId }) } as never);
}

describe("DELETE /api/games/[gameId]/participants/[seat]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
    vi.mocked(isGameStarted).mockResolvedValue(false);
  });

  it("evicts a pair before the game starts", async () => {
    const res = await invoke("g1", "A1NS");
    expect(res.status).toBe(200);
    expect(deleteParticipant).toHaveBeenCalledWith("g1", "A1NS");
    expect(broadcastParticipants).toHaveBeenCalledWith("g1");
    // The evicted pair must drop off the leaderboard live too.
    expect(broadcastLeaderboardChanged).toHaveBeenCalledWith(mockIo, "g1");
    // The evicted device (on its waiting screen) is told it lost its seat so
    // it returns to seat selection.
    expect(mockTo).toHaveBeenCalledWith("game:g1");
    expect(mockEmit).toHaveBeenCalledWith("game:seatEvicted", {
      gameId: "g1",
      seat: "A1NS",
    });
  });

  it("blocks eviction once the game has started (F27)", async () => {
    vi.mocked(isGameStarted).mockResolvedValue(true);

    const res = await invoke("g1", "A1NS");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/already started/i);
    // The hard delete must NOT run post-start (it would orphan board rows).
    expect(deleteParticipant).not.toHaveBeenCalled();
    expect(broadcastParticipants).not.toHaveBeenCalled();
  });

  it("rejects a malformed seat with 400", async () => {
    const res = await invoke("g1", "not-a-seat");
    expect(res.status).toBe(400);
    expect(deleteParticipant).not.toHaveBeenCalled();
  });

  it("returns 401 when the director token is invalid", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await invoke("g1", "A1NS");
    expect(res.status).toBe(401);
    expect(isGameStarted).not.toHaveBeenCalled();
    expect(deleteParticipant).not.toHaveBeenCalled();
  });
});
