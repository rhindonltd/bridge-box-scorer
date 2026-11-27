/**
 * The Thurner teams movement, for an even number of teams T.
 *
 * Tables 1 … C (C = T − 1) form a circuit and table T is a satellite. Every
 * team's North/South pair stays at its home table. There are T − 1 rounds and
 * C board sets, one copy each. Counting tables round the circuit from 1:
 *
 * - circuit table t plays board set t + r − 1 in round r (the sets move down
 *   one table each round);
 * - team T's East/West pair starts at table 1 and moves up `s` tables each
 *   round, where 3·s ≡ 1 (mod C);
 * - the satellite table shares its board set with the circuit table team T's
 *   East/West pair is visiting;
 * - team i's East/West pair (i ≤ C) starts at table 3 − 2i and moves up one
 *   table each round, except in the round it would reach its own home table:
 *   then it plays at the satellite table instead. That is the round team T's
 *   East/West pair is visiting table i, which is why `s` must satisfy 3·s ≡ 1.
 *
 * Every team meets every other once, a match's two rooms playing the same set
 * (the satellite's match in one round, every other match in two rounds), and
 * each team plays each set once in each direction. No step exists when C is a
 * multiple of 3 (4, 10, 16 … teams), so those counts have no Thurner.
 *
 * Pure: no framework or I/O.
 */

import type { Table, Tables } from "@/model/movement";
import { boardsForSet } from "@/modules/movement-catalog/generation/mitchell/mitchell-utils";

/** Setup parameters for a Thurner teams movement. */
export interface ThurnerTeamsSpec {
  /** Number of teams (equals the table count); see {@link isThurnerTeamCount}. */
  teams: number;
  /** Boards played per round. */
  boardsPerRound: number;
}

/** The number of rounds a Thurner of `teams` teams plays. */
export function thurnerTeamsRounds(teams: number): number {
  return teams - 1;
}

/**
 * Whether a Thurner can be built for `teams` teams: an even count of at least
 * 6 where teams − 1 is not a multiple of 3.
 */
export function isThurnerTeamCount(teams: number): boolean {
  return (
    Number.isInteger(teams) &&
    teams >= 6 &&
    teams % 2 === 0 &&
    (teams - 1) % 3 !== 0
  );
}

/** `x` counted round a circuit of `c` tables, as a table number 1..c. */
function circuitTable(x: number, c: number): number {
  return ((((x - 1) % c) + c) % c) + 1;
}

/** The step team T's East/West pair moves each round: s with 3·s ≡ 1 (mod c). */
function satelliteVisitorStep(c: number): number {
  // c is not a multiple of 3, so 3 has an inverse: (c + 1)/3 or (2c + 1)/3.
  return c % 3 === 2 ? (c + 1) / 3 : (2 * c + 1) / 3;
}

/**
 * Generate a Thurner teams movement as a fully-expanded `Tables`, with board
 * numbers applied from `boardsPerRound`. The satellite table and the circuit
 * table it shares with each round carry each other's number as `sharesWith`.
 * Participant ids follow the shared teams convention: a team's home pair is
 * "${T}NS" and its away pair "${T}EW".
 *
 * @throws when the team count has no Thurner, or boardsPerRound is not a
 *   positive integer.
 */
export function generateThurnerTeams(spec: ThurnerTeamsSpec): Tables {
  const { teams, boardsPerRound } = spec;
  if (!isThurnerTeamCount(teams)) {
    throw new Error(
      `A Thurner needs an even number of teams of at least 6, with teams − 1 not a multiple of 3; got ${teams}`,
    );
  }
  if (!Number.isInteger(boardsPerRound) || boardsPerRound < 1) {
    throw new Error("boardsPerRound must be a positive integer");
  }

  const circuit = teams - 1;
  const satellite = teams;
  const step = satelliteVisitorStep(circuit);
  const rounds = thurnerTeamsRounds(teams);
  const tables: Table[] = Array.from({ length: teams }, (_, i) => ({
    table: i + 1,
    rounds: [],
  }));

  for (let round = 1; round <= rounds; round++) {
    // The circuit table team T's East/West pair visits, which the satellite
    // shares its boards with.
    const shared = circuitTable(1 + step * (round - 1), circuit);
    const visitorAt = new Map<number, number>([[shared, satellite]]);
    for (let team = 1; team <= circuit; team++) {
      const candidate = circuitTable(round - 2 * team + 2, circuit);
      visitorAt.set(candidate === team ? satellite : candidate, team);
    }
    const setAt = (table: number) => circuitTable(table + round - 1, circuit);
    for (let table = 1; table <= teams; table++) {
      const onSatellite = table === satellite;
      tables[table - 1].rounds.push({
        round,
        boards: boardsForSet(
          setAt(onSatellite ? shared : table),
          boardsPerRound,
        ),
        participants: {
          nsId: `${table}NS`,
          ewId: `${visitorAt.get(table)}EW`,
        },
        ...(onSatellite || table === shared
          ? { sharesWith: onSatellite ? shared : satellite }
          : {}),
      });
    }
  }
  return { tables };
}
