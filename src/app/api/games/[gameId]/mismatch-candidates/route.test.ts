import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/services/detect-swiss-mismatch-service", () => ({
  detectSectionMismatches: vi.fn(),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { detectSectionMismatches } from "@/services/detect-swiss-mismatch-service";
import { GET } from "./route";

function invoke(gameId: string, section: string | null = "A") {
  const url = section
    ? `http://localhost/api/games/${gameId}/mismatch-candidates?section=${section}`
    : `http://localhost/api/games/${gameId}/mismatch-candidates`;
  const req = new Request(url, {
    method: "GET",
    headers: { "x-director-token": "tok" },
  });
  return GET(req, { params: Promise.resolve({ gameId }) } as never);
}

describe("GET /api/games/[gameId]/mismatch-candidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("returns the detected candidates for an authorised director", async () => {
    const candidates = [
      {
        section: "A",
        roundNumber: 2,
        mismatchedPair: 1,
        actualOpponent: 3,
        correctOpponent: 6,
        actualOpponentVp: 10,
        correctOpponentVp: 30,
        direction: "LOWER",
        tableNumber: 1,
        side: "NS",
        boardNumber: 3,
      },
    ];
    vi.mocked(detectSectionMismatches).mockResolvedValue(candidates as never);

    const res = await invoke("g1", "A");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.candidates).toEqual(candidates);
    expect(detectSectionMismatches).toHaveBeenCalledWith("g1", "A");
  });

  it("returns 400 when the section query param is missing", async () => {
    const res = await invoke("g1", null);
    expect(res.status).toBe(400);
    expect(detectSectionMismatches).not.toHaveBeenCalled();
  });

  it("returns 401 when the director token is invalid", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    expect((await invoke("g1", "A")).status).toBe(401);
    expect(detectSectionMismatches).not.toHaveBeenCalled();
  });

  it("returns 404 when the game is not found", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);
    expect((await invoke("g1", "A")).status).toBe(404);
  });
});
