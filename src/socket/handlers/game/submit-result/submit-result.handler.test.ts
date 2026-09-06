import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

const mockUpdate = vi.fn(() => ({
  set: vi.fn(() => ({
    where: vi.fn(),
  })),
}));

// The SIT_OUT guard reads the target board's status; default to a playable
// (non-SIT_OUT) board so normal submissions proceed.
const mockSelect = vi.fn(() => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({
      get: vi.fn(async () => ({ status: "NOT_PLAYED" })),
    })),
  })),
}));

vi.mock("@/db/games", () => ({
  getDb: vi.fn(async () => ({
    update: mockUpdate,
    select: mockSelect,
  })),
}));

vi.mock("@/db/games/tables/boards", () => ({
  boards: {
    section: "section",
    roundNumber: "roundNumber",
    tableNumber: "tableNumber",
    boardNumber: "boardNumber",
    status: "status",
  },
}));

vi.mock("@/socket/handlers/results/broadcast-results", () => ({
  broadcastResultsChanged: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db/games/actions/create-submission", () => ({
  createBoardSubmission: vi.fn(),
}));

vi.mock("@/db/games/queries/find-submissions", () => ({
  findBoardSubmissions: vi.fn(),
}));

vi.mock("@/db/games/actions/delete-submissions", () => ({
  deleteBoardSubmissions: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
}));

vi.mock("@/socket/middleware/participant-auth", () => ({
  assertPlayer: vi.fn(),
}));

import { createBoardSubmission } from "@/db/games/actions/create-submission";
import { findBoardSubmissions } from "@/db/games/queries/find-submissions";
import { deleteBoardSubmissions } from "@/db/games/actions/delete-submissions";
import { assertPlayer } from "@/socket/middleware/participant-auth";
import { registerSubmitResultHandler } from "./submit-result.handler";

function makeSocket() {
  return { data: {}, id: "test", on: vi.fn() } as any;
}

function makeIo() {
  const emit = vi.fn();
  return { to: vi.fn(() => ({ emit })), _emit: emit } as any;
}

function submission(
  side: "NS" | "EW",
  boardNumber: number,
  result: string,
): any {
  return { side, boardNumber, result };
}

describe("registerSubmitResultHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: token is valid. assertPlayer resolves true and does not touch cb.
    vi.mocked(assertPlayer).mockResolvedValue(true);
    vi.mocked(createBoardSubmission).mockResolvedValue(undefined as any);
    vi.mocked(deleteBoardSubmissions).mockResolvedValue(undefined as any);
    // Default: only one side has submitted, so no confirm/mismatch yet.
    vi.mocked(findBoardSubmissions).mockResolvedValue([
      submission("NS", 1, "3NTN="),
    ] as any);
  });

  it("registers handler on SUBMIT_RESULT event", () => {
    const socket = makeSocket();
    registerSubmitResultHandler(socket, makeIo());
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.SUBMIT_RESULT,
      expect.any(Function),
    );
  });

  it("rejects a submission against a SIT_OUT board", async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(async () => ({ status: "SIT_OUT" })),
        })),
      })),
    } as any);

    const socket = makeSocket();
    const io = makeIo();
    registerSubmitResultHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(
      {
        gameId: "g1",
        seat: "A1NS",
        token: "tok",
        roundNumber: 2,
        tableNumber: 3,
        boardNumber: 3,
        result: "3NTN=",
      },
      cb,
    );

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "This board is a sit-out",
    });
    expect(createBoardSubmission).not.toHaveBeenCalled();
  });

  it("stores a pending submission and returns success", async () => {
    const socket = makeSocket();
    const io = makeIo();
    registerSubmitResultHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(
      {
        gameId: "g1",
        seat: "A1NS",
        token: "tok",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        result: "3NTN=",
      },
      cb,
    );

    expect(createBoardSubmission).toHaveBeenCalledWith(
      "g1",
      expect.objectContaining({
        section: "A",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        side: "NS",
        result: "3NTN=",
      }),
    );
    expect(cb).toHaveBeenCalledWith({ success: true });
    // Only one side submitted, so no board event.
    expect(io._emit).not.toHaveBeenCalled();
  });

  it("confirms result when both NS and EW agree", async () => {
    vi.mocked(findBoardSubmissions).mockResolvedValue([
      submission("NS", 1, "4HS+1"),
      submission("EW", 1, "4HS+1"),
    ] as any);

    const socket = makeSocket();
    const io = makeIo();
    registerSubmitResultHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(
      {
        gameId: "g3",
        seat: "A1EW",
        token: "tok",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        result: "4HS+1",
      },
      cb,
    );

    expect(cb).toHaveBeenCalledWith({ success: true });
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
    expect(deleteBoardSubmissions).toHaveBeenCalledWith("g3", "A", 1, 1);
  });

  it("emits BOARD_MISMATCH when results disagree", async () => {
    vi.mocked(findBoardSubmissions).mockResolvedValue([
      submission("NS", 3, "3NTN="),
      submission("EW", 3, "3NTN-1"),
    ] as any);

    const socket = makeSocket();
    const io = makeIo();
    registerSubmitResultHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];

    await handler(
      {
        gameId: "g4",
        seat: "A1EW",
        token: "tok",
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
    vi.mocked(findBoardSubmissions).mockResolvedValue([
      submission("NS", 1, "2SN+1"),
      submission("EW", 2, "2SN+1"),
    ] as any);

    const socket = makeSocket();
    const io = makeIo();
    registerSubmitResultHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];

    await handler(
      {
        gameId: "g5",
        seat: "A2EW",
        token: "tok",
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
    vi.mocked(createBoardSubmission).mockRejectedValueOnce(
      new Error("DB fail"),
    );

    const socket = makeSocket();
    const io = makeIo();
    registerSubmitResultHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(
      {
        gameId: "g6",
        seat: "A1NS",
        token: "tok",
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

  it("rejects when assertPlayer fails and stores/broadcasts nothing", async () => {
    // Simulate a wrong/missing token: assertPlayer rejects via the callback.
    vi.mocked(assertPlayer).mockImplementation(
      async (_gameId, _seat, _token, cb?: any) => {
        cb?.({ success: false, error: "Unauthorized" });
        return false;
      },
    );

    const socket = makeSocket();
    const io = makeIo();
    registerSubmitResultHandler(socket, io);

    const handler = socket.on.mock.calls[0][1];
    const cb = vi.fn();

    await handler(
      {
        gameId: "g7",
        seat: "A1NS",
        token: "wrong",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        result: "3NTN=",
      },
      cb,
    );

    expect(assertPlayer).toHaveBeenCalledWith("g7", "A1NS", "wrong", cb);
    expect(cb).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
    // Nothing stored, nothing broadcast.
    expect(createBoardSubmission).not.toHaveBeenCalled();
    expect(io._emit).not.toHaveBeenCalled();
  });
});
