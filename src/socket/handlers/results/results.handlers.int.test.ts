import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { emitWithAck } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";

// registerResultsHandlers only wires three sub-registrars; mock the DB/service
// deps they reach so we can prove each event is registered without a real db.
vi.mock("@/db/games", () => ({
  getDb: vi.fn(async () => ({})),
}));

vi.mock("@/services/leaderboard-service", () => ({
  computeLeaderboard: vi.fn().mockResolvedValue({ type: "MP" }),
  computeSectionLeaderboards: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/board-service", () => ({
  getBoardInstances: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerResultsHandlers } from "./results.handlers";

describe("registerResultsHandlers (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findLoginSession).mockReturnValue(null as any);
  });

  afterEach(async () => {
    await closeServer?.();
  });

  it("wires the leaderboard, traveller, and override handlers", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerResultsHandlers(socket, io);
      });
    });
    closeServer = close;

    // leaderboard:requestState -> registerLeaderboardRequestHandler
    const leaderboard: any = await emitWithAck(
      client,
      SocketEvents.REQUEST_STATE_LEADERBOARD,
      { gameId: "g1" },
    );
    expect(leaderboard.success).toBe(true);

    // traveller:requestState -> registerTravellerRequestHandler
    const traveller: any = await emitWithAck(
      client,
      SocketEvents.REQUEST_STATE_TRAVELLER,
      { gameId: "g1", boardNumber: 1 },
    );
    expect(traveller.success).toBe(true);

    // traveller:overrideResult -> registerTravellerOverrideHandler
    // (rejected here since findLoginSession returns null, proving it's wired).
    const override: any = await emitWithAck(
      client,
      SocketEvents.OVERRIDE_RESULT_TRAVELLER,
      {
        gameId: "g1",
        directorToken: "tok",
        boardNumber: 1,
        roundNumber: 1,
        tableNumber: 1,
        result: "3NTN=",
      },
    );
    expect(override).toMatchObject({ success: false, error: "Unauthorized" });
  });
});
