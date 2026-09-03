import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));
vi.mock("@/db/system/queries/find-club", () => ({ findClub: vi.fn() }));
vi.mock("@/services/usebio-service", () => ({ generateUsebio: vi.fn() }));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findClub } from "@/db/system/queries/find-club";
import { generateUsebio } from "@/services/usebio-service";
import { GET } from "./route";

// NOTE: this route is exported as GET but is wrapped in withDirectorRoute,
// which reads a JSON body (the director token). Browsers/undici forbid a body
// on a real GET, so we invoke the exported handler directly with a Request
// that carries a JSON body — exercising the full route -> withDirectorRoute ->
// handler wiring without NTARH's strict GET/body rejection.
function invoke(gameId: string) {
  const req = new Request("http://localhost/api/games/g1/usebio", {
    method: "POST", // Request() also forbids GET+body; the wrapper ignores method.
    body: JSON.stringify({ directorToken: "tok" }),
    headers: { "content-type": "application/json" },
  });
  return GET(req, { params: Promise.resolve({ gameId }) } as never);
}

describe("GET /api/games/[gameId]/usebio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("returns downloadable XML for an authorised director", async () => {
    vi.mocked(findGameById).mockResolvedValue({
      eventName: "Monday Pairs",
      eventDate: "2024-11-18T00:00:00.000Z",
    } as never);
    vi.mocked(findClub).mockResolvedValue({
      name: "Club",
      clubNumber: "1",
    } as never);
    vi.mocked(generateUsebio).mockResolvedValue("<USEBIO/>");

    const res = await invoke("g1");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    await expect(res.text()).resolves.toBe("<USEBIO/>");
  });

  it("returns 401 when the director token is invalid", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    expect((await invoke("g1")).status).toBe(401);
  });

  it("returns 404 when the game is not found", async () => {
    vi.mocked(findGameById).mockResolvedValue(null as never);
    expect((await invoke("g1")).status).toBe(404);
  });

  it("returns 400 when the club is not configured", async () => {
    vi.mocked(findGameById).mockResolvedValue({
      eventName: "x",
      eventDate: "2024-11-18T00:00:00.000Z",
    } as never);
    vi.mocked(findClub).mockResolvedValue(null as never);
    expect((await invoke("g1")).status).toBe(400);
  });
});
