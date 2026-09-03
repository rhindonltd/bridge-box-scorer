import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { generateWebMitchell } from "./web-mitchell";

/**
 * Golden test: the even-table Web generator must reproduce the published
 * bridgecentral.com Web Mitchell layouts exactly. This is what makes it safe to
 * resolve even-table Web recommendations to the generator rather than a seeded
 * spec.
 *
 * The even-table reference grids are embedded INLINE below (they used to be
 * read from PSMovements.txt, but those seeded blocks were removed once the
 * generator reproduced them — the reference data lives here now). Each entry is
 * the original block's lines: the header line followed by one line per table,
 * each a flat comma-separated list of (ns, ew, boardSet) triples.
 *
 * The odd-table blocks ([WEB8R]/[WEB9R]) use a rover/relay construction the
 * generator's plain rainbow does NOT reproduce, so we assert they differ. Those
 * blocks remain seeded, so the odd targets are still read from the file.
 */

type Triple = [ns: number, ew: number, boardSet: number];

/** A parsed block: its header numbers and per-table triples. */
interface ParsedBlock {
  tables: number;
  rounds: number;
  boardsPerRound: number;
  /** tableTriples[t] = the (ns, ew, set) triples for table t+1, in round order. */
  tableTriples: Triple[][];
}

/**
 * Parse a block given as [headerLine, ...tableLines]. Header is
 * `start,tables,totalBoards,boardsPerRound,rounds,missing`; each table line is a
 * flat list of (ns, ew, set) triples.
 */
function parseBlockLines(lines: string[]): ParsedBlock {
  const headerNums = lines[0].split(",").map((n) => Number(n));
  const [, tables, , boardsPerRound, rounds] = headerNums;

  const tableTriples: Triple[][] = [];
  for (let t = 0; t < tables; t++) {
    const nums = lines[1 + t].split(",").map((n) => Number(n));
    const triples: Triple[] = [];
    for (let k = 0; k + 2 < nums.length; k += 3) {
      triples.push([nums[k], nums[k + 1], nums[k + 2]]);
    }
    tableTriples.push(triples);
  }

  return { tables, rounds, boardsPerRound, tableTriples };
}

/**
 * Reduce the generator output to (ns, ew, boardSet) triples per table, matching
 * the seeded block encoding (board sets numbered 1..rounds).
 */
function generatorTriples(tables: number, rounds: number): Triple[][] {
  const movement = generateWebMitchell({
    tables,
    rounds,
    boardsPerRound: 3,
    web: true,
  });

  return movement.tables.map((table) =>
    table.rounds.map((round): Triple => {
      const ns = Number(round.participants.nsId.replace(/\D/g, ""));
      const ew = Number(round.participants.ewId.replace(/\D/g, ""));
      const boardSet = Math.floor((round.boards[0] - 1) / 3) + 1;
      return [ns, ew, boardSet];
    }),
  );
}

/**
 * Inline reference grids for the even-table Web blocks the generator now
 * produces (formerly [WEB8] 14/16/18/20 and [WEB9] 18 in PSMovements.txt).
 */
const EVEN_WEB_BLOCKS: { label: string; tables: number; rounds: number; lines: string[] }[] = [
  {
    label: "14 Table Web Mitchell (8 rounds)",
    tables: 14,
    rounds: 8,
    lines: [
      "1,14,24,3,8,0",
      "1,1,1,1,14,2,1,13,3,1,12,4,1,10,5,1,9,6,1,8,7,1,7,8",
      "2,2,2,2,1,3,2,14,4,2,13,5,2,11,6,2,10,7,2,9,8,2,8,1",
      "3,3,3,3,2,4,3,1,5,3,14,6,3,12,7,3,11,8,3,10,1,3,9,2",
      "4,4,4,4,3,5,4,2,6,4,1,7,4,13,8,4,12,1,4,11,2,4,10,3",
      "5,5,5,5,4,6,5,3,7,5,2,8,5,14,1,5,13,2,5,12,3,5,11,4",
      "6,6,6,6,5,7,6,4,8,6,3,1,6,1,2,6,14,3,6,13,4,6,12,5",
      "7,7,7,7,6,8,7,5,1,7,4,2,7,2,3,7,1,4,7,14,5,7,13,6",
      "8,8,6,8,7,5,8,6,4,8,5,3,8,3,2,8,2,1,8,1,8,8,14,7",
      "9,9,5,9,8,4,9,7,3,9,6,2,9,4,1,9,3,8,9,2,7,9,1,6",
      "10,10,4,10,9,3,10,8,2,10,7,1,10,5,8,10,4,7,10,3,6,10,2,5",
      "11,11,3,11,10,2,11,9,1,11,8,8,11,6,7,11,5,6,11,4,5,11,3,4",
      "12,12,2,12,11,1,12,10,8,12,9,7,12,7,6,12,6,5,12,5,4,12,4,3",
      "13,13,1,13,12,8,13,11,7,13,10,6,13,8,5,13,7,4,13,6,3,13,5,2",
      "14,14,8,14,13,7,14,12,6,14,11,5,14,9,4,14,8,3,14,7,2,14,6,1",
    ],
  },
  {
    label: "16 Table Web Mitchell (8 rounds)",
    tables: 16,
    rounds: 8,
    lines: [
      "1,16,24,3,8,0",
      "1,1,1,1,16,2,1,15,3,1,14,4,1,12,5,1,11,6,1,10,7,1,9,8",
      "2,2,2,2,1,3,2,16,4,2,15,5,2,13,6,2,12,7,2,11,8,2,10,1",
      "3,3,3,3,2,4,3,1,5,3,16,6,3,14,7,3,13,8,3,12,1,3,11,2",
      "4,4,4,4,3,5,4,2,6,4,1,7,4,15,8,4,14,1,4,13,2,4,12,3",
      "5,5,5,5,4,6,5,3,7,5,2,8,5,16,1,5,15,2,5,14,3,5,13,4",
      "6,6,6,6,5,7,6,4,8,6,3,1,6,1,2,6,16,3,6,15,4,6,14,5",
      "7,7,7,7,6,8,7,5,1,7,4,2,7,2,3,7,1,4,7,16,5,7,15,6",
      "8,8,8,8,7,1,8,6,2,8,5,3,8,3,4,8,2,5,8,1,6,8,16,7",
      "9,9,7,9,8,6,9,7,5,9,6,4,9,4,3,9,3,2,9,2,1,9,1,8",
      "10,10,6,10,9,5,10,8,4,10,7,3,10,5,2,10,4,1,10,3,8,10,2,7",
      "11,11,5,11,10,4,11,9,3,11,8,2,11,6,1,11,5,8,11,4,7,11,3,6",
      "12,12,4,12,11,3,12,10,2,12,9,1,12,7,8,12,6,7,12,5,6,12,4,5",
      "13,13,3,13,12,2,13,11,1,13,10,8,13,8,7,13,7,6,13,6,5,13,5,4",
      "14,14,2,14,13,1,14,12,8,14,11,7,14,9,6,14,8,5,14,7,4,14,6,3",
      "15,15,1,15,14,8,15,13,7,15,12,6,15,10,5,15,9,4,15,8,3,15,7,2",
      "16,16,8,16,15,7,16,14,6,16,13,5,16,11,4,16,10,3,16,9,2,16,8,1",
    ],
  },
  {
    label: "18 Table Web Mitchell (8 rounds)",
    tables: 18,
    rounds: 8,
    lines: [
      "1,18,24,3,8,0",
      "1,1,1,1,18,2,1,17,3,1,16,4,1,14,5,1,13,6,1,12,7,1,11,8",
      "2,2,2,2,1,3,2,18,4,2,17,5,2,15,6,2,14,7,2,13,8,2,12,1",
      "3,3,3,3,2,4,3,1,5,3,18,6,3,16,7,3,15,8,3,14,1,3,13,2",
      "4,4,4,4,3,5,4,2,6,4,1,7,4,17,8,4,16,1,4,15,2,4,14,3",
      "5,5,5,5,4,6,5,3,7,5,2,8,5,18,1,5,17,2,5,16,3,5,15,4",
      "6,6,6,6,5,7,6,4,8,6,3,1,6,1,2,6,18,3,6,17,4,6,16,5",
      "7,7,7,7,6,8,7,5,1,7,4,2,7,2,3,7,1,4,7,18,5,7,17,6",
      "8,8,8,8,7,1,8,6,2,8,5,3,8,3,4,8,2,5,8,1,6,8,18,7",
      "9,9,1,9,8,2,9,7,3,9,6,4,9,4,5,9,3,6,9,2,7,9,1,8",
      "10,10,8,10,9,7,10,8,6,10,7,5,10,5,4,10,4,3,10,3,2,10,2,1",
      "11,11,7,11,10,6,11,9,5,11,8,4,11,6,3,11,5,2,11,4,1,11,3,8",
      "12,12,6,12,11,5,12,10,4,12,9,3,12,7,2,12,6,1,12,5,8,12,4,7",
      "13,13,5,13,12,4,13,11,3,13,10,2,13,8,1,13,7,8,13,6,7,13,5,6",
      "14,14,4,14,13,3,14,12,2,14,11,1,14,9,8,14,8,7,14,7,6,14,6,5",
      "15,15,3,15,14,2,15,13,1,15,12,8,15,10,7,15,9,6,15,8,5,15,7,4",
      "16,16,2,16,15,1,16,14,8,16,13,7,16,11,6,16,10,5,16,9,4,16,8,3",
      "17,17,1,17,16,8,17,15,7,17,14,6,17,12,5,17,11,4,17,10,3,17,9,2",
      "18,18,8,18,17,7,18,16,6,18,15,5,18,13,4,18,12,3,18,11,2,18,10,1",
    ],
  },
  {
    label: "20 Table Web Mitchell (8 rounds)",
    tables: 20,
    rounds: 8,
    lines: [
      "1,20,24,3,8,0",
      "1,1,1,1,20,2,1,19,3,1,18,4,1,16,5,1,15,6,1,14,7,1,13,8",
      "2,2,2,2,1,3,2,20,4,2,19,5,2,17,6,2,16,7,2,15,8,2,14,1",
      "3,3,3,3,2,4,3,1,5,3,20,6,3,18,7,3,17,8,3,16,1,3,15,2",
      "4,4,4,4,3,5,4,2,6,4,1,7,4,19,8,4,18,1,4,17,2,4,16,3",
      "5,5,5,5,4,6,5,3,7,5,2,8,5,20,1,5,19,2,5,18,3,5,17,4",
      "6,6,6,6,5,7,6,4,8,6,3,1,6,1,2,6,20,3,6,19,4,6,18,5",
      "7,7,7,7,6,8,7,5,1,7,4,2,7,2,3,7,1,4,7,20,5,7,19,6",
      "8,8,8,8,7,1,8,6,2,8,5,3,8,3,4,8,2,5,8,1,6,8,20,7",
      "9,9,1,9,8,2,9,7,3,9,6,4,9,4,5,9,3,6,9,2,7,9,1,8",
      "10,10,2,10,9,3,10,8,4,10,7,5,10,5,6,10,4,7,10,3,8,10,2,1",
      "11,11,1,11,10,8,11,9,7,11,8,6,11,6,5,11,5,4,11,4,3,11,3,2",
      "12,12,8,12,11,7,12,10,6,12,9,5,12,7,4,12,6,3,12,5,2,12,4,1",
      "13,13,7,13,12,6,13,11,5,13,10,4,13,8,3,13,7,2,13,6,1,13,5,8",
      "14,14,6,14,13,5,14,12,4,14,11,3,14,9,2,14,8,1,14,7,8,14,6,7",
      "15,15,5,15,14,4,15,13,3,15,12,2,15,10,1,15,9,8,15,8,7,15,7,6",
      "16,16,4,16,15,3,16,14,2,16,13,1,16,11,8,16,10,7,16,9,6,16,8,5",
      "17,17,3,17,16,2,17,15,1,17,14,8,17,12,7,17,11,6,17,10,5,17,9,4",
      "18,18,2,18,17,1,18,16,8,18,15,7,18,13,6,18,12,5,18,11,4,18,10,3",
      "19,19,1,19,18,8,19,17,7,19,16,6,19,14,5,19,13,4,19,12,3,19,11,2",
      "20,20,8,20,19,7,20,18,6,20,17,5,20,15,4,20,14,3,20,13,2,20,12,1",
    ],
  },
  {
    label: "18 Table Web Mitchell (9 rounds)",
    tables: 18,
    rounds: 9,
    lines: [
      "1,18,27,3,9,0",
      "1,1,1,1,18,2,1,17,3,1,16,4,1,15,5,1,14,6,1,13,7,1,12,8,1,11,9",
      "2,2,2,2,1,3,2,18,4,2,17,5,2,16,6,2,15,7,2,14,8,2,13,9,2,12,1",
      "3,3,3,3,2,4,3,1,5,3,18,6,3,17,7,3,16,8,3,15,9,3,14,1,3,13,2",
      "4,4,4,4,3,5,4,2,6,4,1,7,4,18,8,4,17,9,4,16,1,4,15,2,4,14,3",
      "5,5,5,5,4,6,5,3,7,5,2,8,5,1,9,5,18,1,5,17,2,5,16,3,5,15,4",
      "6,6,6,6,5,7,6,4,8,6,3,9,6,2,1,6,1,2,6,18,3,6,17,4,6,16,5",
      "7,7,7,7,6,8,7,5,9,7,4,1,7,3,2,7,2,3,7,1,4,7,18,5,7,17,6",
      "8,8,8,8,7,9,8,6,1,8,5,2,8,4,3,8,3,4,8,2,5,8,1,6,8,18,7",
      "9,9,9,9,8,1,9,7,2,9,6,3,9,5,4,9,4,5,9,3,6,9,2,7,9,1,8",
      "10,10,8,10,9,7,10,8,6,10,7,5,10,6,4,10,5,3,10,4,2,10,3,1,10,2,9",
      "11,11,7,11,10,6,11,9,5,11,8,4,11,7,3,11,6,2,11,5,1,11,4,9,11,3,8",
      "12,12,6,12,11,5,12,10,4,12,9,3,12,8,2,12,7,1,12,6,9,12,5,8,12,4,7",
      "13,13,5,13,12,4,13,11,3,13,10,2,13,9,1,13,8,9,13,7,8,13,6,7,13,5,6",
      "14,14,4,14,13,3,14,12,2,14,11,1,14,10,9,14,9,8,14,8,7,14,7,6,14,6,5",
      "15,15,3,15,14,2,15,13,1,15,12,9,15,11,8,15,10,7,15,9,6,15,8,5,15,7,4",
      "16,16,2,16,15,1,16,14,9,16,13,8,16,12,7,16,11,6,16,10,5,16,9,4,16,8,3",
      "17,17,1,17,16,9,17,15,8,17,14,7,17,13,6,17,12,5,17,11,4,17,10,3,17,9,2",
      "18,18,9,18,17,8,18,16,7,18,15,6,18,14,5,18,13,4,18,12,3,18,11,2,18,10,1",
    ],
  },
];

describe("generateWebMitchell golden comparison (even tables)", () => {
  describe.each(EVEN_WEB_BLOCKS)("$label", ({ tables, rounds, lines }) => {
    it("reproduces the reference block exactly", () => {
      const reference = parseBlockLines(lines);
      const generated = generatorTriples(tables, rounds);

      expect(reference.tableTriples).toEqual(generated);
    });
  });
});

/**
 * The odd-table rover blocks remain seeded; the generator does NOT reproduce
 * them (they use a rover/relay construction). Read those from the file and
 * assert the difference, documenting why odd-table Webs stay on seeded specs.
 */
describe("generateWebMitchell differs from the odd-table rover blocks", () => {
  const content = fs.readFileSync(
    path.join(process.cwd(), "src", "movement", "PSMovements.txt"),
    "latin1",
  );
  const fileLines = content.split(/\r?\n/);

  function parseSeededBlock(name: string, tables: number): ParsedBlock {
    for (let i = 0; i < fileLines.length; i++) {
      if (fileLines[i].trim() !== name) continue;
      const header = fileLines[i + 1]?.trim();
      if (!header) continue;
      if (Number(header.split(",")[1]) !== tables) continue;
      return parseBlockLines([
        header,
        ...Array.from({ length: tables }, (_, t) =>
          fileLines[i + 2 + t].trim(),
        ),
      ]);
    }
    throw new Error(`Block not found: "${name}" with ${tables} tables`);
  }

  const oddTargets: { name: string; tables: number; rounds: number }[] = [
    { name: "[WEB8R] 13 Table Web Mitchell (8 rounds)", tables: 13, rounds: 8 },
    { name: "[WEB8R] 15 Table Web Mitchell (8 rounds)", tables: 15, rounds: 8 },
    { name: "[WEB8R] 17 Table Web Mitchell (8 rounds)", tables: 17, rounds: 8 },
    { name: "[WEB9R] 19 Table Web Mitchell (9 rounds)", tables: 19, rounds: 9 },
  ];

  describe.each(oddTargets)("$name", ({ name, tables, rounds }) => {
    it("is not reproduced by the generator's rainbow construction", () => {
      const seeded = parseSeededBlock(name, tables);
      const generated = generatorTriples(tables, rounds);

      expect(seeded.tableTriples).not.toEqual(generated);
    });
  });
});
