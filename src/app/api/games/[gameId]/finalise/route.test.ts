import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/services/finalise-game-service", () => ({
  checkFinalise: vi.fn(),
}));
vi.mock("@/db/game-index/actions/set-finalised", () => ({
  finaliseGame: vi.fn(),
  reopenGame: vi.fn(),
}));
vi.mock("@/socket/broadcast/game-broadcast", () => ({
  broadcastGameUpdated: vi.fn(),
}));
vi.mock("@/socket/broadcast/joinable-broadcast", () => ({
  broadcastJoinableGames: vi.fn(),
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
import { checkFinalise } from "@/services/finalise-game-service";
import {
  finaliseGame,
  reopenGame,
} from "@/db/game-index/actions/set-finalised";
import { broadcastGameUpdated } from "@/socket/broadcast/game-broadcast";
import { broadcastJoinableGames } from "@/socket/broadcast/joinable-broadcast";
import { POST, DELETE } from "./route";

function invoke(
  handler: typeof POST,
  method: "POST" | "DELETE",
  token: string | null = "tok",
) {
  const req = new Request("http://localhost/api/games/g1/finalise", {
    method,
    headers: token ? { "x-director-token": token } : {},
  });
  return handler(req, { params: Promise.resolve({ gameId: "g1" }) } as never);
}

describe("/api/games/[gameId]/finalise", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("POST returns 401 without a valid director token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await invoke(POST, "POST", null);
    expect(res.status).toBe(401);
    expect(finaliseGame).not.toHaveBeenCalled();
  });

  it("POST returns 409 with problems when results are outstanding", async () => {
    vi.mocked(checkFinalise).mockResolvedValue({
      canFinalise: false,
      problems: [{ code: "RESULTS_OUTSTANDING", message: "2 left" }],
    });
    const res = await invoke(POST, "POST");
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      problems: [{ code: "RESULTS_OUTSTANDING" }],
    });
    expect(finaliseGame).not.toHaveBeenCalled();
  });

  it("POST finalises a clean game and broadcasts", async () => {
    vi.mocked(checkFinalise).mockResolvedValue({
      canFinalise: true,
      problems: [],
    });
    const res = await invoke(POST, "POST");
    expect(res.status).toBe(200);
    expect(finaliseGame).toHaveBeenCalledWith("g1");
    expect(broadcastGameUpdated).toHaveBeenCalledWith("g1");
    expect(broadcastJoinableGames).toHaveBeenCalled();
  });

  it("DELETE returns 401 without a valid director token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await invoke(DELETE, "DELETE", null);
    expect(res.status).toBe(401);
    expect(reopenGame).not.toHaveBeenCalled();
  });

  it("DELETE reopens the game and broadcasts", async () => {
    const res = await invoke(DELETE, "DELETE");
    expect(res.status).toBe(200);
    expect(reopenGame).toHaveBeenCalledWith("g1");
    expect(broadcastGameUpdated).toHaveBeenCalledWith("g1");
    expect(broadcastJoinableGames).toHaveBeenCalled();
  });

  it("DELETE responds 500 when reopening fails", async () => {
    vi.mocked(reopenGame).mockRejectedValue(new Error("db down"));
    const res = await invoke(DELETE, "DELETE");
    expect(res.status).toBe(500);
  });
});
