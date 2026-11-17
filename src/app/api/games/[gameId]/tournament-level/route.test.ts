import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/game-index/actions/update-tournament-level", () => ({
  updateTournamentLevel: vi.fn(),
}));
vi.mock("@/socket/broadcast/game-broadcast", () => ({
  broadcastGameUpdated: vi.fn(),
}));
vi.mock("@/lib/log", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  childLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { updateTournamentLevel } from "@/db/game-index/actions/update-tournament-level";
import { broadcastGameUpdated } from "@/socket/broadcast/game-broadcast";
import { PUT } from "./route";

function invoke(body: unknown, token: string | null = "tok") {
  const req = new Request("http://localhost/api/games/g1/tournament-level", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-director-token": token } : {}),
    },
    body: JSON.stringify(body),
  });
  return PUT(req, { params: Promise.resolve({ gameId: "g1" }) } as never);
}

describe("PUT /api/games/[gameId]/tournament-level", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("rejects a caller without a director token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await invoke({ tournamentLevel: "NORMAL_CLUB" }, null);
    expect(res.status).toBe(401);
    expect(updateTournamentLevel).not.toHaveBeenCalled();
  });

  it("rejects an unknown level", async () => {
    const res = await invoke({ tournamentLevel: "NONSENSE" });
    expect(res.status).toBe(400);
    expect(updateTournamentLevel).not.toHaveBeenCalled();
  });

  it("saves the level and broadcasts the updated game", async () => {
    const res = await invoke({ tournamentLevel: "NATIONAL_HEAT" });
    expect(res.status).toBe(200);
    expect(updateTournamentLevel).toHaveBeenCalledWith("g1", "NATIONAL_HEAT");
    expect(broadcastGameUpdated).toHaveBeenCalledWith("g1");
  });
});
