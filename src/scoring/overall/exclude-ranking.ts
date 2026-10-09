import { rank } from "@/scoring/overall/rank";
import type { OverallScore } from "@/model/leaderboard";

/**
 * EBU White Book §2.4.9 "without standing" — remove a contestant from the
 * final RANKING without removing its results from the field.
 *
 * A without-standing (or removed-withdrawn) contestant's results still count
 * for its opponents — so its board rows must stay in the scored field — but the
 * contestant itself does not appear in the ranking. The scorers all aggregate
 * every id present and rank them; this applies the exclusion as a post-rank
 * pass on the finished {@link OverallScore}: drop the excluded ids' lines and
 * re-rank the remainder so places stay contiguous (1, 2, 3 …).
 *
 * It is applied to the overall score AFTER a scorer produces it (never to the
 * scorer's input), so the opponents' values — computed against the full field
 * including the excluded contestant — are untouched. A no-op when nothing is
 * excluded.
 *
 * Keyed on the line's id: `pairId` (PAIR modes) or `teamId` (TEAM modes).
 */
export function applyRankingExclusion(
  overallScore: OverallScore,
  excludedIds: ReadonlySet<string>,
): OverallScore {
  if (excludedIds.size === 0) return overallScore;

  const kept = overallScore.lines.filter(
    (line) => !excludedIds.has(lineId(line)),
  );
  if (kept.length === overallScore.lines.length) return overallScore;

  // Re-rank the survivors on the SAME value each scorer sorted on, so the
  // exclusion only renumbers places — it does not change relative order.
  const reranked = rank(
    kept.map(({ rank: _rank, tied: _tied, ...rest }) => rest),
    rankValue,
  );

  // The rank util widened the line type to its structural shape; the kept lines
  // are the same concrete members, so the result is the same OverallScore type.
  return { ...overallScore, lines: reranked } as OverallScore;
}

/** The ranking id of an overall line: `pairId` (PAIR) or `teamId` (TEAM). */
function lineId(line: OverallScore["lines"][number]): string {
  if ("pairId" in line) return line.pairId;
  /* v8 ignore next -- every overall line carries either pairId or teamId */
  return "teamId" in line ? line.teamId : "";
}

/**
 * The value a line is ranked on, by scoring variant — mirroring each overall
 * scorer's own `sort` key so a re-rank reproduces the original order:
 *   MP → percentage (totalMP / maxMP); XIMP → crossImps; IMP → imps;
 *   SWISS_VP → totalVP; IMP_AGG → totalImps; BAM/PAB → totalWon.
 */
function rankValue(line: Record<string, unknown>): number {
  if ("totalMP" in line) {
    const maxMP = line.maxMP as number;
    return maxMP > 0 ? (line.totalMP as number) / maxMP : 0;
  }
  if ("crossImps" in line) return line.crossImps as number;
  if ("imps" in line) return line.imps as number;
  if ("totalVP" in line) return line.totalVP as number;
  if ("totalImps" in line) return line.totalImps as number;
  if ("totalWon" in line) return line.totalWon as number;
  /* v8 ignore next -- all OverallScore line variants are covered above */
  return 0;
}
