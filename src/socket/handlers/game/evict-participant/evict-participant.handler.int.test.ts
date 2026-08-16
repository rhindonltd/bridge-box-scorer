import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { waitForEvent, emitWithAck } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";
import { registerEvictParticipantHandler } from "./evict-participant.handler";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));

vi.mock("@/db/games/pairs/actions/delete-participant", () => ({
  deleteParticipant: vi.fn(),
}));

vi.mock("@/db/games/pairs/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

import { findLoginSession } from "@/db/system/queries/find-login-session";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { deleteParticipant as deletePairParticipant } from "@/db/games/actions/delete-participant";
import { findPairs } from "@/db/games/queries/find-pairs";

describe("registerEvictParticipantHandler (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "game-1",
    } as any);
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "game-1",
      gameType: "PAIRS",
    } as any);
    vi.mocked(deletePairParticipant).mockResolvedValue(undefined as any);
    vi.mocked(findPairs).mockResolvedValue([]);
  });

  afterEach(async () => {
    await closeServer?.();
  });

  it("evicts participant and broadcasts PARTICIPANTS", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerEvictParticipantHandler(socket, io);
      });
    });
    closeServer = close;

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "game-1" });

    const participantsPromise = waitForEvent(client, SocketEvents.PARTICIPANTS);

    const result = await emitWithAck(client, SocketEvents.EVICT_PARTICIPANT, {
      gameId: "game-1",
      seat: "1NS",
      directorToken: "test-token",
    });

    expect(result).toEqual({ success: true });
    const event = await participantsPromise;
    expect(event).toHaveProperty("participants");
    expect(deletePairParticipant).toHaveBeenCalledWith("game-1", "1NS");
  });

  it("rejects invalid payload", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerEvictParticipantHandler(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(
      client,
      SocketEvents.EVICT_PARTICIPANT,
      {},
    );

    expect(result).toMatchObject({ success: false, error: "Invalid payload" });
  });

  it("rejects invalid director token", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerEvictParticipantHandler(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.EVICT_PARTICIPANT, {
      gameId: "game-1",
      seat: "1NS",
      directorToken: "bad-token",
    });

    expect(result).toMatchObject({ success: false });
  });

  it("returns error when game not found", async () => {
    vi.mocked(findGameById).mockResolvedValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerEvictParticipantHandler(socket, io);
      });
    });
    closeServer = close;

    const result = await emitWithAck(client, SocketEvents.EVICT_PARTICIPANT, {
      gameId: "game-1",
      seat: "1NS",
      directorToken: "test-token",
    });

    expect(result).toMatchObject({ success: false, error: "Game not found" });
  });
});
