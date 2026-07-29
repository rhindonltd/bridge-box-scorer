import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { io as Client } from "socket.io-client";

import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

// ---- mock DB layer ----

vi.mock("@/db/games/shared/actions/create-player", () => ({
  createPlayer: vi.fn(),
}));

vi.mock("@/db/games/individual/actions/create-participant", () => ({
  createParticipant: vi.fn(),
}));

vi.mock("@/db/games/individual/queries/find-individuals", () => ({
  findIndividuals: vi.fn(),
}));

vi.mock("@/db/games/pairs/actions/create-participant", () => ({
  createParticipant: vi.fn(),
}));

vi.mock("@/db/games/pairs/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { createPlayer } from "@/db/games/shared/actions/create-player";
import { createParticipant as createIndividual } from "@/db/games/individual/actions/create-participant";
import { findIndividuals } from "@/db/games/individual/queries/find-individuals";
import { registerCreateParticipantHandler } from "./create-participant";

describe("registerCreateParticipantHandler (integration)", () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: Server;
  let client: ReturnType<typeof Client>;

  beforeEach(async () => {
    vi.clearAllMocks();

    httpServer = createServer();
    io = new Server(httpServer, { cors: { origin: "*" } });

    io.on("connection", (socket: Socket) => {
      // Mark every test connection as a director so the guard passes
      socket.data.isDirector = true;

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

  it("creates an INDIVIDUAL participant and emits PARTICIPANTS", async () => {
    vi.mocked(createPlayer).mockResolvedValue({ id: 99 } as any);
    vi.mocked(createIndividual).mockResolvedValue(undefined);
    vi.mocked(findIndividuals).mockResolvedValue([
      {
        type: "INDIVIDUAL",
        initialSeat: "1N",
        player: {
          id: 99,
          firstName: "Alice",
          lastName: "Smith",
          nationalId: null,
        },
      },
    ]);

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
          newParticipant: {
            type: "INDIVIDUAL",
            initialSeat: "1N",
            player: { firstName: "Alice", lastName: "Smith" },
          },
        },
        resolve,
      );
    });

    expect(response).toMatchObject({ success: true, key: expect.any(String) });

    const event = await participantsEvent;
    expect(event.participants).toEqual([
      expect.objectContaining({ type: "INDIVIDUAL" }),
    ]);
  });

  it("returns success: false when createPlayer throws", async () => {
    vi.mocked(createPlayer).mockRejectedValue(new Error("db error"));

    const response = await new Promise<any>((resolve) => {
      client.emit(
        SocketEvents.CREATE_PARTICIPANT,
        {
          gameId: "game-1",
          newParticipant: {
            type: "INDIVIDUAL",
            initialSeat: "1N",
            player: { firstName: "X", lastName: "Y" },
          },
        },
        resolve,
      );
    });

    expect(response).toEqual({ success: false });
  });
});
