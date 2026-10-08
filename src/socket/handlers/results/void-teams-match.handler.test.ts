import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/tables/boards", () => ({
  boards: {
    section: "section",
    roundNumber: "roundNumber",
    tableNumber: "tableNumber",
    boardNumber: "boardNumber",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => ({ and: args }),
  eq: (a: unknown, b: unknown) => ({ eq: [a, b] }),
}));

vi.mock("@/socket/middleware/director-auth", () => ({
  assertDirector: vi.fn(),
}));

vi.mock("./broadcast-results", () => ({
  broadcastResultsChanged: vi.fn().mockResolvedValue(undefined),
}));

import { getDb } from "@/db/games";
import { assertDirector } from "@/socket/middleware/director-auth";
import { broadcastResultsChanged } from "./broadcast-results";
import { registerVoidTeamsMatchHandler } from "./void-teams-match.handler";
import { SocketEvents } from "@/socket/socket-events";

function createMockSocket() {
  return { on: vi.fn() } as any;
}

/**
 * A db mock for the ruling writer, which now (1) selects the acted board's
 * matchId, (2) selects the match's home seat, then (3) updates matches.ruling.
 * The acted table is 2 and the match's home is "A2NS" (table 2), so the acted
 * room IS the home side and the stored ruling is home-relative (no inversion).
 */
function makeDb() {
  let selectCall = 0;
  const select = vi.fn(() => {
    const which = selectCall++;
    const chain: any = {
      from: () => chain,
      where: () => chain,
      limit: () =>
        Promise.resolve(which === 0 ? [{ matchId: 1 }] : [{ home: "A2NS" }]),
    };
    return chain;
  });
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return { select, update, _set: set, _where: where };
}

const validPayload = {
  gameId: "g1",
  directorToken: "tok",
  boardNumber: 3,
  roundNumber: 1,
  tableNumber: 2,
  cause: "SEATING_STANDARD" as const,
};

describe("registerVoidTeamsMatchHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertDirector).mockReturnValue(true);
  });

  it("registers the void-teams-match handler", () => {
    const socket = createMockSocket();
    registerVoidTeamsMatchHandler(socket, {} as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.VOID_TEAMS_MATCH_TRAVELLER,
      expect.any(Function),
    );
  });

  it("writes the void token with VOID_MATCH status and broadcasts", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const socket = createMockSocket();
    const io = {} as any;
    registerVoidTeamsMatchHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(validPayload, cb);

    expect(db._set).toHaveBeenCalledWith({ ruling: "VOID:SEATING_STANDARD" });
    expect(cb).toHaveBeenCalledWith({ success: true, data: null });
    expect(broadcastResultsChanged).toHaveBeenCalledWith(io, "g1", 3);
  });

  it("encodes a §3.3.9 short-void cause", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);
    const socket = createMockSocket();
    registerVoidTeamsMatchHandler(socket, {} as any);
    const handler = socket.on.mock.calls[0][1];

    await handler({ ...validPayload, cause: "SHORT_OFFENDER_EW" }, vi.fn());
    // Acted table 2 is the match home (A2NS), so the cause is stored as-is.
    expect(db._set).toHaveBeenCalledWith({ ruling: "VOID:SHORT_OFFENDER_EW" });
  });

  it("rejects an invalid cause", async () => {
    const socket = createMockSocket();
    registerVoidTeamsMatchHandler(socket, {} as any);
    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ ...validPayload, cause: "NOPE" }, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: expect.any(String),
    });
    expect(assertDirector).not.toHaveBeenCalled();
  });

  it("rejects a non-director", async () => {
    vi.mocked(assertDirector).mockReturnValue(false);
    const socket = createMockSocket();
    registerVoidTeamsMatchHandler(socket, {} as any);
    const handler = socket.on.mock.calls[0][1];
    await handler(validPayload, vi.fn());

    expect(getDb).not.toHaveBeenCalled();
    expect(broadcastResultsChanged).not.toHaveBeenCalled();
  });

  it("does not broadcast when the game db is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const socket = createMockSocket();
    registerVoidTeamsMatchHandler(socket, {} as any);
    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(validPayload, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Game not found",
    });
    expect(broadcastResultsChanged).not.toHaveBeenCalled();
  });
});
