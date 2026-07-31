import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { waitForEvent, emitWithAck } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";
import { registerUpdateTablesHandler } from "./update-tables.handler";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));

vi.mock("@/db/game-index/actions/update-table-count", () => ({
  updateTableCount: vi.fn(),
}));

vi.mock("@/db/games/pairs/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/games/individual/queries/find-individuals", () => ({
  findIndividuals: vi.fn(),
}));

import { findLoginSession } from "@/db/system/queries/find-login-session";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { updateTableCount } from "@/db/game-index/actions/update-table-count";
import { findPairs } from "@/db/games/pairs/queries/find-pairs";

describe("registerUpdateTablesHandler (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token", role: "DIRECTOR", gameId: "game-1",
    } as any);
    vi.mocked(updateTableCount).mockResolvedValue(undefined as any);
    vi.mocked(findPairs).mockResolvedValue([]);
  });

  afterEach(async () => {
    await closeServer?.();
  });

  it("updates table count and broadcasts GAME_UPDATED", async () => {
    vi.mocked(findGameById)
      .mockResolvedValueOnce({ gameId: "game-1", gameType: "PAIRS", tables: 4 } as any)
      .mockResolvedValueOnce({ gameId: "game-1", gameType: "PAIRS", tables: 5 } as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerUpdateTablesHandler(socket, io);
      });
    });
    closeServer = close;

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "game-1" });

    const updatedPromise = waitForEvent(client, SocketEvents.GAME_UPDATED);

    const result = await emitWithAck(client, SocketEvents.UPDATE_TABLES, {
      gameId: "game-1", tables: 5, directorToken: "test-token",
    });

    expect(result).toEqual({ success: true });
    expect(updateTableCount).toHaveBeenCalledWith("game-1", 5);

    const event = await updatedPromise;
    expect(event).toHaveProperty("game");
  });

  it("rejects reducing tables when participants seated at higher tables", async () => {
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "game-1", gameType: "PAIRS", tables: 4,
    } as any);
    vi.mocked(findPairs).mockResolvedValue([
      { initialSeat: "3NS" },
    ] as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerUpdateTablesHandler(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.UPDATE_TABLES, {
      gameId: "game-1", tables: 2, directorToken: "test-token",
    });

    expect(result).toMatchObject({ success: false });
    expect(result.error).toContain("Cannot reduce");
    expect(updateTableCount).not.toHaveBeenCalled();
  });

  it("rejects invalid director token", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerUpdateTablesHandler(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.UPDATE_TABLES, {
      gameId: "game-1", tables: 5, directorToken: "bad-token",
    });

    expect(result).toMatchObject({ success: false });
  });

  it("rejects invalid payload", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerUpdateTablesHandler(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.UPDATE_TABLES, {});

    expect(result).toMatchObject({ success: false, error: "Invalid payload" });
  });
});
