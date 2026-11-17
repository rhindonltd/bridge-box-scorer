import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));
vi.mock("@/db/game-index/queries/is-game-finalised", () => ({
  isGameFinalised: vi.fn(),
}));
vi.mock("@/db/system/queries/find-club", () => ({ findClub: vi.fn() }));
vi.mock("@/services/usebio-service", () => ({ generateUsebio: vi.fn() }));

import { getDb } from "@/db/games";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { isGameFinalised } from "@/db/game-index/queries/is-game-finalised";
import { findClub } from "@/db/system/queries/find-club";
import { generateUsebio } from "@/services/usebio-service";
import { GET } from "./route";

// An open GET: no director token and no query string. The tournament level is
// the one saved on the game.
function invoke(gameId = "g1") {
  const req = new Request(`http://localhost/api/games/${gameId}/usebio`, {
    method: "GET",
  });
  return GET(req, { params: Promise.resolve({ gameId }) } as never);
}

const GAME = {
  eventName: "Monday Pairs",
  eventDate: "2024-11-18T00:00:00.000Z",
  tournamentLevel: "NATIONAL_HEAT",
};

describe("GET /api/games/[gameId]/usebio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
    vi.mocked(isGameFinalised).mockResolvedValue(true);
  });

  it("returns downloadable XML for a finalised game without a director token", async () => {
    vi.mocked(findGameById).mockResolvedValue(GAME as never);
    vi.mocked(findClub).mockResolvedValue({
      name: "Club",
      clubNumber: "1",
    } as never);
    vi.mocked(generateUsebio).mockResolvedValue("<USEBIO/>");

    const res = await invoke();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    await expect(res.text()).resolves.toBe("<USEBIO/>");
    // The level saved on the game is threaded into the generator.
    expect(generateUsebio).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "NATIONAL_HEAT",
    );
  });

  it("falls back to the default level for a game with none saved", async () => {
    vi.mocked(findGameById).mockResolvedValue({
      ...GAME,
      tournamentLevel: null,
    } as never);
    vi.mocked(findClub).mockResolvedValue({
      name: "Club",
      clubNumber: "1",
    } as never);
    vi.mocked(generateUsebio).mockResolvedValue("<USEBIO/>");

    await invoke();

    expect(generateUsebio).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "NORMAL_CLUB",
    );
  });

  it("returns 403 until the game is finalised", async () => {
    vi.mocked(findGameById).mockResolvedValue(GAME as never);
    vi.mocked(isGameFinalised).mockResolvedValue(false);
    const res = await invoke();
    expect(res.status).toBe(403);
    expect(generateUsebio).not.toHaveBeenCalled();
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
