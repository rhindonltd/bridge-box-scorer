import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { generateWebMitchell } from "./web-mitchell";

/**
 * Golden test: the even-table Web generator must reproduce the seeded
 * PSMovements.txt Web blocks exactly, because those seeded specs are the
 * movements directors have historically run. This is what makes it safe to
 * resolve even-table Web recommendations to the generator instead of the
 * seeded spec.
 *
 * The odd-table blocks ([WEB8R]/[WEB9R]) use a rover/relay construction the
 * generator's plain rainbow does NOT reproduce, so we assert they differ — and
 * odd-table Webs stay on the seeded specs (see resolve-recommendation.ts).
 */

type Triple = [ns: number, ew: number, boardSet: number];

/** A parsed PSMovements block: its name, header numbers, and per-table triples. */
interface ParsedBlock {
  name: string;
  tables: number;
  rounds: number;
  boardsPerRound: number;
  /** tableTriples[t] = the (ns, ew, set) triples for table t+1, in round order. */
  tableTriples: Triple[][];
}

function loadPsMovements(): string {
  const file = path.join(
    process.cwd(),
    "src",
    "movement",
    "PSMovements.txt",
  );
  // The file is latin1-encoded (see gen-web-mitchell script).
  return fs.readFileSync(file, "latin1");
}

/**
 * Find and parse the block introduced by an exact name line. Returns the first
 * block whose name line matches and whose header table count equals `tables`.
 */
function parseBlock(
  content: string,
  name: string,
  tables: number,
): ParsedBlock {
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== name) continue;

    const header = lines[i + 1]?.trim();
    if (!header) continue;

    // Header: start,tables,totalBoards,boardsPerRound,rounds,missing
    const headerNums = header.split(",").map((n) => Number(n));
    const [, headerTables, , boardsPerRound, rounds] = headerNums;

    if (headerTables !== tables) continue;

    const tableTriples: Triple[][] = [];
    for (let t = 0; t < headerTables; t++) {
      const row = lines[i + 2 + t]?.trim();
      if (!row) break;
      const nums = row.split(",").map((n) => Number(n));
      const triples: Triple[] = [];
      for (let k = 0; k + 2 < nums.length; k += 3) {
        triples.push([nums[k], nums[k + 1], nums[k + 2]]);
      }
      tableTriples.push(triples);
    }

    return { name, tables: headerTables, rounds, boardsPerRound, tableTriples };
  }

  throw new Error(`Block not found: "${name}" with ${tables} tables`);
}

/** Reduce the generator output to (ns, ew, boardSet) triples per table. */
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
      // The seeded blocks number board sets 1..rounds; the generator's first
      // board number maps back to its set as floor((first-1)/perRound)+1.
      const boardSet = Math.floor((round.boards[0] - 1) / 3) + 1;
      return [ns, ew, boardSet];
    }),
  );
}

describe("generateWebMitchell golden comparison with PSMovements.txt", () => {
  const content = loadPsMovements();

  const evenTargets: { name: string; tables: number; rounds: number }[] = [
    { name: "[WEB8] 14 Table Web Mitchell (8 rounds)", tables: 14, rounds: 8 },
    { name: "[WEB8] 16 Table Web Mitchell (8 rounds)", tables: 16, rounds: 8 },
    { name: "[WEB8] 18 Table Web Mitchell (8 rounds)", tables: 18, rounds: 8 },
    { name: "[WEB8] 20 Table Web Mitchell (8 rounds)", tables: 20, rounds: 8 },
    { name: "[WEB9] 18 Table Web Mitchell (9 rounds)", tables: 18, rounds: 9 },
  ];

  describe.each(evenTargets)(
    "$name",
    ({ name, tables, rounds }) => {
      it("reproduces the seeded block exactly", () => {
        const seeded = parseBlock(content, name, tables);
        const generated = generatorTriples(tables, rounds);

        expect(seeded.tableTriples).toEqual(generated);
      });
    },
  );

  const oddTargets: { name: string; tables: number; rounds: number }[] = [
    { name: "[WEB8R] 13 Table Web Mitchell (8 rounds)", tables: 13, rounds: 8 },
    { name: "[WEB8R] 15 Table Web Mitchell (8 rounds)", tables: 15, rounds: 8 },
    { name: "[WEB8R] 17 Table Web Mitchell (8 rounds)", tables: 17, rounds: 8 },
    { name: "[WEB9R] 19 Table Web Mitchell (9 rounds)", tables: 19, rounds: 9 },
  ];

  describe.each(oddTargets)("$name (rover — not generated)", ({ name, tables, rounds }) => {
    it("differs from the generator's rainbow construction", () => {
      const seeded = parseBlock(content, name, tables);
      const generated = generatorTriples(tables, rounds);

      // The seeded rover blocks are intentionally NOT reproduced by the
      // generator; this documents why odd-table Webs stay on the seeded specs.
      expect(seeded.tableTriples).not.toEqual(generated);
    });
  });
});
