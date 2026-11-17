import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));
vi.mock("@/db/game-index/queries/is-game-finalised", () => ({
  isGameFinalised: vi.fn(),
}));
vi.mock("@/db/system/queries/find-club", () => ({ findClub: vi.fn() }));
vi.mock("@/services/pbn-service", () => ({ generatePbnExport: vi.fn() }));

import { getDb } from "@/db/games";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { isGameFinalised } from "@/db/game-index/queries/is-game-finalised";
import { findClub } from "@/db/system/queries/find-club";
import { generatePbnExport } from "@/services/pbn-service";
import { GET } from "./route";

function invoke(gameId = "g1") {
  const req = new Request(`http://localhost/api/games/${gameId}/pbn`, {
    method: "GET",
  });
  return GET(req, { params: Promise.resolve({ gameId }) } as never);
}

const GAME = {
  eventName: "Monday Pairs",
  eventDate: "2024-11-18T00:00:00.000Z",
};

describe("GET /api/games/[gameId]/pbn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
    vi.mocked(isGameFinalised).mockResolvedValue(true);
  });

  it("returns a downloadable PBN file for a finalised game without a director token", async () => {
    vi.mocked(findGameById).mockResolvedValue(GAME as never);
    vi.mocked(findClub).mockResolvedValue({
      name: "Club",
      clubNumber: "1",
    } as never);
    vi.mocked(generatePbnExport).mockResolvedValue("[Event]");

    const res = await invoke();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-pbn");
    expect(res.headers.get("content-disposition")).toContain(
      "Monday_Pairs_2024-11-18.pbn",
    );
    await expect(res.text()).resolves.toBe("[Event]");
  });

  it("returns 403 until the game is finalised", async () => {
    vi.mocked(findGameById).mockResolvedValue(GAME as never);
    vi.mocked(isGameFinalised).mockResolvedValue(false);
    expect((await invoke()).status).toBe(403);
    expect(generatePbnExport).not.toHaveBeenCalled();
  });

  it("returns 404 when the game is not found", async () => {
    vi.mocked(findGameById).mockResolvedValue(null as never);
    expect((await invoke()).status).toBe(404);
  });

  it("returns 400 when the club is not configured", async () => {
    vi.mocked(findGameById).mockResolvedValue(GAME as never);
    vi.mocked(findClub).mockResolvedValue(null as never);
    expect((await invoke()).status).toBe(400);
  });
});
