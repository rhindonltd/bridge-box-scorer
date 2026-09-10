import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { GET } from "./route";

function invoke(gameId: string, token: string | null = "tok") {
  const headers = new Headers();
  if (token) headers.set("x-director-token", token);
  const req = new Request(
    `http://localhost/api/games/${gameId}/director/validate`,
    { method: "GET", headers },
  );
  return GET(req, { params: Promise.resolve({ gameId }) } as never);
}

describe("GET /api/games/[gameId]/director/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
  });

  it("returns success for a valid director token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(true);

    const res = await invoke("g1");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      result: { valid: true },
    });
    expect(validateDirectorToken).toHaveBeenCalledWith("tok", "g1");
  });

  it("returns 401 for a stale / invalid director token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);

    const res = await invoke("g1");
    expect(res.status).toBe(401);
  });

  it("returns 404 when the game does not exist", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(true);
    vi.mocked(getDb).mockResolvedValue(undefined as never);

    const res = await invoke("missing");
    expect(res.status).toBe(404);
  });
});
