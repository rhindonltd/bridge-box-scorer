/**
 * The American Whist teams movement, for an odd number of teams.
 *
 * A team is the two pairs seated at one home table: its North/South pair stays
 * at that table all session, and its East/West pair travels. Each round every
 * East/West pair moves down two tables and every board set moves down one
 * table (both wrapping round from table 1 to the highest). With n teams:
 *
 * - in round k, table t's home pair plays team t + 2k's away pair on board set
 *   t + k − 1 (counted round past n);
 * - there are n − 1 rounds, and every team meets every other team once, in one
 *   match per round;
 * - there are n board sets, one copy each, all in play every round;
 * - a match's two rooms play the same set in two different rounds (team A's
 *   home pair meets team B's away pair in round k, and B's home pair meets A's
 *   away pair in round n − k).
 *
 * Moving down two only reaches every table when the team count is odd, so an
 * even count is rejected. Pure: no framework or I/O.
 */

import type { Table, Tables } from "@/model/movement";
import { boardsForSet } from "@/modules/movement-catalog/pairs/mitchell/mitchell-utils";

/** Setup parameters for an American Whist teams movement. */
export interface AmericanWhistTeamsSpec {
  /** Number of teams (equals the table count); must be odd and at least 3. */
  teams: number;
  /** Boards played per round. */
  boardsPerRound: number;
}

/** The number of rounds an American Whist of `teams` teams plays. */
export function americanWhistTeamsRounds(teams: number): number {
  return teams - 1;
}

/** Whether an American Whist teams movement can be built for `teams` teams. */
export function isAmericanWhistTeamCount(teams: number): boolean {
  return Number.isInteger(teams) && teams >= 3 && teams % 2 === 1;
}

/** `n`'s position `offset` places on from `from`, in 1..n. */
function wrap(from: number, offset: number, n: number): number {
  return ((from - 1 + offset) % n) + 1;
}

/**
 * Generate an American Whist teams movement as a fully-expanded `Tables`, with
 * board numbers applied from `boardsPerRound` (board set s is boards
 * (s − 1)·bpr + 1 .. s·bpr). Participant ids follow the shared teams
 * convention: a team's home pair is "${T}NS" and its away pair "${T}EW".
 *
 * @throws when the team count is not odd and at least 3, or boardsPerRound is
 *   not a positive integer.
 */
export function generateAmericanWhistTeams(
  spec: AmericanWhistTeamsSpec,
): Tables {
  const { teams, boardsPerRound } = spec;
  if (!isAmericanWhistTeamCount(teams)) {
    throw new Error(
      `American Whist needs an odd number of teams (at least 3), got ${teams}`,
    );
  }
  if (!Number.isInteger(boardsPerRound) || boardsPerRound < 1) {
    throw new Error("boardsPerRound must be a positive integer");
  }

  const rounds = americanWhistTeamsRounds(teams);
  const tables: Table[] = [];
  for (let table = 1; table <= teams; table++) {
    const tableRounds: Table["rounds"] = [];
    for (let round = 1; round <= rounds; round++) {
      const visitor = wrap(table, 2 * round, teams);
      const boardSet = wrap(table, round - 1, teams);
      tableRounds.push({
        round,
        boards: boardsForSet(boardSet, boardsPerRound),
        participants: { nsId: `${table}NS`, ewId: `${visitor}EW` },
      });
    }
    tables.push({ table, rounds: tableRounds });
  }
  return { tables };
}
