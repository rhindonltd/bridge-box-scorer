import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/socket/middleware/participant-auth", () => ({
  assertPlayer: vi.fn(),
}));
vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));
vi.mock("@/services/call-director/locate-caller", () => ({
  locateCaller: vi.fn(),
}));
vi.mock("@/socket/broadcast/director-calls", () => ({
  callDirector: vi.fn(() => ({ calls: 2 })),
}));

import { assertPlayer } from "@/socket/middleware/participant-auth";
import { getDb } from "@/db/games";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { locateCaller } from "@/services/call-director/locate-caller";
import { callDirector } from "@/socket/broadcast/director-calls";
import { registerCallDirectorHandler } from "./call-director.handler";
import { registerGameHandlers } from "../game.handlers";

const table = { section: null, tableNumber: 3, roundNumber: 2, side: "NS" };

async function call(payload: Record<string, unknown>) {
  const socket = { id: "s1", on: vi.fn(), join: vi.fn() } as any;
  const io = { to: vi.fn() } as any;
  registerCallDirectorHandler(socket, io);
  const handler = socket.on.mock.calls.find(
    (c: any) => c[0] === SocketEvents.CALL_DIRECTOR,
  )![1];
  const cb = vi.fn();
  await handler({ gameId: "g1", seat: "A3NS", token: "t", ...payload }, cb);
  return { cb, io };
}

describe("game:callDirector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertPlayer).mockResolvedValue(true);
    vi.mocked(findGameById).mockResolvedValue({
      eventName: "Monday Pairs",
    } as never);
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(locateCaller).mockResolvedValue({
      table: table as never,
      players: "Mary Smith & John Jones",
    });
  });

  it("calls the director to the pair's table and says where", async () => {
    const { cb, io } = await call({});
    expect(assertPlayer).toHaveBeenCalledWith(
      "g1",
      "A3NS",
      "t",
      expect.any(Function),
    );
    expect(callDirector).toHaveBeenCalledWith(
      "g1",
      "A3NS",
      { eventName: "Monday Pairs", table, players: "Mary Smith & John Jones" },
      io,
    );
    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: { table, calls: 2 },
    });
  });

  it("refuses a device that doesn't hold the seat", async () => {
    vi.mocked(assertPlayer).mockImplementation(async (_g, _s, _t, ack) => {
      ack?.({ success: false, error: "Unauthorized" });
      return false;
    });
    const { cb } = await call({ token: "wrong" });
    expect(callDirector).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
  });

  it("reports a missing game", async () => {
    vi.mocked(findGameById).mockResolvedValue(null as never);
    expect((await call({})).cb).toHaveBeenCalledWith({
      success: false,
      error: "Game not found",
    });
    vi.mocked(findGameById).mockResolvedValue({ eventName: "x" } as never);
    vi.mocked(getDb).mockResolvedValue(null as never);
    expect((await call({})).cb).toHaveBeenCalledWith({
      success: false,
      error: "Game not found",
    });
    expect(callDirector).not.toHaveBeenCalled();
  });

  it("is registered with the game handlers", () => {
    const socket = { id: "s1", on: vi.fn() } as any;
    registerGameHandlers(socket, {} as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.CALL_DIRECTOR,
      expect.any(Function),
    );
  });
});
