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
import { registerVoidPairsMatchHandler } from "./void-pairs-match.handler";
import { SocketEvents } from "@/socket/socket-events";

function createMockSocket() {
  return { on: vi.fn() } as any;
}

function makeDb() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  return { update, _set: set, _where: where };
}

const validPayload = {
  gameId: "g1",
  directorToken: "tok",
  boardNumber: 3,
  roundNumber: 1,
  tableNumber: 2,
  cause: "OFFENDER_EW" as const,
};

describe("registerVoidPairsMatchHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertDirector).mockReturnValue(true);
  });

  it("registers the void-pairs-match handler", () => {
    const socket = createMockSocket();
    registerVoidPairsMatchHandler(socket, {} as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.VOID_PAIRS_MATCH_TRAVELLER,
      expect.any(Function),
    );
  });

  it("writes the void token with VOID_PAIR status and broadcasts", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const socket = createMockSocket();
    const io = {} as any;
    registerVoidPairsMatchHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(validPayload, cb);

    expect(db._set).toHaveBeenCalledWith({
      directorOverrideResult: "VOIDP:OFFENDER_EW",
      status: "VOID_PAIR",
    });
    expect(cb).toHaveBeenCalledWith({ success: true, data: null });
    expect(broadcastResultsChanged).toHaveBeenCalledWith(io, "g1", 3);
  });

  it("rejects an invalid cause", async () => {
    const socket = createMockSocket();
    registerVoidPairsMatchHandler(socket, {} as any);
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
    registerVoidPairsMatchHandler(socket, {} as any);
    const handler = socket.on.mock.calls[0][1];
    await handler(validPayload, vi.fn());

    expect(getDb).not.toHaveBeenCalled();
    expect(broadcastResultsChanged).not.toHaveBeenCalled();
  });

  it("does not broadcast when the game db is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const socket = createMockSocket();
    registerVoidPairsMatchHandler(socket, {} as any);
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
