import { describe, it, expect } from "vitest";
import {
  chooseHandover,
  isSamePair,
  MAX_PAIRS_PER_TEAM,
  newPairBoards,
  returningPairBoards,
  teamHandoverRejection,
  type HandoverOccupant,
  type PlayerIdentity,
} from "./handover";

const a = { firstName: "A", lastName: "One" };
const b = { firstName: "B", lastName: "Two" };
const c = { firstName: "C", lastName: "Three" };
const d = { firstName: "D", lastName: "Four" };

describe("isSamePair", () => {
  it("never matches a recorded side with a missing player", () => {
    expect(
      isSamePair(
        { player1: a, player2: b },
        { player1: a, player2: undefined },
      ),
    ).toBe(false);
    expect(
      isSamePair(
        { player1: a, player2: b },
        { player1: undefined, player2: b },
      ),
    ).toBe(false);
  });

  it("matches either seat order", () => {
    expect(
      isSamePair({ player1: b, player2: a }, { player1: a, player2: b }),
    ).toBe(true);
  });

  it("ignores case and spacing in names", () => {
    expect(
      isSamePair(
        {
          player1: { firstName: "  a ", lastName: "ONE" },
          player2: { firstName: "b", lastName: "two  " },
        },
        { player1: a, player2: b },
      ),
    ).toBe(true);
  });

  it("goes by EBU number when both players carry one", () => {
    const withId = (p: PlayerIdentity, nationalId: string) => ({
      ...p,
      nationalId,
    });
    expect(
      isSamePair(
        { player1: withId(c, "1"), player2: withId(d, "2") },
        { player1: withId(a, "1"), player2: withId(b, "2") },
      ),
    ).toBe(true);
    expect(
      isSamePair(
        { player1: withId(a, "9"), player2: b },
        { player1: withId(a, "1"), player2: b },
      ),
    ).toBe(false);
  });
});

describe("chooseHandover", () => {
  const playerById = new Map<number, PlayerIdentity>([
    [1, a],
    [2, b],
    [3, c],
    [4, d],
  ]);
  const occ = (
    id: number,
    player1: number,
    player2: number,
    isArrivalAnchor = 0,
  ): HandoverOccupant => ({
    id,
    boards: null,
    isArrivalAnchor,
    player1,
    player2,
  });
  const arriving = (player1: PlayerIdentity, player2: PlayerIdentity) => ({
    player1,
    player2,
  });

  it("rejects a seat with no occupant", () => {
    expect(chooseHandover([], playerById, arriving(a, b))).toEqual({
      ok: false,
      error: "No pair is seated there to hand over from.",
    });
  });

  it("rejects the pair already playing the seat", () => {
    expect(chooseHandover([occ(1, 1, 2)], playerById, arriving(b, a))).toEqual({
      ok: false,
      error: "That pair is already playing this seat.",
    });
  });

  it("hands a single-occupant seat to a new pair", () => {
    const standIn = occ(1, 1, 2);
    expect(chooseHandover([standIn], playerById, arriving(c, d))).toEqual({
      ok: true,
      kind: "newPair",
      standIn,
    });
  });

  it("brings back a pair that played the seat earlier", () => {
    const original = occ(1, 1, 2);
    const substitute = occ(2, 3, 4, 1);
    expect(
      chooseHandover([original, substitute], playerById, arriving(a, b)),
    ).toEqual({
      ok: true,
      kind: "returningPair",
      leaving: substitute,
      returning: original,
    });
  });

  it("rejects a third pair on a seat that already has a substitute", () => {
    const original = occ(1, 1, 2);
    const substitute = occ(2, 3, 4, 1);
    const e = { firstName: "E", lastName: "Five" };
    expect(
      chooseHandover([original, substitute], playerById, arriving(e, e)),
    ).toEqual({
      ok: false,
      error:
        "This seat already has a substitute. Only the pair who played it earlier (A One & B Two) can take it back.",
    });
  });
});

describe("teamHandoverRejection", () => {
  it("lets a new pair join below the team limit", () => {
    expect(teamHandoverRejection(1, 1)).toBeNull();
  });

  it("rejects a new pair once the team fields the maximum", () => {
    expect(teamHandoverRejection(2, MAX_PAIRS_PER_TEAM - 2)).toEqual({
      ok: false,
      error:
        "This team already has a substitute. A team can have at most six players.",
    });
  });
});

describe("newPairBoards", () => {
  it("gives the stand-in the played boards and the arriving pair the rest", () => {
    expect(newPairBoards({ played: [1, 2], unplayed: [3, 4] })).toEqual({
      ok: true,
      standInBoards: [1, 2],
      arrivingBoards: [3, 4],
    });
  });

  it("rejects when every board already has a result", () => {
    expect(newPairBoards({ played: [1, 2], unplayed: [] })).toEqual({
      ok: false,
      error: "Every board here already has a result — nothing to hand over.",
    });
  });
});

describe("returningPairBoards", () => {
  it("keeps the leaving pair's played boards and returns the rest", () => {
    expect(
      returningPairBoards([3, 4, 5, 6], [2, 1], {
        played: [1, 2, 4, 3],
        unplayed: [6, 5],
      }),
    ).toEqual({
      ok: true,
      collapse: false,
      leavingKeeps: [3, 4],
      returningBoards: [1, 2, 5, 6],
    });
  });

  it("treats whole-seat occupancies as every played board", () => {
    expect(
      returningPairBoards(null, null, { played: [2, 1], unplayed: [3] }),
    ).toEqual({
      ok: true,
      collapse: false,
      leavingKeeps: [1, 2],
      returningBoards: [3],
    });
  });

  it("collapses the seat when the leaving pair played nothing", () => {
    expect(
      returningPairBoards([3, 4], [1, 2], { played: [1, 2], unplayed: [3, 4] }),
    ).toEqual({ ok: true, collapse: true });
  });

  it("rejects when every board already has a result", () => {
    expect(
      returningPairBoards([3], [1, 2], { played: [1, 2, 3], unplayed: [] }),
    ).toEqual({
      ok: false,
      error: "Every board here already has a result — nothing to hand over.",
    });
  });
});
