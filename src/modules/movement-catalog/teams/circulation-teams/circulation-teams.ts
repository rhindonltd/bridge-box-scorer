/**
 * The Circulation teams movement, for exactly four teams.
 *
 * A team is the two pairs seated at one home table: its North/South pair stays
 * at that table all session, and its East/West pair plays at the opponents'
 * table. There are three rounds, each one match per pair of teams:
 *
 * - round 1: team 1 v team 2 and team 3 v team 4;
 * - round 2: team 1 v team 3 and team 2 v team 4;
 * - round 3: team 1 v team 4 and team 2 v team 3.
 *
 * Each round has its own boards. At the start of a round they are shared out
 * evenly, table 1 taking the first quarter, table 2 the next, and so on, and
 * each time a table finishes its boards they pass to the next table down
 * (table 1 passes to table 4). So every table plays every board of the round,
 * starting on its own quarter, and both rooms of each match play the same
 * boards. One copy of each board.
 *
 * Pure: no framework or I/O.
 */

import type { Table, Tables } from "@/model/movement";

/** Setup parameters for a Circulation teams movement. */
export interface CirculationTeamsSpec {
  /** Boards played per round (one match); a multiple of 4. */
  boardsPerRound: number;
}

/** A Circulation is always four teams, one table each. */
export const CIRCULATION_TEAMS = 4;

/** A Circulation always plays three rounds: one match against each team. */
export const CIRCULATION_ROUNDS = 3;

/**
 * Team `team`'s opponent in `round`. Numbering the teams from 0, a team's
 * opponent is its number with the round's bits flipped: 0-1 and 2-3 in round 1,
 * 0-2 and 1-3 in round 2, 0-3 and 1-2 in round 3.
 */
function opponentOf(team: number, round: number): number {
  return ((team - 1) ^ round) + 1;
}

/**
 * Generate a Circulation teams movement as a fully-expanded `Tables`. Each
 * round's boards are listed in the order the table plays them, starting on its
 * own quarter. Participant ids follow the shared teams convention: a team's
 * home pair is "${T}NS" and its away pair "${T}EW".
 *
 * @throws when boardsPerRound is not a positive multiple of 4.
 */
export function generateCirculationTeams(spec: CirculationTeamsSpec): Tables {
  const { boardsPerRound } = spec;
  if (
    !Number.isInteger(boardsPerRound) ||
    boardsPerRound < CIRCULATION_TEAMS ||
    boardsPerRound % CIRCULATION_TEAMS !== 0
  ) {
    throw new Error(
      `A Circulation needs a positive multiple of ${CIRCULATION_TEAMS} boards per round, got ${boardsPerRound}`,
    );
  }

  const tables: Table[] = [];
  for (let table = 1; table <= CIRCULATION_TEAMS; table++) {
    const tableRounds: Table["rounds"] = [];
    for (let round = 1; round <= CIRCULATION_ROUNDS; round++) {
      const firstOfRound = (round - 1) * boardsPerRound + 1;
      const quarter = boardsPerRound / CIRCULATION_TEAMS;
      // The table starts on its own quarter, then plays on round the rest.
      const start = (table - 1) * quarter;
      const boards = Array.from(
        { length: boardsPerRound },
        (_, i) => firstOfRound + ((start + i) % boardsPerRound),
      );
      tableRounds.push({
        round,
        boards,
        participants: {
          nsId: `${table}NS`,
          ewId: `${opponentOf(table, round)}EW`,
        },
      });
    }
    tables.push({ table, rounds: tableRounds });
  }
  return { tables };
}
