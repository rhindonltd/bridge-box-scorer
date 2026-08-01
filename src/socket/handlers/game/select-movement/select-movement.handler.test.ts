import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----

vi.mock("@/db/movements/queries/get-movement", () => ({
  getPairMovement: vi.fn(),
  getTeamMovement: vi.fn(),
}));

// Mock the DB factories so db.transaction() is a no-op
const mockTransaction = vi.fn(async (fn: (tx: any) => Promise<void>) => {
  const tx = { insert: vi.fn(() => ({ values: vi.fn() })) };
  await fn(tx);
});

vi.mock("@/db/games/pairs", () => ({
  getDb: vi.fn(async () => ({ transaction: mockTransaction })),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import {
  getPairMovement,
  getTeamMovement,
} from "@/db/movements/queries/get-movement";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerSelectMovementHandler } from "./select-movement.handler";

// Minimal PAIRS movement fixture
const pairMovement = [
  {
    tableNumber: 1,
    rounds: [
      { roundNumber: 1, ns: "1", ew: "2", boardStart: 1, boardEnd: 1 },
    ],
  },
];

function makeDirectorSocket() {
  return {
    data: {},
    id: "test-socket",
    on: vi.fn(),
  };
}

describe("registerSelectMovementHandler (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: any) => Promise<void>) => {
      const tx = { insert: vi.fn(() => ({ values: vi.fn() })) };
      await fn(tx);
    });

    // Default: valid director session
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "g1",
    } as any);
  });

  it("registers handler on SELECT_MOVEMENT event", () => {
    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.SELECT_MOVEMENT,
      expect.any(Function),
    );
  });

  it("rejects when directorToken is invalid", async () => {
    vi.mocked(findLoginSession).mockReturnValue(null as any);

    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler({ gameId: "g1", type: "PAIRS", id: 1, directorToken: "bad-token" }, cb);

    expect(cb).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(getPairMovement).not.toHaveBeenCalled();
  });

  it("processes PAIRS movement and returns success", async () => {
    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    vi.mocked(getPairMovement).mockResolvedValue(pairMovement as any);

    await handler({ gameId: "g1", type: "PAIRS", id: 5, directorToken: "test-token" }, cb);

    expect(getPairMovement).toHaveBeenCalledWith(5);
    expect(mockTransaction).toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("falls back to TEAM movement for TEAMS type and returns success", async () => {
    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    vi.mocked(getTeamMovement).mockResolvedValue(pairMovement as any);

    await handler({ gameId: "g1", type: "TEAMS", id: 3, directorToken: "test-token" }, cb);

    expect(getTeamMovement).toHaveBeenCalledWith(3);
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("returns success: false when movement query throws", async () => {
    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    vi.mocked(getPairMovement).mockRejectedValue(new Error("db fail"));

    await handler({ gameId: "g1", type: "PAIRS", id: 1, directorToken: "test-token" }, cb);

    expect(cb).toHaveBeenCalledWith({ success: false });
  });

  it("returns success: false when transaction throws", async () => {
    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    vi.mocked(getPairMovement).mockResolvedValue(pairMovement as any);
    mockTransaction.mockRejectedValue(new Error("tx fail"));

    await handler({ gameId: "g1", type: "PAIRS", id: 1, directorToken: "test-token" }, cb);

    expect(cb).toHaveBeenCalledWith({ success: false });
  });

  it("processes a mitchell movement spec", async () => {
    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(
      {
        gameId: "g1",
        type: "PAIRS",
        mitchell: { tables: 3, rounds: 3, boardsPerRound: 2 },
        directorToken: "test-token",
      },
      cb,
    );

    expect(mockTransaction).toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("returns error when no movement specified (no id and no mitchell)", async () => {
    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler({ gameId: "g1", type: "PAIRS", directorToken: "test-token" }, cb);

    expect(cb).toHaveBeenCalledWith({ success: false, error: "No movement specified" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("does not throw when cb is undefined and no movement specified", async () => {
    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];

    // Should not throw when cb is not provided
    await expect(
      handler({ gameId: "g1", type: "PAIRS", directorToken: "test-token" }, undefined),
    ).resolves.not.toThrow();

    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
