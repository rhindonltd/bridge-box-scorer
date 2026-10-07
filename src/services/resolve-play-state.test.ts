import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/schedule-service", () => ({
  getSchedule: vi.fn(),
}));
vi.mock("@/db/games/queries/get-section-movement", () => ({
  getSectionMovement: vi.fn(),
}));
vi.mock("@/db/games/queries/find-submissions", () => ({
  findBoardSubmissions: vi.fn(),
}));

import { resolvePlayState } from "./resolve-play-state";
import { getSchedule } from "@/services/schedule-service";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { findBoardSubmissions } from "@/db/games/queries/find-submissions";

const db = {} as never;

/** A played round with per-board statuses, defaulting to table 1. */
function round(
  roundNumber: number,
  statuses: { boardNumber: number; status: string }[],
  over: Partial<{ tableNumber: number; sitOut: boolean }> = {},
) {
  return {
    roundNumber,
    tableNumber: over.tableNumber ?? 1,
    side: "NS" as const,
    boards: statuses.map((s) => s.boardNumber),
    boardStatuses: statuses,
    sitOut: over.sitOut ?? false,
    players: { N: null, S: null, E: null, W: null },
  };
}

function withSchedule(rounds: unknown[]) {
  vi.mocked(getSchedule).mockResolvedValue({
    assignmentId: "A1",
    side: "NS",
    rounds,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSectionMovement).mockResolvedValue(null);
  vi.mocked(findBoardSubmissions).mockResolvedValue([] as never);
});

describe("resolvePlayState", () => {
  it("returns null when the seat has no schedule", async () => {
    vi.mocked(getSchedule).mockResolvedValue(null as never);
    expect(await resolvePlayState(db, "g1", "A1NS")).toBeNull();
  });

  it("positions the player on the first unconfirmed board, entering it", async () => {
    withSchedule([
      round(1, [
        { boardNumber: 1, status: "CONFIRMED" },
        { boardNumber: 2, status: "NOT_PLAYED" },
      ]),
    ]);

    const state = await resolvePlayState(db, "g1", "A1NS");

    expect(state!.phase).toEqual({
      kind: "round",
      roundIndex: 0,
      position: { at: "entering", boardNumber: 2 },
    });
  });

  it("reports waitingConfirmation when this table has one pending submission", async () => {
    withSchedule([round(1, [{ boardNumber: 1, status: "PENDING_CONFIRMATION" }])]);
    vi.mocked(findBoardSubmissions).mockResolvedValue([
      { side: "NS", boardNumber: 1, result: "3NTN=" },
    ] as never);

    const state = await resolvePlayState(db, "g1", "A1NS");

    expect(state!.phase).toMatchObject({
      kind: "round",
      position: { at: "waitingConfirmation", boardNumber: 1 },
    });
  });

  it("is still entering when only the OTHER side has submitted", async () => {
    // The EW pair submitted board 1; this seat (NS) has not. The board is
    // PENDING_CONFIRMATION, but from NS's point of view they still need to
    // enter their own result — they are entering, not waiting.
    withSchedule([round(1, [{ boardNumber: 1, status: "PENDING_CONFIRMATION" }])]);
    vi.mocked(findBoardSubmissions).mockResolvedValue([
      { side: "EW", boardNumber: 1, result: "3NTN=" },
    ] as never);

    const state = await resolvePlayState(db, "g1", "A1NS");

    expect(state!.phase).toMatchObject({
      kind: "round",
      position: { at: "entering", boardNumber: 1 },
    });
  });

  it("reports a mismatch, oriented NS/EW, when both sides disagree", async () => {
    withSchedule([round(1, [{ boardNumber: 1, status: "PENDING_CONFIRMATION" }])]);
    vi.mocked(findBoardSubmissions).mockResolvedValue([
      { side: "NS", boardNumber: 1, result: "3NTN=" },
      { side: "EW", boardNumber: 1, result: "3NTN+1" },
    ] as never);

    const state = await resolvePlayState(db, "g1", "A1NS");

    expect(state!.phase).toMatchObject({
      kind: "round",
      position: {
        at: "mismatch",
        boardNumber: 1,
        nsResult: "3NTN=",
        ewResult: "3NTN+1",
      },
    });
  });

  it("rests on a sit-out round the player has reached (a bye is a page they confirm)", async () => {
    withSchedule([
      round(1, [{ boardNumber: 1, status: "CONFIRMED" }]),
      { ...round(2, []), sitOut: true, tableNumber: null },
    ]);

    const state = await resolvePlayState(db, "g1", "A1NS");
    // Round 1 is done; round 2 is the sit-out the player has now reached. It is
    // a resting page they must acknowledge, so a reload lands them back on it
    // (not silently skipped to complete).
    expect(state!.phase).toEqual({ kind: "sitOut", roundIndex: 1 });
  });

  it("rests on a mid-schedule sit-out before the next playable round", async () => {
    withSchedule([
      round(1, [{ boardNumber: 1, status: "CONFIRMED" }]),
      { ...round(2, []), sitOut: true, tableNumber: null },
      round(3, [{ boardNumber: 3, status: "NOT_PLAYED" }], { tableNumber: 2 }),
    ]);

    const state = await resolvePlayState(db, "g1", "A1NS");
    // The player has reached round 2 (the sit-out) and has not moved past it,
    // so they rest on the sit-out page; round 3 comes after they Continue.
    expect(state!.phase).toEqual({ kind: "sitOut", roundIndex: 1 });
  });

  it("reports complete when all rounds are done and none are expected beyond", async () => {
    withSchedule([round(1, [{ boardNumber: 1, status: "CONFIRMED" }])]);
    // No movement / SPEC → expectedRounds null → fall back to materialized.
    const state = await resolvePlayState(db, "g1", "A1NS");
    expect(state!.phase).toEqual({ kind: "complete" });
  });

  it("reports awaitingNextRound for Swiss when more rounds are expected than drawn", async () => {
    withSchedule([round(1, [{ boardNumber: 1, status: "CONFIRMED" }])]);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS",
      swiss: { tables: 5, rounds: 7, boardsPerRound: 7 },
    } as never);

    const state = await resolvePlayState(db, "g1", "A1NS");
    expect(state!.phase).toEqual({
      kind: "awaitingNextRound",
      completedRound: 1,
    });
  });

  it("reports complete for Swiss once the final expected round is done", async () => {
    withSchedule([
      round(1, [{ boardNumber: 1, status: "CONFIRMED" }]),
      round(2, [{ boardNumber: 2, status: "CONFIRMED" }]),
    ]);
    vi.mocked(getSectionMovement).mockResolvedValue({
      source: "SWISS",
      swiss: { tables: 5, rounds: 2, boardsPerRound: 1 },
    } as never);

    const state = await resolvePlayState(db, "g1", "A1NS");
    expect(state!.phase).toEqual({ kind: "complete" });
  });

  it("carries assignmentId and side through", async () => {
    withSchedule([round(1, [{ boardNumber: 1, status: "NOT_PLAYED" }])]);
    const state = await resolvePlayState(db, "g1", "A1NS");
    expect(state).toMatchObject({ assignmentId: "A1", side: "NS" });
  });
});
