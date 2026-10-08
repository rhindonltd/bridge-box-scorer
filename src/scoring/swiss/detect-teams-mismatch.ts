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
