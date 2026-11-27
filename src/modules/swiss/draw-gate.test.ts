import { describe, it, expect, vi } from "vitest";
import {
  isSwissRoundFinal,
  nextSwissDrawRound,
  PAIRS_ROUND_COMPLETION,
  swissTeamsOddFieldRejection,
  TEAMS_ROUND_COMPLETION,
} from "./draw-gate";

const board = (status: string | null, ruling: string | null = null) => ({
  status,
  ruling,
});

describe("isSwissRoundFinal", () => {
  it("is complete when every playable board has a final status", () => {
    expect(
      isSwissRoundFinal(
        [board("CONFIRMED"), board("OVERRIDDEN"), board("CANCELLED")],
        PAIRS_ROUND_COMPLETION,
      ),
    ).toBe(true);
  });

  it("is incomplete while a board has no result", () => {
    expect(
      isSwissRoundFinal(
        [board("CONFIRMED"), board("PENDING")],
        PAIRS_ROUND_COMPLETION,
      ),
    ).toBe(false);
    expect(
      isSwissRoundFinal([board("CONFIRMED"), board(null)], PAIRS_ROUND_COMPLETION),
    ).toBe(false);
  });

  it("counts a board on a ruled match as resolved", () => {
    expect(
      isSwissRoundFinal(
        [board("CONFIRMED"), board(null, "VOID:BOTH")],
        PAIRS_ROUND_COMPLETION,
      ),
    ).toBe(true);
  });

  it("drops pairs byes and half-average blocks from the playable boards", () => {
    expect(
      isSwissRoundFinal(
        [board("CONFIRMED"), board("SIT_OUT"), board("HALF_AVERAGE")],
        PAIRS_ROUND_COMPLETION,
      ),
    ).toBe(true);
    // A round of only scorer-resolved boards has nothing to draw from.
    expect(
      isSwissRoundFinal([board("SIT_OUT")], PAIRS_ROUND_COMPLETION),
    ).toBe(false);
  });

  it("counts a teams bye as resolved", () => {
    expect(
      isSwissRoundFinal([board("SIT_OUT")], TEAMS_ROUND_COMPLETION),
    ).toBe(true);
    expect(
      isSwissRoundFinal([board("HALF_AVERAGE")], TEAMS_ROUND_COMPLETION),
    ).toBe(false);
  });

  it("is never complete for an empty round", () => {
    expect(isSwissRoundFinal([], TEAMS_ROUND_COMPLETION)).toBe(false);
  });
});

describe("nextSwissDrawRound", () => {
  it("draws round 1 without checking any round", async () => {
    const isRoundComplete = vi.fn();
    expect(await nextSwissDrawRound(0, 5, { isRoundComplete })).toEqual({
      ok: true,
      nextRound: 1,
    });
    expect(isRoundComplete).not.toHaveBeenCalled();
  });

  it("draws the next round once the current one is complete", async () => {
    const isRoundComplete = vi.fn(async () => true);
    expect(await nextSwissDrawRound(2, 5, { isRoundComplete })).toEqual({
      ok: true,
      nextRound: 3,
    });
    expect(isRoundComplete).toHaveBeenCalledWith(2);
  });

  it("waits for the current round to be scored", async () => {
    expect(
      await nextSwissDrawRound(2, 5, { isRoundComplete: async () => false }),
    ).toEqual({ ok: false, reason: "ROUND_INCOMPLETE" });
  });

  it("stops once the last round has been drawn, without reading", async () => {
    const isRoundComplete = vi.fn();
    expect(await nextSwissDrawRound(5, 5, { isRoundComplete })).toEqual({
      ok: false,
      reason: "EVENT_COMPLETE",
    });
    expect(isRoundComplete).not.toHaveBeenCalled();
  });
});

describe("swissTeamsOddFieldRejection", () => {
  it("allows an even field and an odd field with byes", () => {
    expect(swissTeamsOddFieldRejection(4, "TRIPLE")).toBeNull();
    expect(swissTeamsOddFieldRejection(1, "BYE")).toBeNull();
  });

  it("needs three teams for a triple", () => {
    expect(swissTeamsOddFieldRejection(1, "TRIPLE")).toBe("ODD_TEAM_COUNT");
    expect(swissTeamsOddFieldRejection(3, "TRIPLE")).toBeNull();
  });
});
