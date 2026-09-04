import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { emitWithAck } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

// DB layer: db.update(...).set(...).where(...) resolves.
const mockWhere = vi.fn().mockResolvedValue(undefined);
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));

vi.mock("@/db/games", () => ({
  getDb: vi.fn(async () => ({ update: mockUpdate })),
}));

vi.mock("@/db/games/tables/boards", () => ({
  boards: {
    roundNumber: "roundNumber",
    tableNumber: "tableNumber",
    boardNumber: "boardNumber",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
}));

vi.mock("./broadcast-results", () => ({
  broadcastResultsChanged: vi.fn().mockResolvedValue(undefined),
}));

import { findLoginSession } from "@/db/system/queries/find-login-session";
import { getDb } from "@/db/games";
import { broadcastResultsChanged } from "./broadcast-results";
import { registerTravellerOverrideHandler } from "./traveller-override.handler";

const validPayload = {
  gameId: "g1",
  directorToken: "tok",
  boardNumber: 7,
  roundNumber: 1,
  tableNumber: 2,
  result: "3NTN=",
};

describe("registerTravellerOverrideHandler (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockResolvedValue(undefined);
    vi.mocked(getDb).mockResolvedValue({ update: mockUpdate } as any);
    vi.mocked(findLoginSession).mockReturnValue({
      token: "tok",
      role: "DIRECTOR",
      gameId: "g1",
    } as any);
  });

  afterEach(async () => {
    await closeServer?.();
  });

  it("writes the override and fans out recomputed snapshots", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerTravellerOverrideHandler(socket, io);
      });
    });
    closeServer = close;

    const response: any = await emitWithAck(
      client,
      SocketEvents.OVERRIDE_RESULT_TRAVELLER,
      validPayload,
    );

    expect(response).toEqual({ success: true, data: null });
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "OVERRIDDEN", directorOverrideResult: "3NTN=" }),
    );
    expect(broadcastResultsChanged).toHaveBeenCalledWith(
      expect.anything(),
      "g1",
      7,
    );
  });

  it("rejects an invalid payload", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerTravellerOverrideHandler(socket, io);
      });
    });
    closeServer = close;

    const response: any = await emitWithAck(
      client,
      SocketEvents.OVERRIDE_RESULT_TRAVELLER,
      {},
    );

    expect(response).toMatchObject({ success: false, error: "Invalid payload" });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects a non-director", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerTravellerOverrideHandler(socket, io);
      });
    });
    closeServer = close;

    const response: any = await emitWithAck(
      client,
      SocketEvents.OVERRIDE_RESULT_TRAVELLER,
      { ...validPayload, directorToken: "bad" },
    );

    expect(response).toMatchObject({ success: false, error: "Unauthorized" });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns an error when the game db is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerTravellerOverrideHandler(socket, io);
      });
    });
    closeServer = close;

    const response: any = await emitWithAck(
      client,
      SocketEvents.OVERRIDE_RESULT_TRAVELLER,
      validPayload,
    );

    expect(response).toMatchObject({ success: false, error: "Game not found" });
    expect(broadcastResultsChanged).not.toHaveBeenCalled();
  });

  it("returns an error when the DB write throws (catch block)", async () => {
    mockWhere.mockRejectedValue(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerTravellerOverrideHandler(socket, io);
      });
    });
    closeServer = close;

    const response: any = await emitWithAck(
      client,
      SocketEvents.OVERRIDE_RESULT_TRAVELLER,
      validPayload,
    );

    expect(response).toMatchObject({
      success: false,
      error: "Failed to override result",
    });
    expect(broadcastResultsChanged).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
