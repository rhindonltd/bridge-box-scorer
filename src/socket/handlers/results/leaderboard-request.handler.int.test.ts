import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { emitWithAck } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/services/leaderboard-service", () => ({
  computeLeaderboard: vi.fn(),
  computeSectionLeaderboards: vi.fn(),
}));

import { getDb } from "@/db/games";
import {
  computeLeaderboard,
  computeSectionLeaderboards,
} from "@/services/leaderboard-service";
import { registerLeaderboardRequestHandler } from "./leaderboard-request.handler";

describe("registerLeaderboardRequestHandler (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(computeLeaderboard).mockResolvedValue({ type: "MP" } as any);
    vi.mocked(computeSectionLeaderboards).mockResolvedValue([] as any);
  });

  afterEach(async () => {
    await closeServer?.();
  });

  it("returns the snapshot on the ack and joins the leaderboard room", async () => {
    let serverSocket: Socket | null = null;

    const { client, close, io } = await createSocketTestServer((server) => {
      server.on("connection", (socket: Socket) => {
        serverSocket = socket;
        registerLeaderboardRequestHandler(socket, server);
      });
    });
    closeServer = close;

    const response: any = await emitWithAck(
      client,
      SocketEvents.REQUEST_STATE_LEADERBOARD,
      { gameId: "g1" },
    );

    expect(response.success).toBe(true);
    expect(response.data).toMatchObject({
      leaderboard: { type: "MP" },
      sections: [],
    });

    // The socket is now a member of the leaderboard room.
    const room = io.sockets.adapter.rooms.get(Rooms.leaderboard("g1"));
    expect(room?.has(serverSocket!.id)).toBe(true);
  });

  it("leaves the leaderboard room on leaderboard:leave", async () => {
    let serverSocket: Socket | null = null;

    const { client, close, io } = await createSocketTestServer((server) => {
      server.on("connection", (socket: Socket) => {
        serverSocket = socket;
        registerLeaderboardRequestHandler(socket, server);
      });
    });
    closeServer = close;

    await emitWithAck(client, SocketEvents.REQUEST_STATE_LEADERBOARD, {
      gameId: "g1",
    });
    expect(
      io.sockets.adapter.rooms.get(Rooms.leaderboard("g1"))?.has(
        serverSocket!.id,
      ),
    ).toBe(true);

    client.emit(SocketEvents.LEAVE_LEADERBOARD, { gameId: "g1" });
    // Give the server a tick to process the leave.
    await new Promise((r) => setTimeout(r, 100));

    expect(
      io.sockets.adapter.rooms.get(Rooms.leaderboard("g1")),
    ).toBeUndefined();
  });

  it("ignores a leaderboard:leave with an invalid payload", async () => {
    let serverSocket: Socket | null = null;

    const { client, close, io } = await createSocketTestServer((server) => {
      server.on("connection", (socket: Socket) => {
        serverSocket = socket;
        registerLeaderboardRequestHandler(socket, server);
      });
    });
    closeServer = close;

    await emitWithAck(client, SocketEvents.REQUEST_STATE_LEADERBOARD, {
      gameId: "g1",
    });

    // Invalid payload — the handler returns early and the room membership stays.
    client.emit(SocketEvents.LEAVE_LEADERBOARD, {});
    await new Promise((r) => setTimeout(r, 100));

    expect(
      io.sockets.adapter.rooms.get(Rooms.leaderboard("g1"))?.has(
        serverSocket!.id,
      ),
    ).toBe(true);
  });

  it("returns null on the ack when the game db is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);

    const { client, close } = await createSocketTestServer((server) => {
      server.on("connection", (socket: Socket) => {
        registerLeaderboardRequestHandler(socket, server);
      });
    });
    closeServer = close;

    const response: any = await emitWithAck(
      client,
      SocketEvents.REQUEST_STATE_LEADERBOARD,
      { gameId: "g1" },
    );

    expect(response).toEqual({ success: true, data: null });
  });

  it("rejects an invalid requestState payload", async () => {
    const { client, close } = await createSocketTestServer((server) => {
      server.on("connection", (socket: Socket) => {
        registerLeaderboardRequestHandler(socket, server);
      });
    });
    closeServer = close;

    const response: any = await emitWithAck(
      client,
      SocketEvents.REQUEST_STATE_LEADERBOARD,
      {},
    );

    expect(response).toMatchObject({ success: false, error: "Invalid payload" });
  });

  it("returns null and swallows a compute error", async () => {
    vi.mocked(computeLeaderboard).mockRejectedValue(new Error("boom"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { client, close } = await createSocketTestServer((server) => {
      server.on("connection", (socket: Socket) => {
        registerLeaderboardRequestHandler(socket, server);
      });
    });
    closeServer = close;

    const response: any = await emitWithAck(
      client,
      SocketEvents.REQUEST_STATE_LEADERBOARD,
      { gameId: "g1" },
    );

    expect(response).toEqual({ success: true, data: null });
    errSpy.mockRestore();
  });
});
