/**
 * Hand-built results for scoring tests.
 *
 * A teams match is played in two rooms. The HOME team's North/South pair sits
 * at its own table (the "home room") and the AWAY team's North/South pair sits
 * at the away team's table (the "away room"); in an American Whist the two
 * rooms are played in different rounds, on the same boards; each room's result is
 * recorded from that room's North/South point of view. So a board's team result
 * for the home team is
 *
 *     (home-room NS score) - (away-room NS score)
 *
 * and that net is what the team scoring converts to IMPs / boards won.
 *
 * Only part-scores made (and games on boards where the vulnerability is known)
 * are used, so every expected score can be checked by hand.
 */
export interface TeamMatch {
  /** The match's boards, in order. */
  boards: number[];
  /** Table of the home team (its NS pair sits there). */
  homeTable: number;
  /** Table of the away team (its NS pair sits there). */
  awayTable: number;
  /** Result at the home table for each board (NS declarer notation, e.g. "2SN+1"). */
  homeRoom: string[];
  /** Result at the away table for each board. */
  awayRoom: string[];
}

/** Turn match definitions into the seeder's `outcomes` map ("board@table"). */
export function teamMatchOutcomes(
  matches: TeamMatch[],
): Record<string, string> {
  const outcomes: Record<string, string> = {};
  for (const m of matches) {
    m.boards.forEach((board, i) => {
      outcomes[`${board}@${m.homeTable}`] = m.homeRoom[i];
      outcomes[`${board}@${m.awayTable}`] = m.awayRoom[i];
    });
  }
  return outcomes;
}

/**
 * A 3-team American Whist at 2 boards a round (team "A<n>NS" is the team whose
 * home table is n). Each pair of teams meets once, on its own board set, with
 * the two rooms in different rounds:
 *
 *   round 1: table 1 hosts T3 (boards 1-2), table 2 hosts T1 (3-4), table 3
 *            hosts T2 (5-6)
 *   round 2: table 1 hosts T2 (3-4), table 2 hosts T3 (5-6), table 3 hosts T1
 *            (1-2)
 *
 * A match is numbered by its board set, so the leaderboard's per-match columns
 * are 1 (T1 v T3), 2 (T1 v T2) and 3 (T2 v T3); each team plays two of them.
 * Vulnerability by board: 1 none, 2 NS, 3 EW, 4 both, 5 NS, 6 EW. Net IMPs for
 * each home team, worked from the IMP scale:
 *
 *   M1  T1 v T3  boards 1-2   +30, -30            => +1, -1  = 0   (tie)
 *   M2  T1 v T2  boards 3-4   -450, -530          => -10, -11 = -21
 *   M3  T2 v T3  boards 5-6   -30, 0              => -1, 0   = -1
 *
 * Net IMPs in total: T1 -21, T2 +20, T3 +1.
 * Boards won (win 1, tie 1/2) of 4: T1 1, T2 2.5, T3 2.5.
 */
export const THREE_TEAM_MATCHES: TeamMatch[] = [
  {
    boards: [1, 2],
    homeTable: 1,
    awayTable: 3,
    homeRoom: ["2SN+1", "1NTN="], // 140, 90
    awayRoom: ["2SN=", "2NTN="], // 110, 120
  },
  {
    boards: [3, 4],
    homeTable: 1,
    awayTable: 2,
    homeRoom: ["3NTN-1", "1NTN="], // -50 (NS not vul), 90
    awayRoom: ["3NTN=", "4SN="], // 400 (NS not vul), 620 (both vul)
  },
  {
    boards: [5, 6],
    homeTable: 2,
    awayTable: 3,
    homeRoom: ["1NTN=", "2SN="], // 90, 110
    awayRoom: ["2NTN=", "2SN="], // 120, 110
  },
];

/**
 * A 3-table Mitchell (3 rounds, 2 boards a round) for pairs scoring. Each board
 * is played at all three tables, so each has three lines. The NS result at each
 * (board, table), as score for North/South:
 *
 *   board 1: t1 2SN+1 (140)  t2 2SN= (110)    t3 1NTN= (90)
 *   board 2: t1 2SE= (-110)  t2 1NTN= (90)    t3 3SN+1 (170)
 *   board 3: t1 1NTE= (-90)  t2 2NTN= (120)   t3 2SN+1 (140)
 *   board 4: t1 3SN= (140)   t2 2SE+1 (-140)  t3 2SN= (110)
 *   board 5: t1 2NTN+1 (150) t2 1NTN= (90)    t3 2SE= (-110)
 *   board 6: t1 2SN= (110)   t2 3SN+1 (170)   t3 1NTE= (-90)
 *
 * Only part-scores, so vulnerability never matters. Worked example, board 1:
 * cross-IMPs compare each line with every other and average, so the 140 line
 * gets (IMP(30) + IMP(50)) / 2 = (1 + 2) / 2 = +1.5, the 110 line
 * (IMP(-30) + IMP(20)) / 2 = (-1 + 1) / 2 = 0, and the 90 line
 * (IMP(-50) + IMP(-20)) / 2 = (-2 - 1) / 2 = -1.5; East/West get the negatives.
 *
 * Each pair plays six boards and the leaderboard shows its average cross-IMP
 * per board. The Mitchell is a two-winner movement, so there are separate
 * North/South and East/West lists. Standings (worked with an independent
 * calculation of the rule, to two decimals):
 *
 *   NS: A2NS 0.42, A1NS -0.08, A3NS -0.33
 *   EW: A3EW 1.83, A2EW -0.67, A1EW -1.17
 */
export const MITCHELL_PAIRS_RESULTS: Record<string, string> = {
  "1@1": "2SN+1",
  "1@2": "2SN=",
  "1@3": "1NTN=",
  "2@1": "2SE=",
  "2@2": "1NTN=",
  "2@3": "3SN+1",
  "3@1": "1NTE=",
  "3@2": "2NTN=",
  "3@3": "2SN+1",
  "4@1": "3SN=",
  "4@2": "2SE+1",
  "4@3": "2SN=",
  "5@1": "2NTN+1",
  "5@2": "1NTN=",
  "5@3": "2SE=",
  "6@1": "2SN=",
  "6@2": "3SN+1",
  "6@3": "1NTE=",
};
