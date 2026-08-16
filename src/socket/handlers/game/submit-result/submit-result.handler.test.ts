import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

const mockUpdate = vi.fn(() => ({
  set: vi.fn(() => ({
    where: vi.fn(),
  })),
}));

vi.mock("@/db/games/pairs", () => ({
  getDb: vi.fn(async () => ({
    update: mockUpdate,
  })),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
}));

import { registerSubmitResultHandler } from "./submit-result.handler";

function makeSocket() {
  return { data: {}, id: "test", on: vi.fn() } as any;
}

function makeIo() {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit } as any;
}

describe("registerSubmitResultHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers handler on SUBMIT_RESULT event", () => {
    const socket = makeSocket();
    registerSubmitResultHandler(socket, makeIo());
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.SUBMIT_RESULT,
      expect.any(Function),
    );
  });

  it("stores NS pending submission and returns success", async () => {
    const socket = makeSocket();
    const io = makeIo();
    registerSubmitResultHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(
      {
        gameId: "g1",
        gameType: "PAIRS",
        seat: "1NS",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        result: "3NTN=",
      },
      cb,
    );

    expect(cb).toHaveBeenCalledWith({ success: true });
    // No emit since only one side submitted
    expect(io._emit).not.toHaveBeenCalled();
  });

  it("stores EW pending submission and returns success", async () => {
    const socket = makeSocket();
    const io = makeIo();
    registerSubmitResultHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(
      {
        gameId: "g2",
        gameType: "PAIRS",
        seat: "1EW",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        result: "3NTN=",
      },
      cb,
    );

    expect(cb).toHaveBeenCalledWith({ success: true });
  });

  it("confirms result when both NS and EW agree", async () => {
    const socket = makeSocket();
    const io = makeIo();
    registerSubmitResultHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    // NS submits
    await handler(
      {
        gameId: "g3",
        gameType: "PAIRS",
        seat: "1NS",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        result: "4HS+1",
      },
      cb1,
    );

    // EW submits same result
    await handler(
      {
        gameId: "g3",
        gameType: "PAIRS",
        seat: "1EW",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        result: "4HS+1",
      },
      cb2,
    );

    expect(cb1).toHaveBeenCalledWith({ success: true });
    expect(cb2).toHaveBeenCalledWith({ success: true });

    // Should emit BOARD_CONFIRMED and BOARD_RESULT_UPDATED
    expect(io._emit).toHaveBeenCalledWith(
      SocketEvents.BOARD_CONFIRMED,
      expect.objectContaining({
        gameId: "g3",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        result: "4HS+1",
      }),
    );
    expect(io._emit).toHaveBeenCalledWith(
      SocketEvents.BOARD_RESULT_UPDATED,
      expect.objectContaining({
        gameId: "g3",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
      }),
    );
  });

  it("emits BOARD_MISMATCH when results disagree", async () => {
    const socket = makeSocket();
    const io = makeIo();
    registerSubmitResultHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];

    // NS submits one result
    await handler(
      {
        gameId: "g4",
        gameType: "PAIRS",
        seat: "1NS",
        roundNumber: 2,
        tableNumber: 1,
        boardNumber: 3,
        result: "3NTN=",
      },
      vi.fn(),
    );

    // EW submits a different result
    await handler(
      {
        gameId: "g4",
        gameType: "PAIRS",
        seat: "1EW",
        roundNumber: 2,
        tableNumber: 1,
        boardNumber: 3,
        result: "3NTN-1",
      },
      vi.fn(),
    );

    expect(io._emit).toHaveBeenCalledWith(
      SocketEvents.BOARD_MISMATCH,
      expect.objectContaining({
        gameId: "g4",
        roundNumber: 2,
        tableNumber: 1,
        nsResult: "3NTN=",
        ewResult: "3NTN-1",
      }),
    );
  });

  it("emits BOARD_MISMATCH when board numbers disagree", async () => {
    const socket = makeSocket();
    const io = makeIo();
    registerSubmitResultHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];

    // NS submits for board 1
    await handler(
      {
        gameId: "g5",
        gameType: "PAIRS",
        seat: "2NS",
        roundNumber: 1,
        tableNumber: 2,
        boardNumber: 1,
        result: "2SN+1",
      },
      vi.fn(),
    );

    // EW submits for board 2 (different board number)
    await handler(
      {
        gameId: "g5",
        gameType: "PAIRS",
        seat: "2EW",
        roundNumber: 1,
        tableNumber: 2,
        boardNumber: 2,
        result: "2SN+1",
      },
      vi.fn(),
    );

    expect(io._emit).toHaveBeenCalledWith(
      SocketEvents.BOARD_MISMATCH,
      expect.objectContaining({
        gameId: "g5",
        nsBoardNumber: 1,
        ewBoardNumber: 2,
      }),
    );
  });

  it("returns error on internal failure", async () => {
    // Make getDb throw
    const { getDb } = await import("@/db/games");
    vi.mocked(getDb).mockRejectedValueOnce(new Error("DB fail"));

    const socket = makeSocket();
    const io = makeIo();
    registerSubmitResultHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    // First submit NS to populate pending
    await handler(
      {
        gameId: "g6",
        gameType: "PAIRS",
        seat: "1NS",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        result: "1NTN=",
      },
      vi.fn(),
    );

    // Second submit to trigger the DB write path which will throw
    await handler(
      {
        gameId: "g6",
        gameType: "PAIRS",
        seat: "1EW",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        result: "1NTN=",
      },
      cb,
    );

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Failed to submit result",
    });
  });
});
