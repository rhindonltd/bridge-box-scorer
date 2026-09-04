import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket as ClientSocket } from "socket.io-client";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { emitWithAck, waitForEvent } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";
import { registerSectionHandlers } from "./section.handlers";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

vi.mock("@/db/games/actions/set-section-movement", () => ({
  setSectionMovement: vi.fn(),
}));

vi.mock("@/db/games/actions/create-section", () => ({
  createSection: vi.fn(),
}));

vi.mock("@/db/games/actions/rename-section", () => ({
  renameSection: vi.fn(),
}));

vi.mock("@/db/games/actions/delete-section", () => ({
  deleteSection: vi.fn(),
}));

vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: vi.fn(),
}));

vi.mock("@/db/games", () => ({
  getDb: vi.fn(async () => ({})),
}));

import { findLoginSession } from "@/db/system/queries/find-login-session";
import { setSectionMovement } from "@/db/games/actions/set-section-movement";
import { createSection } from "@/db/games/actions/create-section";
import { renameSection } from "@/db/games/actions/rename-section";
import { deleteSection } from "@/db/games/actions/delete-section";
import { findSections } from "@/db/games/queries/find-sections";
import { getDb } from "@/db/games";

describe("registerSectionHandlers (integration)", () => {
  let closeServer: () => Promise<void>;
  const extra: ClientSocket[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findLoginSession).mockReturnValue({
      token: "tok",
      role: "DIRECTOR",
      gameId: "g1",
    } as any);
    vi.mocked(findSections).mockResolvedValue([
      { section: "A", label: "A", tables: 4, selectedMovement: null, ordinal: 0 },
    ] as any);
    vi.mocked(setSectionMovement).mockResolvedValue(undefined);
    vi.mocked(createSection).mockResolvedValue(undefined);
    vi.mocked(renameSection).mockResolvedValue(undefined as any);
    vi.mocked(deleteSection).mockResolvedValue(undefined as any);
    vi.mocked(getDb).mockResolvedValue({} as any);
  });

  afterEach(async () => {
    for (const c of extra) c.disconnect();
    await closeServer?.();
  });

  it("notifies only the target section when its movement changes", async () => {
    const { client, close, addClient } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    // client is the director in section A; playerB is in section B.
    const playerB = await addClient();
    extra.push(playerB);

    await emitWithAck(client, SocketEvents.JOIN_GAME, {
      gameId: "g1",
      section: "A",
    });
    await emitWithAck(playerB, SocketEvents.JOIN_GAME, {
      gameId: "g1",
      section: "B",
    });

    // Section A client should NOT receive B's SECTION_UPDATED.
    let aGotSectionUpdate = false;
    client.on(SocketEvents.SECTION_UPDATED, () => {
      aGotSectionUpdate = true;
    });

    const bReceived = waitForEvent(playerB, SocketEvents.SECTION_UPDATED);

    const result = await emitWithAck(client, SocketEvents.SET_SECTION_MOVEMENT, {
      gameId: "g1",
      section: "B",
      mitchell: { tables: 3, rounds: 3, boardsPerRound: 2 },
      directorToken: "tok",
    });

    expect(result).toMatchObject({ success: true });
    expect(setSectionMovement).toHaveBeenCalledWith(
      "g1",
      "B",
      expect.objectContaining({ source: "MITCHELL" }),
    );

    const event = await bReceived;
    expect(event).toMatchObject({ gameId: "g1", section: "B" });
    expect(aGotSectionUpdate).toBe(false);
  });

  it("rejects a non-director", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.CREATE_SECTION, {
      gameId: "g1",
      section: "B",
      tables: 3,
      directorToken: "bad",
    });

    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
    expect(createSection).not.toHaveBeenCalled();
  });

  it("forwards a create-section error (duplicate section)", async () => {
    vi.mocked(createSection).mockRejectedValue(
      new Error("Section A already exists"),
    );

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.CREATE_SECTION, {
      gameId: "g1",
      section: "A",
      tables: 3,
      directorToken: "tok",
    });

    expect(result).toMatchObject({
      success: false,
      error: "Section A already exists",
    });
  });

  it("creates a section and broadcasts GAME_UPDATED with the section list", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "g1" });

    const updatedPromise = waitForEvent(client, SocketEvents.GAME_UPDATED);

    const result = await emitWithAck(client, SocketEvents.CREATE_SECTION, {
      gameId: "g1",
      section: "B",
      label: "Section B",
      tables: 3,
      directorToken: "tok",
    });

    expect(result).toMatchObject({ success: true });
    expect(createSection).toHaveBeenCalledWith("g1", {
      section: "B",
      label: "Section B",
      tables: 3,
    });

    const event: any = await updatedPromise;
    expect(event).toMatchObject({ gameId: "g1" });
    expect(event.sections).toEqual([
      expect.objectContaining({ section: "A" }),
    ]);
  });

  it("does not broadcast GAME_UPDATED when the game db is missing (still acks success)", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "g1" });

    let gotUpdate = false;
    client.on(SocketEvents.GAME_UPDATED, () => {
      gotUpdate = true;
    });

    const result = await emitWithAck(client, SocketEvents.CREATE_SECTION, {
      gameId: "g1",
      section: "B",
      tables: 3,
      directorToken: "tok",
    });

    expect(result).toMatchObject({ success: true });
    // broadcastSections early-returns when getDb resolves null.
    expect(findSections).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 100));
    expect(gotUpdate).toBe(false);
  });

  it("renames a section and broadcasts GAME_UPDATED", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "g1" });

    const updatedPromise = waitForEvent(client, SocketEvents.GAME_UPDATED);

    const result = await emitWithAck(client, SocketEvents.RENAME_SECTION, {
      gameId: "g1",
      section: "A",
      label: "Room A",
      directorToken: "tok",
    });

    expect(result).toMatchObject({ success: true });
    expect(renameSection).toHaveBeenCalledWith("g1", "A", "Room A");

    const event: any = await updatedPromise;
    expect(event).toMatchObject({ gameId: "g1" });
  });

  it("rejects a rename from a non-director", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.RENAME_SECTION, {
      gameId: "g1",
      section: "A",
      label: "Room A",
      directorToken: "bad",
    });

    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
    expect(renameSection).not.toHaveBeenCalled();
  });

  it("forwards a rename-section error", async () => {
    vi.mocked(renameSection).mockRejectedValue(new Error("Section not found"));

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.RENAME_SECTION, {
      gameId: "g1",
      section: "A",
      label: "Room A",
      directorToken: "tok",
    });

    expect(result).toMatchObject({
      success: false,
      error: "Section not found",
    });
  });

  it("deletes a section and broadcasts GAME_UPDATED", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "g1" });

    const updatedPromise = waitForEvent(client, SocketEvents.GAME_UPDATED);

    const result = await emitWithAck(client, SocketEvents.DELETE_SECTION, {
      gameId: "g1",
      section: "A",
      directorToken: "tok",
    });

    expect(result).toMatchObject({ success: true });
    expect(deleteSection).toHaveBeenCalledWith("g1", "A");

    const event: any = await updatedPromise;
    expect(event).toMatchObject({ gameId: "g1" });
  });

  it("rejects a delete from a non-director", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.DELETE_SECTION, {
      gameId: "g1",
      section: "A",
      directorToken: "bad",
    });

    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
    expect(deleteSection).not.toHaveBeenCalled();
  });

  it("forwards a delete-section error", async () => {
    vi.mocked(deleteSection).mockRejectedValue(
      new Error("Cannot delete the last section"),
    );

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.DELETE_SECTION, {
      gameId: "g1",
      section: "A",
      directorToken: "tok",
    });

    expect(result).toMatchObject({
      success: false,
      error: "Cannot delete the last section",
    });
  });

  it("sets a SPEC movement with id + boardsPerRound", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.SET_SECTION_MOVEMENT, {
      gameId: "g1",
      section: "A",
      id: 12,
      boardsPerRound: 2,
      directorToken: "tok",
    });

    expect(result).toMatchObject({ success: true });
    expect(setSectionMovement).toHaveBeenCalledWith("g1", "A", {
      source: "SPEC",
      specId: 12,
      boardsPerRound: 2,
    });
  });

  it("rejects a SPEC movement with an id but no boardsPerRound", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.SET_SECTION_MOVEMENT, {
      gameId: "g1",
      section: "A",
      id: 12,
      directorToken: "tok",
    });

    expect(result).toMatchObject({
      success: false,
      error: "No boards per round specified",
    });
    expect(setSectionMovement).not.toHaveBeenCalled();
  });

  it("clears a section's movement when neither mitchell nor id is given", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.SET_SECTION_MOVEMENT, {
      gameId: "g1",
      section: "A",
      directorToken: "tok",
    });

    expect(result).toMatchObject({ success: true });
    expect(setSectionMovement).toHaveBeenCalledWith("g1", "A", null);
  });

  it("forwards a set-section-movement error", async () => {
    vi.mocked(setSectionMovement).mockRejectedValue(
      new Error("Invalid movement"),
    );

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.SET_SECTION_MOVEMENT, {
      gameId: "g1",
      section: "A",
      mitchell: { tables: 3, rounds: 3, boardsPerRound: 2 },
      directorToken: "tok",
    });

    expect(result).toMatchObject({
      success: false,
      error: "Invalid movement",
    });
  });

  // Each catch block maps a non-Error rejection to a generic "Unknown error";
  // these cover the else branch of `err instanceof Error ? ... : ...`.
  it("maps a non-Error create failure to Unknown error", async () => {
    vi.mocked(createSection).mockRejectedValue("boom");

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.CREATE_SECTION, {
      gameId: "g1",
      section: "B",
      tables: 3,
      directorToken: "tok",
    });

    expect(result).toMatchObject({ success: false, error: "Unknown error" });
  });

  it("maps a non-Error rename failure to Unknown error", async () => {
    vi.mocked(renameSection).mockRejectedValue("boom");

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.RENAME_SECTION, {
      gameId: "g1",
      section: "A",
      label: "Room A",
      directorToken: "tok",
    });

    expect(result).toMatchObject({ success: false, error: "Unknown error" });
  });

  it("maps a non-Error delete failure to Unknown error", async () => {
    vi.mocked(deleteSection).mockRejectedValue("boom");

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.DELETE_SECTION, {
      gameId: "g1",
      section: "A",
      directorToken: "tok",
    });

    expect(result).toMatchObject({ success: false, error: "Unknown error" });
  });

  it("rejects a set-movement from a non-director", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.SET_SECTION_MOVEMENT, {
      gameId: "g1",
      section: "A",
      mitchell: { tables: 3, rounds: 3, boardsPerRound: 2 },
      directorToken: "bad",
    });

    expect(result).toMatchObject({ success: false, error: "Unauthorized" });
    expect(setSectionMovement).not.toHaveBeenCalled();
  });

  it("maps a non-Error set-movement failure to Unknown error", async () => {
    vi.mocked(setSectionMovement).mockRejectedValue("boom");

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerSectionHandlers(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.SET_SECTION_MOVEMENT, {
      gameId: "g1",
      section: "A",
      mitchell: { tables: 3, rounds: 3, boardsPerRound: 2 },
      directorToken: "tok",
    });

    expect(result).toMatchObject({ success: false, error: "Unknown error" });
  });
});
