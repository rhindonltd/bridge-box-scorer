import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/game-index/actions/create-game", () => ({
  createBridgeGame: vi.fn(),
}));
vi.mock("@/db/games/actions/create-game", () => ({ createGameDb: vi.fn() }));
vi.mock("@/db/system/actions/create-login-session", () => ({
  createLoginSession: vi.fn(),
}));
vi.mock("@/socket/broadcast/joinable-broadcast", () => ({
  broadcastJoinableGames: vi.fn(),
}));

import { createBridgeGame } from "@/db/game-index/actions/create-game";
import { createGameDb } from "@/db/games/actions/create-game";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import { broadcastJoinableGames } from "@/socket/broadcast/joinable-broadcast";
import { POST } from "./route";

const validBody = {
  eventName: "Monday Pairs",
  director: "Jane",
  gameType: "PAIRS",
  sessionName: "",
  sectionName: "",
  eventDate: "2026-09-11",
  tables: 4,
  leadCardRequired: true,
};

function invoke(body: unknown) {
  const req = new Request("http://localhost/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req as never);
}

describe("POST /api/games", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createBridgeGame).mockResolvedValue({
      gameId: "g1",
      gameType: "PAIRS",
      tables: 4,
    } as never);
    vi.mocked(createGameDb).mockResolvedValue(undefined as never);
    vi.mocked(createLoginSession).mockResolvedValue(undefined as never);
  });

  it("creates the game, session, broadcasts, and returns 201 with a token", async () => {
    const res = await invoke(validBody);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toMatchObject({
      success: true,
      result: {
        game: { gameId: "g1" },
        directorToken: expect.any(String),
      },
    });

    expect(createGameDb).toHaveBeenCalledWith("g1", 4);
    expect(createLoginSession).toHaveBeenCalledWith(
      expect.objectContaining({ gameId: "g1", role: "DIRECTOR" }),
    );
    expect(broadcastJoinableGames).toHaveBeenCalled();
  });

  it("returns 400 for an invalid body (client error)", async () => {
    const res = await invoke({ eventName: "" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: "Invalid game details",
    });
    expect(createBridgeGame).not.toHaveBeenCalled();
  });

  it("returns 500 and does not broadcast when creation fails (server error)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(createBridgeGame).mockRejectedValue(new Error("db exploded"));

    const res = await invoke(validBody);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: "Internal server error",
    });
    expect(broadcastJoinableGames).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
