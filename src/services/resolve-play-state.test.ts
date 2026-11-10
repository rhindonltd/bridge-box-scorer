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

  it("returns null when the seat is seated but the game is not started yet (no rounds)", async () => {
    // A seated pair has an occupancy row (schedule is non-null) but, before the
    // director starts the game, no boards are materialized so there are no
    // rounds. This must resolve to null (→ 404 → WaitingToStartPage), NOT to a
    // `complete` phase that would show the Game Complete screen.
    withSchedule([]);
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
    withSchedule([
      round(1, [{ boardNumber: 1, status: "PENDING_CONFIRMATION" }]),
    ]);
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
    withSchedule([
      round(1, [{ boardNumber: 1, status: "PENDING_CONFIRMATION" }]),
    ]);
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
    withSchedule([
      round(1, [{ boardNumber: 1, status: "PENDING_CONFIRMATION" }]),
    ]);
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

  it("reports an empty result for a mismatched side that submitted none", async () => {
    withSchedule([
      round(1, [{ boardNumber: 1, status: "PENDING_CONFIRMATION" }]),
    ]);
    vi.mocked(findBoardSubmissions).mockResolvedValue([
      { side: "NS", boardNumber: 1, result: null },
      { side: "EW", boardNumber: 2, result: null },
    ] as never);
    const state = await resolvePlayState(db, "g1", "A1NS");
    expect(state!.phase).toMatchObject({
      kind: "round",
      position: {
        at: "mismatch",
        nsBoardNumber: 1,
        nsResult: "",
        ewBoardNumber: 2,
        ewResult: "",
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

  describe("expected-late opponent", () => {
    /** A played round whose opponent is an empty expected-late seat. */
    function lateRound(
      roundNumber: number,
      statuses: { boardNumber: number; status: string }[],
      tableNumber = 1,
    ) {
      return {
        ...round(roundNumber, statuses, { tableNumber }),
        opponentExpectedLate: true,
      };
    }

    it("rests on an expectedLate phase when the current round's opponent is late", async () => {
      withSchedule([lateRound(1, [{ boardNumber: 1, status: "NOT_PLAYED" }])]);

      const state = await resolvePlayState(db, "g1", "A1NS");

      // Not a stuck `round` phase: a dedicated resting phase the pair
      // acknowledges (wait, or move on).
      expect(state!.phase).toEqual({ kind: "expectedLate", roundIndex: 0 });
    });

    it("turns back into a normal round once the opponent is seated (mark cleared)", async () => {
      // The director seated the latecomers: the schedule no longer flags the
      // round expected-late, so it resolves as an ordinary enterable round.
      withSchedule([round(1, [{ boardNumber: 1, status: "NOT_PLAYED" }])]);

      const state = await resolvePlayState(db, "g1", "A1NS");

      expect(state!.phase).toMatchObject({
        kind: "round",
        roundIndex: 0,
        position: { at: "entering", boardNumber: 1 },
      });
    });
  });

  describe("strict round ordering (never pulled back)", () => {
    /** A played round whose opponent is an empty expected-late seat. */
    function lateRound(
      roundNumber: number,
      statuses: { boardNumber: number; status: string }[],
      tableNumber = 1,
    ) {
      return {
        ...round(roundNumber, statuses, { tableNumber }),
        opponentExpectedLate: true,
      };
    }

    it("stays on a partly-played round (some boards finalised, some not)", async () => {
      // A finalised board in the CURRENT round must not float the pair past it.
      withSchedule([
        round(1, [
          { boardNumber: 1, status: "CONFIRMED" },
          { boardNumber: 2, status: "NOT_PLAYED" },
        ]),
      ]);

      const state = await resolvePlayState(db, "g1", "A1NS");
      expect(state!.phase).toMatchObject({
        kind: "round",
        roundIndex: 0,
        position: { at: "entering", boardNumber: 2 },
      });
    });

    it("does not pull a pair back to a skipped expected-late round after they played a later one", async () => {
      // Round 1's opponent never arrived (boards left unconfirmed); the pair
      // moved on and played round 2. Even though round 1 is 'incomplete', the
      // pair must stay at/after round 2 — not be dragged back to round 1.
      withSchedule([
        lateRound(1, [{ boardNumber: 1, status: "NOT_PLAYED" }]),
        round(2, [{ boardNumber: 2, status: "CONFIRMED" }], { tableNumber: 2 }),
      ]);

      const state = await resolvePlayState(db, "g1", "A1NS");
      // Round 2 is the last finalised round and it is complete, so the pair is
      // between rounds / done — never resolved back to round 1.
      expect(state!.phase).toEqual({ kind: "complete" });
    });

    it("does not pull a pair back when a director corrects an earlier, already-passed round", async () => {
      // Round 1 was corrected (CONFIRMED → OVERRIDDEN, which is 'not CONFIRMED'
      // and so would look incomplete) after the pair finished round 2. Strict
      // ordering keeps them at round 2, not back on round 1.
      withSchedule([
        round(1, [{ boardNumber: 1, status: "OVERRIDDEN" }]),
        round(2, [{ boardNumber: 2, status: "NOT_PLAYED" }], {
          tableNumber: 2,
        }),
      ]);

      const state = await resolvePlayState(db, "g1", "A1NS");
      expect(state!.phase).toMatchObject({
        kind: "round",
        roundIndex: 1,
        position: { at: "entering", boardNumber: 2 },
      });
    });
  });

  describe("absent boards (design §11)", () => {
    it("skips a round whose boards are all ABSENT (the opponents withdrew)", async () => {
      withSchedule([
        round(1, [{ boardNumber: 1, status: "CONFIRMED" }]),
        round(2, [{ boardNumber: 2, status: "ABSENT" }]),
        round(3, [{ boardNumber: 3, status: "NOT_PLAYED" }]),
      ]);
      const state = await resolvePlayState(db, "g1", "A1NS");
      expect(state!.phase).toEqual({
        kind: "round",
        roundIndex: 2,
        position: { at: "entering", boardNumber: 3 },
      });
    });

    it("skips an ABSENT board within a partly-absent round", async () => {
      withSchedule([
        round(1, [
          { boardNumber: 1, status: "ABSENT" },
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

    it("is complete when every remaining board is ABSENT (this pair withdrew)", async () => {
      withSchedule([
        round(1, [{ boardNumber: 1, status: "CONFIRMED" }]),
        round(2, [{ boardNumber: 2, status: "ABSENT" }]),
      ]);
      const state = await resolvePlayState(db, "g1", "A1NS");
      expect(state!.phase).toEqual({ kind: "complete" });
    });
  });
});
