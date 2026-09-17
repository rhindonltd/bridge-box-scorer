import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/actions/set-deal", () => ({
  upsertDeal: vi.fn(),
}));

vi.mock("@/socket/middleware/director-auth", () => ({
  assertDirector: vi.fn(),
}));

vi.mock("./broadcast-results", () => ({
  broadcastResultsChanged: vi.fn().mockResolvedValue(undefined),
}));

import { getDb } from "@/db/games";
import { upsertDeal } from "@/db/games/actions/set-deal";
import { assertDirector } from "@/socket/middleware/director-auth";
import { broadcastResultsChanged } from "./broadcast-results";
import { registerDealOverrideHandler } from "./deal-override.handler";
import { SocketEvents } from "@/socket/socket-events";
import type { Deal } from "@/model/common";

function createMockSocket() {
  return { on: vi.fn() } as any;
}

function validDeal(): Deal {
  const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  return {
    N: ranks.map((r) => `${r}S`),
    E: ranks.map((r) => `${r}H`),
    S: ranks.map((r) => `${r}D`),
    W: ranks.map((r) => `${r}C`),
  };
}

const validPayload = {
  gameId: "g1",
  directorToken: "tok",
  boardNumber: 7,
  deal: validDeal(),
};

describe("registerDealOverrideHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertDirector).mockReturnValue(true);
    vi.mocked(getDb).mockResolvedValue({} as any);
  });

  it("registers the handler on DEAL_OVERRIDE", () => {
    const socket = createMockSocket();
    registerDealOverrideHandler(socket, {} as never);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.DEAL_OVERRIDE,
      expect.any(Function),
    );
  });

  it("upserts the deal and broadcasts on success", async () => {
    const socket = createMockSocket();
    const io = {} as never;
    registerDealOverrideHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(validPayload, cb);

    expect(upsertDeal).toHaveBeenCalledWith({}, 7, validPayload.deal);
    expect(cb).toHaveBeenCalledWith({ success: true, data: null });
    expect(broadcastResultsChanged).toHaveBeenCalledWith(io, "g1", 7);
  });

  it("rejects a non-director", async () => {
    vi.mocked(assertDirector).mockReturnValue(false);
    const socket = createMockSocket();
    registerDealOverrideHandler(socket, {} as never);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(validPayload, cb);

    expect(upsertDeal).not.toHaveBeenCalled();
    expect(broadcastResultsChanged).not.toHaveBeenCalled();
  });

  it("rejects an incomplete deal", async () => {
    const socket = createMockSocket();
    registerDealOverrideHandler(socket, {} as never);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    const broken = { ...validPayload, deal: { ...validDeal(), N: validDeal().N.slice(0, 12) } };
    await handler(broken, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "That is not a complete deal",
    });
    expect(upsertDeal).not.toHaveBeenCalled();
  });

  it("acks a failure when the game db is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const socket = createMockSocket();
    registerDealOverrideHandler(socket, {} as never);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(validPayload, cb);

    expect(cb).toHaveBeenCalledWith({ success: false, error: "Game not found" });
    expect(broadcastResultsChanged).not.toHaveBeenCalled();
  });
});
