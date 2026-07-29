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

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
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

  it("creates game and broadcasts joinable games", async () => {
    const bridgeGame = { gameId: "game-123", gameType: "BRIDGE" };

    vi.mocked(createBridgeGame).mockResolvedValue(bridgeGame as any);
    vi.mocked(createGameDb).mockResolvedValue(undefined);
    vi.mocked(findJoinableGames).mockResolvedValue([{ gameId: "game-123" }] as any);

    const { io, client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        // Mark as director so assertDirector passes
        socket.data.isDirector = true;
        registerCreateGameHandler(socket, io);
      });
    });
    closeServer = close;

    const broadcast = waitForEvent(client, SocketEvents.JOINABLE_GAMES);

    const response = await emitWithAck(client, SocketEvents.CREATE_GAME, {
      name: "test-game",
    });

    expect(response).toEqual({
      data: { game: bridgeGame },
      success: true,
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
        socket.data.isDirector = true;
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
