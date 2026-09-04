import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { io as Client } from "socket.io-client";

import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

// ---- mock DB layer ----

vi.mock("@/db/games/actions/create-player", () => ({
  createPlayer: vi.fn(),
}));

vi.mock("@/db/games/actions/create-participant", () => ({
  createParticipant: vi.fn(),
}));

vi.mock("@/db/games/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { createPlayer } from "@/db/games/actions/create-player";
import { createParticipant as createPair } from "@/db/games/actions/create-participant";
import { findPairs } from "@/db/games/queries/find-pairs";
import { getDb } from "@/db/games";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerCreateParticipantHandler } from "./create-participant";

describe("registerCreateParticipantHandler (integration)", () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: Server;
  let client: ReturnType<typeof Client>;

  beforeEach(async () => {
    vi.clearAllMocks();

    vi.mocked(getDb).mockResolvedValue({} as any);

    // Mock findLoginSession to validate the test director token
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "game-1",
    } as any);

    httpServer = createServer();
    io = new Server(httpServer, { cors: { origin: "*" } });

    io.on("connection", (socket: Socket) => {
      socket.on("join", (room: string) => socket.join(room));
      registerCreateParticipantHandler(socket, io);
    });

    await new Promise<void>((resolve) => httpServer.listen(() => resolve()));

    const { port } = httpServer.address() as { port: number };
    client = Client(`http://localhost:${port}`);
    await new Promise<void>((resolve) => client.on("connect", () => resolve()));
  });

  afterEach(async () => {
    client.disconnect();
    await new Promise<void>((resolve) => io.close(() => resolve()));
  });

  it("creates a PAIR participant and emits PARTICIPANTS", async () => {
    vi.mocked(createPlayer)
      .mockResolvedValueOnce({ id: 10 } as any)
      .mockResolvedValueOnce({ id: 11 } as any);
    vi.mocked(createPair).mockResolvedValue(undefined);
    vi.mocked(findPairs).mockResolvedValue([
      {
        type: "PAIR",
        initialSeat: "A1NS",
        player1: {
          id: 10,
          firstName: "Alice",
          lastName: "Smith",
          nationalId: null,
        },
        player2: {
          id: 11,
          firstName: "Bob",
          lastName: "Jones",
          nationalId: null,
        },
      },
    ] as any);

    // Subscribe to the room so the broadcast reaches this client
    client.emit("join", Rooms.game("game-1"));
    await new Promise((r) => setTimeout(r, 50));

    const participantsEvent = new Promise<any>((resolve) =>
      client.on(SocketEvents.PARTICIPANTS, resolve),
    );

    const response = await new Promise<any>((resolve) => {
      client.emit(
        SocketEvents.CREATE_PARTICIPANT,
        {
          gameId: "game-1",
          directorToken: "test-token",
          newParticipant: {
            type: "PAIR",
            initialSeat: "A1NS",
            player1: { firstName: "Alice", lastName: "Smith" },
            player2: { firstName: "Bob", lastName: "Jones" },
          },
        },
        resolve,
      );
    });

    expect(response).toMatchObject({
      success: true,
      data: { key: expect.any(String) },
    });

    const event = await participantsEvent;
    expect(event.participants).toEqual([
      expect.objectContaining({ type: "PAIR" }),
    ]);
  });

  it("returns success: false when createPlayer throws", async () => {
    vi.mocked(createPlayer).mockRejectedValue(new Error("db error"));

    const response = await new Promise<any>((resolve) => {
      client.emit(
        SocketEvents.CREATE_PARTICIPANT,
        {
          gameId: "game-1",
          directorToken: "test-token",
          newParticipant: {
            type: "PAIR",
            initialSeat: "A1NS",
            player1: { firstName: "X", lastName: "Y" },
            player2: { firstName: "A", lastName: "B" },
          },
        },
        resolve,
      );
    });

    expect(response).toMatchObject({ success: false });
  });

  it("returns success: false with the db-missing error when getDb resolves null", async () => {
    vi.mocked(createPlayer)
      .mockResolvedValueOnce({ id: 10 } as any)
      .mockResolvedValueOnce({ id: 11 } as any);
    vi.mocked(createPair).mockResolvedValue(undefined);
    vi.mocked(getDb).mockResolvedValue(null as any);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await new Promise<any>((resolve) => {
      client.emit(
        SocketEvents.CREATE_PARTICIPANT,
        {
          gameId: "game-1",
          directorToken: "test-token",
          newParticipant: {
            type: "PAIR",
            initialSeat: "A1NS",
            player1: { firstName: "X", lastName: "Y" },
            player2: { firstName: "A", lastName: "B" },
          },
        },
        resolve,
      );
    });

    expect(response).toMatchObject({
      success: false,
      error: "Game db does not exist",
    });
    errSpy.mockRestore();
  });

  it("maps a non-Error rejection to Unknown error", async () => {
    vi.mocked(createPlayer).mockRejectedValue("boom");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await new Promise<any>((resolve) => {
      client.emit(
        SocketEvents.CREATE_PARTICIPANT,
        {
          gameId: "game-1",
          directorToken: "test-token",
          newParticipant: {
            type: "PAIR",
            initialSeat: "A1NS",
            player1: { firstName: "X", lastName: "Y" },
            player2: { firstName: "A", lastName: "B" },
          },
        },
        resolve,
      );
    });

    expect(response).toMatchObject({
      success: false,
      error: "Unknown error",
    });
    errSpy.mockRestore();
  });
});
