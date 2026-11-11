import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/actions/set-deal", () => ({
  upsertDeals: vi.fn(),
}));

vi.mock("@/socket/middleware/director-auth", () => ({
  assertDirector: vi.fn(),
}));

vi.mock("./broadcast-results", () => ({
  broadcastResultsChanged: vi.fn().mockResolvedValue(undefined),
}));

import { getDb } from "@/db/games";
import { upsertDeals } from "@/db/games/actions/set-deal";
import { assertDirector } from "@/socket/middleware/director-auth";
import { broadcastResultsChanged } from "./broadcast-results";
import {
  registerDealImportBulkHandler,
  MAX_IMPORT_BOARDS,
} from "./deal-import-bulk.handler";
import { SocketEvents } from "@/socket/socket-events";
import type { Card, Deal, Rank } from "@/model/common";

function createMockSocket() {
  return { on: vi.fn() } as any;
}

function validDeal(): Deal {
  const ranks: Rank[] = [
    "A",
    "K",
    "Q",
    "J",
    "T",
    "9",
    "8",
    "7",
    "6",
    "5",
    "4",
    "3",
    "2",
  ];
  return {
    N: ranks.map((r): Card => `S${r}`),
    E: ranks.map((r): Card => `H${r}`),
    S: ranks.map((r): Card => `D${r}`),
    W: ranks.map((r): Card => `C${r}`),
  };
}

function brokenDeal(): Deal {
  return { ...validDeal(), N: validDeal().N.slice(0, 12) };
}

function payload(deals: { boardNumber: number; deal: Deal }[]) {
  return { gameId: "g1", directorToken: "tok", deals };
}

async function run(
  data: unknown,
  io: unknown = {},
): Promise<ReturnType<typeof vi.fn>> {
  const socket = createMockSocket();
  registerDealImportBulkHandler(socket, io as never);
  const handler = socket.on.mock.calls[0][1];
  const cb = vi.fn();
  await handler(data, cb);
  return cb;
}

describe("registerDealImportBulkHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertDirector).mockReturnValue(true);
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(upsertDeals).mockResolvedValue(undefined);
  });

  it("registers the handler on DEAL_IMPORT_BULK", () => {
    const socket = createMockSocket();
    registerDealImportBulkHandler(socket, {} as never);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.DEAL_IMPORT_BULK,
      expect.any(Function),
    );
  });

  it("saves every deal, acks the count and broadcasts each board", async () => {
    const io = {};
    const deals = [
      { boardNumber: 1, deal: validDeal() },
      { boardNumber: 2, deal: validDeal() },
      { boardNumber: 5, deal: validDeal() },
    ];
    const cb = await run(payload(deals), io);

    expect(upsertDeals).toHaveBeenCalledWith({}, deals);
    expect(cb).toHaveBeenCalledWith({ success: true, data: { saved: 3 } });
    expect(broadcastResultsChanged).toHaveBeenCalledTimes(3);
    expect(broadcastResultsChanged).toHaveBeenCalledWith(io, "g1", 1);
    expect(broadcastResultsChanged).toHaveBeenCalledWith(io, "g1", 2);
    expect(broadcastResultsChanged).toHaveBeenCalledWith(io, "g1", 5);
  });

  it("rejects a non-director without writing", async () => {
    vi.mocked(assertDirector).mockReturnValue(false);
    await run(payload([{ boardNumber: 1, deal: validDeal() }]));

    expect(upsertDeals).not.toHaveBeenCalled();
    expect(broadcastResultsChanged).not.toHaveBeenCalled();
  });

  it("rejects the whole batch when one deal is incomplete", async () => {
    const cb = await run(
      payload([
        { boardNumber: 1, deal: validDeal() },
        { boardNumber: 2, deal: brokenDeal() },
      ]),
    );

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Board 2 is not a complete deal",
    });
    expect(upsertDeals).not.toHaveBeenCalled();
    expect(broadcastResultsChanged).not.toHaveBeenCalled();
  });

  it("rejects a duplicated board number", async () => {
    const cb = await run(
      payload([
        { boardNumber: 3, deal: validDeal() },
        { boardNumber: 3, deal: validDeal() },
      ]),
    );

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Board 3 appears more than once",
    });
    expect(upsertDeals).not.toHaveBeenCalled();
  });

  it("rejects an empty batch and one over the cap", async () => {
    const empty = await run(payload([]));
    expect(empty).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );

    const tooMany = await run(
      payload(
        Array.from({ length: MAX_IMPORT_BOARDS + 1 }, (_, i) => ({
          boardNumber: i + 1,
          deal: validDeal(),
        })),
      ),
    );
    expect(tooMany).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(upsertDeals).not.toHaveBeenCalled();
  });

  it("acks a failure when the game db is missing", async () => {
    vi.mocked(getDb).mockResolvedValue(null);
    const cb = await run(payload([{ boardNumber: 1, deal: validDeal() }]));

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Game not found",
    });
    expect(upsertDeals).not.toHaveBeenCalled();
  });

  it("acks a failure and does not broadcast when the save throws", async () => {
    vi.mocked(upsertDeals).mockRejectedValue(new Error("locked"));
    const cb = await run(payload([{ boardNumber: 1, deal: validDeal() }]));

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Failed to save deals",
    });
    expect(broadcastResultsChanged).not.toHaveBeenCalled();
  });
});
