import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { io as Client } from "socket.io-client";

import { SocketEvents } from "@/socket/socket-events";

// ---- mock DB layer only ----

vi.mock("@/db/game-index/actions/set-selected-movement", () => ({
  setSelectedMovement: vi.fn(async () => {}),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({ gameId: "g1" })),
}));

vi.mock("@/db/system/queries/find-login-session", () => ({
  findLoginSession: vi.fn(),
}));

import { setSelectedMovement } from "@/db/game-index/actions/set-selected-movement";
import { findLoginSession } from "@/db/system/queries/find-login-session";
import { registerSelectMovementHandler } from "./select-movement.handler";

describe("registerSelectMovementHandler (integration)", () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: Server;
  let client: ReturnType<typeof Client>;

  beforeEach(async () => {
    vi.clearAllMocks();

    vi.mocked(findLoginSession).mockReturnValue({
      token: "test-token",
      role: "DIRECTOR",
      gameId: "g1",
    } as any);

    httpServer = createServer();
    io = new Server(httpServer, { cors: { origin: "*" } });

    io.on("connection", (socket: Socket) => {
      registerSelectMovementHandler(socket, io);
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

  it("persists a PAIRS spec selection and returns success", async () => {
    const result = await new Promise<any>((resolve) => {
      client.emit(
        SocketEvents.SELECT_MOVEMENT,
        { gameId: "g1", type: "PAIRS", id: 1, directorToken: "test-token" },
        resolve,
      );
    });

    expect(result).toEqual({ success: true });
    expect(setSelectedMovement).toHaveBeenCalledWith("g1", {
      source: "SPEC",
      specId: 1,
    });
  });

  it("handles errors gracefully and returns success: false", async () => {
    vi.mocked(setSelectedMovement).mockRejectedValueOnce(new Error("boom"));

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
