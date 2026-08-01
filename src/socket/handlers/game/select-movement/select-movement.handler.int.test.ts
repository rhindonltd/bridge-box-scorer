import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { io as Client } from "socket.io-client";

import { SocketEvents } from "@/socket/socket-events";

// ---- mock heavy DB layer only ----

vi.mock("@/db/movements/queries/get-movement", () => ({
  getPairMovement: vi.fn(),
  getTeamMovement: vi.fn(),
}));

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

import { getPairMovement } from "@/db/movements/queries/get-movement";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerSelectMovementHandler } from "./select-movement.handler";

describe("registerSelectMovementHandler (integration)", () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: Server;
  let client: ReturnType<typeof Client>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: any) => Promise<void>) => {
      const tx = { insert: vi.fn(() => ({ values: vi.fn() })) };
      await fn(tx);
    });

    // Mock findLoginSession to validate the test director token
    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "g1",
    } as any);

    httpServer = createServer();
    io = new Server(httpServer, { cors: { origin: "*" } });

    io.on("connection", (socket: Socket) => {
      registerSelectMovementHandler(socket);
    });

    await new Promise<void>((resolve) => httpServer.listen(() => resolve()));

    const { port } = httpServer.address() as { port: number };
    client = Client(`http://localhost:${port}`);
    await new Promise<void>((resolve) => client.on("connect", () => resolve()));
  });

  afterEach(async () => {
    client.disconnect();
    await new Promise<void>((resolve) => io.close(() => resolve()));
  });

  it("processes PAIRS movement and returns success", async () => {
    vi.mocked(getPairMovement).mockResolvedValue([
      {
        tableNumber: 1,
        rounds: [
          { roundNumber: 1, ns: "1", ew: "2", boardStart: 1, boardEnd: 1 },
        ],
      },
    ] as any);

    const result = await new Promise<any>((resolve) => {
      client.emit(
        SocketEvents.SELECT_MOVEMENT,
        { gameId: "g1", type: "PAIRS", id: 1, directorToken: "test-token" },
        resolve,
      );
    });

    expect(result).toEqual({ success: true });
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("handles errors gracefully and returns success: false", async () => {
    vi.mocked(getPairMovement).mockRejectedValue(new Error("boom"));

    const result = await new Promise<any>((resolve) => {
      client.emit(
        SocketEvents.SELECT_MOVEMENT,
        { gameId: "g1", type: "PAIRS", id: 1, directorToken: "test-token" },
        resolve,
      );
    });

    expect(result).toEqual({ success: false });
  });
});
