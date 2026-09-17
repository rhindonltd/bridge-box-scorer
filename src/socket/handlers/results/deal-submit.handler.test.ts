import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/actions/set-deal", () => ({
  insertDealIfAbsent: vi.fn(),
}));

vi.mock("@/socket/middleware/participant-auth", () => ({
  assertPlayer: vi.fn(),
}));

vi.mock("./broadcast-results", () => ({
  broadcastResultsChanged: vi.fn().mockResolvedValue(undefined),
}));

import { getDb } from "@/db/games";
import { insertDealIfAbsent } from "@/db/games/actions/set-deal";
import { assertPlayer } from "@/socket/middleware/participant-auth";
import { broadcastResultsChanged } from "./broadcast-results";
import { registerDealSubmitHandler } from "./deal-submit.handler";
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
  seat: "A1NS",
  token: "tok",
  boardNumber: 5,
  deal: validDeal(),
};

describe("registerDealSubmitHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertPlayer).mockResolvedValue(true);
    vi.mocked(getDb).mockResolvedValue({} as any);
  });

  it("registers the handler on DEAL_SUBMIT", () => {
    const socket = createMockSocket();
    registerDealSubmitHandler(socket, {} as never);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.DEAL_SUBMIT,
      expect.any(Function),
    );
  });

  it("stores a first-wins deal and broadcasts", async () => {
    vi.mocked(insertDealIfAbsent).mockResolvedValue({ status: "inserted" });
    const socket = createMockSocket();
    const io = {} as never;
    registerDealSubmitHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(validPayload, cb);

    expect(insertDealIfAbsent).toHaveBeenCalledWith({}, 5, validPayload.deal);
    expect(cb).toHaveBeenCalledWith({ success: true, data: { stored: true } });
    expect(broadcastResultsChanged).toHaveBeenCalledWith(io, "g1", 5);
  });

  it("acks stored:false and does not broadcast when a deal already exists", async () => {
    vi.mocked(insertDealIfAbsent).mockResolvedValue({ status: "exists" });
    const socket = createMockSocket();
    registerDealSubmitHandler(socket, {} as never);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(validPayload, cb);

    expect(cb).toHaveBeenCalledWith({ success: true, data: { stored: false } });
    expect(broadcastResultsChanged).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated player", async () => {
    vi.mocked(assertPlayer).mockResolvedValue(false);
    const socket = createMockSocket();
    registerDealSubmitHandler(socket, {} as never);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler(validPayload, cb);

    expect(insertDealIfAbsent).not.toHaveBeenCalled();
    expect(broadcastResultsChanged).not.toHaveBeenCalled();
  });

  it("rejects an incomplete deal without touching the db", async () => {
    const socket = createMockSocket();
    registerDealSubmitHandler(socket, {} as never);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    const broken = { ...validPayload, deal: { ...validDeal(), N: validDeal().N.slice(0, 12) } };
    await handler(broken, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "That is not a complete deal",
    });
    expect(insertDealIfAbsent).not.toHaveBeenCalled();
  });

  it("rejects an invalid payload shape", async () => {
    const socket = createMockSocket();
    registerDealSubmitHandler(socket, {} as never);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();
    await handler({ gameId: "g1" }, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: expect.any(String),
    });
    expect(assertPlayer).not.toHaveBeenCalled();
  });
});
