import { buildVoidMatch, type VoidCause } from "@/model/teams-match-void";
import {
  groupTeamMatches,
  teamMatchBoardImps,
  type TeamMatchRow,
  type TeamMatchStructureRow,
} from "./team-match";

/**
 * The one §2.4.3 fact the teams/Swiss-VP withdrawal pass needs about a seat:
 * whether a whole TEAM has withdrawn. A withdrawn team's home-NS seat id (e.g.
 * "A1NS") — the same id a match row's `home`/`opponent` carries — is all that
 * is required to derive the §3.3.9 void ruling on its unplayed matches.
 */
export interface TeamWithdrawal {
  /** The withdrawn team's stable home-NS seat id (e.g. "A1NS"). */
  seat: string;
}

/**
 * EBU White Book §2.4.3–§2.4.6 (teams): a whole team's withdrawal turns every
 * teams match it did NOT play into a §3.3.9 VOID — the withdrawing team scores
 * below average (AVE−) and its opponent is indemnified (AVE+) — WITHOUT
 * persisting anything: a withdrawal is a derived scoring consequence, not a
 * stored per-match fact, so the ruling is synthesised in-memory at scoring time
 * and layered onto the match rows the scorer / exporter already read.
 *
 * Returns a NEW match-row array (the input is not mutated) in which every
 * `TEAMS` match that
 *   - involves a withdrawn team as `home` or `opponent`,
 *   - has NOT been played (no comparable board — `boardsPlayed === 0`), and
 *   - carries NO existing ruling (a real director ruling always wins),
 * gains a `VOID:SHORT_OFFENDER_NS` / `VOID:SHORT_OFFENDER_EW` ruling, home-
 * relative: the withdrawer is the "offender" (AVE−), its opponent AVE+. NS when
 * the withdrawer is the match `home`, EW when it is the `opponent`. The void
 * cause is then honoured by the shared teams-VP scorer (`matchVoidCause` →
 * `voidMatchVp`) and the USEBIO teams export, so both agree.
 *
 * A match the withdrawn team DID play (boardsPlayed > 0) is left exactly as it
 * is: those boards stand and score normally — only the matches lost to the
 * withdrawal are voided. When BOTH teams in a match have withdrawn, the home
 * team is treated as the offender (`SHORT_OFFENDER_NS`); this is a corner case
 * (two teams withdrawing and being drawn against each other on an unplayed
 * round) with no asymmetric indemnity to protect, so the home-relative default
 * is used.
 */
export function applyTeamWithdrawalRulings<M extends TeamMatchStructureRow>(
  matchRows: M[],
  withdrawals: readonly TeamWithdrawal[],
  boardRows: TeamMatchRow[],
): M[] {
  if (withdrawals.length === 0) return matchRows;

  const withdrawnSeats = new Set(withdrawals.map((w) => w.seat));

  // The played-board count for each unplayed match, keyed by the identity a
  // match row and a reconstructed `TeamMatch` share: (section, round, home).
  // `groupTeamMatches` + `teamMatchBoardImps` is the exact "is this match
  // played?" rule the scorer uses, so the void is applied to precisely the
  // matches the scorer would otherwise read as 0/0 neutral.
  const boardsPlayedByMatch = new Map<string, number>();
  for (const match of groupTeamMatches(boardRows, matchRows)) {
    const { boardsPlayed } = teamMatchBoardImps(match);
    boardsPlayedByMatch.set(
      matchKey(match.section, match.round, match.homeTeamId),
      boardsPlayed,
    );
  }

  return matchRows.map((row) => {
    if (row.kind !== "TEAMS" || row.opponent == null) return row;
    if (row.ruling != null) return row; // a real director ruling always wins

    const homeWithdrawn = withdrawnSeats.has(row.home);
    const opponentWithdrawn = withdrawnSeats.has(row.opponent);
    if (!homeWithdrawn && !opponentWithdrawn) return row;

    const boardsPlayed =
      boardsPlayedByMatch.get(matchKey(row.section, row.roundNumber, row.home)) ??
      0;
    if (boardsPlayed > 0) return row; // the match was played — it stands

    // Home-relative offender: the withdrawer is AVE−, its opponent AVE+. When
    // both withdrew, treat the home team as the offender.
    const cause: VoidCause = homeWithdrawn
      ? "SHORT_OFFENDER_NS"
      : "SHORT_OFFENDER_EW";

    return { ...row, ruling: buildVoidMatch(cause) };
  });
}

/** The identity a match row and a reconstructed match share. */
function matchKey(section: string, round: number, homeTeamId: string): string {
  return `${section}|${round}|${homeTeamId}`;
}
