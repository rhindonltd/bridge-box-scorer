import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  generateRoundRobinTeams,
  roundRobinTeamsSchedule,
} from "./round-robin-teams-pairing";
import type { Tables } from "@/model/movement";
import { teamOpponentKey } from "@/movement/swiss-teams/swiss-teams-pairing";

/**
 * Recover, for each team, the ordered list of opponents it meets across the
 * whole generated movement, reading straight off the expanded pair-seat ids.
 * A team's home pair is `${team}NS` and its away pair `${team}EW`, so at any
 * table the NS id names the home team and the EW id names the visiting team.
 */
function opponentsByTeam(movement: Tables): Map<number, number[]> {
  const byTeam = new Map<number, number[]>();
  const add = (team: number, opponent: number): void => {
    const list = byTeam.get(team) ?? [];
    list.push(opponent);
    byTeam.set(team, list);
  };

  for (const table of movement.tables) {
    for (const round of table.rounds) {
      const home = Number(round.participants.nsId.replace(/NS$/, ""));
      const away = Number(round.participants.ewId.replace(/EW$/, ""));
      // Each physical table is one room of a match; record the encounter from
      // the home team's perspective (the mirror room records the reverse).
      add(home, away);
    }
  }

  return byTeam;
}

describe("roundRobinTeamsSchedule", () => {
  it("plays every team exactly once per round", () => {
    const rounds = roundRobinTeamsSchedule(6, 5);
    expect(rounds).toHaveLength(5);

    for (const round of rounds) {
      const seen = new Set<number>();
      for (const { a, b } of round) {
        expect(seen.has(a)).toBe(false);
        expect(seen.has(b)).toBe(false);
        seen.add(a);
        seen.add(b);
      }
      // All six teams appear (three matches).
      expect(seen).toEqual(new Set([1, 2, 3, 4, 5, 6]));
      expect(round).toHaveLength(3);
    }
  });

  it("meets every opponent exactly once across a full round robin", () => {
    const teams = 8;
    const rounds = roundRobinTeamsSchedule(teams, teams - 1);

    const seenPairs = new Set<string>();
    for (const round of rounds) {
      for (const { a, b } of round) {
        const key = teamOpponentKey(a, b);
        expect(seenPairs.has(key)).toBe(false);
        seenPairs.add(key);
      }
    }

    // A full round robin of N teams has N*(N-1)/2 distinct matches.
    expect(seenPairs.size).toBe((teams * (teams - 1)) / 2);
  });

  it("returns fewer rounds than a full robin when asked", () => {
    const rounds = roundRobinTeamsSchedule(6, 2);
    expect(rounds).toHaveLength(2);
    // Still no repeat opponents within the shortened event.
    const seen = new Set<string>();
    for (const round of rounds) {
      for (const { a, b } of round) {
        const key = teamOpponentKey(a, b);
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });
});

describe("generateRoundRobinTeams", () => {
  it("expands to every physical table carrying every round", () => {
    const movement = generateRoundRobinTeams({
      teams: 6,
      rounds: 5,
      boardsPerRound: 4,
    });

    // One physical table per team (each team's home table hosts a room).
    expect(movement.tables.map((t) => t.table)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const table of movement.tables) {
      expect(table.rounds.map((r) => r.round)).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("applies the correct board range per round", () => {
    const bpr = 4;
    const movement = generateRoundRobinTeams({
      teams: 6,
      rounds: 5,
      boardsPerRound: bpr,
    });

    for (const table of movement.tables) {
      for (const round of table.rounds) {
        const start = (round.round - 1) * bpr + 1;
        const expected = Array.from({ length: bpr }, (_, i) => start + i);
        expect(round.boards).toEqual(expected);
      }
    }
  });

  it("uses the home NS / away EW seat convention at each table", () => {
    const movement = generateRoundRobinTeams({
      teams: 4,
      rounds: 3,
      boardsPerRound: 2,
    });

    for (const table of movement.tables) {
      for (const round of table.rounds) {
        // NS is always this table's own team (its home pair never moves).
        expect(round.participants.nsId).toBe(`${table.table}NS`);
        // EW is some other team's away pair.
        const away = Number(round.participants.ewId.replace(/EW$/, ""));
        expect(round.participants.ewId).toBe(`${away}EW`);
        expect(away).not.toBe(table.table);
      }
    }
  });

  it("has each team meet every other team exactly once over a full robin", () => {
    const teams = 6;
    const movement = generateRoundRobinTeams({
      teams,
      rounds: teams - 1,
      boardsPerRound: 3,
    });

    const opponents = opponentsByTeam(movement);
    for (let team = 1; team <= teams; team++) {
      const met = opponents.get(team) ?? [];
      const others = Array.from({ length: teams }, (_, i) => i + 1).filter(
        (t) => t !== team,
      );
      // Every other team met exactly once (no repeats, no self).
      expect([...met].sort((a, b) => a - b)).toEqual(others);
    }
  });

  it("throws on an odd team count", () => {
    expect(() =>
      generateRoundRobinTeams({ teams: 5, rounds: 4, boardsPerRound: 2 }),
    ).toThrow(/even team count/);
  });

  it("throws when asked for more rounds than a full round robin", () => {
    expect(() =>
      generateRoundRobinTeams({ teams: 4, rounds: 4, boardsPerRound: 2 }),
    ).toThrow(/at most 3 rounds/);
  });

  it("throws on a non-positive boardsPerRound", () => {
    expect(() =>
      generateRoundRobinTeams({ teams: 4, rounds: 3, boardsPerRound: 0 }),
    ).toThrow(/boardsPerRound/);
  });
});

/**
 * Cross-check our understanding of the `TSMovements.txt` round-robin layout:
 * each table row is a sequence of (homeTeam, opponentTeam, boardSet) triples,
 * one per round. This decodes the shipped "5 Table Round Robin Teams" block and
 * asserts the format so the generator and the file stay describable in the same
 * terms. (The shipped blocks are odd-team layouts, which the generator itself
 * does not target yet — this only validates the shared triple format.)
 */
describe("TSMovements round-robin format", () => {
  it("decodes the 5-table block as (home, opponent, boardSet) triples", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "TSMovements.txt"),
      "utf-8",
    );

    const lines = content.split(/\r?\n/);
    const headerIdx = lines.findIndex((l) =>
      l.startsWith("5 Table Round Robin Teams"),
    );
    expect(headerIdx).toBeGreaterThan(-1);

    // The line after the header is the movement header:
    // type, tables, boardSets, boardsPerSet, rounds.
    const header = lines[headerIdx + 1].split(",").map((n) => parseInt(n, 10));
    const [, tables, , , rounds] = header;
    expect(tables).toBe(5);
    expect(rounds).toBe(4);

    // Each of the next `tables` lines is a table's per-round triples.
    for (let t = 0; t < tables; t++) {
      const nums = lines[headerIdx + 2 + t].split(",").map((n) => parseInt(n, 10));
      expect(nums.length).toBe(rounds * 3);

      for (let r = 0; r < rounds; r++) {
        const home = nums[r * 3];
        // The first element of every triple on table t's row is its own team.
        expect(home).toBe(t + 1);
      }
    }
  });
});
