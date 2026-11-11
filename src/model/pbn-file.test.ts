import { describe, it, expect } from "vitest";
import { parsePbnFile } from "./pbn-file";
import { dealerFor, isCompleteDeal, toPbn } from "./deal";
import { Ranks, Suits } from "./common";
import type { Card, Deal } from "./common";

/** The example game from the PBN 2.1 specification (board 1). */
const SPEC_DEAL =
  "N:.63.AKQ987.A9732 A8654.KQ5.T.QJT6 J973.J98742.3.K4 KQT2.AT.J6542.85";

const SPEC_EXAMPLE = `[Event "International Amsterdam Airport Schiphol Bridgetournament"]
[Site "Amsterdam, The Netherlands NLD"]
[Date "1995.06.10"]
[Board "1"]
[West "Podgor"]
[North "Westra"]
[East "Kalish"]
[South "Leufkens"]
[Dealer "N"]
[Vulnerable "None"]
[Deal "${SPEC_DEAL}"]
[Scoring "IMP"]
[Declarer "S"]
[Contract "5HX"]
[Result "9"]
{
                S
                H 6 3
                D A K Q 9 8 7
                C A 9 7 3 2
S K Q 10 2                      S A 8 6 5 4
H A 10                          H K Q 5
D J 6 5 4 2                     D 10
C 8 5                           C Q J 10 6
                S J 9 7 3
                H J 9 8 7 4 2
                D 3
                C K 4
}
[Auction "N"]
1D      1S   3H =1= 4S
4NT =2= X    Pass   Pass
5C      X    5H     X
Pass    Pass Pass
[Note "1:non-forcing 6-9 points, 6-card"]
[Note "2:two colors: clubs and diamonds"]
[Play "W"]
SK =1= H3 S4 S3
C5 C2 C6 CK
S2 H6 S5 S7
C8 CA CT C4
`;

/** Deterministic shuffled deal for board `n` (so fixtures are reproducible). */
function dealFor(n: number): Deal {
  const pack: Card[] = [];
  for (const suit of Suits) {
    for (const rank of Ranks) pack.push(`${suit}${rank}` as Card);
  }
  let seed = n * 7919 + 13;
  for (let i = pack.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const j = seed % (i + 1);
    [pack[i], pack[j]] = [pack[j], pack[i]];
  }
  return {
    N: pack.slice(0, 13),
    E: pack.slice(13, 26),
    S: pack.slice(26, 39),
    W: pack.slice(39, 52),
  };
}

const sorted = (hand: Card[]) => [...hand].sort();

function expectSameDeal(actual: Deal, expected: Deal) {
  for (const dir of ["N", "E", "S", "W"] as const) {
    expect(sorted(actual[dir])).toEqual(sorted(expected[dir]));
  }
}

/** A dealing-machine style game: Dealer / Vulnerable / Deal only. */
function machineGame(n: number): string {
  return `[Dealer "${dealerFor(n)}"]\n[Vulnerable "None"]\n[Deal "${toPbn(dealFor(n), dealerFor(n))}"]\n`;
}

describe("parsePbnFile", () => {
  it("parses the spec example game, ignoring auction, play and diagram", () => {
    const { boards, errors } = parsePbnFile(SPEC_EXAMPLE);
    expect(errors).toEqual([]);
    expect(boards).toHaveLength(1);
    expect(boards[0].boardNumber).toBe(1);
    expect(isCompleteDeal(boards[0].deal)).toBe(true);
    expect(boards[0].deal.N).toContain("H6");
    expect(boards[0].deal.N).not.toContain("SA");
    expect(boards[0].deal.E).toContain("SA");
  });

  it("parses a 32-board file with Board tags", () => {
    const text = Array.from(
      { length: 32 },
      (_, i) => `[Board "${i + 1}"]\n${machineGame(i + 1)}`,
    ).join("\n");
    const { boards, errors } = parsePbnFile(text);
    expect(errors).toEqual([]);
    expect(boards.map((b) => b.boardNumber)).toEqual(
      Array.from({ length: 32 }, (_, i) => i + 1),
    );
    boards.forEach((b) => expectSameDeal(b.deal, dealFor(b.boardNumber)));
  });

  it("numbers boards by file order when there are no Board tags", () => {
    const text = [machineGame(1), machineGame(2), machineGame(3)].join("\n");
    const { boards, errors } = parsePbnFile(text);
    expect(errors).toEqual([]);
    expect(boards.map((b) => b.boardNumber)).toEqual([1, 2, 3]);
    expectSameDeal(boards[1].deal, dealFor(2));
  });

  it("handles CRLF line endings and a BOM", () => {
    const text = "\uFEFF" + [machineGame(1), machineGame(2)].join("\n");
    const { boards, errors } = parsePbnFile(text.replace(/\n/g, "\r\n"));
    expect(errors).toEqual([]);
    expect(boards).toHaveLength(2);
  });

  it("skips % header lines and ; comments", () => {
    const text = `% PBN 2.1\n% EXPORT\n; a comment\n[Board "4"]\n${machineGame(4)}`;
    const { boards, errors } = parsePbnFile(text);
    expect(errors).toEqual([]);
    expect(boards.map((b) => b.boardNumber)).toEqual([4]);
  });

  it("accepts several tag pairs on one line", () => {
    const deal = toPbn(dealFor(5), "N");
    const text = `[Board "5"] [Dealer "N"] [Deal "${deal}"]\n`;
    const { boards, errors } = parsePbnFile(text);
    expect(errors).toEqual([]);
    expect(boards[0].boardNumber).toBe(5);
    expectSameDeal(boards[0].deal, dealFor(5));
  });

  it("accepts a tag pair that spans lines", () => {
    const deal = toPbn(dealFor(6), "N");
    const text = `[Board\n"6"]\n[Deal\n  "${deal}"\n]\n`;
    const { boards, errors } = parsePbnFile(text);
    expect(errors).toEqual([]);
    expect(boards[0].boardNumber).toBe(6);
  });

  it("does not split a game on a blank line inside a { } comment", () => {
    const deal = toPbn(dealFor(7), "N");
    const text = `[Board "7"]\n[Deal "${deal}"]\n{first line\n\nsecond line}\n[Auction "N"]\nPass Pass Pass Pass\n\n[Board "8"]\n${machineGame(8)}`;
    const { boards, errors } = parsePbnFile(text);
    expect(errors).toEqual([]);
    expect(boards.map((b) => b.boardNumber)).toEqual([7, 8]);
  });

  it("uses the first occurrence of a repeated tag within a game", () => {
    const deal = toPbn(dealFor(9), "N");
    const text = `[Board "9"]\n[Note "a"]\n[Note "b"]\n[Deal "${deal}"]\n`;
    const { boards, errors } = parsePbnFile(text);
    expect(errors).toEqual([]);
    expect(boards).toHaveLength(1);
  });

  it("starts a new game when Board/Deal repeat without a blank line", () => {
    const text = `[Board "1"]\n[Deal "${toPbn(dealFor(1), "N")}"]\n[Board "2"]\n[Deal "${toPbn(dealFor(2), "E")}"]\n`;
    const { boards, errors } = parsePbnFile(text);
    expect(errors).toEqual([]);
    expect(boards.map((b) => b.boardNumber)).toEqual([1, 2]);
  });

  it("accepts '-' as a void suit marker", () => {
    // 'N:.63.AKQ987.A9732' written with '-' for the spade void.
    const withDash = SPEC_DEAL.replace("N:.63", "N:-.63");
    const { boards, errors } = parsePbnFile(
      `[Board "1"]\n[Deal "${withDash}"]\n`,
    );
    expect(errors).toEqual([]);
    expect(boards).toHaveLength(1);
  });

  it("rejects a deal with unknown ('-' / '?') hands as incomplete", () => {
    const text = `[Board "1"]\n[Deal "N:.63.AKQ987.A9732 - - -"]\n\n[Board "2"]\n[Deal "N:.63.AKQ987.A9732 ? ? ?"]\n`;
    const { boards, errors } = parsePbnFile(text);
    expect(boards).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatchObject({ gameIndex: 1, boardNumber: 1 });
    expect(errors[0].message).toMatch(/incomplete/i);
    expect(errors[1]).toMatchObject({ gameIndex: 2, boardNumber: 2 });
  });

  it("reports a bad card count without aborting the rest of the file", () => {
    const good = toPbn(dealFor(2), "E");
    const bad = SPEC_DEAL.replace("AKQ987", "AKQ98");
    const text = `[Board "1"]\n[Deal "${bad}"]\n\n[Board "2"]\n[Deal "${good}"]\n`;
    const { boards, errors } = parsePbnFile(text);
    expect(boards.map((b) => b.boardNumber)).toEqual([2]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ gameIndex: 1, boardNumber: 1 });
  });

  it("reports duplicate board numbers and keeps the first", () => {
    const text = `[Board "3"]\n[Deal "${toPbn(dealFor(3), "S")}"]\n\n[Board "3"]\n[Deal "${toPbn(dealFor(4), "S")}"]\n`;
    const { boards, errors } = parsePbnFile(text);
    expect(boards).toHaveLength(1);
    expectSameDeal(boards[0].deal, dealFor(3));
    expect(errors).toEqual([
      expect.objectContaining({ gameIndex: 2, boardNumber: 3 }),
    ]);
    expect(errors[0].message).toMatch(/more than once/);
  });

  it("reports games with a Board but no Deal, and a missing/invalid Board", () => {
    const text = `[Board "1"]\n[Dealer "N"]\n\n[Board "x"]\n[Deal "${toPbn(dealFor(2), "E")}"]\n\n[Deal "${toPbn(dealFor(3), "S")}"]\n`;
    const { boards, errors } = parsePbnFile(text);
    expect(boards).toEqual([]);
    expect(errors.map((e) => e.message)).toEqual([
      "Game has no Deal",
      'Invalid board number "x"',
      "Game has no Board number",
    ]);
  });

  it("reports a deal with no dealer prefix", () => {
    const { errors } = parsePbnFile(`[Board "1"]\n[Deal ".63.AKQ987.A9732"]\n`);
    expect(errors[0].message).toMatch(/dealer/i);
  });

  it("returns nothing for an empty or tag-free file", () => {
    expect(parsePbnFile("")).toEqual({ boards: [], errors: [] });
    expect(parsePbnFile('hello\n\n[Event "x"]\n')).toEqual({
      boards: [],
      errors: [],
    });
  });
});
