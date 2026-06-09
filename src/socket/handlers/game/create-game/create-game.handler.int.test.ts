import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { emitWithAck, waitForEvent } from "@/socket/test/socket-helpers";

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

describe("CREATE_GAME (integration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates game and broadcasts joinable games", async () => {
    const bridgeGame = {
      gameId: "game-123",
      gameType: "BRIDGE",
    };

    (createBridgeGame as any).mockResolvedValue(bridgeGame);
    (createGameDb as any).mockResolvedValue(undefined);
    (findJoinableGames as any).mockResolvedValue([{ gameId: "game-123" }]);

    const { io, client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket) => {
        registerCreateGameHandler(socket, io);
      });
    });

    const broadcast = waitForEvent(client, SocketEvents.JOINABLE_GAMES);

    const response = await emitWithAck(client, SocketEvents.CREATE_GAME, {
      name: "test-game",
    });

    expect(response).toEqual({
      game: bridgeGame,
      success: true,
    });

    expect(await broadcast).toEqual([{ gameId: "game-123" }]);

    await close();
  });

  it("returns failure when DB throws", async () => {
    (createBridgeGame as any).mockRejectedValue(new Error("fail"));

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket) => {
        registerCreateGameHandler(socket, io);
      });
    });

    const response = await emitWithAck(client, SocketEvents.CREATE_GAME, {
      name: "fail-game",
    });

    expect(response).toEqual({
      success: false,
    });

    await close();
  });
});
