import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/services/start-game-service", () => ({ startGame: vi.fn() }));
vi.mock("@/timer/promote-timer", () => ({
  promoteTimerAtGameStart: vi.fn(),
}));
vi.mock("@/socket/broadcast/game-broadcast", () => ({
  broadcastGameStarted: vi.fn(),
}));
vi.mock("@/socket/websocket", () => ({ getIO: vi.fn() }));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { startGame } from "@/services/start-game-service";
import { promoteTimerAtGameStart } from "@/timer/promote-timer";
import { broadcastGameStarted } from "@/socket/broadcast/game-broadcast";
import { getIO } from "@/socket/websocket";
import { POST } from "./route";

function invoke(gameId: string, token: string | null = "tok") {
  const req = new Request(`http://localhost/api/games/${gameId}/start`, {
    method: "POST",
    headers: token ? { "x-director-token": token } : {},
  });
  return POST(req, { params: Promise.resolve({ gameId }) } as never);
}

describe("POST /api/games/[gameId]/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
    vi.mocked(getIO).mockReturnValue({} as never);
  });

  it("starts a valid game: promotes the timer, broadcasts, returns 200", async () => {
    vi.mocked(startGame).mockResolvedValue({
      canStart: true,
      problems: [],
      sitOutSeat: null,
    });

    const res = await invoke("g1");

    expect(res.status).toBe(200);
    expect(promoteTimerAtGameStart).toHaveBeenCalledWith("g1", expect.anything());
    expect(broadcastGameStarted).toHaveBeenCalledWith("g1");
  });

  it("returns 409 with problems when the game cannot start", async () => {
    vi.mocked(startGame).mockResolvedValue({
      canStart: false,
      problems: [
        { code: "NO_PAIRS_SEATED", message: "No pairs are seated yet." },
      ],
      sitOutSeat: null,
    });

    const res = await invoke("g1");

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: "Game cannot be started",
      problems: [
        expect.objectContaining({ code: "NO_PAIRS_SEATED" }),
      ],
    });
    expect(broadcastGameStarted).not.toHaveBeenCalled();
    expect(promoteTimerAtGameStart).not.toHaveBeenCalled();
  });

  it("skips timer promotion when no live server is available", async () => {
    vi.mocked(getIO).mockReturnValue(null);
    vi.mocked(startGame).mockResolvedValue({
      canStart: true,
      problems: [],
      sitOutSeat: null,
    });

    const res = await invoke("g1");

    expect(res.status).toBe(200);
    expect(promoteTimerAtGameStart).not.toHaveBeenCalled();
    // broadcastGameStarted itself no-ops without a server, but is still called.
    expect(broadcastGameStarted).toHaveBeenCalledWith("g1");
  });

  it("returns 401 without a valid director token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await invoke("g1", null);
    expect(res.status).toBe(401);
    expect(startGame).not.toHaveBeenCalled();
  });

  it("returns 404 when the game does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);
    const res = await invoke("ghost");
    expect(res.status).toBe(404);
  });

  it("returns 500 when the start service throws (infra failure)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(startGame).mockRejectedValue(new Error("Game db does not exist"));

    const res = await invoke("g1");

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: "Internal server error",
    });
    expect(broadcastGameStarted).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
