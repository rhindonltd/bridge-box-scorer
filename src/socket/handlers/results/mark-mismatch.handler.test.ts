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
import { registerMarkMismatchHandler } from "./mark-mismatch.handler";
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
  side: "NS" as const,
  direction: "HIGHER" as const,
  fault: "NOT" as const,
};

describe("registerMarkMismatchHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertDirector).mockReturnValue(true);
  });

  it("registers the mark-mismatch handler", () => {
    const socket = createMockSocket();
    registerMarkMismatchHandler(socket, {} as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.MISMATCH_TRAVELLER,
      expect.any(Function),
    );
  });

  it("writes the mismatch token to matchRuling with MISMATCH status and broadcasts", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const socket = createMockSocket();
    const io = {} as any;
    registerMarkMismatchHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(validPayload, cb);

    // The ruling goes in matchRuling (NOT directorOverrideResult), so the board
    // keeps its real result in the field.
    expect(db._set).toHaveBeenCalledWith({
      matchRuling: "MM:NS:HIGHER:NOT",
      status: "MISMATCH",
    });
    expect(cb).toHaveBeenCalledWith({ success: true, data: null });
    expect(broadcastResultsChanged).toHaveBeenCalledWith(io, "g1", 3);
  });

  it("rejects an invalid direction", async () => {
    const socket = createMockSocket();
    registerMarkMismatchHandler(socket, {} as any);
    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ ...validPayload, direction: "SIDEWAYS" }, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: expect.any(String),
    });
    expect(assertDirector).not.toHaveBeenCalled();
  });

  it("rejects a non-director", async () => {
    vi.mocked(assertDirector).mockReturnValue(false);
    const socket = createMockSocket();
    registerMarkMismatchHandler(socket, {} as any);
    const handler = socket.on.mock.calls[0][1];
    await handler(validPayload, vi.fn());

    expect(getDb).not.toHaveBeenCalled();
    expect(broadcastResultsChanged).not.toHaveBeenCalled();
  });

  it("does not broadcast when the game db is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const socket = createMockSocket();
    registerMarkMismatchHandler(socket, {} as any);
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
