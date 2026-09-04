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

vi.mock("@/db/games/actions/update-section-tables", () => ({
  updateSectionTables: vi.fn(),
}));

vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: vi.fn(),
}));

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

import { findLoginSession } from "@/db/system/queries/find-login-session";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { updateSectionTables } from "@/db/games/actions/update-section-tables";
import { findSections } from "@/db/games/queries/find-sections";
import { getDb } from "@/db/games";

describe("registerUpdateTablesHandler (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "game-1",
    } as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(updateSectionTables).mockResolvedValue(undefined as any);
    vi.mocked(findSections).mockResolvedValue([
      { section: "A", label: "A", tables: 4, selectedMovement: null, ordinal: 0 },
    ] as any);
  });

  afterEach(async () => {
    await closeServer?.();
  });

  it("updates a section's table count and broadcasts GAME_UPDATED", async () => {
    vi.mocked(findGameById)
      .mockResolvedValueOnce({
        gameId: "game-1",
        gameType: "PAIRS",
      } as any)
      .mockResolvedValueOnce({
        gameId: "game-1",
        gameType: "PAIRS",
      } as any);

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
      gameId: "game-1",
      section: "A",
      tables: 5,
      directorToken: "test-token",
    });

    expect(result).toEqual({ success: true });
    expect(updateSectionTables).toHaveBeenCalledWith("game-1", "A", 5);

    const event = await updatedPromise;
    expect(event).toHaveProperty("game");
  });

  it("rejects reducing a section when participants seated at higher tables", async () => {
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "game-1",
      gameType: "PAIRS",
    } as any);
    vi.mocked(updateSectionTables).mockRejectedValue(
      new Error(
        "Cannot reduce section A to 2 tables: table 3 has seated participants. Evict them first.",
      ),
    );

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerUpdateTablesHandler(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.UPDATE_TABLES, {
      gameId: "game-1",
      section: "A",
      tables: 2,
      directorToken: "test-token",
    });

    expect(result).toMatchObject({ success: false });
    expect(result.error).toContain("Cannot reduce");
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
      gameId: "game-1",
      section: "A",
      tables: 5,
      directorToken: "bad-token",
    });

    expect(result).toMatchObject({ success: false });
  });

  it("returns an error when the game is not found", async () => {
    vi.mocked(findGameById).mockResolvedValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerUpdateTablesHandler(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.UPDATE_TABLES, {
      gameId: "game-1",
      section: "A",
      tables: 5,
      directorToken: "test-token",
    });

    expect(result).toMatchObject({ success: false, error: "Game not found" });
  });

  it("returns an error when the game db is not found", async () => {
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "game-1",
      gameType: "PAIRS",
    } as any);
    vi.mocked(getDb).mockResolvedValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerUpdateTablesHandler(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.UPDATE_TABLES, {
      gameId: "game-1",
      section: "A",
      tables: 5,
      directorToken: "test-token",
    });

    expect(result).toMatchObject({
      success: false,
      error: "Game db not found",
    });
  });

  it("returns an error when the section is not found", async () => {
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "game-1",
      gameType: "PAIRS",
    } as any);
    vi.mocked(findSections).mockResolvedValue([
      { section: "A", label: "A", tables: 4, selectedMovement: null, ordinal: 0 },
    ] as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerUpdateTablesHandler(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.UPDATE_TABLES, {
      gameId: "game-1",
      section: "Z",
      tables: 5,
      directorToken: "test-token",
    });

    expect(result).toMatchObject({
      success: false,
      error: "Section Z not found",
    });
  });

  it("maps an unexpected error to a generic internal server error", async () => {
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "game-1",
      gameType: "PAIRS",
    } as any);
    vi.mocked(updateSectionTables).mockRejectedValue(new Error("boom"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerUpdateTablesHandler(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.UPDATE_TABLES, {
      gameId: "game-1",
      section: "A",
      tables: 5,
      directorToken: "test-token",
    });

    expect(result).toMatchObject({
      success: false,
      error: "Internal server error",
    });
    errSpy.mockRestore();
  });

  it("maps a non-Error thrown value to a generic internal server error", async () => {
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "game-1",
      gameType: "PAIRS",
    } as any);
    vi.mocked(updateSectionTables).mockRejectedValue("boom");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerUpdateTablesHandler(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.UPDATE_TABLES, {
      gameId: "game-1",
      section: "A",
      tables: 5,
      directorToken: "test-token",
    });

    expect(result).toMatchObject({
      success: false,
      error: "Internal server error",
    });
    errSpy.mockRestore();
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
