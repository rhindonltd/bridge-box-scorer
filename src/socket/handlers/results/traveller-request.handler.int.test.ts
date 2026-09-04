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
});
