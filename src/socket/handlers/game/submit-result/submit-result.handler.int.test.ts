import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Socket } from "socket.io";
import { createSocketTestServer } from "@/socket/test/socket-test-harness";
import { waitForEvent, emitWithAck } from "@/socket/test/socket-helpers";
import { SocketEvents } from "@/socket/socket-events";
import { registerSubmitResultHandler } from "./submit-result.handler";
import { registerJoinGameHandler } from "@/socket/handlers/game/join-game/join-game.handler";
import { broadcastResultsChanged } from "@/socket/handlers/results/broadcast-results";
import { getDb } from "@/db/games";
import { findBoardSubmissions } from "@/db/games/queries/find-submissions";

// Mock the results broadcaster so this test does not pull in the real
// leaderboard/board compute + drizzle chain; assert it's invoked on confirm.
vi.mock("@/socket/handlers/results/broadcast-results", () => ({
  broadcastResultsChanged: vi.fn().mockResolvedValue(undefined),
}));

// Mock DB layer
const mockWhere = vi.fn().mockResolvedValue(undefined);
const mockSet = vi.fn(() => ({
  where: mockWhere,
}));
const mockUpdate = vi.fn(() => ({
  set: mockSet,
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
  getDb: vi.fn(async () => ({ update: mockUpdate, select: mockSelect })),
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

// Stateful in-memory fake for the board-submission persistence layer. The
// handler now stores pending submissions in the DB (create/find/delete) rather
// than tracking them in memory, so these mocks reconstruct that state keyed by
// game/table/round, with a re-submission from the same side overwriting the
// previous one (mirroring the real upsert behaviour).
type FakeSubmission = {
  side: "NS" | "EW";
  boardNumber: number;
  result: string;
};
const submissionStore = new Map<string, FakeSubmission[]>();
const storeKey = (
  gameId: string,
  section: string,
  tableNumber: number,
  roundNumber: number,
) => `${gameId}:${section}:${tableNumber}:${roundNumber}`;

vi.mock("@/db/games/actions/create-submission", () => ({
  createBoardSubmission: vi.fn(async (gameId: string, sub: any) => {
    const key = storeKey(gameId, sub.section, sub.tableNumber, sub.roundNumber);
    const existing = submissionStore.get(key) ?? [];
    const next = existing.filter((s) => s.side !== sub.side);
    next.push({
      side: sub.side,
      boardNumber: sub.boardNumber,
      result: sub.result,
    });
    submissionStore.set(key, next);
  }),
}));

vi.mock("@/db/games/queries/find-submissions", () => ({
  findBoardSubmissions: vi.fn(
    async (
      gameId: string,
      section: string,
      tableNumber: number,
      roundNumber: number,
    ) =>
      submissionStore.get(storeKey(gameId, section, tableNumber, roundNumber)) ??
      [],
  ),
}));

vi.mock("@/db/games/actions/delete-submissions", () => ({
  deleteBoardSubmissions: vi.fn(
    async (
      gameId: string,
      section: string,
      tableNumber: number,
      roundNumber: number,
    ) => {
      submissionStore.delete(
        storeKey(gameId, section, tableNumber, roundNumber),
      );
    },
  ),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  and: vi.fn((...args: any[]) => args),
}));

describe("registerSubmitResultHandler (integration)", () => {
  let closeServer: () => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    submissionStore.clear();
    // Restore the default db (mockResolvedValue overrides in some tests persist
    // across cases since clearAllMocks does not reset implementations).
    vi.mocked(getDb).mockResolvedValue({
      update: mockUpdate,
      select: mockSelect,
    } as any);
    // Restore the stateful default for findBoardSubmissions.
    vi.mocked(findBoardSubmissions).mockImplementation(
      async (
        gameId: string,
        section: string,
        tableNumber: number,
        roundNumber: number,
      ) =>
        submissionStore.get(
          storeKey(gameId, section, tableNumber, roundNumber),
        ) ?? [],
    );
  });

  afterEach(async () => {
    await closeServer?.();
  });

  it("single submission returns success but does not broadcast", async () => {
    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSubmitResultHandler(socket, io);
      });
    });
    closeServer = close;

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "game-1" });

    // Set up listeners for events that should NOT fire
    let confirmed = false;
    let mismatched = false;
    client.on(SocketEvents.BOARD_CONFIRMED, () => {
      confirmed = true;
    });
    client.on(SocketEvents.BOARD_MISMATCH, () => {
      mismatched = true;
    });

    const result = await emitWithAck(client, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-1",
      gameType: "PAIRS",
      seat: "A1NS",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 1,
      result: "3NTN=",
    });

    expect(result).toEqual({ success: true });

    // Wait a tick to confirm no events were emitted
    await new Promise((r) => setTimeout(r, 100));
    expect(confirmed).toBe(false);
    expect(mismatched).toBe(false);
  });

  it("matching submissions from both sides emit BOARD_CONFIRMED", async () => {
    const { client, close, addClient } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSubmitResultHandler(socket, io);
      });
    });
    closeServer = close;

    const client2 = await addClient();

    // Both join the game room
    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "game-1" });
    await emitWithAck(client2, SocketEvents.JOIN_GAME, { gameId: "game-1" });

    // Set up listeners
    const confirmPromise1 = waitForEvent(client, SocketEvents.BOARD_CONFIRMED);
    const confirmPromise2 = waitForEvent(client2, SocketEvents.BOARD_CONFIRMED);

    // NS submits
    await emitWithAck(client, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-1",
      gameType: "PAIRS",
      seat: "A1NS",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 7,
      result: "3NTN=",
    });

    // EW submits same result
    await emitWithAck(client2, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-1",
      gameType: "PAIRS",
      seat: "A1EW",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 7,
      result: "3NTN=",
    });

    const event1 = await confirmPromise1;
    const event2 = await confirmPromise2;

    expect(event1).toMatchObject({
      gameId: "game-1",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 7,
      result: "3NTN=",
    });
    expect(event2).toMatchObject(event1 as Record<string, unknown>);

    client2.disconnect();
  });

  it("mismatching results emit BOARD_MISMATCH", async () => {
    const { client, close, addClient } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSubmitResultHandler(socket, io);
      });
    });
    closeServer = close;

    const client2 = await addClient();

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "game-2" });
    await emitWithAck(client2, SocketEvents.JOIN_GAME, { gameId: "game-2" });

    const mismatchPromise1 = waitForEvent(client, SocketEvents.BOARD_MISMATCH);

    // NS submits one result
    await emitWithAck(client, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-2",
      gameType: "PAIRS",
      seat: "A2NS",
      roundNumber: 1,
      tableNumber: 2,
      boardNumber: 3,
      result: "3NTN=",
    });

    // EW submits different result
    await emitWithAck(client2, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-2",
      gameType: "PAIRS",
      seat: "A2EW",
      roundNumber: 1,
      tableNumber: 2,
      boardNumber: 3,
      result: "3NTN+1",
    });

    const event = await mismatchPromise1;

    expect(event).toMatchObject({
      gameId: "game-2",
      roundNumber: 1,
      tableNumber: 2,
      nsBoardNumber: 3,
      nsResult: "3NTN=",
      ewBoardNumber: 3,
      ewResult: "3NTN+1",
    });

    client2.disconnect();
  });

  it("different board numbers emit BOARD_MISMATCH", async () => {
    const { client, close, addClient } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSubmitResultHandler(socket, io);
      });
    });
    closeServer = close;

    const client2 = await addClient();

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "game-3" });
    await emitWithAck(client2, SocketEvents.JOIN_GAME, { gameId: "game-3" });

    const mismatchPromise = waitForEvent(client, SocketEvents.BOARD_MISMATCH);

    // NS submits board 1
    await emitWithAck(client, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-3",
      gameType: "PAIRS",
      seat: "A1NS",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 1,
      result: "3NTN=",
    });

    // EW submits board 2
    await emitWithAck(client2, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-3",
      gameType: "PAIRS",
      seat: "A1EW",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 2,
      result: "4HE+1",
    });

    const event = await mismatchPromise;

    expect(event).toMatchObject({
      nsBoardNumber: 1,
      nsResult: "3NTN=",
      ewBoardNumber: 2,
      ewResult: "4HE+1",
    });

    client2.disconnect();
  });

  it("after mismatch, re-submission with correct result confirms", async () => {
    const { client, close, addClient } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSubmitResultHandler(socket, io);
      });
    });
    closeServer = close;

    const client2 = await addClient();

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "game-4" });
    await emitWithAck(client2, SocketEvents.JOIN_GAME, { gameId: "game-4" });

    // First attempt: mismatch
    await emitWithAck(client, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-4",
      gameType: "PAIRS",
      seat: "A1NS",
      roundNumber: 2,
      tableNumber: 1,
      boardNumber: 5,
      result: "3NTN=",
    });

    const mismatchPromise = waitForEvent(client, SocketEvents.BOARD_MISMATCH);
    await emitWithAck(client2, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-4",
      gameType: "PAIRS",
      seat: "A1EW",
      roundNumber: 2,
      tableNumber: 1,
      boardNumber: 5,
      result: "3NTN+1",
    });
    await mismatchPromise;

    // EW re-submits with correct result (overwrites their pending)
    const confirmPromise = waitForEvent(client, SocketEvents.BOARD_CONFIRMED);
    await emitWithAck(client2, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-4",
      gameType: "PAIRS",
      seat: "A1EW",
      roundNumber: 2,
      tableNumber: 1,
      boardNumber: 5,
      result: "3NTN=",
    });

    const confirmed = await confirmPromise;
    expect(confirmed).toMatchObject({
      boardNumber: 5,
      result: "3NTN=",
    });

    client2.disconnect();
  });

  it("BOARD_RESULT_UPDATED is also emitted on confirmation", async () => {
    const { client, close, addClient } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSubmitResultHandler(socket, io);
      });
    });
    closeServer = close;

    const client2 = await addClient();

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "game-6" });
    await emitWithAck(client2, SocketEvents.JOIN_GAME, { gameId: "game-6" });

    const updatedPromise = waitForEvent(
      client,
      SocketEvents.BOARD_RESULT_UPDATED,
    );

    await emitWithAck(client, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-6",
      gameType: "PAIRS",
      seat: "A3NS",
      roundNumber: 1,
      tableNumber: 3,
      boardNumber: 9,
      result: "PO",
    });

    await emitWithAck(client2, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-6",
      gameType: "PAIRS",
      seat: "A3EW",
      roundNumber: 1,
      tableNumber: 3,
      boardNumber: 9,
      result: "PO",
    });

    const updated = await updatedPromise;
    expect(updated).toMatchObject({
      gameId: "game-6",
      roundNumber: 1,
      tableNumber: 3,
      boardNumber: 9,
    });

    // The results broadcaster is invoked so live leaderboard/traveller viewers
    // get recomputed snapshots (occupancy-gated inside the broadcaster).
    expect(broadcastResultsChanged).toHaveBeenCalledWith(
      expect.anything(),
      "game-6",
      9,
    );

    client2.disconnect();
  });

  it("DB update is called with confirmedResult on match", async () => {
    const { client, close, addClient } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSubmitResultHandler(socket, io);
      });
    });
    closeServer = close;

    const client2 = await addClient();

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "game-7" });
    await emitWithAck(client2, SocketEvents.JOIN_GAME, { gameId: "game-7" });

    const confirmPromise = waitForEvent(client, SocketEvents.BOARD_CONFIRMED);

    await emitWithAck(client, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-7",
      gameType: "PAIRS",
      seat: "A1NS",
      roundNumber: 3,
      tableNumber: 1,
      boardNumber: 10,
      result: "2SXE-2",
    });

    await emitWithAck(client2, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-7",
      gameType: "PAIRS",
      seat: "A1EW",
      roundNumber: 3,
      tableNumber: 1,
      boardNumber: 10,
      result: "2SXE-2",
    });

    await confirmPromise;

    // Verify DB was called
    expect(mockUpdate).toHaveBeenCalled();

    client2.disconnect();
  });

  it("rejects a submission against a SIT_OUT board", async () => {
    // Override the board status lookup to report a sit-out board.
    vi.mocked(getDb).mockResolvedValue({
      update: mockUpdate,
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            get: vi.fn(async () => ({ status: "SIT_OUT" })),
          })),
        })),
      })),
    } as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSubmitResultHandler(socket, io);
      });
    });
    closeServer = close;

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "game-so" });

    const result = await emitWithAck(client, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-so",
      seat: "A1NS",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 1,
      result: "3NTN=",
    });

    expect(result).toMatchObject({
      success: false,
      error: "This board is a sit-out",
    });
    // No confirmation write happens for a rejected sit-out submission.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("does not confirm when two pending submissions are the same side", async () => {
    // Defensive branch: two rows exist but both are NS (no EW), so the
    // `!ns || !ew` guard returns without confirming.
    vi.mocked(findBoardSubmissions).mockResolvedValue([
      { side: "NS", boardNumber: 3, result: "3NTN=" },
      { side: "NS", boardNumber: 3, result: "3NTN=" },
    ] as any);

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSubmitResultHandler(socket, io);
      });
    });
    closeServer = close;

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "game-ns2" });

    let confirmed = false;
    client.on(SocketEvents.BOARD_CONFIRMED, () => {
      confirmed = true;
    });

    const result = await emitWithAck(client, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-ns2",
      seat: "A1NS",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 3,
      result: "3NTN=",
    });

    expect(result).toEqual({ success: true });
    await new Promise((r) => setTimeout(r, 100));
    expect(confirmed).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws (and reports failure) when db is missing at confirm time", async () => {
    // getDb resolves null: the SIT_OUT lookup is skipped, the submission is
    // stored, and at confirm time the `if (!db) throw` guard fires and is
    // caught, reporting a generic failure.
    vi.mocked(getDb).mockResolvedValue(null as any);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { client, close, addClient } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSubmitResultHandler(socket, io);
      });
    });
    closeServer = close;

    const client2 = await addClient();

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "game-nodb" });
    await emitWithAck(client2, SocketEvents.JOIN_GAME, { gameId: "game-nodb" });

    // First (NS) submission acks success (db null path stores it).
    await emitWithAck(client, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-nodb",
      seat: "A1NS",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 4,
      result: "3NTN=",
    });

    let confirmed = false;
    client.on(SocketEvents.BOARD_CONFIRMED, () => {
      confirmed = true;
    });

    // Matching EW submission reaches the confirm path where `!db` throws.
    // The success ack already fired before confirmation, so the ack is still
    // success; the observable effect is that confirmation never completes and
    // the error is logged.
    const result = await emitWithAck(client2, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-nodb",
      seat: "A1EW",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 4,
      result: "3NTN=",
    });

    expect(result).toEqual({ success: true });
    await new Promise((r) => setTimeout(r, 100));
    expect(confirmed).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(
      "Submit result error:",
      expect.any(Error),
    );

    client2.disconnect();
    errSpy.mockRestore();
  });

  it("reports failure when persisting the submission throws (catch block)", async () => {
    const { createBoardSubmission } = await import(
      "@/db/games/actions/create-submission"
    );
    vi.mocked(createBoardSubmission).mockRejectedValueOnce(
      new Error("db write failed"),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { client, close } = await createSocketTestServer((io) => {
      io.on("connection", (socket: Socket) => {
        registerJoinGameHandler(socket);
        registerSubmitResultHandler(socket, io);
      });
    });
    closeServer = close;

    await emitWithAck(client, SocketEvents.JOIN_GAME, { gameId: "game-err" });

    const result = await emitWithAck(client, SocketEvents.SUBMIT_RESULT, {
      gameId: "game-err",
      seat: "A1NS",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 1,
      result: "3NTN=",
    });

    expect(result).toMatchObject({
      success: false,
      error: "Failed to submit result",
    });
    errSpy.mockRestore();
  });
});
