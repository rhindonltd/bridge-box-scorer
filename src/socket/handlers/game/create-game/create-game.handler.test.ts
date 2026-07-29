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

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { createBridgeGame } from "@/db/game-index/actions/create-game";
import { createGameDb } from "@/db/games/actions/create-game";
import { findJoinableGames } from "@/db/game-index/queries/find-joinable-games";
import { registerCreateGameHandler } from "./create-game.handler";

describe("registerCreateGameHandler", () => {
  let socket: any;
  let io: any;
  let handler: Function;

  beforeEach(() => {
    vi.clearAllMocks();

    socket = {
      data: { isDirector: true },
      id: "test-socket",
      on: vi.fn((event, cb) => {
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

  it("creates game successfully and emits JOINABLE_GAMES", async () => {
    const newBridgeGame = { name: "test-game" };
    const bridgeGame = { gameId: "123", gameType: "BRIDGE" };

    vi.mocked(createBridgeGame).mockResolvedValue(bridgeGame as any);
    vi.mocked(createGameDb).mockResolvedValue(undefined);
    vi.mocked(findJoinableGames).mockResolvedValue([{ gameId: "123" }] as any);

    registerCreateGameHandler(socket, io);

    const cb = vi.fn();
    await handler(newBridgeGame, cb);

    expect(createBridgeGame).toHaveBeenCalledWith(newBridgeGame);
    expect(createGameDb).toHaveBeenCalledWith("123", "BRIDGE");
    expect(cb).toHaveBeenCalledWith({
      data: { game: bridgeGame },
      success: true,
    });
    expect(io.emit).toHaveBeenCalledWith(SocketEvents.JOINABLE_GAMES, {
      joinableGames: [{ gameId: "123" }],
    });
  });

  it("returns failure when an error occurs", async () => {
    const newBridgeGame = { name: "bad-game" };
    const cb = vi.fn();

    vi.mocked(createBridgeGame).mockRejectedValue(new Error("fail"));

    registerCreateGameHandler(socket, io);

    await handler(newBridgeGame, cb);

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(io.emit).not.toHaveBeenCalled();
  });

  it("rejects non-director sockets", async () => {
    socket.data.isDirector = false;
    const cb = vi.fn();

    registerCreateGameHandler(socket, io);
    await handler({ name: "game" }, cb);

    expect(cb).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(createBridgeGame).not.toHaveBeenCalled();
  });
});
