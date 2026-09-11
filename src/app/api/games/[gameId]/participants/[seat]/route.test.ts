import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/games/actions/delete-participant", () => ({
  deleteParticipant: vi.fn(),
}));
vi.mock("@/socket/broadcast/participant-broadcast", () => ({
  broadcastParticipants: vi.fn(),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { deleteParticipant } from "@/db/games/actions/delete-participant";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { DELETE } from "./route";

function invoke(gameId: string, seat: string, token: string | null = "tok") {
  const req = new Request(
    `http://localhost/api/games/${gameId}/participants/${seat}`,
    {
      method: "DELETE",
      headers: token ? { "x-director-token": token } : {},
    },
  );
  return DELETE(req, { params: Promise.resolve({ gameId }) } as never);
}

describe("DELETE /api/games/[gameId]/participants/[seat]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("evicts the seat and broadcasts, returning 200", async () => {
    const res = await invoke("g1", "A1NS");

    expect(res.status).toBe(200);
    expect(deleteParticipant).toHaveBeenCalledWith("g1", "A1NS");
    expect(broadcastParticipants).toHaveBeenCalledWith("g1");
  });

  it("returns 401 without a valid director token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await invoke("g1", "A1NS", null);
    expect(res.status).toBe(401);
    expect(deleteParticipant).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed seat (client error)", async () => {
    const res = await invoke("g1", "not-a-seat");
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "Invalid seat" });
    expect(deleteParticipant).not.toHaveBeenCalled();
  });

  it("returns 404 when the game does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);
    const res = await invoke("ghost", "A1NS");
    expect(res.status).toBe(404);
  });

  it("returns 500 when the action fails unexpectedly (server error)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(deleteParticipant).mockRejectedValue(new Error("db exploded"));

    const res = await invoke("g1", "A1NS");

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: "Internal server error",
    });
    expect(broadcastParticipants).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
