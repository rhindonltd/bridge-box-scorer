import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Server, Socket } from "socket.io";
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

vi.mock("@/db/system/actions/create-login-session", () => ({
  createLoginSession: vi.fn(),
}));

import { createBridgeGame } from "@/db/game-index/actions/create-game";
import { createGameDb } from "@/db/games/actions/create-game";
import { findJoinableGames } from "@/db/game-index/queries/find-joinable-games";
import { registerCreateGameHandler } from "./create-game.handler";

describe("CREATE_GAME (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await closeServer?.();
  });

  it("creates game, returns directorToken, and broadcasts joinable games", async () => {
    const bridgeGame = { gameId: "game-123", gameType: "PAIRS" };

    vi.mocked(createBridgeGame).mockResolvedValue(bridgeGame as any);
    vi.mocked(createGameDb).mockResolvedValue(undefined);
    vi.mocked(findJoinableGames).mockResolvedValue([{ gameId: "game-123" }] as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        // No director flag needed — anyone can create
        registerCreateGameHandler(socket, io);
      });
    });
    closeServer = close;

    const broadcast = waitForEvent(client, SocketEvents.JOINABLE_GAMES);

    const response = await emitWithAck(client, SocketEvents.CREATE_GAME, {
      name: "test-game",
    });

    expect(response).toMatchObject({
      success: true,
      data: {
        game: bridgeGame,
        directorToken: expect.any(String),
      },
    });

    const broadcastPayload = await broadcast;
    expect(broadcastPayload).toEqual({
      joinableGames: [{ gameId: "game-123" }],
    });
  });

  it("returns failure when DB throws", async () => {
    vi.mocked(createBridgeGame).mockRejectedValue(new Error("fail"));

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerCreateGameHandler(socket, io);
      });
    });
    closeServer = close;

    const response = await emitWithAck(client, SocketEvents.CREATE_GAME, {
      name: "fail-game",
    });

    expect(response).toMatchObject({ success: false });
  });
});
