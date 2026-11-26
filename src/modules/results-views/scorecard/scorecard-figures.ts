import type { AdjustedBoardScore, EventScore } from "@/modules/scoring";
import type { ScorecardBoard, ScorecardRoundVp } from "@/model/scorecard";

// The figures a pair's scorecard reads from the event's scoring run, so the
// scorecard agrees with the leaderboard.

/**
 * The Victory Points this pair earned in each Swiss round, read from the same
 * standings the leaderboard shows (a round's VP comes from the whole match, so
 * it is per round, not per board).
 */
export function swissRoundVps(
  eventScore: EventScore,
  pairId: string,
  section: string,
  separateSections: boolean,
  boards: readonly ScorecardBoard[],
): ScorecardRoundVp[] {
  const { overall: leaderboard, sections } = eventScore;
  const board =
    (separateSections ? null : leaderboard) ??
    sections.find((s) => s.section === section) ??
    null;
  if (!board || board.overallScore.type !== "PAIR_SWISS_VP") return [];

  const line = board.overallScore.lines.find(
    (l) => "pairId" in l && l.pairId === pairId,
  );
  if (!line || !("vpByRound" in line)) return [];

  const vpByRound = line.vpByRound as Record<number, number>;
  return Object.keys(vpByRound)
    .map(Number)
    .sort((a, b) => a - b)
    .map((roundNumber) => ({
      roundNumber,
      opponentId:
        boards.find((b) => b.roundNumber === roundNumber)?.opponentId ?? null,
      vp: vpByRound[roundNumber],
    }));
}

/**
 * One field's adjusted board scores (the figures the leaderboard counts),
 * looked up by board and pair; undefined where the standings have no figure.
 */
export function adjustedScoreLookup(
  adjusted: readonly AdjustedBoardScore[],
  field: string,
): (boardNumber: number, pairId: string) => AdjustedBoardScore | undefined {
  const key = (boardNumber: number, pairId: string) => `${boardNumber}|${pairId}`;
  const byKey = new Map<string, AdjustedBoardScore>();
  for (const a of adjusted) {
    if (a.field === field) byKey.set(key(a.boardNumber, a.pairId), a);
  }
  return (boardNumber, pairId) => byKey.get(key(boardNumber, pairId));
}
