import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----

vi.mock("@/db/movements/queries/get-movement", () => ({
  getIndividualMovement: vi.fn(),
  getPairMovement: vi.fn(),
  getTeamMovement: vi.fn(),
}));

// Mock the DB factories so db.transaction() is a no-op
const mockTransaction = vi.fn(async (fn: (tx: any) => Promise<void>) => {
  const tx = { insert: vi.fn(() => ({ values: vi.fn() })) };
  await fn(tx);
});

vi.mock("@/db/games/individual", () => ({
  getDb: vi.fn(async () => ({ transaction: mockTransaction })),
}));

vi.mock("@/db/games/pairs", () => ({
  getDb: vi.fn(async () => ({ transaction: mockTransaction })),
}));

// director-auth guard reads socket.data.isDirector — no real DB needed
vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import {
  getIndividualMovement,
  getPairMovement,
  getTeamMovement,
} from "@/db/movements/queries/get-movement";
import { registerSelectMovementHandler } from "./select-movement.handler";

// Minimal INDIVIDUAL movement fixture
const individualMovement = [
  {
    tableNumber: 1,
    rounds: [
      {
        roundNumber: 1,
        n: "1",
        s: "2",
        e: "3",
        w: "4",
        boardStart: 1,
        boardEnd: 2,
      },
    ],
  },
];

// Minimal PAIRS movement fixture
const pairMovement = [
  {
    tableNumber: 1,
    rounds: [{ roundNumber: 1, ns: "1", ew: "2", boardStart: 1, boardEnd: 1 }],
  },
];

function makeDirectorSocket() {
  return {
    data: { isDirector: true },
    id: "test-socket",
    on: vi.fn(),
  };
}

describe("registerSelectMovementHandler (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(
      async (fn: (tx: any) => Promise<void>) => {
        const tx = { insert: vi.fn(() => ({ values: vi.fn() })) };
        await fn(tx);
      },
    );
  });

  it("registers handler on SELECT_MOVEMENT event", () => {
    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.SELECT_MOVEMENT,
      expect.any(Function),
    );
  });

  it("rejects non-director sockets immediately", async () => {
    const socket = { data: { isDirector: false }, id: "x", on: vi.fn() };
    registerSelectMovementHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler({ gameId: "g1", type: "INDIVIDUAL", id: 1 }, cb);

    expect(cb).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    expect(getIndividualMovement).not.toHaveBeenCalled();
  });

  it("processes INDIVIDUAL movement and returns success", async () => {
    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    vi.mocked(getIndividualMovement).mockResolvedValue(
      individualMovement as any,
    );

    await handler({ gameId: "g1", type: "INDIVIDUAL", id: 10 }, cb);

    expect(getIndividualMovement).toHaveBeenCalledWith(10);
    expect(mockTransaction).toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("processes PAIRS movement and returns success", async () => {
    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    vi.mocked(getPairMovement).mockResolvedValue(pairMovement as any);

    await handler({ gameId: "g1", type: "PAIRS", id: 5 }, cb);

    expect(getPairMovement).toHaveBeenCalledWith(5);
    expect(mockTransaction).toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("falls back to TEAM movement for unknown types and returns success", async () => {
    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    vi.mocked(getTeamMovement).mockResolvedValue(pairMovement as any);

    await handler({ gameId: "g1", type: "TEAM", id: 3 }, cb);

    expect(getTeamMovement).toHaveBeenCalledWith(3);
    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("returns success: false when movement query throws", async () => {
    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    vi.mocked(getIndividualMovement).mockRejectedValue(new Error("db fail"));

    await handler({ gameId: "g1", type: "INDIVIDUAL", id: 1 }, cb);

    expect(cb).toHaveBeenCalledWith({ success: false });
  });

  it("returns success: false when transaction throws", async () => {
    const socket = makeDirectorSocket();
    registerSelectMovementHandler(socket as any);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    vi.mocked(getIndividualMovement).mockResolvedValue(
      individualMovement as any,
    );
    mockTransaction.mockRejectedValue(new Error("tx fail"));

    await handler({ gameId: "g1", type: "INDIVIDUAL", id: 1 }, cb);

    expect(cb).toHaveBeenCalledWith({ success: false });
  });
});
