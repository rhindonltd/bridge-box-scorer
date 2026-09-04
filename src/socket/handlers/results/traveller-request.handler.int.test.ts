import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { emitWithAck } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/services/board-service", () => ({
  getBoardInstances: vi.fn(),
}));

import { getDb } from "@/db/games";
import { getBoardInstances } from "@/services/board-service";
import { registerTravellerRequestHandler } from "./traveller-request.handler";

describe("registerTravellerRequestHandler (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(getBoardInstances).mockResolvedValue([
      { boardNumber: 7, roundNumber: 1, tableNumber: 2 },
    ] as any);
  });

  afterEach(async () => {
    await closeServer?.();
  });

  it("returns a board's instances on the ack and joins that board's room", async () => {
    let serverSocket: Socket | null = null;

    const { client, close, io } = await createSocketTestServer((server) => {
      server.on("connection", (socket: Socket) => {
        serverSocket = socket;
        registerTravellerRequestHandler(socket, server);
      });
    });
    closeServer = close;

    const response: any = await emitWithAck(
      client,
      SocketEvents.REQUEST_STATE_TRAVELLER,
      { gameId: "g1", boardNumber: 7 },
    );

    expect(response.success).toBe(true);
    expect(response.data).toMatchObject({
      instances: [{ boardNumber: 7, roundNumber: 1, tableNumber: 2 }],
    });

    const room = io.sockets.adapter.rooms.get(Rooms.traveller("g1", 7));
    expect(room?.has(serverSocket!.id)).toBe(true);
  });

  it("leaves the board's traveller room on traveller:leave", async () => {
    let serverSocket: Socket | null = null;

    const { client, close, io } = await createSocketTestServer((server) => {
      server.on("connection", (socket: Socket) => {
        serverSocket = socket;
        registerTravellerRequestHandler(socket, server);
      });
    });
    closeServer = close;

    await emitWithAck(client, SocketEvents.REQUEST_STATE_TRAVELLER, {
      gameId: "g1",
      boardNumber: 7,
    });
    expect(
      io.sockets.adapter.rooms.get(Rooms.traveller("g1", 7))?.has(
        serverSocket!.id,
      ),
    ).toBe(true);

    client.emit(SocketEvents.LEAVE_TRAVELLER, { gameId: "g1", boardNumber: 7 });
    await new Promise((r) => setTimeout(r, 100));

    expect(
      io.sockets.adapter.rooms.get(Rooms.traveller("g1", 7)),
    ).toBeUndefined();
  });

  it("ignores a traveller:leave with an invalid payload", async () => {
    let serverSocket: Socket | null = null;

    const { client, close, io } = await createSocketTestServer((server) => {
      server.on("connection", (socket: Socket) => {
        serverSocket = socket;
        registerTravellerRequestHandler(socket, server);
      });
    });
    closeServer = close;

    await emitWithAck(client, SocketEvents.REQUEST_STATE_TRAVELLER, {
      gameId: "g1",
      boardNumber: 7,
    });

    client.emit(SocketEvents.LEAVE_TRAVELLER, {});
    await new Promise((r) => setTimeout(r, 100));

    expect(
      io.sockets.adapter.rooms.get(Rooms.traveller("g1", 7))?.has(
        serverSocket!.id,
      ),
    ).toBe(true);
  });

  it("returns null on the ack when the game db is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);

    const { client, close } = await createSocketTestServer((server) => {
      server.on("connection", (socket: Socket) => {
        registerTravellerRequestHandler(socket, server);
      });
    });
    closeServer = close;

    const response: any = await emitWithAck(
      client,
      SocketEvents.REQUEST_STATE_TRAVELLER,
      { gameId: "g1", boardNumber: 7 },
    );

    expect(response).toEqual({ success: true, data: null });
  });

  it("rejects an invalid requestState payload", async () => {
    const { client, close } = await createSocketTestServer((server) => {
      server.on("connection", (socket: Socket) => {
        registerTravellerRequestHandler(socket, server);
      });
    });
    closeServer = close;

    const response: any = await emitWithAck(
      client,
      SocketEvents.REQUEST_STATE_TRAVELLER,
      { gameId: "g1" },
    );

    expect(response).toMatchObject({ success: false, error: "Invalid payload" });
  });

  it("returns null and swallows a load error", async () => {
    vi.mocked(getBoardInstances).mockRejectedValue(new Error("boom"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { client, close } = await createSocketTestServer((server) => {
      server.on("connection", (socket: Socket) => {
        registerTravellerRequestHandler(socket, server);
      });
    });
    closeServer = close;

    const response: any = await emitWithAck(
      client,
      SocketEvents.REQUEST_STATE_TRAVELLER,
      { gameId: "g1", boardNumber: 7 },
    );

    expect(response).toEqual({ success: true, data: null });
    errSpy.mockRestore();
  });
});
