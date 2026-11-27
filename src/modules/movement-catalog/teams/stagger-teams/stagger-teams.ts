/**
 * The Stagger teams movement, for an even number of teams T (M = T / 2).
 *
 * Every team's North/South pair stays at its home table. There are T − 1
 * rounds in two stanzas, each with its own boards:
 *
 * - stanza 1 is rounds 1 … M − 1 on board sets 1 … M; in its k-th round each
 *   East/West pair moves to the table 2k above its home table;
 * - stanza 2 is rounds M … T − 1 on board sets M + 1 … T; in its k-th round
 *   each East/West pair moves to the table 2k − 1 above its home table.
 *
 * Tables t and t + M play the same board set every round, sharing it. In the
 * k-th round of a stanza, tables t and t + M play the stanza's set
 * ((t − 1) mod M) + k (counted round the stanza's M sets).
 *
 * Every team's North/South pair meets every other team's East/West pair once,
 * and the two rooms between two teams play the same set, so each pair of
 * teams plays one ordinary two-room match. A stanza's matches finish within
 * it, so the teams can score up between the stanzas. Each team plays T − 1
 * sets, the same ones from each direction.
 *
 * Pure: no framework or I/O.
 */

import type { Table, Tables } from "@/model/movement";
import { boardsForSet } from "@/modules/movement-catalog/pairs/mitchell/mitchell-utils";

/** Setup parameters for a Stagger teams movement. */
export interface StaggerTeamsSpec {
  /** Number of teams (equals the table count); even and at least 4. */
  teams: number;
  /** Boards played per round. */
  boardsPerRound: number;
}

/** The number of rounds a Stagger of `teams` teams plays. */
export function staggerTeamsRounds(teams: number): number {
  return teams - 1;
}

/** Whether a Stagger can be built for `teams` teams: an even count of at least 4. */
export function isStaggerTeamCount(teams: number): boolean {
  return Number.isInteger(teams) && teams >= 4 && teams % 2 === 0;
}

/** `x` counted round 1..n. */
function wrap(x: number, n: number): number {
  return ((((x - 1) % n) + n) % n) + 1;
}

/**
 * Generate a Stagger teams movement as a fully-expanded `Tables`, with board
 * numbers applied from `boardsPerRound`. Each round carries the table it
 * shares its boards with as `sharesWith`. Participant ids follow the shared
 * teams convention: a team's home pair is "${T}NS" and its away pair "${T}EW".
 *
 * @throws when the team count is not even and at least 4, or boardsPerRound is
 *   not a positive integer.
 */
export function generateStaggerTeams(spec: StaggerTeamsSpec): Tables {
  const { teams, boardsPerRound } = spec;
  if (!isStaggerTeamCount(teams)) {
    throw new Error(
      `A Stagger needs an even number of teams (at least 4), got ${teams}`,
    );
  }
  if (!Number.isInteger(boardsPerRound) || boardsPerRound < 1) {
    throw new Error("boardsPerRound must be a positive integer");
  }

  const half = teams / 2;
  const tables: Table[] = [];
  for (let table = 1; table <= teams; table++) {
    const tableRounds: Table["rounds"] = [];
    for (let round = 1; round <= staggerTeamsRounds(teams); round++) {
      const firstStanza = round < half;
      // The round's place within its stanza, from 1.
      const k = firstStanza ? round : round - (half - 1);
      const shift = firstStanza ? 2 * k : 2 * k - 1;
      const stanzaSet = wrap(table + k - 1, half);
      const boardSet = (firstStanza ? 0 : half) + stanzaSet;
      tableRounds.push({
        round,
        boards: boardsForSet(boardSet, boardsPerRound),
        participants: {
          nsId: `${table}NS`,
          ewId: `${wrap(table + shift, teams)}EW`,
        },
        sharesWith: wrap(table + half, teams),
      });
    }
    tables.push({ table, rounds: tableRounds });
  }
  return { tables };
}
