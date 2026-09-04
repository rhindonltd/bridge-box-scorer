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
});
