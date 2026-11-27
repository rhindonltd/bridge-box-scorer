/**
 * The head-to-head teams movement: two teams, one match in two stanzas.
 *
 * Table 1 is team 1's home table and table 2 team 2's. Each stanza has its own
 * boards, and the two tables play all of them: table 1 starts on the first
 * half and table 2 on the second half, and they swap halfway. Each team's two
 * pairs meet both of the other team's pairs, one in each stanza:
 *
 * - stanza 1: table 1 is 1NS v 2EW, table 2 is 2NS v 1EW;
 * - stanza 2: team 2's pairs swap tables and directions, so table 1 is
 *   1NS v 2NS (sitting East/West) and table 2 is 2EW (sitting North/South)
 *   v 1EW.
 *
 * Team 1 holds the North/South cards at table 1 and the East/West cards at
 * table 2 in both stanzas, so each stanza compares as an ordinary two-room
 * match. Each stanza is its own match, scored up at the break between them.
 *
 * Pure: no framework or I/O.
 */

import type { Table, Tables } from "@/model/movement";

/** Setup parameters for a head-to-head teams movement. */
export interface HeadToHeadTeamsSpec {
  /** Boards played in each stanza; even, so the tables can swap halves. */
  boardsPerRound: number;
}

/** A head-to-head is always two teams, one table each. */
export const HEAD_TO_HEAD_TEAMS = 2;

/** A head-to-head always plays two stanzas, one round each. */
export const HEAD_TO_HEAD_ROUNDS = 2;

/** Each stanza's seating: [table 1's NS, EW], [table 2's NS, EW]. */
const SEATING: [string, string][][] = [
  [
    ["1NS", "2EW"],
    ["2NS", "1EW"],
  ],
  [
    ["1NS", "2NS"],
    ["2EW", "1EW"],
  ],
];

/**
 * Generate a head-to-head teams movement as a fully-expanded `Tables`. Each
 * stanza's boards are listed in the order the table plays them: table 1 from
 * the first board, table 2 from the first board of the second half.
 *
 * @throws when boardsPerRound is not a positive even number.
 */
export function generateHeadToHeadTeams(spec: HeadToHeadTeamsSpec): Tables {
  const { boardsPerRound } = spec;
  if (
    !Number.isInteger(boardsPerRound) ||
    boardsPerRound < 2 ||
    boardsPerRound % 2 !== 0
  ) {
    throw new Error(
      `A head-to-head needs an even number of boards per stanza, got ${boardsPerRound}`,
    );
  }

  const half = boardsPerRound / 2;
  const tables: Table[] = [];
  for (let table = 1; table <= HEAD_TO_HEAD_TEAMS; table++) {
    const start = (table - 1) * half;
    tables.push({
      table,
      rounds: SEATING.map((stanza, i) => {
        const firstOfStanza = i * boardsPerRound + 1;
        const [nsId, ewId] = stanza[table - 1];
        return {
          round: i + 1,
          boards: Array.from(
            { length: boardsPerRound },
            (_, k) => firstOfStanza + ((start + k) % boardsPerRound),
          ),
          participants: { nsId, ewId },
        };
      }),
    });
  }
  return { tables };
}
