import {
  drawSwissTeamsRound,
  type TeamId,
} from "@/movement/swiss-teams/swiss-teams-pairing";
import { MismatchDirection } from "@/model/swiss-mismatch";
import { MISMATCH_VP_THRESHOLD } from "@/scoring/swiss/detect-mismatch";

/**
 * EBU White Book §3.5 mismatch DETECTION for Swiss TEAMS.
 *
 * The teams analogue of the pairs detector: replay the deterministic teams draw
 * on the corrected as-of-round-R standings and diff each team's correct
 * opponent against the one it actually played, flagging a > 5 current-VP gap.
 *
 * Teams can have an odd-field TRIPLE or BYE in a round. Those are NOT clean
 * head-to-heads, so the teams IN the triple or on the bye are excluded; the
 * ORDINARY tables of that round are still assessed. The caller passes the
 * excluded set and a standings list already reduced to the ordinary field, so
 * the engine simply pairs the ordinary teams with no odd-handling.
 */

/** A detected (un-ruled) teams mismatch for one team in one round. */
export interface TeamsMismatchCandidate {
  roundNumber: number;
  /** The team drawn against the wrong opponent (home-table stable id). */
  mismatchedTeam: TeamId;
  actualOpponent: TeamId;
  correctOpponent: TeamId;
  actualOpponentVp: number;
  correctOpponentVp: number;
  direction: MismatchDirection;
}

/** Inputs for detecting mismatches among one committed teams round. */
export interface DetectTeamsRoundInput {
  roundNumber: number;
  teams: number;
  /**
   * Corrected standings-as-of-R, already REDUCED to the ordinary field (the
   * round's triple/bye teams removed). An even list the engine pairs directly.
   */
  orderedOrdinary: TeamId[];
  /** Matchups played over rounds < R (for the draw's repeat avoidance). */
  playedOpponents: ReadonlySet<string>;
  /** Each ordinary team's committed opponent that round. */
  committedOpponentByTeam: Map<TeamId, TeamId>;
  /** Current VP total per team (all teams), for the > 5 comparison. */
  currentVpByTeam: Map<TeamId, number>;
  /** Teams in the round's triple/bye — excluded from any candidate. */
  excludedTeams: ReadonlySet<TeamId>;
}

/**
 * Detect teams mismatch candidates for one committed round's ORDINARY tables.
 *
 * The corrected ordinary pairing is produced by replaying `drawSwissTeamsRound`
 * on the reduced even field (no bye/triple). A team is flagged when its correct
 * opponent differs from the committed one and their current VP totals are more
 * than 5 apart — unless the team OR either opponent is in the excluded
 * (triple/bye) set, in which case it is left to a manual director ruling.
 */
export function detectTeamsRoundMismatches(
  input: DetectTeamsRoundInput,
): TeamsMismatchCandidate[] {
  const {
    roundNumber,
    teams,
    orderedOrdinary,
    playedOpponents,
    committedOpponentByTeam,
    currentVpByTeam,
    excludedTeams,
  } = input;

  // An odd ordinary field can't be a clean all-head-to-head replay; bail (the
  // caller reduces to an even ordinary field in the normal triple/bye case).
  if (orderedOrdinary.length % 2 !== 0) return [];

  const correct = drawSwissTeamsRound({
    teams,
    standings: orderedOrdinary,
    playedOpponents,
    oddRound: "BYE",
  });

  const correctOpp = new Map<TeamId, TeamId>();
  for (const m of correct.matches) {
    correctOpp.set(m.a, m.b);
    correctOpp.set(m.b, m.a);
  }

  const candidates: TeamsMismatchCandidate[] = [];

  for (const [team, correctOpponent] of correctOpp) {
    if (excludedTeams.has(team) || excludedTeams.has(correctOpponent)) continue;

    const actualOpponent = committedOpponentByTeam.get(team);
    if (actualOpponent == null) continue;
    if (excludedTeams.has(actualOpponent)) continue;
    if (actualOpponent === correctOpponent) continue;

    const actualOpponentVp = currentVpByTeam.get(actualOpponent) ?? 0;
    const correctOpponentVp = currentVpByTeam.get(correctOpponent) ?? 0;
    const delta = actualOpponentVp - correctOpponentVp;
    if (Math.abs(delta) <= MISMATCH_VP_THRESHOLD) continue;

    candidates.push({
      roundNumber,
      mismatchedTeam: team,
      actualOpponent,
      correctOpponent,
      actualOpponentVp,
      correctOpponentVp,
      direction: delta > 0 ? "HIGHER" : "LOWER",
    });
  }

  return candidates.sort((a, b) => a.mismatchedTeam - b.mismatchedTeam);
}

/**
 * One head-to-head comparison inside a committed triple (its two teams and the
 * board range they met over), as the triple detector needs it.
 */
export interface TripleComparisonInput {
  low: TeamId;
  high: TeamId;
  boardStart: number;
  boardEnd: number;
}

/** Inputs for detecting §3.5 mismatches INSIDE one committed triple. */
export interface DetectTripleMismatchInput {
  roundNumber: number;
  /** The three teams actually in the committed triple (ascending). */
  committedMembers: TeamId[];
  /** The three teams the corrected draw would have put in the triple. */
  correctMembers: TeamId[];
  /** The committed triple's three head-to-head comparisons. */
  comparisons: TripleComparisonInput[];
  /** Current (as-of-now) VP total per team, for the > 5 comparison. */
  currentVpByTeam: Map<TeamId, number>;
}

/** A detected (un-ruled) mismatch for one team inside a committed triple. */
export interface TripleMismatchCandidate {
  roundNumber: number;
  /** The committed-triple team that faced the wrong opponent. */
  mismatchedTeam: TeamId;
  /** The opponent it actually played (and should not have). */
  actualOpponent: TeamId;
  /** The opponent the corrected triple would have given in that slot. */
  correctOpponent: TeamId;
  actualOpponentVp: number;
  correctOpponentVp: number;
  direction: MismatchDirection;
  /** A board of the comparison the mismatched team met `actualOpponent` over,
   * so the ruling can target that specific 10-VP comparison. */
  boardNumber: number;
}

/**
 * Detect §3.5 mismatches INSIDE one committed teams triple (F21 Part B).
 *
 * A triple's three teams are chosen deterministically from the standings
 * (bottom-ranked three without a recent triple), so a retroactive adjustment to
 * an earlier round can change which three the CORRECTED draw would have picked.
 * When the committed trio differs from the correct trio, some team in the
 * committed triple faced an opponent it should not have.
 *
 * For each committed member still in the correct trio we diff its two committed
 * opponents against its two correct opponents; a swapped opponent is flagged
 * when its current VP differs from the correct opponent's by more than the
 * threshold. Members dropped from the correct trio (they should have played an
 * ordinary head-to-head) are left to a manual director ruling — the detector
 * only reports the clean "wrong third team" case, mirroring how the ordinary
 * detector reports a single opponent swap. The §3.5 fault/validity judgement
 * remains the director's.
 */
export function detectTripleMismatches(
  input: DetectTripleMismatchInput,
): TripleMismatchCandidate[] {
  const {
    roundNumber,
    committedMembers,
    correctMembers,
    comparisons,
    currentVpByTeam,
  } = input;

  const committedSet = new Set(committedMembers);
  const correctSet = new Set(correctMembers);

  // No membership change → every team played the right two opponents.
  const sameTrio =
    committedSet.size === correctSet.size &&
    [...committedSet].every((t) => correctSet.has(t));
  if (sameTrio) return [];

  const vp = (t: TeamId) => currentVpByTeam.get(t) ?? 0;

  /** A board within the comparison the two teams met over, or null. */
  const comparisonBoard = (a: TeamId, b: TeamId): number | null => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const comp = comparisons.find((c) => c.low === lo && c.high === hi);
    return comp ? comp.boardStart : null;
  };

  const candidates: TripleMismatchCandidate[] = [];

  for (const team of committedMembers) {
    // Only report teams that remain in the correct trio: their two correct
    // opponents are well-defined (the other two correct members). A team no
    // longer in the trio should have played an ordinary match — a messier case
    // left to the director.
    if (!correctSet.has(team)) continue;

    const committedOpps = committedMembers.filter((t) => t !== team);
    const correctOpps = correctMembers.filter((t) => t !== team);

    // The opponents that are present in the committed trio but NOT in the
    // correct one — the "wrong" opponents this team faced.
    const wrongOpps = committedOpps.filter((o) => !correctSet.has(o));
    // The opponents the correct trio adds that were not committed — the ones
    // this team SHOULD have faced instead.
    const missingOpps = correctOpps.filter((o) => !committedSet.has(o));

    // Pair each wrong opponent with a correct replacement (by VP closeness is
    // overkill for a size-1 swap; pair positionally in sorted order).
    const sortedWrong = [...wrongOpps].sort((a, b) => a - b);
    const sortedMissing = [...missingOpps].sort((a, b) => a - b);

    for (let i = 0; i < sortedWrong.length && i < sortedMissing.length; i++) {
      const actualOpponent = sortedWrong[i];
      const correctOpponent = sortedMissing[i];
      const actualOpponentVp = vp(actualOpponent);
      const correctOpponentVp = vp(correctOpponent);
      const delta = actualOpponentVp - correctOpponentVp;
      if (Math.abs(delta) <= MISMATCH_VP_THRESHOLD) continue;

      const boardNumber = comparisonBoard(team, actualOpponent);
      if (boardNumber == null) continue;

      candidates.push({
        roundNumber,
        mismatchedTeam: team,
        actualOpponent,
        correctOpponent,
        actualOpponentVp,
        correctOpponentVp,
        direction: delta > 0 ? "HIGHER" : "LOWER",
        boardNumber,
      });
    }
  }

  return candidates.sort((a, b) => a.mismatchedTeam - b.mismatchedTeam);
}
