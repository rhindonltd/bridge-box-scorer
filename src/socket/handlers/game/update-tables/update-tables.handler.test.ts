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

vi.mock("@/db/games/individual/queries/find-individuals", () => ({
  findIndividuals: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { updateTableCount } from "@/db/game-index/actions/update-table-count";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findPairs } from "@/db/games/pairs/queries/find-pairs";
import { findIndividuals } from "@/db/games/individual/queries/find-individuals";
import { registerUpdateTablesHandler } from "./update-tables.handler";

function makeSocket(isDirector = true) {
  return { data: { isDirector }, id: "test", on: vi.fn() } as any;
}

function makeIo() {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit } as any;
}

describe("registerUpdateTablesHandler", () => {
  beforeEach(() => vi.clearAllMocks());

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
    await handler({ gameId: "g1", tables: 5 }, cb);

    expect(updateTableCount).toHaveBeenCalledWith("g1", 5);
    expect(io._emit).toHaveBeenCalledWith(
      SocketEvents.GAME_UPDATED,
      { game: updatedGame },
    );
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
    await handler({ gameId: "g1", tables: 2 }, cb);

    expect(updateTableCount).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.stringContaining("table 3") }),
    );
  });

  it("allows reduction when no participants at removed tables", async () => {
    const game = { gameId: "g1", tables: 4, gameType: "INDIVIDUAL" };
    const updatedGame = { ...game, tables: 3 };

    vi.mocked(findGameById)
      .mockResolvedValueOnce(game as any)
      .mockResolvedValueOnce(updatedGame as any);
    vi.mocked(findIndividuals).mockResolvedValue([
      { initialSeat: "1N", type: "INDIVIDUAL", player: {} },
    ] as any);
    vi.mocked(updateTableCount).mockResolvedValue(undefined);

    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "g1", tables: 3 }, cb);

    expect(updateTableCount).toHaveBeenCalledWith("g1", 3);
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("rejects non-directors", async () => {
    const socket = makeSocket(false);
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "g1", tables: 5 }, cb);

    expect(cb).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(findGameById).not.toHaveBeenCalled();
  });
});
