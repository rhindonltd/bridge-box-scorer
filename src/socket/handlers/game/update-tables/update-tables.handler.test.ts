import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/db/games/actions/update-section-tables", () => ({
  updateSectionTables: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));

vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: vi.fn(),
}));

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { updateSectionTables } from "@/db/games/actions/update-section-tables";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findSections } from "@/db/games/queries/find-sections";
import { getDb } from "@/db/games";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerUpdateTablesHandler } from "./update-tables.handler";

function makeSocket() {
  return { data: {}, id: "test", on: vi.fn() } as any;
}

function makeIo() {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit } as any;
}

function sectionRow(letter: string, tables: number) {
  return { section: letter, label: letter, tables, selectedMovement: null, ordinal: 0 };
}

describe("registerUpdateTablesHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "g1",
    } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(findSections).mockResolvedValue([
      sectionRow("A", 4),
      sectionRow("B", 3),
    ] as any);
  });

  it("registers handler on UPDATE_TABLES event", () => {
    const socket = makeSocket();
    registerUpdateTablesHandler(socket, makeIo());
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.UPDATE_TABLES,
      expect.any(Function),
    );
  });

  it("resizes the given section and broadcasts GAME_UPDATED", async () => {
    const game = { gameId: "g1", gameType: "PAIRS" };
    vi.mocked(findGameById).mockResolvedValue(game as any);
    vi.mocked(updateSectionTables).mockResolvedValue(undefined);

    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(
      { gameId: "g1", section: "B", tables: 5, directorToken: "test-token" },
      cb,
    );

    expect(updateSectionTables).toHaveBeenCalledWith("g1", "B", 5);
    expect(io._emit).toHaveBeenCalledWith(SocketEvents.GAME_UPDATED, {
      game,
    });
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("defaults to section A when no section is given", async () => {
    vi.mocked(findGameById).mockResolvedValue({ gameId: "g1" } as any);
    vi.mocked(updateSectionTables).mockResolvedValue(undefined);

    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "g1", tables: 6, directorToken: "test-token" }, cb);

    expect(updateSectionTables).toHaveBeenCalledWith("g1", "A", 6);
  });

  it("forwards the per-section shrink-guard error", async () => {
    vi.mocked(findGameById).mockResolvedValue({ gameId: "g1" } as any);
    vi.mocked(updateSectionTables).mockRejectedValue(
      new Error(
        "Cannot reduce section A to 2 tables: table 3 has seated participants. Evict them first.",
      ),
    );

    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(
      { gameId: "g1", section: "A", tables: 2, directorToken: "test-token" },
      cb,
    );

    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining("table 3"),
      }),
    );
  });

  it("rejects an unknown section", async () => {
    vi.mocked(findGameById).mockResolvedValue({ gameId: "g1" } as any);

    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(
      { gameId: "g1", section: "Z", tables: 5, directorToken: "test-token" },
      cb,
    );

    expect(updateSectionTables).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Section Z not found",
    });
  });

  it("rejects non-directors", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(
      { gameId: "g1", section: "A", tables: 5, directorToken: "bad-token" },
      cb,
    );

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
    await handler(
      { gameId: "g1", section: "A", tables: 5, directorToken: "test-token" },
      cb,
    );

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Game not found",
    });
    expect(updateSectionTables).not.toHaveBeenCalled();
  });

  it("returns error on internal failure", async () => {
    vi.mocked(findGameById).mockRejectedValue(new Error("DB error"));

    const socket = makeSocket();
    const io = makeIo();
    registerUpdateTablesHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(
      { gameId: "g1", section: "A", tables: 5, directorToken: "test-token" },
      cb,
    );

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

    await expect(
      handler(
        { gameId: "g1", section: "A", tables: 5, directorToken: "test-token" },
        undefined,
      ),
    ).resolves.not.toThrow();
  });
});
