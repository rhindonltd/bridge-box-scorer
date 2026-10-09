import "server-only";

import { Db } from "@/db/games";
import { boards, Board } from "@/db/games/tables/boards";
import { matches, type Match } from "@/db/games/tables/matches";
import { findPairs } from "@/db/games/queries/find-pairs";
import { scoreBoard, ScoredBoard } from "@/scoring/traveller/score-traveller";
import { equaliseMpBoards } from "@/scoring/traveller/pair/neuberg-across-boards";
import { applyBetterThanAverage } from "@/scoring/traveller/pair/better-than-average";
import { roundMpBoards } from "@/scoring/traveller/pair/round-mp-boards";
import { MatchpointLine } from "@/scoring/traveller/pair/mp";
import { PairTraveller } from "@/model/traveller";
import { BoardOutcome } from "@/model/score";
import { OverallScore } from "@/model/leaderboard";
import {
  AssignedPair,
  AssignedTeam,
  parseSeat,
  sectionOf,
} from "@/model/participants";
import "@/scoring/plugins/register";
import { getCombination, getOverallPlugin } from "@/scoring/plugins/registry";
import { rank } from "@/scoring/overall/rank";
import { applyRankingExclusion } from "@/scoring/overall/exclude-ranking";
import {
  readRankingExclusions,
  readWithdrawals,
  type WithdrawalRecord,
} from "@/db/games/queries/ranking-exclusions";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { getAnySectionMovement } from "@/db/games/queries/get-section-movement";
import { findTeams } from "@/db/games/queries/find-teams";
import { ScoringType } from "@/db/games/types/scoring-type";
import {
  parseSelectedMovement,
  boardsPerRoundOf,
} from "@/model/selected-movement";
import {
  classifyEvent,
  isTwoWinnerPairs,
  SwissVpMode,
} from "@/model/event-format";
import { calculateSwissXimpVpOverall } from "@/scoring/swiss/swiss-ximp-vp-overall";
import { calculateSwissMpVpOverall } from "@/scoring/swiss/swiss-mp-vp-overall";
import { calculateTeamsVpOverall } from "@/scoring/swiss/teams-vp-overall";
import { applyTeamWithdrawalRulings } from "@/scoring/swiss/team-withdrawal";
import { calculateTeamsImpAggregateOverall } from "@/scoring/swiss/teams-imp-aggregate-overall";
import {
  BoardComparisonScoring,
  calculateTeamsBoardComparisonOverall,
} from "@/scoring/swiss/teams-board-comparison-overall";

/**
 * A computed leaderboard: the overall score plus the participants it ranks.
 * Participants are pairs for pair games and teams for team games; the pairing
 * with the overall score is enforced by {@link OverallScoreAndParticipant} at
 * the boundary this feeds.
 */
export interface LeaderboardResult {
  type: OverallScore["type"];
  overallScore: OverallScore;
  participants: AssignedPair[] | AssignedTeam[];
  /**
   * For a two-winner pairs event (a standard Mitchell, where North/South and
   * East/West are separate fields), the same standings split into two
   * independent rankings — one per direction — each ranked within its own
   * field. Absent for one-winner and teams events, where `overallScore` /
   * `participants` are the single ranking. When present, `overallScore` /
   * `participants` still hold the pooled ranking (unused by the two-winner
   * display) so existing single-ranking consumers keep working.
   */
  directional?: {
    ns: { overallScore: OverallScore; participants: AssignedPair[] };
    ew: { overallScore: OverallScore; participants: AssignedPair[] };
  };
}

/**
 * A per-section leaderboard, tagged with the section it belongs to.
 */
export interface SectionLeaderboard extends LeaderboardResult {
  section: string;
}

function toParticipant(p: Awaited<ReturnType<typeof findPairs>>[number]) {
  return { ...p, type: "PAIR" as const, id: p.initialSeat };
}

/**
 * Apply the §2.4.9 "without standing" ranking exclusion to a computed
 * leaderboard: drop the excluded participants from the overall ranking (and
 * from each directional sub-ranking) while leaving their results in the field.
 * A no-op when nothing is excluded. Applied at the entry points so the pure
 * compute functions stay exclusion-agnostic.
 */
function excludeFromLeaderboard<T extends LeaderboardResult>(
  result: T,
  excludedIds: ReadonlySet<string>,
): T {
  if (excludedIds.size === 0) return result;
  return {
    ...result,
    overallScore: applyRankingExclusion(result.overallScore, excludedIds),
    ...(result.directional
      ? {
          directional: {
            ns: {
              ...result.directional.ns,
              overallScore: applyRankingExclusion(
                result.directional.ns.overallScore,
                excludedIds,
              ),
            },
            ew: {
              ...result.directional.ew,
              overallScore: applyRankingExclusion(
                result.directional.ew.overallScore,
                excludedIds,
              ),
            },
          },
        }
      : {}),
  };
}

/**
 * Compute the Swiss VP overall for a set of board rows under the given VP mode.
 * Returns null when there is no Swiss VP mode, so callers fall back to the
 * standard board-pooled overall.
 */
function scoreSwissVp(
  boardRows: Board[],
  matchRows: Match[],
  mode: SwissVpMode,
  expectedBoards: number | undefined,
) {
  if (mode === "XIMP")
    return calculateSwissXimpVpOverall(boardRows, matchRows, { expectedBoards });
  if (mode === "MP")
    return calculateSwissMpVpOverall(boardRows, matchRows, { expectedBoards });
  return null;
}

/**
 * Score a set of board rows into an overall score under the given scoring type.
 * Rows are bucketed by board number; every row for a board forms one traveller,
 * so pooling rows from multiple sections combines them into a single field.
 *
 * @param sectionLabel  The value written to each traveller's `section` field.
 *   For a per-section leaderboard this is the real section; for the combined
 *   leaderboard it is a synthetic label (e.g. the gameId) since the traveller
 *   pools every section.
 */
function scoreBoardsToOverall(
  boardRows: Board[],
  scoringType: ScoringType,
  sectionLabel: string,
  withdrawers: WithdrawalRecord[] = [],
): OverallScore {
  const boardMap = new Map<number, Board[]>();
  for (const row of boardRows) {
    const arr = boardMap.get(row.boardNumber) ?? [];
    arr.push(row);
    boardMap.set(row.boardNumber, arr);
  }

  const scoredBoards: ScoredBoard[] = [];
  for (const [boardNumber, rows] of boardMap) {
    const linesWithResults = rows.filter((r) => {
      const result = r.directorOverrideResult ?? r.confirmedResult;
      return result != null;
    });

    if (linesWithResults.length === 0) continue;

    const pairTraveller: PairTraveller = {
      type: "PAIR",
      mode: "PAIR",
      board: boardNumber,
      section: sectionLabel,
      lines: linesWithResults.map((r) => ({
        nsId: r.ns,
        ewId: r.ew,
        outcome: (r.directorOverrideResult ??
          r.confirmedResult) as BoardOutcome,
      })),
    };

    scoredBoards.push(scoreBoard(pairTraveller, scoringType));
  }

  // EBU White Book §4.2.3: for matchpoints, equalise boards played a different
  // number of times (half-table, fouled/short boards) by scaling each short
  // board up to the full field via Neuberg (or the §4.2.3.3 small-sub-field
  // rule). A no-op when every board was played the same number of times. Done
  // before the sit-out synthesis below so the per-board top the byes are
  // credited against (`maxMatchPoints`) is the equalised full-field top.
  if (getCombination(scoringType).perBoard === "MP") {
    const equalised = equaliseMpBoards(
      scoredBoards.map((b) => ({
        board: b.board,
        lines: b.lines as MatchpointLine[],
      })),
    );
    // EBU White Book §4.1.1.1: in the STANDINGS, an AVE+/AVE− board gives the
    // pair the greater-of-60%/lesser-of-40% vs its windowed average on its
    // other boards. Applied after Neuberg equalisation (so the board tops are
    // the equalised full-field tops) and only to the copy fed to the overall
    // aggregator — the per-board traveller keeps the flat 60/40.
    const adjusted = applyBetterThanAverage(equalised);
    adjusted.forEach((b, i) => {
      scoredBoards[i].lines = b.lines;
    });
  }

  // Swiss sit-outs: credit each idle (bye) pair a compensatory result for the
  // boards it missed, so a forced bye doesn't drag its standing down. This adds
  // synthetic scored lines alongside the real ones before aggregation, keyed by
  // the sit-out pair's participant id, and is a no-op when there are no
  // SIT_OUT rows (i.e. for every non-Swiss / even-field game).
  scoredBoards.push(
    ...swissSitOutScoredBoards(boardMap, scoringType, scoredBoards),
  );

  // EBU §2.4.3–§2.4.6: the withdrawal credits — the withdrawer's own AVE−
  // (PENALISED) and its opponents' AVE+ (after-half) / cancel (before-half) on
  // the boards it did not play. Added as synthetic lines like the sit-out
  // credit; a no-op when nobody withdrew.
  scoredBoards.push(
    ...withdrawalCreditBoards(boardMap, scoringType, scoredBoards, withdrawers),
  );

  // EBU White Book §4.2.6.1: round each board's matchpoints to the nearest
  // whole matchpoint (exact halves away from the board average) as the LAST
  // step — after Neuberg equalisation, the better-than-average uplift, and the
  // sit-out synthesis above, all of which must be computed at full precision.
  // The overall ranking sums these rounded per-board scores, so a published
  // total equals the sum of the shown board scores.
  if (getCombination(scoringType).perBoard === "MP") {
    const rounded = roundMpBoards(
      scoredBoards.map((b) => ({
        board: b.board,
        lines: b.lines as MatchpointLine[],
      })),
    );
    rounded.forEach((b, i) => {
      scoredBoards[i].lines = b.lines;
    });
  }

  // This board-pooled overall path is only reached for pairs scorings (MP /
  // Cross-IMP, and the IMP-family fallback), which always declare an `overall`
  // plugin. Teams never reach here — they are routed to their dedicated
  // scorers before this — so a missing `overall` would be a wiring error.
  const overallId = getCombination(scoringType).overall;
  if (!overallId) {
    throw new Error(
      `Scoring type "${scoringType}" has no overall plugin for the board-pooled path`,
    );
  }
  const overallPlugin = getOverallPlugin(overallId);
  return overallPlugin.aggregate(
    scoredBoards.map((b) => ({ lines: b.lines })),
  ) as OverallScore;
}

/**
 * The value a pair line is ranked on, by pair scoring type. Mirrors each
 * overall plugin's `sort` key (MP ranks on percentage, IMP on total imps,
 * Cross-IMP on total cross-imps), so re-ranking a partition here matches how
 * the plugin ranked the pooled field.
 */
function pairRankValue(line: OverallScore["lines"][number]): number {
  if ("totalMP" in line) {
    return line.maxMP > 0 ? line.totalMP / line.maxMP : 0;
  }
  if ("imps" in line) return line.imps;
  if ("crossImps" in line) return line.crossImps;
  /* v8 ignore next -- pairRankValue is only called for MP/IMP/XIMP pair lines */
  return 0;
}

/**
 * Split a pooled pairs overall score into two independent rankings by seat
 * direction (a two-winner Mitchell: North/South and East/West are separate
 * fields). The per-board matchpointing is unchanged — the same field-wide
 * values are used — but each direction is ranked only within itself, so an NS
 * pair's rank/percentage reflects the NS field only, and likewise for EW.
 *
 * The pooled score's line values are reused verbatim; only rank/tied are
 * recomputed per direction. `pairId` is a section-qualified seat ending in
 * NS/EW (see {@link toParticipant}), so the direction is read straight from it.
 */
function splitByDirection(
  overallScore: OverallScore,
  participants: AssignedPair[],
): LeaderboardResult["directional"] {
  const forDirection = (direction: "NS" | "EW") => {
    const lines = overallScore.lines.filter(
      (l) => "pairId" in l && parseSeat(l.pairId).direction === direction,
    );
    // Re-rank within this direction's field, dropping the pooled rank/tied and
    // recomputing them from the same value the plugin sorted on.
    const reranked = rank(
      lines.map(({ ...rest }) => rest),
      pairRankValue,
    ) as OverallScore["lines"];

    const directionParticipants = participants.filter(
      (p) => parseSeat(p.initialSeat).direction === direction,
    );

    return {
      overallScore: { ...overallScore, lines: reranked } as OverallScore,
      participants: directionParticipants,
    };
  };

  return { ns: forDirection("NS"), ew: forDirection("EW") };
}

/** The 60% (average-plus) award a bye pair receives under matchpoints. */
const SIT_OUT_MP_FRACTION = 0.6;

/**
 * Build synthetic scored boards that credit Swiss sit-out (bye) pairs for the
 * boards they missed.
 *
 * A SIT_OUT board row carries the sitting-out pair on its `ns` seat (its `ew`
 * is a phantom that maps to no participant). For each such board we emit one
 * synthetic scored line that the overall aggregator sums for that pair:
 *   - Matchpoints: 60% of the board top. The per-board top for the round is the
 *     same for every table, so it is read from a real (played) board that
 *     round: `maxMatchPoints`. When no board that round has been scored yet,
 *     the top is unknown and the bye is credited nothing (it will fill in once
 *     the round's real results arrive).
 *   - IMP / Cross-IMP: these have no fixed per-board maximum, so "60% of max"
 *     is undefined; the fair, standings-protecting credit is the field average,
 *     i.e. zero net imps. The synthetic line therefore contributes 0, which
 *     still counts the board so the pair isn't under-boarded.
 *
 * The phantom opponent id is emitted on the other seat; because it matches no
 * participant, its (zero) contribution is harmless.
 */
function swissSitOutScoredBoards(
  boardMap: Map<number, Board[]>,
  scoringType: ScoringType,
  playedScoredBoards: ScoredBoard[],
): ScoredBoard[] {
  const pluginId = getCombination(scoringType).perBoard;

  // Per-round matchpoint top, keyed by board number, read from a real scored
  // line for that board (all tables share the same top on a given board).
  const topByBoard = new Map<number, number>();
  if (pluginId === "MP") {
    for (const sb of playedScoredBoards) {
      const lines = sb.lines as { maxMatchPoints?: number }[];
      const withTop = lines.find(
        (l) => typeof l.maxMatchPoints === "number" && l.maxMatchPoints > 0,
      );
      if (withTop) topByBoard.set(sb.board, withTop.maxMatchPoints!);
    }
  }

  const synthetic: ScoredBoard[] = [];

  for (const [boardNumber, rows] of boardMap) {
    for (const row of rows) {
      if (row.status !== "SIT_OUT") continue;

      const byePair = row.ns; // sit-out pair sits on the NS seat
      const phantom = row.ew;

      if (pluginId === "MP") {
        const top = topByBoard.get(boardNumber);
        if (top == null) continue; // no scored sibling board yet
        synthetic.push({
          pluginId,
          board: boardNumber,
          lines: [
            {
              nsId: byePair,
              ewId: phantom,
              score: null,
              maxMatchPoints: top,
              nsMatchPoints: SIT_OUT_MP_FRACTION * top,
              ewMatchPoints: 0,
            },
          ],
        });
      } else if (pluginId === "IMP") {
        synthetic.push({
          pluginId,
          board: boardNumber,
          lines: [
            { nsId: byePair, ewId: phantom, score: null, nsImps: 0, ewImps: 0 },
          ],
        });
      } else {
        // PAIR_XIMP
        synthetic.push({
          pluginId,
          board: boardNumber,
          lines: [
            {
              nsId: byePair,
              ewId: phantom,
              score: null,
              nsCrossImps: 0,
              ewCrossImps: 0,
            },
          ],
        });
      }
    }
  }

  return synthetic;
}

/** AVE−/AVE+ as a fraction of the board top. */
const AVE_MINUS_FRACTION = 0.4;
const AVE_PLUS_FRACTION = 0.6;

/**
 * Build synthetic scored boards for the §2.4.3–§2.4.6 withdrawal credits on a
 * board-pooled pairs event — BOTH the withdrawer's own score (§2.4.5/§2.4.6)
 * and its opponents' indemnity (§2.4.4). Both act on the SAME rows: the
 * withdrawer's unplayed (no-result) board rows, each a real head-to-head cell
 * with the withdrawer on one seat and an opponent on the other.
 *
 * Per unplayed row, keyed off whether the withdrawal is BEFORE or AFTER half
 * the event (counted in boards the withdrawer actually played — §3.2):
 *
 * - **Withdrawer seat** (§2.4.5): a PENALISED withdrawer gets AVE−-minus-fine
 *   `(40 − fine)/100` of the board top, capped at half the event's boards. A
 *   REMOVE withdrawer gets nothing here (it is dropped from the ranking by the
 *   §2.4.9 exclusion — crediting it would be pointless).
 * - **Opponent seat** (§2.4.4): AFTER half → AVE+ (60% of the board top); the
 *   result against the withdrawer stands and the opponent is indemnified for
 *   the board it can no longer play. BEFORE half → nothing (the score against
 *   the withdrawer is CANCELLED, so the opponent simply has one fewer board,
 *   which the §4.2.3 short-board equalisation already handles — the design §7
 *   worked example).
 *
 * MP uses the board top (read from a real scored board, like the sit-out
 * credit). IMP/XIMP have no per-board maximum, so both sides get the
 * field-average (0 net) — the board still counts so neither pair is
 * under-boarded, matching the sit-out treatment. (Swiss unplayed boards don't
 * exist as rows; teams / Swiss-VP withdrawals are match-level — see
 * `teamWithdrawalRulings`.)
 */
function withdrawalCreditBoards(
  boardMap: Map<number, Board[]>,
  scoringType: ScoringType,
  playedScoredBoards: ScoredBoard[],
  withdrawers: WithdrawalRecord[],
): ScoredBoard[] {
  if (withdrawers.length === 0) return [];
  const pluginId = getCombination(scoringType).perBoard;
  const bySeat = new Map(withdrawers.map((w) => [w.seat, w]));

  // The event's scheduled board count = the distinct board numbers present (the
  // whole movement is materialised up front for static pairs), for the §2.4.5
  // half-event AVE− cap and the §2.4.4 before/after-half split.
  const totalScheduledBoards = boardMap.size;
  const halfThreshold = Math.ceil(totalScheduledBoards / 2);

  // Boards each withdrawer actually PLAYED (rows with a result), to decide the
  // before/after-half split per §3.2.
  const playedBySeat = new Map<string, number>();
  for (const rows of boardMap.values()) {
    for (const row of rows) {
      const result = row.directorOverrideResult ?? row.confirmedResult;
      if (result == null) continue;
      for (const seat of [row.ns, row.ew]) {
        if (bySeat.has(seat)) {
          playedBySeat.set(seat, (playedBySeat.get(seat) ?? 0) + 1);
        }
      }
    }
  }

  // Per-round matchpoint top, keyed by board number, from a real scored line.
  const topByBoard = new Map<number, number>();
  if (pluginId === "MP") {
    for (const sb of playedScoredBoards) {
      const lines = sb.lines as { maxMatchPoints?: number }[];
      const withTop = lines.find(
        (l) => typeof l.maxMatchPoints === "number" && l.maxMatchPoints > 0,
      );
      if (withTop) topByBoard.set(sb.board, withTop.maxMatchPoints!);
    }
  }

  // §2.4.5 cap: the withdrawer's own AVE− applies to at most half the event's
  // boards, counted per withdrawer.
  const selfCredited = new Map<string, number>();

  const synthetic: ScoredBoard[] = [];

  for (const [boardNumber, rows] of boardMap) {
    for (const row of rows) {
      const result = row.directorOverrideResult ?? row.confirmedResult;
      if (result != null) continue; // a played board, not an unplayed one

      const nsW = bySeat.get(row.ns);
      const ewW = bySeat.get(row.ew);
      const w = nsW ?? ewW;
      if (!w) continue; // no withdrawer on this unplayed row
      const withdrawerOnNs = nsW != null;

      const afterHalf = (playedBySeat.get(w.seat) ?? 0) >= halfThreshold;

      // Withdrawer's own §2.4.5 AVE−-minus-fine (PENALISED only, capped).
      let withdrawerFraction = 0;
      if (w.treatment === "PENALISED") {
        const used = selfCredited.get(w.seat) ?? 0;
        if (used < halfThreshold) {
          selfCredited.set(w.seat, used + 1);
          withdrawerFraction = Math.max(0, AVE_MINUS_FRACTION - w.finePercent / 100);
        }
      }

      // Opponent's §2.4.4 indemnity: AVE+ after half, nothing (cancel) before.
      const opponentFraction = afterHalf ? AVE_PLUS_FRACTION : 0;

      // Nothing to credit either side on this row (e.g. before-half REMOVE).
      if (withdrawerFraction === 0 && opponentFraction === 0) continue;

      const nsFraction = withdrawerOnNs ? withdrawerFraction : opponentFraction;
      const ewFraction = withdrawerOnNs ? opponentFraction : withdrawerFraction;

      if (pluginId === "MP") {
        const top = topByBoard.get(boardNumber);
        if (top == null) continue; // no scored sibling board yet
        synthetic.push({
          pluginId,
          board: boardNumber,
          lines: [
            {
              nsId: row.ns,
              ewId: row.ew,
              score: null,
              maxMatchPoints: top,
              nsMatchPoints: nsFraction * top,
              ewMatchPoints: ewFraction * top,
            },
          ],
        });
      } else if (pluginId === "IMP") {
        synthetic.push({
          pluginId,
          board: boardNumber,
          lines: [
            { nsId: row.ns, ewId: row.ew, score: null, nsImps: 0, ewImps: 0 },
          ],
        });
      } else {
        synthetic.push({
          pluginId,
          board: boardNumber,
          lines: [
            {
              nsId: row.ns,
              ewId: row.ew,
              score: null,
              nsCrossImps: 0,
              ewCrossImps: 0,
            },
          ],
        });
      }
    }
  }

  return synthetic;
}

type Pairs = Awaited<ReturnType<typeof findPairs>>;

/**
 * Pure combined leaderboard: pool all sections' results per board number into
 * one traveller and score them together, producing a single ranking across the
 * whole game (bucketing purely by board number, preserving the pre-sections
 * behaviour). Operates on already-read board/pair rows.
 */
function computeCombined(
  boardRows: Board[],
  matchRows: Match[],
  pairs: Pairs,
  gameId: string,
  scoringType: ScoringType,
  swissVpMode: SwissVpMode,
  isTeamsVp: boolean,
  teamsImpAggregate: boolean,
  teamsBoardComparison: BoardComparisonScoring | null,
  barometer: boolean,
  twoWinner: boolean,
  teams: AssignedTeam[],
  expectedBoards: number | undefined,
  withdrawals: WithdrawalRecord[],
): LeaderboardResult {
  // A board-comparison teams game (BAM/PAB) ranks teams on boards won; a
  // teams-VP game ranks teams on Victory Points; an aggregate-IMP teams game
  // ranks teams on total net IMPs; every other game ranks pairs (Swiss VP or
  // the standard board-pooled overall).
  if (teamsBoardComparison !== null) {
    const overallScore = calculateTeamsBoardComparisonOverall(
      boardRows,
      matchRows,
      {
        barometer,
        scoring: teamsBoardComparison,
        expectedBoards,
      },
    );
    return { type: overallScore.type, overallScore, participants: teams };
  }

  if (teamsImpAggregate) {
    const overallScore = calculateTeamsImpAggregateOverall(boardRows, matchRows, {
      barometer,
    });
    return { type: overallScore.type, overallScore, participants: teams };
  }

  if (isTeamsVp) {
    // §2.4.3–§2.4.6: a withdrawn team's unplayed matches score as a §3.3.9
    // void (withdrawer AVE−, opponent AVE+). Synthesise those rulings in-memory
    // onto the match rows before scoring — never persisted.
    const ruledMatches = applyTeamWithdrawalRulings(
      matchRows,
      withdrawals,
      boardRows,
    );
    const overallScore = calculateTeamsVpOverall(boardRows, ruledMatches, {
      expectedBoards,
    });
    return { type: overallScore.type, overallScore, participants: teams };
  }

  const overallScore =
    scoreSwissVp(boardRows, matchRows, swissVpMode, expectedBoards) ??
    scoreBoardsToOverall(boardRows, scoringType, gameId, withdrawals);
  const participants = pairs.map(toParticipant);
  return {
    type: overallScore.type,
    overallScore,
    participants,
    // Two-winner Mitchell: also expose NS and EW as separate rankings. Swiss VP
    // is one-winner, so only split the board-pooled overall.
    ...(twoWinner && swissVpMode === null
      ? { directional: splitByDirection(overallScore, participants) }
      : {}),
  };
}

/**
 * Pure per-section leaderboards: each section is scored independently (only its
 * own board rows are pooled and only its own participants returned), in
 * ascending letter order. Operates on already-read board/pair rows.
 */
function computeSections(
  boardRows: Board[],
  matchRows: Match[],
  pairs: Pairs,
  scoringType: ScoringType,
  swissVpMode: SwissVpMode,
  isTeamsVp: boolean,
  teamsImpAggregate: boolean,
  teamsBoardComparison: BoardComparisonScoring | null,
  barometer: boolean,
  twoWinner: boolean,
  teams: AssignedTeam[],
  expectedBoards: number | undefined,
  withdrawals: WithdrawalRecord[],
): SectionLeaderboard[] {
  const rowsBySection = new Map<string, Board[]>();
  for (const row of boardRows) {
    const arr = rowsBySection.get(row.section) ?? [];
    arr.push(row);
    rowsBySection.set(row.section, arr);
  }

  // Withdrawers are section-qualified by seat (e.g. "A1NS"); bucket per section
  // so each section's board-pooled scoring sees only its own withdrawers.
  const withdrawersBySection = new Map<string, WithdrawalRecord[]>();
  for (const w of withdrawals) {
    const section = sectionOf(w.seat);
    const arr = withdrawersBySection.get(section) ?? [];
    arr.push(w);
    withdrawersBySection.set(section, arr);
  }

  const matchesBySection = new Map<string, Match[]>();
  for (const m of matchRows) {
    const arr = matchesBySection.get(m.section) ?? [];
    arr.push(m);
    matchesBySection.set(m.section, arr);
  }

  const pairsBySection = new Map<string, Pairs>();
  for (const pair of pairs) {
    const section = sectionOf(pair.initialSeat);
    const arr = pairsBySection.get(section) ?? [];
    arr.push(pair);
    pairsBySection.set(section, arr);
  }

  // Teams are section-qualified by their home NS seat id (e.g. "A1NS").
  const teamsBySection = new Map<string, AssignedTeam[]>();
  for (const team of teams) {
    const section = sectionOf(team.id);
    const arr = teamsBySection.get(section) ?? [];
    arr.push(team);
    teamsBySection.set(section, arr);
  }

  const sections = Array.from(
    new Set([...rowsBySection.keys(), ...pairsBySection.keys()]),
  ).sort();

  return sections.map((section): SectionLeaderboard => {
    const sectionRows = rowsBySection.get(section) ?? [];
    const sectionMatches = matchesBySection.get(section) ?? [];

    if (teamsBoardComparison !== null) {
      const overallScore = calculateTeamsBoardComparisonOverall(
        sectionRows,
        sectionMatches,
        {
          barometer,
          scoring: teamsBoardComparison,
          expectedBoards,
        },
      );
      return {
        section,
        type: overallScore.type,
        overallScore,
        participants: teamsBySection.get(section) ?? [],
      };
    }

    if (teamsImpAggregate) {
      const overallScore = calculateTeamsImpAggregateOverall(
        sectionRows,
        sectionMatches,
        {
          barometer,
        },
      );
      return {
        section,
        type: overallScore.type,
        overallScore,
        participants: teamsBySection.get(section) ?? [],
      };
    }

    if (isTeamsVp) {
      // §2.4.3–§2.4.6: void a withdrawn team's unplayed matches (per section).
      const ruledMatches = applyTeamWithdrawalRulings(
        sectionMatches,
        withdrawersBySection.get(section) ?? [],
        sectionRows,
      );
      const overallScore = calculateTeamsVpOverall(sectionRows, ruledMatches, {
        expectedBoards,
      });
      return {
        section,
        type: overallScore.type,
        overallScore,
        participants: teamsBySection.get(section) ?? [],
      };
    }

    const overallScore =
      scoreSwissVp(sectionRows, sectionMatches, swissVpMode, expectedBoards) ??
      scoreBoardsToOverall(
        sectionRows,
        scoringType,
        section,
        withdrawersBySection.get(section) ?? [],
      );
    const sectionParticipants = (pairsBySection.get(section) ?? []).map(
      toParticipant,
    );
    return {
      section,
      type: overallScore.type,
      overallScore,
      participants: sectionParticipants,
      // Two-winner Mitchell: split each section into its own NS and EW
      // rankings too. Swiss VP is one-winner, so only split the board-pooled
      // overall.
      ...(twoWinner && swissVpMode === null
        ? { directional: splitByDirection(overallScore, sectionParticipants) }
        : {}),
    };
  });
}

/** Read the scoring type, all board rows and all pairs for a game in one go. */
async function readLeaderboardInputs(
  db: Db,
  gameId: string,
): Promise<{
  scoringType: ScoringType;
  combinedRanking: boolean;
  swissVpMode: SwissVpMode;
  isTeamsVp: boolean;
  teamsImpAggregate: boolean;
  teamsBoardComparison: BoardComparisonScoring | null;
  barometer: boolean;
  twoWinner: boolean;
  expectedBoards: number | undefined;
  boardRows: Board[];
  matchRows: Match[];
  pairs: Pairs;
  teams: AssignedTeam[];
  excludedFromRanking: Set<string>;
  withdrawals: WithdrawalRecord[];
}> {
  const game = await findGameById(gameId);
  // The movement drives event classification (teams VP / Swiss VP / board
  // pooled). It's stored PER SECTION in the games DB, not on the game-index
  // row, so prefer the game-index copy when present but fall back to the
  // section movement — otherwise a Swiss / Swiss Teams game (whose movement
  // only ever lives on the section) misclassifies as a plain board-pooled
  // pairs event, which for a teams IMP_VP game has no scorer and throws.
  const movement =
    parseSelectedMovement(game?.selectedMovement) ??
    (await getAnySectionMovement(db));

  // Single classification point: what scoring format this game runs under and,
  // for Swiss Pairs, how its per-round VP is derived.
  const classification = classifyEvent(
    game!.gameType,
    game!.scoringType,
    movement,
  );
  const isTeamsVp = classification.format === "TEAMS_VP";
  // An aggregate-IMP teams format: ranks teams on total net IMPs (no VP).
  const teamsImpAggregate = classification.format === "TEAMS_IMP_AGG";
  // A board-comparison teams format (Board-a-Match / Point-a-Board), or null
  // for any other format. Carries the scale directly so the compute functions
  // pass it straight to the shared scorer.
  const teamsBoardComparison: BoardComparisonScoring | null =
    classification.format === "TEAMS_BAM"
      ? "BAM"
      : classification.format === "TEAMS_PAB"
        ? "PAB"
        : null;
  const swissVpMode: SwissVpMode = classification.swissVpMode;

  // A barometer teams movement (Swiss Teams: all tables play the same boards
  // each round) drives the per-round table; a fixed-schedule movement (Round
  // Robin) drives the cumulative table. Only meaningful for the teams formats.
  const barometer = movement?.source === "SWISS_TEAMS";

  // A two-winner pairs movement (standard Mitchell) is ranked as separate NS
  // and EW fields.
  const twoWinner = isTwoWinnerPairs(game!.gameType, movement);

  // The expected boards per teams match — needed only to size the §3.3.9 void
  // split (AVE+/AVE− over ⌈N/2⌉ boards). Taken from the movement's per-round
  // board count; undefined when unknown (the void scorer then falls back to the
  // flat §3.3.6.1 scoring).
  const expectedBoards = boardsPerRoundOf(movement) ?? undefined;

  const needsTeams =
    isTeamsVp || teamsImpAggregate || teamsBoardComparison !== null;

  // Match rows carry the structure the teams scorers read AND the §3.3.8/§3.5
  // match-level rulings the Swiss Pairs VP scorer applies, so load them for any
  // teams game OR a Swiss Pairs VP (XIMP/MP) game.
  const needsMatches = needsTeams || swissVpMode !== null;

  const [
    boardRows,
    matchRows,
    pairs,
    teams,
    excludedFromRanking,
    withdrawals,
  ] = await Promise.all([
      db.select().from(boards) as Promise<Board[]>,
      needsMatches
        ? (db.select().from(matches) as Promise<Match[]>)
        : Promise.resolve([] as Match[]),
      findPairs(db),
      // Teams are derived from the seating; needed for any teams game (VP,
      // aggregate IMP, BAM, or PAB).
      needsTeams ? findTeams(db) : Promise.resolve([] as AssignedTeam[]),
      readRankingExclusions(db),
      readWithdrawals(db),
    ]);

  return {
    scoringType: game!.scoringType,
    combinedRanking: game!.combinedRanking,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    expectedBoards,
    boardRows,
    matchRows,
    pairs,
    teams,
    excludedFromRanking,
    withdrawals,
  };
}

/**
 * Read the game's scoring type, board rows and pairs ONCE, then compute both
 * the combined and per-section leaderboards from that single read. This is the
 * entry point to use when both are needed (e.g. the leaderboard snapshot),
 * avoiding the duplicate full-table reads that calling the two `compute*`
 * functions separately would incur.
 */
export async function buildLeaderboards(
  db: Db,
  gameId: string,
): Promise<{
  leaderboard: LeaderboardResult | null;
  sections: SectionLeaderboard[];
}> {
  const {
    scoringType,
    combinedRanking,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    expectedBoards,
    boardRows,
    matchRows,
    pairs,
    teams,
    excludedFromRanking,
    withdrawals,
  } = await readLeaderboardInputs(db, gameId);

  const sections = computeSections(
    boardRows,
    matchRows,
    pairs,
    scoringType,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    teams,
    expectedBoards,
    withdrawals,
  ).map((s) => excludeFromLeaderboard(s, excludedFromRanking));

  // The director can turn off the combined overall ranking for a multi-section
  // event, keeping sections separate. It stays on by default, and is always
  // produced for a single-section game (where "combined" and the one section
  // are identical anyway).
  const showCombined = combinedRanking || sections.length <= 1;

  return {
    leaderboard: showCombined
      ? excludeFromLeaderboard(
          computeCombined(
            boardRows,
            matchRows,
            pairs,
            gameId,
            scoringType,
            swissVpMode,
            isTeamsVp,
            teamsImpAggregate,
            teamsBoardComparison,
            barometer,
            twoWinner,
            teams,
            expectedBoards,
            withdrawals,
          ),
          excludedFromRanking,
        )
      : null,
    sections,
  };
}

/**
 * Compute the combined leaderboard: all sections' results for a given board
 * number are pooled into one traveller and scored together, producing a single
 * ranking across the whole game. Reads once and computes only the combined
 * result (for callers that need just it).
 */
export async function computeLeaderboard(
  db: Db,
  gameId: string,
): Promise<LeaderboardResult> {
  const {
    scoringType,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    expectedBoards,
    boardRows,
    matchRows,
    pairs,
    teams,
    excludedFromRanking,
    withdrawals,
  } = await readLeaderboardInputs(db, gameId);
  return excludeFromLeaderboard(
    computeCombined(
      boardRows,
      matchRows,
      pairs,
      gameId,
      scoringType,
      swissVpMode,
      isTeamsVp,
      teamsImpAggregate,
      teamsBoardComparison,
      barometer,
      twoWinner,
      teams,
      expectedBoards,
      withdrawals,
    ),
    excludedFromRanking,
  );
}

/**
 * Compute one leaderboard per section. Each section is scored independently:
 * only that section's board rows are pooled, and only that section's
 * participants are returned. Sections are returned in ascending letter order.
 * Reads once and computes only the per-section result.
 */
export async function computeSectionLeaderboards(
  db: Db,
  gameId: string,
): Promise<SectionLeaderboard[]> {
  const {
    scoringType,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    expectedBoards,
    boardRows,
    matchRows,
    pairs,
    teams,
    excludedFromRanking,
    withdrawals,
  } = await readLeaderboardInputs(db, gameId);
  return computeSections(
    boardRows,
    matchRows,
    pairs,
    scoringType,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    teams,
    expectedBoards,
    withdrawals,
  ).map((s) => excludeFromLeaderboard(s, excludedFromRanking));
}

/**
 * Section leaderboards computed over only the rounds BEFORE `maxRoundExclusive`
 * (i.e. `roundNumber < maxRoundExclusive`), using the CURRENT board values.
 *
 * This reconstructs the "corrected standings as of round R" that EBU §3.5
 * mismatch detection needs: the standings the round-R draw SHOULD have used,
 * were today's (possibly retroactively adjusted) earlier-round scores known at
 * the time. It is NOT draw-time fidelity — it deliberately reflects later
 * adjustments on earlier-round boards, which is exactly the "correct opponents"
 * the §3.5 comparison is against. `computeSections` is a pure function of the
 * board rows, so filtering the rows by round is sufficient; nothing else about
 * the aggregation changes.
 */
export async function computeSectionLeaderboardsAsOf(
  db: Db,
  gameId: string,
  maxRoundExclusive: number,
): Promise<SectionLeaderboard[]> {
  const {
    scoringType,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    expectedBoards,
    boardRows,
    matchRows,
    pairs,
    teams,
  } = await readLeaderboardInputs(db, gameId);
  const earlierRows = boardRows.filter(
    (r) => r.roundNumber < maxRoundExclusive,
  );
  const earlierMatches = matchRows.filter(
    (m) => m.roundNumber < maxRoundExclusive,
  );
  // NOTE: neither the §2.4.9 ranking exclusion NOR the §2.4.5/§2.4.6 withdrawer
  // self-credit is applied here (hence the empty withdrawers list). This
  // function reconstructs the standings order that drove a past round's Swiss
  // draw, for §3.5 mismatch detection. The draw at the time ranked EVERY seated
  // contestant on their REAL results — withdrawal is a scoring-time concern, not
  // a draw-time one — so applying either here would make the replayed "correct
  // opponents" diverge from the deterministic draw and flag false mismatches.
  return computeSections(
    earlierRows,
    earlierMatches,
    pairs,
    scoringType,
    swissVpMode,
    isTeamsVp,
    teamsImpAggregate,
    teamsBoardComparison,
    barometer,
    twoWinner,
    teams,
    expectedBoards,
    [],
  );
}
