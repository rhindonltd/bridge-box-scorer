import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

const socketOn = vi.fn();
const socketOff = vi.fn();
const socketEmit = vi.fn();
vi.mock("../lib/socket", () => ({
  getSocket: () => ({ on: socketOn, off: socketOff, emit: socketEmit }),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

const mockGetPlayerToken = vi.fn();
vi.mock("@/lib/player-token", () => ({
  getPlayerToken: (...args: unknown[]) => mockGetPlayerToken(...args),
}));

import { usePlayFlow } from "./play-flow";
import { SocketEvents } from "../socket/socket-events";

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

function withSchedule(schedule: unknown) {
  mockUseSWR.mockReturnValue({ data: schedule });
}

describe("usePlayFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlayerToken.mockReturnValue({
      startingPosition: "A1NS",
      token: "tok-1",
    });
  });

  it("is in the loading state until a schedule arrives", () => {
    withSchedule(undefined);
    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));
    expect(result.current.playState.state).toBe("loading");
  });

  it("starts at the first incomplete round", () => {
    withSchedule({
      assignmentId: "A1",
      side: "NS",
      rounds: [
        round(1, [1, 2], { confirmed: true }),
        round(2, [3, 4]),
      ],
    });

    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));
    expect(result.current.playState).toEqual({
      state: "roundInfo",
      roundIndex: 1,
    });
  });

  it("reports gameComplete when all rounds are confirmed", () => {
    withSchedule({
      assignmentId: "A1",
      side: "NS",
      rounds: [round(1, [1], { confirmed: true })],
    });

    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));
    expect(result.current.playState.state).toBe("gameComplete");
  });

  it("enters a round then submits a result, emitting SUBMIT_RESULT", () => {
    withSchedule({
      assignmentId: "A1",
      side: "NS",
      rounds: [round(1, [1, 2])],
    });

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
    withSchedule({
      assignmentId: "A1",
      side: "NS",
      rounds: [round(1, [1, 2])],
    });

    const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

    act(() => result.current.handleEnterRound());
    act(() => result.current.submitResult(1, "3NTN="));

    expect(socketEmit).toHaveBeenCalledWith(
      SocketEvents.SUBMIT_RESULT,
      expect.objectContaining({ token: "" }),
    );
  });

  it("submits the board chosen in the wizard, not the positional first board", () => {
    withSchedule({
      assignmentId: "A1",
      side: "NS",
      rounds: [round(1, [1, 2])],
    });

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
    withSchedule({ assignmentId: "A1", side: "NS", rounds: [round(1, [1])] });

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
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2])],
      });
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
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2])],
      });
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
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2])],
      });
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
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2])],
      });
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
      // A schedule without rounds => hook keeps scheduleRef null.
      withSchedule({ assignmentId: "A1", side: "NS" });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      expect(result.current.schedule).toBeNull();
      const onConfirmed = onConfirmedHandler();
      act(() =>
        onConfirmed({ roundNumber: 1, tableNumber: 1, boardNumber: 1 }),
      );
      // Nothing to transition; still loading.
      expect(result.current.playState.state).toBe("loading");
    });
  });

  describe("BOARD_MISMATCH socket handler", () => {
    it("transitions a matching waiting board to mismatch", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2])],
      });
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
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2])],
      });
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
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2])],
      });
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
      withSchedule({ assignmentId: "A1", side: "NS" });
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
      expect(result.current.playState.state).toBe("loading");
    });
  });

  describe("handleReenter", () => {
    it("moves from mismatch back to enterContract", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2])],
      });
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
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2])],
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleReenter());
      expect(result.current.playState.state).toBe("roundInfo");
    });
  });

  // Drive a single board of round 0 all the way to boardResults.
  function toBoardResults(result: {
    current: ReturnType<typeof usePlayFlow>;
  }, boardNumber: number) {
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
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2])],
      });
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

    it("shows move info when the round is complete but more rounds remain", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1]), round(2, [2])],
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      toBoardResults(result, 1);
      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState).toEqual({
        state: "moveInfo",
        nextRoundIndex: 1,
      });
    });

    it("completes the game after the last board of the last round", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1])],
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      toBoardResults(result, 1);
      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState.state).toBe("gameComplete");
    });

    it("is a no-op outside the boardResults state", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1])],
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState.state).toBe("roundInfo");
    });

    it("no-ops when the schedule ref is null", () => {
      withSchedule({ assignmentId: "A1", side: "NS" });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState.state).toBe("loading");
    });
  });

  describe("handleMoveInfoContinue", () => {
    it("moves from moveInfo to the next roundInfo", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1]), round(2, [2])],
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      toBoardResults(result, 1);
      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState.state).toBe("moveInfo");

      act(() => result.current.handleMoveInfoContinue());
      expect(result.current.playState).toEqual({
        state: "roundInfo",
        roundIndex: 1,
      });
    });

    it("is a no-op outside the moveInfo state", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1])],
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleMoveInfoContinue());
      expect(result.current.playState.state).toBe("roundInfo");
    });
  });

  describe("handleSitOutContinue", () => {
    it("moves to move info when more rounds remain", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1]), round(2, [2])],
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      expect(result.current.playState.state).toBe("roundInfo");
      act(() => result.current.handleSitOutContinue());
      expect(result.current.playState).toEqual({
        state: "moveInfo",
        nextRoundIndex: 1,
      });
    });

    it("completes the game when on the last round", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1])],
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleSitOutContinue());
      expect(result.current.playState.state).toBe("gameComplete");
    });

    it("is a no-op outside the roundInfo state", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1])],
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      // Enter the round so we're in enterContract, not roundInfo.
      act(() => result.current.handleEnterRound());
      act(() => result.current.handleSitOutContinue());
      expect(result.current.playState.state).toBe("enterContract");
    });

    it("no-ops when the schedule ref is null", () => {
      withSchedule({ assignmentId: "A1", side: "NS" });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleSitOutContinue());
      expect(result.current.playState.state).toBe("loading");
    });
  });

  describe("submitResult guards", () => {
    it("is a no-op when not in enterContract", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1])],
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      // Still in roundInfo.
      act(() => result.current.submitResult(1, "3NTN="));
      expect(result.current.playState.state).toBe("roundInfo");
      expect(socketEmit).not.toHaveBeenCalled();
    });

    it("is a no-op when the board is not part of the round", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2])],
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.handleEnterRound());
      // Board 99 is not in the round.
      act(() => result.current.submitResult(99, "3NTN="));
      expect(result.current.playState.state).toBe("enterContract");
      expect(socketEmit).not.toHaveBeenCalled();
    });

    it("no-ops when the schedule ref is null", () => {
      withSchedule({ assignmentId: "A1", side: "NS" });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      act(() => result.current.submitResult(1, "3NTN="));
      expect(socketEmit).not.toHaveBeenCalled();
    });
  });

  describe("initialPlayState sit-out handling", () => {
    it("skips a leading sit-out round when selecting the start round", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [], { sitOut: true }), round(2, [3, 4])],
      });
      const { result } = renderHook(() => usePlayFlow("g1", "A1NS"));

      expect(result.current.playState).toEqual({
        state: "roundInfo",
        roundIndex: 1,
      });
    });
  });

  describe("handleEnterRound guard", () => {
    it("is a no-op outside the roundInfo state", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1])],
      });
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
    it("does not reset play state when SWR hands back a fresh schedule for the same key", () => {
      const schedule = {
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2])],
      };
      withSchedule(schedule);
      const { result, rerender } = renderHook(() =>
        usePlayFlow("g1", "A1NS"),
      );

      act(() => result.current.handleEnterRound());
      expect(result.current.playState.state).toBe("enterContract");

      // A background revalidation returns a new (but equivalent) object.
      withSchedule({ ...schedule, rounds: [round(1, [1, 2])] });
      rerender();

      // State is preserved, not reset to roundInfo.
      expect(result.current.playState.state).toBe("enterContract");
    });

    it("does not fall back to loading when a revalidation transiently drops the schedule", () => {
      withSchedule({
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1, 2])],
      });
      const { result, rerender } = renderHook(() =>
        usePlayFlow("g1", "A1NS"),
      );

      act(() => result.current.handleEnterRound());
      expect(result.current.playState.state).toBe("enterContract");

      // SWR transiently returns no data (still the same key).
      withSchedule(undefined);
      rerender();

      // Already initialised for this key, so we keep the current state
      // rather than resetting to loading.
      expect(result.current.playState.state).toBe("enterContract");
    });
  });

  // Reaching the defensive `!round` guards requires the schedule to shrink out
  // from under a play state that already references a now-missing round index.
  // A 0-round schedule stays non-null (rounds is a truthy empty array), so the
  // ref updates but the play state is preserved by the init guard.
  describe("defensive missing-round guards after the schedule shrinks", () => {
    function emptyRoundsSchedule() {
      return { assignmentId: "A1", side: "NS", rounds: [] as unknown[] };
    }

    it("BOARD_CONFIRMED no-ops when the referenced round has vanished", () => {
      const schedule = {
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1])],
      };
      withSchedule(schedule);
      const { result, rerender } = renderHook(() =>
        usePlayFlow("g1", "A1NS"),
      );

      act(() => result.current.handleEnterRound());
      act(() => result.current.submitResult(1, "3NTN="));
      expect(result.current.playState.state).toBe("waiting");

      withSchedule(emptyRoundsSchedule());
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
      const schedule = {
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1])],
      };
      withSchedule(schedule);
      const { result, rerender } = renderHook(() =>
        usePlayFlow("g1", "A1NS"),
      );

      act(() => result.current.handleEnterRound());
      act(() => result.current.submitResult(1, "3NTN="));

      withSchedule(emptyRoundsSchedule());
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
      const schedule = {
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1])],
      };
      withSchedule(schedule);
      const { result, rerender } = renderHook(() =>
        usePlayFlow("g1", "A1NS"),
      );

      act(() => result.current.handleEnterRound());
      expect(result.current.playState.state).toBe("enterContract");

      withSchedule(emptyRoundsSchedule());
      rerender();

      act(() => result.current.submitResult(1, "3NTN="));
      // Still enterContract; no emit, since the round is gone.
      expect(result.current.playState.state).toBe("enterContract");
      expect(socketEmit).not.toHaveBeenCalled();
    });

    it("handleBoardResultsNext no-ops when the referenced round has vanished", () => {
      const schedule = {
        assignmentId: "A1",
        side: "NS",
        rounds: [round(1, [1])],
      };
      withSchedule(schedule);
      const { result, rerender } = renderHook(() =>
        usePlayFlow("g1", "A1NS"),
      );

      toBoardResults(result, 1);
      expect(result.current.playState.state).toBe("boardResults");

      withSchedule(emptyRoundsSchedule());
      rerender();

      act(() => result.current.handleBoardResultsNext());
      expect(result.current.playState.state).toBe("boardResults");
    });
  });
});
