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

    act(() => result.current.submitResult("3NTN="));

    // Transitions to waiting and emits the submission for board 1.
    expect(result.current.playState.state).toBe("waiting");
    expect(socketEmit).toHaveBeenCalledWith(
      SocketEvents.SUBMIT_RESULT,
      expect.objectContaining({
        gameId: "g1",
        seat: "A1NS",
        roundNumber: 1,
        boardNumber: 1,
        result: "3NTN=",
      }),
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
});
