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

vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: vi.fn(),
}));

vi.mock("@/db/games", () => ({
  getDb: vi.fn(async () => ({})),
}));

import { findLoginSession } from "@/db/system/queries/find-login-session";
import { setSectionMovement } from "@/db/games/actions/set-section-movement";
import { createSection } from "@/db/games/actions/create-section";
import { findSections } from "@/db/games/queries/find-sections";

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
});
