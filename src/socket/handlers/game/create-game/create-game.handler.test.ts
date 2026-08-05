import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----
vi.mock("@/db/game-index/actions/create-game", () => ({
  createBridgeGame: vi.fn(),
}));

vi.mock("@/db/games/actions/create-game", () => ({
  createGameDb: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-joinable-games", () => ({
  findJoinableGames: vi.fn(),
}));

vi.mock("@/db/system/actions/create-login-session", () => ({
  createLoginSession: vi.fn(),
}));

import { createBridgeGame } from "@/db/game-index/actions/create-game";
import { createGameDb } from "@/db/game/actions/create-game";
import { findJoinableGames } from "@/db/game-index/queries/find-joinable-games";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import { registerCreateGameHandler } from "./create-game.handler";

describe("registerCreateGameHandler", () => {
  let socket: any;
  let io: any;
  let handler: Function;

  beforeEach(() => {
    vi.clearAllMocks();

    socket = {
      data: {},
      id: "test-socket",
      on: vi.fn((_event, cb) => {
        handler = cb;
      }),
    };

    io = {
      emit: vi.fn(),
    };
  });

  it("registers CREATE_GAME handler", () => {
    registerCreateGameHandler(socket, io);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.CREATE_GAME,
      expect.any(Function),
    );
  });

  it("creates game, creates director session, and emits JOINABLE_GAMES", async () => {
    const newBridgeGame = { name: "test-game" };
    const bridgeGame = { gameId: "123", gameType: "PAIRS" };

    vi.mocked(createBridgeGame).mockResolvedValue(bridgeGame as any);
    vi.mocked(createGameDb).mockResolvedValue(undefined);
    vi.mocked(createLoginSession).mockResolvedValue(undefined);
    vi.mocked(findJoinableGames).mockResolvedValue([{ gameId: "123" }] as any);

    registerCreateGameHandler(socket, io);

    const cb = vi.fn();
    await handler(newBridgeGame, cb);

    expect(createBridgeGame).toHaveBeenCalledWith(newBridgeGame);
    expect(createGameDb).toHaveBeenCalledWith("123", "PAIRS");

    // Should create a director login session
    expect(createLoginSession).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: "123",
        role: "DIRECTOR",
        token: expect.any(String),
      }),
    );

    // Callback includes game and directorToken
    expect(cb).toHaveBeenCalledWith({
      data: {
        game: bridgeGame,
        directorToken: expect.any(String),
      },
      success: true,
    });

    expect(io.emit).toHaveBeenCalledWith(SocketEvents.JOINABLE_GAMES, {
      joinableGames: [{ gameId: "123" }],
    });
  });

  it("allows anyone to create a game (no director check)", async () => {
    const bridgeGame = { gameId: "456", gameType: "PAIRS" };

    vi.mocked(createBridgeGame).mockResolvedValue(bridgeGame as any);
    vi.mocked(createGameDb).mockResolvedValue(undefined);
    vi.mocked(createLoginSession).mockResolvedValue(undefined);
    vi.mocked(findJoinableGames).mockResolvedValue([]);

    registerCreateGameHandler(socket, io);

    const cb = vi.fn();
    await handler({ name: "open-game" }, cb);

    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(createBridgeGame).toHaveBeenCalled();
  });

  it("returns failure when an error occurs", async () => {
    const cb = vi.fn();

    vi.mocked(createBridgeGame).mockRejectedValue(new Error("fail"));

    registerCreateGameHandler(socket, io);

    await handler({ name: "bad-game" }, cb);

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(io.emit).not.toHaveBeenCalled();
  });

  it("returns 'Unknown error' when thrown value is not an Error instance", async () => {
    const cb = vi.fn();

    vi.mocked(createBridgeGame).mockRejectedValue("string-error");

    registerCreateGameHandler(socket, io);

    await handler({ name: "bad-game" }, cb);

    expect(cb).toHaveBeenCalledWith({
      error: "Unknown error",
      success: false,
    });
    expect(io.emit).not.toHaveBeenCalled();
  });
});
