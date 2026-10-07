import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockUseSWR = vi.fn();
const mockMutate = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
  mutate: (...args: unknown[]) => mockMutate(...args),
}));

const socketOn = vi.fn();
const socketOff = vi.fn();
const socketEmit = vi.fn();
const mockEmitWithAck = vi.fn();
vi.mock("../lib/socket", () => ({
  getSocket: () => ({ on: socketOn, off: socketOff, emit: socketEmit }),
  emitWithAck: (...args: unknown[]) => mockEmitWithAck(...args),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

const mockGetPlayerToken = vi.fn();
vi.mock("@/lib/player-token", () => ({
  getPlayerToken: (...args: unknown[]) => mockGetPlayerToken(...args),
}));

import { usePlayFlow } from "./play-flow";
import { SocketEvents } from "../socket/socket-events";
import type {
  ResolvedPlayStateResponse,
  ResolvedWithinRound,
} from "./play-state-machine";

/** A materialized round, defaulting to table 1 and NOT_PLAYED boards. */
function round(
  roundNumber: number,
  boards: number[],
  opts: { sitOut?: boolean; confirmed?: boolean } = {},
) {
  return {
    roundNumber,
    tableNumber: 1,
    boards,
    boardStatuses: boards.map((b) => ({
      boardNumber: b,
      status: opts.confirmed ? "CONFIRMED" : "NOT_PLAYED",
    })),
    players: { N: null, S: null, E: null, W: null },
    sitOut: opts.sitOut,
  };
}

/** A `round` phase at `roundIndex`, entering `boardNumber` (the common case). */
function enteringPhase(
  roundIndex: number,
  boardNumber: number,
): ResolvedPlayStateResponse["phase"] {
  const position: ResolvedWithinRound = { at: "entering", boardNumber };
  return { kind: "round", roundIndex, position };
}

/**
 * Set the resolved play state the SWR fetch returns. The hook derives the
 * INITIAL play state from `phase`; forward progression from there is driven by
 * the reducer + socket events, so most flow tests start on an `entering` round
 * phase and then dispatch.
 */
function withResolved(resolved: unknown) {
  mockUseSWR.mockReturnValue({ data: resolved });
}

/** Convenience: a resolved state on round 0, entering its first board. */
function withEnteringRound(
  rounds: ReturnType<typeof round>[],
  roundIndex = 0,
) {
  const first = rounds[roundIndex].boards[0];
  withResolved({
    assignmentId: "A1",
    side: "NS",
    rounds,
    phase: enteringPhase(roundIndex, first),
  });
}

/** Simulate the play-state fetch failing with a given HTTP status. */
function withResolvedError(status: number) {
  const error = Object.assign(new Error("fetch failed"), { status });
  mockUseSWR.mockReturnValue({ data: undefined, error });
}

describe("usePlayFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlayerToken.mockReturnValue({
      startingPosition: "A1NS",
      token: "tok-1",
    });
  });

  it("is in the loading state until a resolved play state arrives", () => {
    withResolved(undefined);
    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));
    expect(result.current.playState.state).toBe("loading");
    // No data and no error yet: this is the brief initial load, not the
    // "waiting for the game to start" state.
    expect(result.current.waitingToStart).toBe(false);
  });

  it("reports waitingToStart when the play state 404s (game not started)", () => {
    withResolvedError(404);
    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));
    expect(result.current.schedule).toBeNull();
    expect(result.current.waitingToStart).toBe(true);
  });

  it("does not treat a non-404 play-state error as waiting-to-start", () => {
    withResolvedError(500);
    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));
    expect(result.current.waitingToStart).toBe(false);
  });

  it("revalidates the play state when the game is updated (e.g. started)", () => {
    withResolvedError(404);
    renderHook(() => usePlayFlow("g1", "A1NS"));

    const call = socketOn.mock.calls.find(
      (c) => c[0] === SocketEvents.GAME_UPDATED,
    );
    expect(call).toBeTruthy();

    // Firing GAME_UPDATED revalidates the seat's play-state key so a waiting
    // player advances into play without a manual refresh.
    const handler = call![1] as () => void;
    handler();
    expect(mockMutate).toHaveBeenCalledWith("/api/games/g1/play-state/A1NS");
  });

  it("starts on the round the server resolved as current", () => {
    withResolved({
      assignmentId: "A1",
      side: "NS",
      rounds: [round(1, [1, 2], { confirmed: true }), round(2, [3, 4])],
      phase: enteringPhase(1, 3),
    });

    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));
    expect(result.current.playState).toEqual({
      state: "roundInfo",
      roundIndex: 1,
    });
  });

  it("reports gameComplete when the server resolves the event complete", () => {
    withResolved({
      assignmentId: "A1",
      side: "NS",
      rounds: [round(1, [1], { confirmed: true })],
      phase: { kind: "complete" },
    });

    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));
    expect(result.current.playState.state).toBe("gameComplete");
  });

  it("shows the between-rounds wait when the server resolves awaitingNextRound", () => {
    withResolved({
      assignmentId: "A1",
      side: "NS",
      rounds: [round(1, [1], { confirmed: true })],
      phase: { kind: "awaitingNextRound", completedRound: 1 },
    });

    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));
    expect(result.current.playState).toEqual({
      state: "awaitingNextRound",
      completedRound: 1,
    });
  });

  it("resumes directly on waiting when the server resolved a pending submission", () => {
    const position: ResolvedWithinRound = {
      at: "waitingConfirmation",
      boardNumber: 2,
    };
    withResolved({
      assignmentId: "A1",
      side: "NS",
      rounds: [round(1, [1, 2])],
      phase: { kind: "round", roundIndex: 0, position },
    });

    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));
    expect(result.current.playState).toEqual({
      state: "waiting",
      roundIndex: 0,
      boardIndex: 1,
    });
  });

  it("resumes directly on a mismatch when the server resolved one", () => {
    const position: ResolvedWithinRound = {
      at: "mismatch",
      boardNumber: 1,
      nsBoardNumber: 1,
      nsResult: "3NTN=",
      ewBoardNumber: 1,
      ewResult: "3NTN+1",
    };
    withResolved({
      assignmentId: "A1",
      side: "NS",
      rounds: [round(1, [1])],
      phase: { kind: "round", roundIndex: 0, position },
    });

    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));
    expect(result.current.playState).toEqual({
      state: "mismatch",
      roundIndex: 0,
      boardIndex: 0,
      nsBoardNumber: 1,
      nsResult: "3NTN=",
      ewBoardNumber: 1,
      ewResult: "3NTN+1",
    });
  });

  it("enters a round then submits a result, emitting SUBMIT_RESULT", () => {
    withEnteringRound([round(1, [1, 2])]);

    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

    act(() => result.current.handleEnterRound());
    expect(result.current.playState).toEqual({
      state: "enterContract",
      roundIndex: 0,
      boardIndex: 0,
    });

    act(() => result.current.submitResult(1, "3NTN="));

    // Transitions to waiting and emits the submission for board 1, carrying
    // the seat's player token read from the token store.
    expect(result.current.playState.state).toBe("waiting");
    expect(mockGetPlayerToken).toHaveBeenCalledWith("g1");
    expect(socketEmit).toHaveBeenCalledWith(
      SocketEvents.SUBMIT_RESULT,
      expect.objectContaining({
        gameId: "g1",
        seat: "A1NS",
        token: "tok-1",
        roundNumber: 1,
        boardNumber: 1,
        result: "3NTN=",
      }),
    );
  });

  it("emits an empty token when no player token is stored", () => {
    mockGetPlayerToken.mockReturnValue(null);
    withEnteringRound([round(1, [1, 2])]);

    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

    act(() => result.current.handleEnterRound());
    act(() => result.current.submitResult(1, "3NTN="));

    expect(socketEmit).toHaveBeenCalledWith(
      SocketEvents.SUBMIT_RESULT,
      expect.objectContaining({ token: "" }),
    );
  });

  it("submits the board chosen in the wizard, not the positional first board", () => {
    withEnteringRound([round(1, [1, 2])]);

    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

    act(() => result.current.handleEnterRound());
    // Player picks the second board of the round in the wizard.
    act(() => result.current.submitResult(2, "4SE="));

    // waiting state tracks board 2 (index 1), and the emit carries board 2.
    expect(result.current.playState).toEqual({
      state: "waiting",
      roundIndex: 0,
      boardIndex: 1,
    });
    expect(socketEmit).toHaveBeenCalledWith(
      SocketEvents.SUBMIT_RESULT,
      expect.objectContaining({ boardNumber: 2, result: "4SE=" }),
    );
  });

  it("registers and cleans up board socket listeners", () => {
    withEnteringRound([round(1, [1])]);

    const { unmount } = renderHook(() => usePlayFlow("g1", "A1NS"));
    expect(socketOn).toHaveBeenCalledWith(
      SocketEvents.BOARD_CONFIRMED,
      expect.any(Function),
    );
    expect(socketOn).toHaveBeenCalledWith(
      SocketEvents.BOARD_MISMATCH,
      expect.any(Function),
    );

    unmount();
    expect(socketOff).toHaveBeenCalledWith(
      SocketEvents.BOARD_CONFIRMED,
      expect.any(Function),
    );
  });

  // --- Helpers for driving the socket-handler + state-machine paths. ---

  type Handler = (payload: unknown) => void;

  function getHandler(event: string): Handler {
    const call = socketOn.mock.calls.find((c) => c[0] === event);
    if (!call) throw new Error(`no handler registered for ${event}`);
    return call[1] as Handler;
  }

  const onConfirmedHandler = () => getHandler(SocketEvents.BOARD_CONFIRMED);
  const onMismatchHandler = () => getHandler(SocketEvents.BOARD_MISMATCH);

  describe("BOARD_CONFIRMED socket handler", () => {
    it("transitions a matching waiting board to boardResults", () => {
      withEnteringRound([round(1, [1, 2])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleEnterRound());
      act(() => result.current.submitResult(1, "3NTN="));
      expect(result.current.playState.state).toBe("waiting");

      const onConfirmed = onConfirmedHandler();
      act(() =>
        onConfirmed({ roundNumber: 1, tableNumber: 1, boardNumber: 1 }),
      );

      expect(result.current.playState).toEqual({
        state: "boardResults",
        roundIndex: 0,
        boardIndex: 0,
      });
    });

    it("ignores a confirmation while not waiting/mismatch", () => {
      withEnteringRound([round(1, [1, 2])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      // Still in roundInfo, not waiting.
      expect(result.current.playState.state).toBe("roundInfo");
      const onConfirmed = onConfirmedHandler();
      act(() =>
        onConfirmed({ roundNumber: 1, tableNumber: 1, boardNumber: 1 }),
      );
      expect(result.current.playState.state).toBe("roundInfo");
    });

    it("ignores a confirmation for a different round/table", () => {
      withEnteringRound([round(1, [1, 2])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleEnterRound());
      act(() => result.current.submitResult(1, "3NTN="));

      const onConfirmed = onConfirmedHandler();
      // Wrong round number.
      act(() =>
        onConfirmed({ roundNumber: 99, tableNumber: 1, boardNumber: 1 }),
      );
      expect(result.current.playState.state).toBe("waiting");
    });

    it("ignores a confirmation for a different board", () => {
      withEnteringRound([round(1, [1, 2])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleEnterRound());
      act(() => result.current.submitResult(1, "3NTN="));

      const onConfirmed = onConfirmedHandler();
      // Right round/table, wrong board.
      act(() =>
        onConfirmed({ roundNumber: 1, tableNumber: 1, boardNumber: 2 }),
      );
      expect(result.current.playState.state).toBe("waiting");
    });

    it("no-ops when the schedule ref is null", () => {
      // A resolved object without rounds => hook keeps scheduleRef null.
      withResolved({ assignmentId: "A1", side: "NS", phase: { kind: "complete" } });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      expect(result.current.schedule).toBeNull();
      const onConfirmed = onConfirmedHandler();
      act(() =>
        onConfirmed({ roundNumber: 1, tableNumber: 1, boardNumber: 1 }),
      );
      // schedule ref null; nothing to transition.
      expect(result.current.playState.state).toBe("gameComplete");
    });
  });

  describe("BOARD_MISMATCH socket handler", () => {
    it("transitions a matching waiting board to mismatch", () => {
      withEnteringRound([round(1, [1, 2])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleEnterRound());
      act(() => result.current.submitResult(1, "3NTN="));

      const onMismatch = onMismatchHandler();
      act(() =>
        onMismatch({
          roundNumber: 1,
          tableNumber: 1,
          nsBoardNumber: 1,
          nsResult: "3NTN=",
          ewBoardNumber: 1,
          ewResult: "3NTN+1",
        }),
      );

      expect(result.current.playState).toEqual({
        state: "mismatch",
        roundIndex: 0,
        boardIndex: 0,
        nsBoardNumber: 1,
        nsResult: "3NTN=",
        ewBoardNumber: 1,
        ewResult: "3NTN+1",
      });
    });

    it("ignores a mismatch while not waiting", () => {
      withEnteringRound([round(1, [1, 2])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      const onMismatch = onMismatchHandler();
      act(() =>
        onMismatch({
          roundNumber: 1,
          tableNumber: 1,
          nsBoardNumber: 1,
          nsResult: "x",
          ewBoardNumber: 1,
          ewResult: "y",
        }),
      );
      expect(result.current.playState.state).toBe("roundInfo");
    });

    it("ignores a mismatch for a different round/table", () => {
      withEnteringRound([round(1, [1, 2])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleEnterRound());
      act(() => result.current.submitResult(1, "3NTN="));

      const onMismatch = onMismatchHandler();
      act(() =>
        onMismatch({
          roundNumber: 99,
          tableNumber: 1,
          nsBoardNumber: 1,
          nsResult: "x",
          ewBoardNumber: 1,
          ewResult: "y",
        }),
      );
      expect(result.current.playState.state).toBe("waiting");
    });

    it("no-ops when the schedule ref is null", () => {
      withResolved({ assignmentId: "A1", side: "NS", phase: { kind: "complete" } });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      const onMismatch = onMismatchHandler();
      act(() =>
        onMismatch({
          roundNumber: 1,
          tableNumber: 1,
          nsBoardNumber: 1,
          nsResult: "x",
          ewBoardNumber: 1,
          ewResult: "y",
        }),
      );
      expect(result.current.playState.state).toBe("gameComplete");
    });
  });

  describe("handleReenter", () => {
    it("moves from mismatch back to enterContract", () => {
      withEnteringRound([round(1, [1, 2])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleEnterRound());
      act(() => result.current.submitResult(1, "3NTN="));
      act(() =>
        onMismatchHandler()({
          roundNumber: 1,
          tableNumber: 1,
          nsBoardNumber: 1,
          nsResult: "a",
          ewBoardNumber: 1,
          ewResult: "b",
        }),
      );
      expect(result.current.playState.state).toBe("mismatch");

      act(() => result.current.handleReenter());
      expect(result.current.playState).toEqual({
        state: "enterContract",
        roundIndex: 0,
        boardIndex: 0,
      });
    });

    it("is a no-op outside the mismatch state", () => {
      withEnteringRound([round(1, [1, 2])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleReenter());
      expect(result.current.playState.state).toBe("roundInfo");
    });
  });

  // Drive a single board of round 0 all the way to boardResults.
  function toBoardResults(
    result: {
      current: ReturnType<typeof usePlayFlow>;
    },
    boardNumber: number,
  ) {
    act(() => result.current.handleEnterRound());
    act(() => result.current.submitResult(boardNumber, "3NTN="));
    act(() =>
      onConfirmedHandler()({
        roundNumber: 1,
        tableNumber: 1,
        boardNumber,
      }),
    );
  }

  describe("handleBoardResultsNext", () => {
    it("advances to the next board in the same round", () => {
      withEnteringRound([round(1, [1, 2])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      toBoardResults(result, 1);
      expect(result.current.playState.state).toBe("boardResults");

      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState).toEqual({
        state: "enterContract",
        roundIndex: 0,
        boardIndex: 1,
      });
    });

    it("offers the deal-entry step when the round completes and hand entry is on", () => {
      withEnteringRound([round(1, [1]), round(2, [2])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS", true));

      toBoardResults(result, 1);
      // With hand entry on, finishing a round's last board offers the optional
      // deal-entry step before advancing.
      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState).toEqual({
        state: "enterDeals",
        roundIndex: 0,
        nextRoundIndex: 1,
      });
      act(() => result.current.handleDealsContinue());
      expect(result.current.playState).toEqual({
        state: "moveInfo",
        nextRoundIndex: 1,
      });
    });

    it("skips the deal-entry step and shows move info when hand entry is off", () => {
      withEnteringRound([round(1, [1]), round(2, [2])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      toBoardResults(result, 1);
      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState).toEqual({
        state: "moveInfo",
        nextRoundIndex: 1,
      });
    });

    it("completes the game after the last board of the last round with hand entry on", () => {
      withEnteringRound([round(1, [1])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS", true));

      toBoardResults(result, 1);
      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState.state).toBe("enterDeals");
      act(() => result.current.handleDealsContinue());
      expect(result.current.playState.state).toBe("gameComplete");
    });

    it("completes the game after the last board of the last round with hand entry off", () => {
      withEnteringRound([round(1, [1])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      toBoardResults(result, 1);
      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState.state).toBe("gameComplete");
    });

    it("is a no-op outside the boardResults state", () => {
      withEnteringRound([round(1, [1])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState.state).toBe("roundInfo");
    });

    it("no-ops when the schedule ref is null", () => {
      withResolved({ assignmentId: "A1", side: "NS", phase: { kind: "complete" } });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState.state).toBe("gameComplete");
    });
  });

  describe("handleMoveInfoContinue", () => {
    it("moves from moveInfo to the next roundInfo", () => {
      withEnteringRound([round(1, [1]), round(2, [2])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS", true));

      toBoardResults(result, 1);
      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState.state).toBe("enterDeals");
      act(() => result.current.handleDealsContinue());
      expect(result.current.playState.state).toBe("moveInfo");

      act(() => result.current.handleMoveInfoContinue());
      expect(result.current.playState).toEqual({
        state: "roundInfo",
        roundIndex: 1,
      });
    });

    it("is a no-op outside the moveInfo state", () => {
      withEnteringRound([round(1, [1])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleMoveInfoContinue());
      expect(result.current.playState.state).toBe("roundInfo");
    });
  });

  describe("handleSitOutContinue", () => {
    it("moves to move info when more rounds remain", () => {
      // The server resolves the current round as a sit-out the player is
      // resting on; Continue advances past it.
      withResolved({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [], { sitOut: true }), round(2, [2])],
        phase: { kind: "sitOut", roundIndex: 0 },
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      expect(result.current.playState).toEqual({
        state: "roundInfo",
        roundIndex: 0,
      });
      act(() => result.current.handleSitOutContinue());
      expect(result.current.playState).toEqual({
        state: "moveInfo",
        nextRoundIndex: 1,
      });
    });

    it("completes the game when on the last round", () => {
      withResolved({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [], { sitOut: true })],
        phase: { kind: "sitOut", roundIndex: 0 },
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleSitOutContinue());
      expect(result.current.playState.state).toBe("gameComplete");
    });

    it("is a no-op outside the roundInfo state", () => {
      withEnteringRound([round(1, [1])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      // Enter the round so we're in enterContract, not roundInfo.
      act(() => result.current.handleEnterRound());
      act(() => result.current.handleSitOutContinue());
      expect(result.current.playState.state).toBe("enterContract");
    });

    it("no-ops when the schedule ref is null", () => {
      withResolved({ assignmentId: "A1", side: "NS", phase: { kind: "complete" } });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleSitOutContinue());
      expect(result.current.playState.state).toBe("gameComplete");
    });
  });

  describe("submitResult guards", () => {
    it("is a no-op when not in enterContract", () => {
      withEnteringRound([round(1, [1])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      // Still in roundInfo.
      act(() => result.current.submitResult(1, "3NTN="));
      expect(result.current.playState.state).toBe("roundInfo");
      expect(socketEmit).not.toHaveBeenCalled();
    });

    it("is a no-op when the board is not part of the round", () => {
      withEnteringRound([round(1, [1, 2])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleEnterRound());
      // Board 99 is not in the round.
      act(() => result.current.submitResult(99, "3NTN="));
      expect(result.current.playState.state).toBe("enterContract");
      expect(socketEmit).not.toHaveBeenCalled();
    });

    it("no-ops when the schedule ref is null", () => {
      withResolved({ assignmentId: "A1", side: "NS", phase: { kind: "complete" } });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.submitResult(1, "3NTN="));
      expect(socketEmit).not.toHaveBeenCalled();
    });
  });

  describe("resolved sit-out handling", () => {
    it("rests on a sit-out round the server resolved as current", () => {
      withResolved({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [], { sitOut: true }), round(2, [3, 4])],
        phase: { kind: "sitOut", roundIndex: 0 },
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      // The router renders the sit-out page off round.sitOut; the flow sits on
      // the round entry for that index.
      expect(result.current.playState).toEqual({
        state: "roundInfo",
        roundIndex: 0,
      });
    });
  });

  describe("handleEnterRound guard", () => {
    it("is a no-op outside the roundInfo state", () => {
      withEnteringRound([round(1, [1])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      // First enter moves roundInfo -> enterContract.
      act(() => result.current.handleEnterRound());
      expect(result.current.playState.state).toBe("enterContract");

      // Second enter, now not in roundInfo, is ignored.
      act(() => result.current.handleEnterRound());
      expect(result.current.playState.state).toBe("enterContract");
    });
  });

  describe("re-initialisation guard on background revalidation", () => {
    it("does not reset play state when a fresh resolved object arrives for the same key", () => {
      const resolved = {
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2])],
        phase: enteringPhase(0, 1),
      };
      withResolved(resolved);
      const { result, rerender } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleEnterRound());
      expect(result.current.playState.state).toBe("enterContract");

      // A background revalidation returns a new (but equivalent) object.
      withResolved({ ...resolved, rounds: [round(1, [1, 2])] });
      rerender();

      // State is preserved, not reset to roundInfo.
      expect(result.current.playState.state).toBe("enterContract");
    });

    it("does not fall back to loading when a revalidation transiently drops the data", () => {
      withEnteringRound([round(1, [1, 2])]);
      const { result, rerender } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleEnterRound());
      expect(result.current.playState.state).toBe("enterContract");

      // SWR transiently returns no data (still the same key).
      withResolved(undefined);
      rerender();

      // Already initialised for this key, so we keep the current state
      // rather than resetting to loading.
      expect(result.current.playState.state).toBe("enterContract");
    });
  });

  describe("auto-advance from the between-rounds wait (Stage 4)", () => {
    it("advances a waiting player when a fresh resolved draws the next round", () => {
      withResolved({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1], { confirmed: true })],
        phase: { kind: "awaitingNextRound", completedRound: 1 },
      });
      const { result, rerender } = renderHook(() => usePlayFlow("g1", "A1NS"));

      expect(result.current.playState).toEqual({
        state: "awaitingNextRound",
        completedRound: 1,
      });

      // The director draws round 2: a fresh resolved arrives (same key) with a
      // playable round now current.
      withResolved({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1], { confirmed: true }), round(2, [2])],
        phase: enteringPhase(1, 2),
      });
      rerender();

      expect(result.current.playState).toEqual({
        state: "roundInfo",
        roundIndex: 1,
      });
    });

    it("does not clobber an active round when a fresh resolved arrives", () => {
      withEnteringRound([round(1, [1, 2])]);
      const { result, rerender } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleEnterRound());
      act(() => result.current.submitResult(1, "3NTN="));
      expect(result.current.playState.state).toBe("waiting");

      // A background revalidation hands back a resolved object that would, if
      // applied, move the player — but they are mid-round, so it must be
      // ignored.
      withResolved({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2]), round(2, [3])],
        phase: enteringPhase(1, 3),
      });
      rerender();

      // Still waiting on their own board; local progress preserved.
      expect(result.current.playState).toEqual({
        state: "waiting",
        roundIndex: 0,
        boardIndex: 0,
      });
    });
  });

  // Reaching the defensive `!round` guards requires the schedule to shrink out
  // from under a play state that already references a now-missing round index.
  // A 0-round resolved object stays non-null (rounds is a truthy empty array),
  // so the ref updates but the play state is preserved by the init guard.
  describe("defensive missing-round guards after the schedule shrinks", () => {
    function emptyRoundsResolved() {
      return {
        assignmentId: "A1",
        side: "NS",
        rounds: [] as unknown[],
        phase: { kind: "complete" as const },
      };
    }

    it("BOARD_CONFIRMED no-ops when the referenced round has vanished", () => {
      withEnteringRound([round(1, [1])]);
      const { result, rerender } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleEnterRound());
      act(() => result.current.submitResult(1, "3NTN="));
      expect(result.current.playState.state).toBe("waiting");

      withResolved(emptyRoundsResolved());
      rerender();

      act(() =>
        onConfirmedHandler()({
          roundNumber: 1,
          tableNumber: 1,
          boardNumber: 1,
        }),
      );
      expect(result.current.playState.state).toBe("waiting");
    });

    it("BOARD_MISMATCH no-ops when the referenced round has vanished", () => {
      withEnteringRound([round(1, [1])]);
      const { result, rerender } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleEnterRound());
      act(() => result.current.submitResult(1, "3NTN="));

      withResolved(emptyRoundsResolved());
      rerender();

      act(() =>
        onMismatchHandler()({
          roundNumber: 1,
          tableNumber: 1,
          nsBoardNumber: 1,
          nsResult: "a",
          ewBoardNumber: 1,
          ewResult: "b",
        }),
      );
      expect(result.current.playState.state).toBe("waiting");
    });

    it("submitResult no-ops when the referenced round has vanished", () => {
      withEnteringRound([round(1, [1])]);
      const { result, rerender } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleEnterRound());
      expect(result.current.playState.state).toBe("enterContract");

      withResolved(emptyRoundsResolved());
      rerender();

      act(() => result.current.submitResult(1, "3NTN="));
      // Still enterContract; no emit, since the round is gone.
      expect(result.current.playState.state).toBe("enterContract");
      expect(socketEmit).not.toHaveBeenCalled();
    });

    it("handleBoardResultsNext no-ops when the referenced round has vanished", () => {
      withEnteringRound([round(1, [1])]);
      const { result, rerender } = renderHook(() => usePlayFlow("g1", "A1NS"));

      toBoardResults(result, 1);
      expect(result.current.playState.state).toBe("boardResults");

      withResolved(emptyRoundsResolved());
      rerender();

      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState.state).toBe("boardResults");
    });
  });

  describe("play-state SWR retry policy", () => {
    // The hook configures SWR to retry on error EXCEPT on a 404 (the expected
    // "seated, waiting for the game to start" state). We drive the option
    // predicate directly since SWR itself is mocked.
    function shouldRetryOnError() {
      withResolvedError(404);
      renderHook(() => usePlayFlow("g1", "A1NS"));
      const opts = mockUseSWR.mock.calls.at(-1)?.[2] as {
        shouldRetryOnError: (e: Error & { status?: number }) => boolean;
      };
      return opts.shouldRetryOnError;
    }

    it("does not retry on a 404", () => {
      const predicate = shouldRetryOnError();
      const err = Object.assign(new Error("not found"), { status: 404 });
      expect(predicate(err)).toBe(false);
    });

    it("retries on any other error status", () => {
      const predicate = shouldRetryOnError();
      const err = Object.assign(new Error("server error"), { status: 500 });
      expect(predicate(err)).toBe(true);
    });
  });

  describe("submitDeal", () => {
    it("emits DEAL_SUBMIT with the seat token and resolves the ack", async () => {
      mockEmitWithAck.mockResolvedValue({ stored: true });
      withEnteringRound([round(1, [1])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      const deal = { N: "SAKQ", E: "", S: "", W: "" } as unknown as never;
      let ack: { stored: boolean } | undefined;
      await act(async () => {
        ack = await result.current.submitDeal(1, deal);
      });

      expect(ack).toEqual({ stored: true });
      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.DEAL_SUBMIT,
        expect.objectContaining({
          gameId: "g1",
          seat: "A1NS",
          token: "tok-1",
          boardNumber: 1,
          deal,
        }),
      );
    });

    it("sends an empty token when none is stored", async () => {
      mockGetPlayerToken.mockReturnValue(null);
      mockEmitWithAck.mockResolvedValue({ stored: false });
      withEnteringRound([round(1, [1])]);
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      await act(async () => {
        await result.current.submitDeal(2, {} as unknown as never);
      });

      expect(mockEmitWithAck).toHaveBeenCalledWith(
        SocketEvents.DEAL_SUBMIT,
        expect.objectContaining({ token: "", boardNumber: 2 }),
      );
    });
  });
});
