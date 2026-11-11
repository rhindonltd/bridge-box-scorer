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
import { registerSetSeatsSwappedHandler } from "./set-seats-swapped.handler";
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
  swapped: true,
};

describe("registerSetSeatsSwappedHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertDirector).mockReturnValue(true);
  });

  it("registers the set-seats-swapped handler", () => {
    const socket = createMockSocket();
    registerSetSeatsSwappedHandler(socket, {} as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.SET_SEATS_SWAPPED_TRAVELLER,
      expect.any(Function),
    );
  });

  it("sets only the seatsSwapped flag and broadcasts", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const socket = createMockSocket();
    const io = {} as any;
    registerSetSeatsSwappedHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(validPayload, cb);

    expect(db._set).toHaveBeenCalledWith({ seatsSwapped: true });
    expect(cb).toHaveBeenCalledWith({ success: true, data: null });
    expect(broadcastResultsChanged).toHaveBeenCalledWith(io, "g1", 3);
  });

  it("clears the flag when swapped is false", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const socket = createMockSocket();
    registerSetSeatsSwappedHandler(socket, {} as any);

    const handler = socket.on.mock.calls[0][1];
    await handler({ ...validPayload, swapped: false }, vi.fn());

    expect(db._set).toHaveBeenCalledWith({ seatsSwapped: false });
  });

  it("scopes the write to the section when one is supplied", async () => {
    const db = makeDb();
    vi.mocked(getDb).mockResolvedValue(db as any);

    const socket = createMockSocket();
    registerSetSeatsSwappedHandler(socket, {} as any);

    const handler = socket.on.mock.calls[0][1];
    await handler({ ...validPayload, section: "B" }, vi.fn());

    const where = db._where.mock.calls[0][0] as { and: unknown[] };
    expect(where.and).toContainEqual({ eq: ["section", "B"] });
  });

  it("rejects a non-boolean swapped value", async () => {
    const socket = createMockSocket();
    registerSetSeatsSwappedHandler(socket, {} as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ ...validPayload, swapped: "yes" }, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: expect.any(String),
    });
    expect(assertDirector).not.toHaveBeenCalled();
  });

  it("rejects a non-director", async () => {
    vi.mocked(assertDirector).mockReturnValue(false);

    const socket = createMockSocket();
    registerSetSeatsSwappedHandler(socket, {} as any);

    const handler = socket.on.mock.calls[0][1];
    await handler(validPayload, vi.fn());

    expect(getDb).not.toHaveBeenCalled();
    expect(broadcastResultsChanged).not.toHaveBeenCalled();
  });

  it("does not broadcast when the game db is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);

    const socket = createMockSocket();
    registerSetSeatsSwappedHandler(socket, {} as any);

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
