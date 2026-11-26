import { TeamBamOverallScore, TeamPabOverallScore } from "@/model/leaderboard";
import { rank } from "@/modules/scoring/overall/rank";
import { SwissVpBoardRow } from "./swiss-vp-overall";
import {
  groupTeamMatches,
  groupTeamTriples,
  matchVoidCause,
  teamByeRounds,
  teamMatchBoardWins,
  tripleTeamStakes,
  type TeamMatch,
  type TeamMatchStructureRow,
} from "./team-match";
import { detailBoards, type TeamMatchDetail } from "./match-detail";
import { voidMatchWon } from "@/modules/scoring/swiss/team-match-void-score";

/**
 * The fraction of a round's boards a bye team is credited (average-plus, i.e.
 * 60% of the boards it would have played). Held in native board units, so it
 * scales the same on the BAM (1×) and PAB (2×) presentations.
 */
const BYE_WON_FRACTION = 0.6;

/**
 * The two board-comparison teams scorings. They are identical bar the per-board
 * points scale (applied at the display/export boundary) and the USEBIO tag:
 *   - BAM (Board-a-Match): 1 point per board won, 0.5 for a tie.
 *   - PAB (Point-a-Board): 2 points per board won, 1 for a tie.
 */
export type BoardComparisonScoring = "BAM" | "PAB";

interface Accumulator {
  totalWon: number;
  totalPlayed: number;
  byRound: Record<number, { won: number; played: number }>;
}

function credit(
  totals: Map<string, Accumulator>,
  id: string,
  round: number,
  won: number,
  played: number,
): void {
  const acc = totals.get(id) ?? { totalWon: 0, totalPlayed: 0, byRound: {} };
  const prev = acc.byRound[round] ?? { won: 0, played: 0 };
  acc.byRound[round] = { won: prev.won + won, played: prev.played + played };
  acc.totalWon = Math.round((acc.totalWon + won) * 100) / 100;
  acc.totalPlayed += played;
  totals.set(id, acc);
}

/**
 * Compute the board-comparison overall standings (Board-a-Match or
 * Point-a-Board) for a teams game from its board rows.
 *
 * Each board of a team match is its own mini-match, decided on raw contract
 * score: the team with the higher score wins the board, an equal score is a
 * tie, the lower score loses. Standings are held in NATIVE BOARD UNITS (win 1 /
 * tie 0.5 / loss 0) regardless of `scoring`; the per-board points scale (BAM 1,
 * PAB 2) is applied only when the standings are displayed or exported, so BAM
 * and PAB rank identically and differ only in presentation.
 *
 * `teamMatchBoardWins` reports the home (primary) team's per-board wins, so the
 * opponent's wins on the same boards are `boardsPlayed - homeWon` (ties split).
 * A round with nothing comparable yet credits 0 won / 0 played so it doesn't
 * distort the running standings.
 *
 * `barometer` is carried straight onto the result: it tells the leaderboard
 * view whether to render a per-round table (Swiss Teams) or a single cumulative
 * total (Round Robin Teams); it does not affect the scoring maths. `scoring`
 * is likewise carried through so the view/export apply the right scale and tag.
 */
export function calculateTeamsBoardComparisonOverall<R extends SwissVpBoardRow>(
  boardRows: R[],
  matchRows: TeamMatchStructureRow[],
  options: {
    barometer: boolean;
    scoring: BoardComparisonScoring;
    expectedBoards?: number;
    /** When given, receives each match as credited (for the export). */
    matches?: TeamMatchDetail<R>[];
  },
): TeamBamOverallScore | TeamPabOverallScore {
  const totals = new Map<string, Accumulator>();
  const { expectedBoards } = options;
  /** Each match as credited, in native board units. */
  const record = (
    match: TeamMatch<R>,
    triple: "SHORT" | "LONG" | null,
    homeScore: number,
    opponentScore: number,
    isVoid: boolean,
  ) => {
    if (!options.matches) return;
    const { perBoard, boardsPlayed } = teamMatchBoardWins(match);
    options.matches.push({
      section: match.section,
      round: match.round,
      triple,
      home: match.homeTeamId,
      opponent: match.opponentTeamId,
      boards: detailBoards(
        match,
        perBoard.map((b) => ({ boardNumber: b.boardNumber, value: b.result })),
      ),
      homeScore,
      opponentScore,
      boardsPlayed,
      void: isVoid,
    });
  };

  for (const match of groupTeamMatches(boardRows, matchRows)) {
    const { round, homeTeamId, opponentTeamId } = match;

    // §3.3.6 / §3.3.9 void match: credit each team a ruling boards-won total
    // (flat 40%/60% of N, or the §3.3.9 AVE+/AVE− half-board split) instead of
    // a real board comparison — the board-win analogue of the teams-VP void.
    const voidCause = matchVoidCause(match);
    if (voidCause != null) {
      const { home, opponent, boards } = voidMatchWon(
        voidCause,
        expectedBoards,
      );
      credit(totals, homeTeamId, round, home, boards);
      credit(totals, opponentTeamId, round, opponent, boards);
      record(match, null, home, opponent, true);
      continue;
    }

    const { won, boardsPlayed } = teamMatchBoardWins(match);

    // Both teams are credited every round so the field is complete; a match
    // with nothing comparable yet contributes 0 won / 0 played to each.
    credit(totals, homeTeamId, round, won, boardsPlayed);
    credit(totals, opponentTeamId, round, boardsPlayed - won, boardsPlayed);
    record(match, null, won, boardsPlayed - won, false);
  }

  // Credit each bye team an average-plus result (60% of the round's boards) for
  // the round it sat out, so a forced bye slightly favours the sitting team.
  for (const bye of teamByeRounds(matchRows)) {
    credit(
      totals,
      bye.teamId,
      bye.round,
      BYE_WON_FRACTION * bye.boards,
      bye.boards,
    );
  }

  // A triple is three ordinary two-team board-comparison matches (x-y, y-z,
  // z-x); each team plays two of them. Credit each comparison as a normal
  // head-to-head (home team wins `won`, away `boardsPlayed - won`) into the
  // round the team's NS pair hosted it (SHORT: one round; LONG: split across R
  // and R+1). `credit` accumulates within a round, so a team's two comparisons
  // add up for a SHORT triple's single round.
  for (const triple of groupTeamTriples(boardRows, matchRows)) {
    for (const comparison of triple.comparisons) {
      const { won, boardsPlayed } = teamMatchBoardWins(comparison);
      record(comparison, triple.kind, won, boardsPlayed - won, false);
    }
    for (const stake of tripleTeamStakes(triple)) {
      const { won, boardsPlayed } = teamMatchBoardWins(stake.comparison);
      const teamWon = stake.isHome ? won : boardsPlayed - won;
      credit(totals, stake.teamId, stake.round, teamWon, boardsPlayed);
    }
  }

  const lines = rank(
    Array.from(totals.entries()).map(([id, acc]) => ({
      teamId: id,
      totalWon: acc.totalWon,
      totalPlayed: acc.totalPlayed,
      byRound: acc.byRound,
    })),
    (row) => row.totalWon,
  );

  const type = options.scoring === "PAB" ? "TEAM_PAB" : "TEAM_BAM";
  return {
    type,
    mode: "TEAM",
    scoring: options.scoring,
    barometer: options.barometer,
    lines,
  } as TeamBamOverallScore | TeamPabOverallScore;
}

/**
 * Board-a-Match overall standings (1 point per board). Thin wrapper over
 * {@link calculateTeamsBoardComparisonOverall}.
 */
export function calculateTeamsBamOverall(
  boardRows: SwissVpBoardRow[],
  matchRows: TeamMatchStructureRow[],
  options: { barometer: boolean; expectedBoards?: number },
): TeamBamOverallScore {
  return calculateTeamsBoardComparisonOverall(boardRows, matchRows, {
    ...options,
    scoring: "BAM",
  }) as TeamBamOverallScore;
}

/**
 * Point-a-Board overall standings (2 points per board). Thin wrapper over
 * {@link calculateTeamsBoardComparisonOverall}.
 */
export function calculateTeamsPabOverall(
  boardRows: SwissVpBoardRow[],
  matchRows: TeamMatchStructureRow[],
  options: { barometer: boolean; expectedBoards?: number },
): TeamPabOverallScore {
  return calculateTeamsBoardComparisonOverall(boardRows, matchRows, {
    ...options,
    scoring: "PAB",
  }) as TeamPabOverallScore;
}
