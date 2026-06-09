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

    const bridgeGame = {
      gameId: "123",
      gameType: "BRIDGE",
    };

    (createBridgeGame as any).mockResolvedValue(bridgeGame);
    (createGameDb as any).mockResolvedValue(undefined);
    (findJoinableGames as any).mockResolvedValue([{ gameId: "123" }]);

    registerCreateGameHandler(socket, io);

    await handler(newBridgeGame, vi.fn());

    const cb = vi.fn();
    await handler(newBridgeGame, cb);

    expect(createBridgeGame).toHaveBeenCalledWith(newBridgeGame);

    expect(createGameDb).toHaveBeenCalledWith("123", "BRIDGE");

    expect(cb).toHaveBeenCalledWith({
      game: bridgeGame,
      success: true,
    });

    expect(io.emit).toHaveBeenCalledWith(SocketEvents.JOINABLE_GAMES, [
      { gameId: "123" },
    ]);
  });

  it("returns failure when an error occurs", async () => {
    const newBridgeGame = { name: "bad-game" };
    const cb = vi.fn();

    (createBridgeGame as any).mockRejectedValue(new Error("fail"));

    registerCreateGameHandler(socket, io);

    await handler(newBridgeGame, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
    });

    expect(io.emit).not.toHaveBeenCalled();
  });
});
