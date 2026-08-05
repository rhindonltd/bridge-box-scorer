import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/db/game-index/actions/update-table-count", () => ({
  updateTableCount: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));

vi.mock("@/db/games/pairs/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { updateTableCount } from "@/db/game-index/actions/update-table-count";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findPairs } from "@/db/game/queries/find-pairs";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerUpdateTablesHandler } from "./update-tables.handler";

function makeSocket() {
  return { data: {}, id: "test", on: vi.fn() } as any;
}

function makeIo() {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit } as any;
}

describe("registerUpdateTablesHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: valid director session
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "g1",
    } as any);
  });

  it("registers handler on UPDATE_TABLES event", () => {
    const socket = makeSocket();
    registerUpdateTablesHandler(socket, makeIo());
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.UPDATE_TABLES,
      expect.any(Function),
    );
  });

  it("adds a table and broadcasts GAME_UPDATED", async () => {
    const game = { gameId: "g1", tables: 4, gameType: "PAIRS" };
    const updatedGame = { ...game, tables: 5 };

    vi.mocked(findGameById)
      .mockResolvedValueOnce(game as any)
      .mockResolvedValueOnce(updatedGame as any);
    vi.mocked(updateTableCount).mockResolvedValue(undefined);

    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "g1", tables: 5, directorToken: "test-token" }, cb);

    expect(updateTableCount).toHaveBeenCalledWith("g1", 5);
    expect(io._emit).toHaveBeenCalledWith(SocketEvents.GAME_UPDATED, {
      game: updatedGame,
    });
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("rejects table reduction when participants occupy higher tables", async () => {
    const game = { gameId: "g1", tables: 4, gameType: "PAIRS" };

    vi.mocked(findGameById).mockResolvedValue(game as any);
    vi.mocked(findPairs).mockResolvedValue([
      { initialSeat: "3NS", type: "PAIR", player1: {}, player2: {} },
    ] as any);

    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "g1", tables: 2, directorToken: "test-token" }, cb);

    expect(updateTableCount).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining("table 3"),
      }),
    );
  });

  it("allows reduction when no participants at removed tables", async () => {
    const game = { gameId: "g1", tables: 4, gameType: "PAIRS" };
    const updatedGame = { ...game, tables: 3 };

    vi.mocked(findGameById)
      .mockResolvedValueOnce(game as any)
      .mockResolvedValueOnce(updatedGame as any);
    vi.mocked(findPairs).mockResolvedValue([
      { initialSeat: "1NS", type: "PAIR", player1: {}, player2: {} },
    ] as any);
    vi.mocked(updateTableCount).mockResolvedValue(undefined);

    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "g1", tables: 3, directorToken: "test-token" }, cb);

    expect(updateTableCount).toHaveBeenCalledWith("g1", 3);
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("rejects non-directors", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "g1", tables: 5, directorToken: "bad-token" }, cb);

    expect(cb).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(findGameById).not.toHaveBeenCalled();
  });

  it("rejects invalid payload (missing tables)", async () => {
    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "g1", directorToken: "test-token" }, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Invalid payload",
    });
    expect(findGameById).not.toHaveBeenCalled();
  });

  it("returns error when game is not found", async () => {
    vi.mocked(findGameById).mockResolvedValue(null as any);

    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "g1", tables: 5, directorToken: "test-token" }, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Game not found",
    });
    expect(updateTableCount).not.toHaveBeenCalled();
  });

  it("returns error on internal failure", async () => {
    vi.mocked(findGameById).mockRejectedValue(new Error("DB error"));

    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "g1", tables: 5, directorToken: "test-token" }, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Internal server error",
    });
  });

  it("does not throw when cb is undefined and an internal error occurs", async () => {
    vi.mocked(findGameById).mockRejectedValue(new Error("DB error"));

    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];

    // Should not throw when cb is not provided
    await expect(
      handler(
        { gameId: "g1", tables: 5, directorToken: "test-token" },
        undefined,
      ),
    ).resolves.not.toThrow();
  });
});
