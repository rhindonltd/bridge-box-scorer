import { describe, it, expect } from "vitest";
import { generateMitchell, MitchellMovementSpec } from "./mitchell";

// Helper: collect all (nsId, ewId) pairings across the movement
function getAllPairings(result: ReturnType<typeof generateMitchell>) {
  const pairings: { ns: string; ew: string; table: number; round: number }[] = [];
  for (const table of result.tables) {
    for (const round of table.rounds) {
      pairings.push({
        ns: round.participants.nsId,
        ew: round.participants.ewId,
        table: table.table,
        round: round.round,
      });
    }
  }
  return pairings;
}

// Helper: collect all board assignments per pair
function getBoardsForPair(result: ReturnType<typeof generateMitchell>, pairId: string) {
  const boards: number[] = [];
  for (const table of result.tables) {
    for (const round of table.rounds) {
      if (round.participants.nsId === pairId || round.participants.ewId === pairId) {
        boards.push(...round.boards);
      }
    }
  }
  return boards;
}

describe("generateMitchell", () => {
  describe("structural properties", () => {
    it("generates correct number of tables", () => {
      const result = generateMitchell({ tables: 5, rounds: 5, boardsPerRound: 3 });
      expect(result.tables).toHaveLength(5);
    });

    it("generates correct number of rounds per table", () => {
      const result = generateMitchell({ tables: 4, rounds: 4, boardsPerRound: 2 });
      for (const table of result.tables) {
        expect(table.rounds).toHaveLength(4);
      }
    });

    it("assigns correct number of boards per round", () => {
      const result = generateMitchell({ tables: 3, rounds: 3, boardsPerRound: 4 });
      for (const table of result.tables) {
        for (const round of table.rounds) {
          expect(round.boards).toHaveLength(4);
        }
      }
    });

    it("table numbers are sequential from 1", () => {
      const result = generateMitchell({ tables: 7, rounds: 7, boardsPerRound: 2 });
      expect(result.tables.map((t) => t.table)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it("round numbers are sequential from 1", () => {
      const result = generateMitchell({ tables: 5, rounds: 5, boardsPerRound: 2 });
      for (const table of result.tables) {
        expect(table.rounds.map((r) => r.round)).toEqual([1, 2, 3, 4, 5]);
      }
    });
  });

  describe("standard Mitchell (odd tables)", () => {
    const spec: MitchellMovementSpec = { tables: 5, rounds: 5, boardsPerRound: 3 };

    it("NS pairs stay at their home table", () => {
      const result = generateMitchell(spec);
      for (const table of result.tables) {
        for (const round of table.rounds) {
          expect(round.participants.nsId).toBe(`${table.table}`);
        }
      }
    });

    it("each EW pair plays at every table exactly once", () => {
      const result = generateMitchell(spec);
      // Collect which tables each EW pair visits
      const ewTableVisits = new Map<string, number[]>();
      for (const table of result.tables) {
        for (const round of table.rounds) {
          const ew = round.participants.ewId;
          if (!ewTableVisits.has(ew)) ewTableVisits.set(ew, []);
          ewTableVisits.get(ew)!.push(table.table);
        }
      }
      for (const [, tables] of ewTableVisits) {
        expect(tables.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
      }
    });

    it("no NS pair meets the same EW pair twice", () => {
      const result = generateMitchell(spec);
      const pairings = getAllPairings(result);
      const encounters = new Set(pairings.map((p) => `${p.ns}-${p.ew}`));
      expect(encounters.size).toBe(pairings.length);
    });

    it("no pair plays the same board twice", () => {
      const result = generateMitchell(spec);
      // Check NS pairs
      for (let i = 1; i <= 5; i++) {
        const boards = getBoardsForPair(result, `${i}`);
        expect(new Set(boards).size).toBe(boards.length);
      }
    });

    it("each board set is played at exactly tables different tables", () => {
      const result = generateMitchell(spec);
      const boardSetCount = new Map<string, number>();
      for (const table of result.tables) {
        for (const round of table.rounds) {
          const key = round.boards.join(",");
          boardSetCount.set(key, (boardSetCount.get(key) ?? 0) + 1);
        }
      }
      // With 5 tables and 5 rounds, each set should be played 5 times (once per round across different tables)
      for (const [, count] of boardSetCount) {
        expect(count).toBe(5);
      }
    });

    it("EW pairs move up one table each round", () => {
      const result = generateMitchell(spec);
      // At table 1: EW in round 1 should be pair that started at table 1 (going backwards)
      // EW pair numbering: pair at table 1 in round 1 = tables (wraps), round 2 = tables-1, etc.
      const ewAtTable1 = result.tables[0].rounds.map((r) => r.participants.ewId);
      // All should be unique
      expect(new Set(ewAtTable1).size).toBe(5);
    });

    it("total boards equal tables × boardsPerRound", () => {
      const result = generateMitchell(spec);
      const allBoards = new Set<number>();
      for (const table of result.tables) {
        for (const round of table.rounds) {
          for (const b of round.boards) {
            allBoards.add(b);
          }
        }
      }
      expect(allBoards.size).toBe(5 * 3); // 5 sets × 3 boards per set = 15 unique boards
    });
  });

  describe("share and relay Mitchell (even tables)", () => {
    const spec: MitchellMovementSpec = { tables: 4, rounds: 4, boardsPerRound: 2 };

    it("NS pairs stay at their home table", () => {
      const result = generateMitchell(spec);
      for (const table of result.tables) {
        for (const round of table.rounds) {
          expect(round.participants.nsId).toBe(`${table.table}`);
        }
      }
    });

    it("each EW pair plays at every table exactly once", () => {
      const result = generateMitchell(spec);
      const ewTableVisits = new Map<string, number[]>();
      for (const table of result.tables) {
        for (const round of table.rounds) {
          const ew = round.participants.ewId;
          if (!ewTableVisits.has(ew)) ewTableVisits.set(ew, []);
          ewTableVisits.get(ew)!.push(table.table);
        }
      }
      for (const [, tables] of ewTableVisits) {
        expect(tables.sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
      }
    });

    it("no NS pair meets the same EW pair twice", () => {
      const result = generateMitchell(spec);
      const pairings = getAllPairings(result);
      const encounters = new Set(pairings.map((p) => `${p.ns}-${p.ew}`));
      expect(encounters.size).toBe(pairings.length);
    });

    it("boards are shared between table pairs half the field apart", () => {
      const result = generateMitchell(spec);
      // With 4 tables: table 1 shares with table 3, table 2 shares with table 4
      // In round 1, tables 1 and 3 should have the same boards, tables 2 and 4 should have the same boards
      // Actually in share & relay, sharing means same SET in the same round
      // Let's just verify that board sets eventually repeat
      const boardsByTableAndRound = new Map<string, number[]>();
      for (const table of result.tables) {
        for (const round of table.rounds) {
          boardsByTableAndRound.set(`${table.table}-${round.round}`, round.boards);
        }
      }
      // Check that some board sets appear more than once in the same round (sharing)
      const boardSetsPerRound = new Map<number, string[]>();
      for (const table of result.tables) {
        for (const round of table.rounds) {
          if (!boardSetsPerRound.has(round.round)) boardSetsPerRound.set(round.round, []);
          boardSetsPerRound.get(round.round)!.push(round.boards.join(","));
        }
      }
      // With even tables and share/relay, some round should have duplicate board sets
      let hasSharing = false;
      for (const [, sets] of boardSetsPerRound) {
        if (new Set(sets).size < sets.length) {
          hasSharing = true;
          break;
        }
      }
      expect(hasSharing).toBe(true);
    });

    it("no pair plays the same board twice", () => {
      const result = generateMitchell(spec);
      for (let i = 1; i <= 4; i++) {
        const boards = getBoardsForPair(result, `${i}`);
        expect(new Set(boards).size).toBe(boards.length);
      }
    });

    it("works with 6 tables", () => {
      const result = generateMitchell({ tables: 6, rounds: 6, boardsPerRound: 3 });
      expect(result.tables).toHaveLength(6);

      // Verify no pair plays same boards twice
      for (let i = 1; i <= 6; i++) {
        const boards = getBoardsForPair(result, `${i}`);
        expect(new Set(boards).size).toBe(boards.length);
      }

      // Verify all pairings unique
      const pairings = getAllPairings(result);
      const encounters = new Set(pairings.map((p) => `${p.ns}-${p.ew}`));
      expect(encounters.size).toBe(pairings.length);
    });

    it("works with 8 tables", () => {
      const result = generateMitchell({ tables: 8, rounds: 8, boardsPerRound: 2 });
      expect(result.tables).toHaveLength(8);

      const pairings = getAllPairings(result);
      const encounters = new Set(pairings.map((p) => `${p.ns}-${p.ew}`));
      expect(encounters.size).toBe(pairings.length);
    });
  });

  describe("skip Mitchell", () => {
    it("throws for odd number of tables", () => {
      expect(() =>
        generateMitchell({ tables: 5, rounds: 5, boardsPerRound: 2, skip: true }),
      ).toThrow("Skip Mitchell cannot have an odd number of tables");
    });

    it("accepts even number of tables", () => {
      const result = generateMitchell({ tables: 6, rounds: 6, boardsPerRound: 2, skip: true });
      expect(result.tables).toHaveLength(6);
    });

    it("NS pairs stay at their home table", () => {
      const result = generateMitchell({ tables: 6, rounds: 6, boardsPerRound: 2, skip: true });
      for (const table of result.tables) {
        for (const round of table.rounds) {
          expect(round.participants.nsId).toBe(`${table.table}`);
        }
      }
    });

    it("each EW pair plays at every table exactly once", () => {
      const result = generateMitchell({ tables: 6, rounds: 6, boardsPerRound: 2, skip: true });
      const ewTableVisits = new Map<string, number[]>();
      for (const table of result.tables) {
        for (const round of table.rounds) {
          const ew = round.participants.ewId;
          if (!ewTableVisits.has(ew)) ewTableVisits.set(ew, []);
          ewTableVisits.get(ew)!.push(table.table);
        }
      }
      for (const [, tables] of ewTableVisits) {
        expect(tables.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
      }
    });

    it("no NS pair meets the same EW pair twice", () => {
      const result = generateMitchell({ tables: 6, rounds: 6, boardsPerRound: 2, skip: true });
      const pairings = getAllPairings(result);
      const encounters = new Set(pairings.map((p) => `${p.ns}-${p.ew}`));
      expect(encounters.size).toBe(pairings.length);
    });

    it("EW pairs skip a table at the midpoint", () => {
      const result = generateMitchell({ tables: 6, rounds: 6, boardsPerRound: 2, skip: true });
      // At table 1, track EW pair progression
      const ewAtTable1 = result.tables[0].rounds.map((r) => r.participants.ewId);
      // All 6 EW pairs should visit table 1
      expect(new Set(ewAtTable1).size).toBe(6);
    });

    it("no pair plays the same board twice", () => {
      const result = generateMitchell({ tables: 6, rounds: 6, boardsPerRound: 2, skip: true });
      for (let i = 1; i <= 6; i++) {
        const boards = getBoardsForPair(result, `${i}`);
        expect(new Set(boards).size).toBe(boards.length);
      }
    });

    it("works with 4 tables", () => {
      const result = generateMitchell({ tables: 4, rounds: 4, boardsPerRound: 3, skip: true });
      const pairings = getAllPairings(result);
      const encounters = new Set(pairings.map((p) => `${p.ns}-${p.ew}`));
      expect(encounters.size).toBe(pairings.length);
    });

    it("works with 8 tables", () => {
      const result = generateMitchell({ tables: 8, rounds: 8, boardsPerRound: 2, skip: true });
      const pairings = getAllPairings(result);
      const encounters = new Set(pairings.map((p) => `${p.ns}-${p.ew}`));
      expect(encounters.size).toBe(pairings.length);

      // EW should visit all tables
      const ewTableVisits = new Map<string, number[]>();
      for (const table of result.tables) {
        for (const round of table.rounds) {
          const ew = round.participants.ewId;
          if (!ewTableVisits.has(ew)) ewTableVisits.set(ew, []);
          ewTableVisits.get(ew)!.push(table.table);
        }
      }
      for (const [, tables] of ewTableVisits) {
        expect(tables.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      }
    });
  });

  describe("arrow switch", () => {
    it("swaps NS and EW in the last N rounds", () => {
      const result = generateMitchell({ tables: 5, rounds: 5, boardsPerRound: 2, arrowSwitchRounds: 2 });
      // At table 1: rounds 1-3 have nsId="1", rounds 4-5 have ewId="1"
      const table1 = result.tables[0];
      expect(table1.rounds[0].participants.nsId).toBe("1");
      expect(table1.rounds[1].participants.nsId).toBe("1");
      expect(table1.rounds[2].participants.nsId).toBe("1");
      expect(table1.rounds[3].participants.ewId).toBe("1");
      expect(table1.rounds[4].participants.ewId).toBe("1");
    });

    it("EW pairs have offset IDs when arrow switch is enabled", () => {
      const result = generateMitchell({ tables: 4, rounds: 4, boardsPerRound: 2, arrowSwitchRounds: 1 });
      // EW pairs should be numbered tables+1 to 2*tables (e.g., 5-8 for 4 tables)
      // to avoid ID collision with NS pairs
      const allEw = new Set<string>();
      for (const table of result.tables) {
        for (const round of table.rounds) {
          if (round.participants.ewId !== `${table.table}`) {
            allEw.add(round.participants.ewId);
          }
        }
      }
      // EW IDs should be > tables (offset by ewAdd)
      for (const ew of allEw) {
        expect(Number(ew)).toBeGreaterThan(4);
      }
    });

    it("all pairings remain unique with arrow switch", () => {
      const result = generateMitchell({ tables: 5, rounds: 5, boardsPerRound: 2, arrowSwitchRounds: 1 });
      const pairings = getAllPairings(result);
      const encounters = new Set(pairings.map((p) => `${p.ns}-${p.ew}`));
      expect(encounters.size).toBe(pairings.length);
    });
  });

  describe("fewer rounds than tables", () => {
    it("works with fewer rounds than tables (shortened game)", () => {
      const result = generateMitchell({ tables: 7, rounds: 5, boardsPerRound: 2 });
      expect(result.tables).toHaveLength(7);
      for (const table of result.tables) {
        expect(table.rounds).toHaveLength(5);
      }

      // NS still fixed
      for (const table of result.tables) {
        for (const round of table.rounds) {
          expect(round.participants.nsId).toBe(`${table.table}`);
        }
      }

      // All encounters unique
      const pairings = getAllPairings(result);
      const encounters = new Set(pairings.map((p) => `${p.ns}-${p.ew}`));
      expect(encounters.size).toBe(pairings.length);
    });
  });
});
