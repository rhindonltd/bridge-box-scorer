/**
 * Pure Teams Round Robin generator.
 *
 * A team is the two pairs seated at one home table: the pair sitting North/
 * South stays there all event (the "home" pair), and the pair sitting East/
 * West travels to face other teams (the "away" pair). A team's stable id is its
 * home table number (1..teams) — the same convention Swiss Teams uses, so the
 * seating expansion (`expandTeamMatches`) and all downstream teams scoring are
 * shared.
 *
 * Unlike Swiss Teams, a round robin's whole schedule is fixed and known up
 * front: every team plays every other team exactly once. The schedule is built
 * with the classic circle (polygon) method — team 1 is held fixed while the
 * remaining teams rotate one position each round, which pairs each team against
 * a new opponent every round with no repeats. A full round robin of N teams
 * runs N-1 rounds; the caller may ask for fewer (a shortened event) but never
 * more.
 *
 * Scope: the team count must be even. Odd counts need a bye each round
 * (three-way / sit-out handling), which is future work — `generateRoundRobinTeams`
 * throws on an odd count rather than guessing.
 *
 * This module is framework/IO-free: all persistence, scoring and socket
 * plumbing lives elsewhere. It mirrors the pairs generator contract
 * (`generateMitchell`): it takes a spec `{ teams, rounds, boardsPerRound }` and
 * returns a fully-expanded `Tables` with board numbers already applied, ready
 * to map to the DB materialization shape.
 */

import { Table, Tables } from "@/model/movement";
import { boardsForSet } from "@/movement/mitchell/mitchell-utils";
import {
  TeamsMatch,
  expandTeamMatches,
  teamIds,
} from "@/movement/swiss-teams/swiss-teams-pairing";

/** Setup parameters for a Teams Round Robin. */
export interface RoundRobinTeamsSpec {
  /** Number of teams (equals the table count); must be even. */
  teams: number;
  /** Rounds to play; capped at a full round robin (teams - 1). */
  rounds: number;
  /** Boards played per round (fixes each round's board range). */
  boardsPerRound: number;
}

/** Order a match's ids so the lower id is `a` (canonical form). */
function normalizeMatch(x: number, y: number): TeamsMatch {
  return x <= y ? { a: x, b: y } : { a: y, b: x };
}

/** Sort matches by their lower team id for a stable, readable order. */
function sortMatches(matches: TeamsMatch[]): TeamsMatch[] {
  return [...matches].sort((m, n) => m.a - n.a);
}

/**
 * Build the full round-robin schedule as one `TeamsMatch[]` per round, using
 * the circle method. Team 1 is fixed; the other teams rotate one step each
 * round. Returns exactly `rounds` rounds (each a complete pairing of all
 * teams), where `rounds` has already been validated to be within 1..teams-1.
 *
 * Exported for testing the pure schedule independently of the board layout.
 */
export function roundRobinTeamsSchedule(
  teams: number,
  rounds: number,
): TeamsMatch[][] {
  // Working order of team ids; index 0 stays fixed, the rest rotate.
  const order = teamIds(teams);
  const half = teams / 2;

  const schedule: TeamsMatch[][] = [];

  for (let round = 0; round < rounds; round++) {
    const matches: TeamsMatch[] = [];
    for (let i = 0; i < half; i++) {
      // Pair the i-th from the front with the i-th from the back.
      matches.push(normalizeMatch(order[i], order[teams - 1 - i]));
    }
    schedule.push(sortMatches(matches));

    // Rotate everything except the fixed first element: the last non-fixed
    // team moves to the front of the rotating block.
    const rotating = order.slice(1);
    rotating.unshift(rotating.pop() as number);
    for (let i = 1; i < teams; i++) {
      order[i] = rotating[i - 1];
    }
  }

  return schedule;
}

/**
 * Validate a Teams Round Robin spec and clamp/reject as documented.
 *
 * @throws if the team count is not an even positive integer, if
 *   `boardsPerRound` is not a positive integer, or if `rounds` is not a
 *   positive integer within 1..teams-1 (more rounds than a full round robin is
 *   impossible without repeating opponents).
 */
function validateSpec(spec: RoundRobinTeamsSpec): void {
  const { teams, rounds, boardsPerRound } = spec;

  if (!Number.isInteger(teams) || teams < 2) {
    throw new Error("teams must be an integer of at least 2");
  }
  if (teams % 2 !== 0) {
    throw new Error(
      `Teams Round Robin requires an even team count, got ${teams}`,
    );
  }
  if (!Number.isInteger(boardsPerRound) || boardsPerRound < 1) {
    throw new Error("boardsPerRound must be a positive integer");
  }
  if (!Number.isInteger(rounds) || rounds < 1) {
    throw new Error("rounds must be a positive integer");
  }
  if (rounds > teams - 1) {
    throw new Error(
      `A round robin of ${teams} teams has at most ${teams - 1} rounds, got ${rounds}`,
    );
  }
}

/**
 * Generate a Teams Round Robin as a fully-expanded `Tables` movement, mirroring
 * `generateMitchell`'s contract.
 *
 * Each round's team matches are expanded into their two physical tables (open
 * room at each home table, away pair travelling) via the shared
 * `expandTeamMatches`, and the round's board numbers are applied from
 * `boardsPerRound` (round r plays board set r). Every table therefore carries a
 * row for each round, so the whole schedule is materialized at start with no
 * live draw.
 *
 * Participant ids follow the shared teams convention: a team's home pair is
 * `${team}NS` (never moves) and its away pair is `${team}EW` (travels to the
 * opponent's home table). `buildSectionRows` prefixes the section later.
 */
export function generateRoundRobinTeams(spec: RoundRobinTeamsSpec): Tables {
  validateSpec(spec);

  const { teams, rounds, boardsPerRound } = spec;
  const schedule = roundRobinTeamsSchedule(teams, rounds);

  // Accumulate rounds per physical table (1..teams). Every table hosts exactly
  // one match room in every round, so each table ends with `rounds` entries.
  const roundsByTable = new Map<number, Table["rounds"]>();
  for (let table = 1; table <= teams; table++) {
    roundsByTable.set(table, []);
  }

  schedule.forEach((matches, roundIndex) => {
    const roundNumber = roundIndex + 1;
    const boards = boardsForSet(roundNumber, boardsPerRound);

    for (const placement of expandTeamMatches(matches)) {
      roundsByTable.get(placement.tableNumber)!.push({
        round: roundNumber,
        boards,
        participants: {
          nsId: `${placement.nsTeam}NS`,
          ewId: `${placement.ewTeam}EW`,
        },
      });
    }
  });

  const tables: Table[] = Array.from(roundsByTable.entries())
    .sort(([a], [b]) => a - b)
    .map(([table, tableRounds]) => ({ table, rounds: tableRounds }));

  return { tables };
}
