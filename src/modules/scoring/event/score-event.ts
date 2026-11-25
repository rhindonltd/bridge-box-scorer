import {
  scoreBoard,
  ScoredBoard,
} from "@/modules/scoring/traveller/score-traveller";
import { equaliseMpBoards } from "@/modules/scoring/traveller/pair/neuberg-across-boards";
import { applyBetterThanAverage } from "@/modules/scoring/traveller/pair/better-than-average";
import { applyBetterThanAverageXimpBoards } from "@/modules/scoring/traveller/pair/better-than-average-imp";
import { roundMpBoards } from "@/modules/scoring/traveller/pair/round-mp-boards";
import { MatchpointLine } from "@/modules/scoring/traveller/pair/mp";
import { XimpLine } from "@/modules/scoring/traveller/pair/x-imp";
import {
  getCombination,
  getOverallPlugin,
} from "@/modules/scoring/plugins/registry";
import { rank } from "@/modules/scoring/overall/rank";
import { applyRankingExclusion } from "@/modules/scoring/overall/exclude-ranking";
import { calculateSwissXimpVpOverall } from "@/modules/scoring/swiss/swiss-ximp-vp-overall";
import { calculateSwissMpVpOverall } from "@/modules/scoring/swiss/swiss-mp-vp-overall";
import { calculateTeamsVpOverall } from "@/modules/scoring/swiss/teams-vp-overall";
import { applyTeamWithdrawalRulings } from "@/modules/scoring/swiss/team-withdrawal";
import { calculateTeamsImpAggregateOverall } from "@/modules/scoring/swiss/teams-imp-aggregate-overall";
import {
  BoardComparisonScoring,
  calculateTeamsBoardComparisonOverall,
} from "@/modules/scoring/swiss/teams-board-comparison-overall";
import { PairTraveller } from "@/model/traveller";
import { BoardOutcome } from "@/model/score";
import { OverallScore } from "@/model/leaderboard";
import {
  AssignedPair,
  AssignedTeam,
  parseSeat,
  sectionOf,
} from "@/model/participants";
import type { WithdrawalRecord } from "@/model/standings";
import type { MatchRow, ResultRow } from "@/model/result-row";
import type { RuledEvent } from "@/model/ruled-event";
import type { GameType, ScoringType } from "@/model/game-types";
import {
  boardsPerRoundOf,
  type SelectedMovement,
} from "@/model/selected-movement";
import {
  classifyEvent,
  isTwoWinnerPairs,
  type EventClassification,
  type SwissVpMode,
} from "@/model/event-format";

/**
 * Event scoring: turn an event's ruled rows into standings — the combined
 * (all sections pooled) ranking and one ranking per section. Pure; the core
 * reads the rows, applies the rulings (`@/modules/rulings`) and passes the
 * result here. See docs/design/modules.md §9.
 */

/**
 * Computed standings: the overall score plus the participants it ranks.
 * Participants are pairs for pair games and teams for team games; the pairing
 * with the overall score is enforced by {@link OverallScoreAndParticipant} at
 * the boundary this feeds.
 */
export interface Standings {
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
 * Per-section standings, tagged with the section it belongs to.
 */
export interface SectionStandings extends Standings {
  section: string;
}

/**
 * Apply the §2.4.9 "without standing" ranking exclusion to a computed
 * leaderboard: drop the excluded participants from the overall ranking (and
 * from each directional sub-ranking) while leaving their results in the field.
 * A no-op when nothing is excluded. Applied at the entry points so the pure
 * compute functions stay exclusion-agnostic.
 */
function excludeFromLeaderboard<T extends Standings>(
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
  boardRows: ResultRow[],
  matchRows: MatchRow[],
  mode: SwissVpMode,
  expectedBoards: number | undefined,
) {
  if (mode === "XIMP")
    return calculateSwissXimpVpOverall(boardRows, matchRows, {
      expectedBoards,
    });
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
 *   leaderboard it is a synthetic label (the game id) since the traveller
 *   pools every section.
 */
function scoreBoardsToOverall(
  boardRows: ResultRow[],
  scoringType: ScoringType,
  sectionLabel: string,
  adjusted: AdjustedBoardScore[],
): OverallScore {
  const boardMap = new Map<number, ResultRow[]>();
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
      // `r.ns`/`r.ew` already carry the OCCUPANT's scored-field id: ordinary
      // seats keep their bare board id, while a §2.4.7 handover seat's stand-in
      // boards carry a distinct `#<occId>` id (rewritten up front in
      // `readLeaderboardInputs`), so the stand-in ranks as its own (excluded)
      // line while still counting for opponents.
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
  // rule). A no-op when every board was played the same number of times.
  if (getCombination(scoringType).perBoard === "MP") {
    const equalised = equaliseMpBoards(
      scoredBoards.map((b) => ({
        board: b.board,
        lines: b.lines as MatchpointLine[],
      })),
    );
    equalised.forEach((b, i) => {
      scoredBoards[i].lines = b.lines;
    });
  }

  // A pair that sits out a round (an odd field in a Mitchell or a stored
  // movement) gets no line for the boards it missed: its percentage, or average
  // cross-IMP, is over the boards it played — EBU White Book §8.80.5 ("their
  // average … factoring their score by the number of boards played"). The
  // SIT_OUT rows carry no result, so they are already dropped above.

  // EBU White Book §4.1.1.1: in the STANDINGS, an AVE+/AVE− award gives the
  // pair the greater-of-60% / lesser-of-40% vs its windowed average on the
  // boards it actually played. (A withdrawn or late pair's missed boards are
  // already rewritten as AVE± outcomes by `applyAbsences` before scoring, so
  // they get the uplift too.) The per-board traveller display keeps the flat
  // 60/40 (this touches only the copy fed to the aggregator).
  if (getCombination(scoringType).perBoard === "MP") {
    const adjusted = applyBetterThanAverage(
      scoredBoards.map((b) => ({
        board: b.board,
        lines: b.lines as MatchpointLine[],
      })),
    );
    adjusted.forEach((b, i) => {
      scoredBoards[i].lines = b.lines;
    });
  }

  // EBU White Book §4.1.1.1 at Cross-IMP: the same "better than average"
  // uplift, but on the IMP scale — an AVE+ board gives the pair the greater of
  // +3 and its average cross-IMP on its other boards, AVE− the lesser of −3 and
  // its average. Standings only, like the MP pass; the per-board display keeps
  // the flat ±3.
  if (getCombination(scoringType).perBoard === "XIMP") {
    const adjusted = applyBetterThanAverageXimpBoards(
      scoredBoards.map((b) => ({
        board: b.board,
        lines: b.lines as XimpLine[],
      })),
    );
    adjusted.forEach((b, i) => {
      scoredBoards[i].lines = b.lines;
    });
  }

  // EBU White Book §4.2.6.1: round each board's matchpoints to the nearest
  // whole matchpoint (exact halves away from the board average) as the LAST
  // step — after Neuberg equalisation and the better-than-average uplift, both
  // of which must be computed at full precision.
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
  // Record each pair's figure on each board exactly as the standings sum it
  // (after equalisation, the better-than-average uplift and rounding), so the
  // personal scorecard shows the same numbers its total is built from (D5).
  adjusted.push(...adjustedBoardScores(sectionLabel, scoredBoards));

  const overallPlugin = getOverallPlugin(overallId);
  return overallPlugin.aggregate(
    scoredBoards.map((b) => ({ lines: b.lines })),
  ) as OverallScore;
}

/**
 * Each pair's figure on each scored board, from both sides of every line:
 * matchpoints and the board top for MP, cross-IMPs for Cross-IMP.
 */
function adjustedBoardScores(
  field: string,
  boards: ScoredBoard[],
): AdjustedBoardScore[] {
  const out: AdjustedBoardScore[] = [];
  for (const board of boards) {
    for (const line of board.lines as (MatchpointLine | XimpLine)[]) {
      if ("nsMatchPoints" in line) {
        const top = line.maxMatchPoints;
        out.push(
          {
            field,
            boardNumber: board.board,
            pairId: line.nsId,
            value: line.nsMatchPoints,
            top,
          },
          {
            field,
            boardNumber: board.board,
            pairId: line.ewId,
            value: line.ewMatchPoints,
            top,
          },
        );
      } else {
        out.push(
          {
            field,
            boardNumber: board.board,
            pairId: line.nsId,
            value: line.nsCrossImps,
          },
          {
            field,
            boardNumber: board.board,
            pairId: line.ewId,
            value: line.ewCrossImps,
          },
        );
      }
    }
  }
  return out;
}

/**
 * The value a pair line is ranked on, by pair scoring type. Mirrors each
 * overall plugin's `sort` key (MP ranks on percentage, IMP on total imps,
 * Cross-IMP on total cross-imps), so re-ranking a partition here matches how
 * the plugin ranked the pooled field.
 */
function pairRankValue(line: OverallScore["lines"][number]): number {
  if ("totalMP" in line) {
    // No matchpoints available yet (maxMP 0): rank at the 50% it is shown at.
    return line.maxMP > 0 ? line.totalMP / line.maxMP : 0.5;
  }
  /* v8 ignore else -- see the fallback below */
  if ("crossImps" in line) return line.crossImps;
  /* v8 ignore next -- pairRankValue is only called for MP/XIMP pair lines */
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
 * recomputed per direction. Only two-winner (direction-qualified) movements are
 * split, where `pairId` is a section-qualified seat ending in NS/EW, so the
 * direction is read straight from it.
 */
function splitByDirection(
  overallScore: OverallScore,
  participants: AssignedPair[],
): Standings["directional"] {
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

/**
 * The "no boards played" baseline line for one competitor, matching the shape
 * each scoring variant produces. Every value is the natural starting point:
 * zero matchpoints out of zero (shown as 50% by the percentage view), zero
 * IMPs / cross-IMPs / VPs / net IMPs, or nothing-won-of-nothing for a
 * board-comparison teams game. The id field (`pairId` / `teamId`) is set from
 * the roster id by the caller.
 */
function baselineLine(
  type: OverallScore["type"],
  id: string,
): OverallScore["lines"][number] {
  const idField = type.startsWith("TEAM") ? { teamId: id } : { pairId: id };
  switch (type) {
    case "PAIR_MP":
      return {
        ...idField,
        totalMP: 0,
        maxMP: 0,
      } as OverallScore["lines"][number];
    case "PAIR_XIMP":
      return { ...idField, crossImps: 0 } as OverallScore["lines"][number];
    case "PAIR_SWISS_VP":
    case "TEAM_SWISS_VP":
      return {
        ...idField,
        totalVP: 0,
        vpByRound: {},
      } as OverallScore["lines"][number];
    case "TEAM_IMP_AGG":
      return {
        ...idField,
        totalImps: 0,
        impsByRound: {},
      } as OverallScore["lines"][number];
    case "TEAM_BAM":
    case "TEAM_PAB":
      return {
        ...idField,
        totalWon: 0,
        totalPlayed: 0,
        byRound: {},
      } as OverallScore["lines"][number];
  }
}

/**
 * Seed the leaderboard with every seated competitor so the standings list the
 * whole field from the start — before any board is played — rather than being
 * empty until results arrive. For each roster id not already in the scored
 * lines (and not excluded from the ranking), a baseline line is appended
 * (50% for matchpoints, zero for IMP/Cross-IMP/VP/net-IMP/boards-won), then the
 * field is re-ranked so places stay contiguous. Competitors with real results
 * keep them untouched; this only fills the gaps.
 *
 * Excluded ids (§2.4.9 without-standing, handover stand-ins, empty
 * expected-late seats) are never baselined — the subsequent exclusion pass
 * would drop them anyway, and they are not part of the ranked field.
 */
function padBaselineLines(
  overallScore: OverallScore,
  rosterIds: string[],
  excludedIds: ReadonlySet<string>,
): OverallScore {
  // Pad per competitor: every roster id that has no scored line yet gets a
  // baseline line, whether nothing has been played or only part of the field
  // has results. The roster ids are the participants' board ids (`anchorId ??
  // initialSeat`, see `toParticipant`; a team's home NS seat) — the same ids
  // the board rows, and therefore the scored lines, are keyed on, and the same
  // ids the views resolve names against. So a competitor with results is
  // matched and left untouched; only the gaps are filled.
  const scoredIds = new Set(overallScore.lines.map(lineIdOf));
  const baselineIds = rosterIds.filter(
    (id) => !excludedIds.has(id) && !scoredIds.has(id),
  );
  if (baselineIds.length === 0) return overallScore;

  // Re-rank the merged field on the same value the scorers sort on so places
  // stay contiguous. Strip the scored lines' old rank/tied first.
  const merged = [
    ...overallScore.lines.map(({ rank: _rank, tied: _tied, ...rest }) => rest),
    ...baselineIds.map((id) => baselineLine(overallScore.type, id)),
  ] as OverallScore["lines"];

  return {
    ...overallScore,
    lines: rank(merged, pairOrTeamRankValue),
  } as OverallScore;
}

/** The ranking id of an overall line: `pairId` (pairs) or `teamId` (teams). */
function lineIdOf(line: OverallScore["lines"][number]): string {
  if ("pairId" in line) return line.pairId;
  /* v8 ignore next -- every overall line carries either pairId or teamId */
  return "teamId" in line ? line.teamId : "";
}

/** Rank value for any overall line variant (pairs or teams). */
function pairOrTeamRankValue(line: OverallScore["lines"][number]): number {
  // A pair with no boards yet (maxMP 0) ranks at the 50% it is shown at.
  if ("totalMP" in line)
    return line.maxMP > 0 ? line.totalMP / line.maxMP : 0.5;
  if ("crossImps" in line) return line.crossImps;
  if ("totalVP" in line) return line.totalVP;
  if ("totalImps" in line) return line.totalImps;
  /* v8 ignore else -- see the fallback below */
  if ("totalWon" in line) return line.totalWon;
  /* v8 ignore next -- all OverallScore line variants are covered above */
  return 0;
}

/**
 * Pure combined leaderboard: pool all sections' results per board number into
 * one traveller and score them together, producing a single ranking across the
 * whole game (bucketing purely by board number, preserving the pre-sections
 * behaviour). Operates on already-read board/pair rows.
 */
function computeCombined(
  boardRows: ResultRow[],
  matchRows: MatchRow[],
  pairs: AssignedPair[],
  combinedLabel: string,
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
  excludedFromRanking: ReadonlySet<string>,
  adjusted: AdjustedBoardScore[],
): Standings {
  // A board-comparison teams game (BAM/PAB) ranks teams on boards won; a
  // teams-VP game ranks teams on Victory Points; an aggregate-IMP teams game
  // ranks teams on total net IMPs; every other game ranks pairs (Swiss VP or
  // the standard board-pooled overall).
  const teamIds = teams.map((t) => t.id);
  if (teamsBoardComparison !== null) {
    const overallScore = padBaselineLines(
      calculateTeamsBoardComparisonOverall(boardRows, matchRows, {
        barometer,
        scoring: teamsBoardComparison,
        expectedBoards,
      }),
      teamIds,
      excludedFromRanking,
    );
    return { type: overallScore.type, overallScore, participants: teams };
  }

  if (teamsImpAggregate) {
    const overallScore = padBaselineLines(
      calculateTeamsImpAggregateOverall(boardRows, matchRows, { barometer }),
      teamIds,
      excludedFromRanking,
    );
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
    const overallScore = padBaselineLines(
      calculateTeamsVpOverall(boardRows, ruledMatches, { expectedBoards }),
      teamIds,
      excludedFromRanking,
    );
    return { type: overallScore.type, overallScore, participants: teams };
  }

  const participants = pairs;
  const overallScore = padBaselineLines(
    scoreSwissVp(boardRows, matchRows, swissVpMode, expectedBoards) ??
      scoreBoardsToOverall(boardRows, scoringType, combinedLabel, adjusted),
    participants.map((p) => p.id),
    excludedFromRanking,
  );
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
  boardRows: ResultRow[],
  matchRows: MatchRow[],
  pairs: AssignedPair[],
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
  excludedFromRanking: ReadonlySet<string>,
  // Seed the full seated field at a baseline score so the standings list every
  // competitor from the start. Disabled for the §3.5 "as-of" replay, which must
  // reproduce the exact field that drove a past Swiss draw.
  baseline = true,
  adjusted: AdjustedBoardScore[] = [],
): SectionStandings[] {
  const rowsBySection = new Map<string, ResultRow[]>();
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

  const matchesBySection = new Map<string, MatchRow[]>();
  for (const m of matchRows) {
    const arr = matchesBySection.get(m.section) ?? [];
    arr.push(m);
    matchesBySection.set(m.section, arr);
  }

  const pairsBySection = new Map<string, AssignedPair[]>();
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

  // Seed the baseline field unless this is the §3.5 as-of replay.
  const pad = (overallScore: OverallScore, rosterIds: string[]) =>
    baseline
      ? padBaselineLines(overallScore, rosterIds, excludedFromRanking)
      : overallScore;

  return sections.map((section): SectionStandings => {
    const sectionRows = rowsBySection.get(section) ?? [];
    const sectionMatches = matchesBySection.get(section) ?? [];

    const sectionTeamIds = (teamsBySection.get(section) ?? []).map((t) => t.id);

    if (teamsBoardComparison !== null) {
      const overallScore = pad(
        calculateTeamsBoardComparisonOverall(sectionRows, sectionMatches, {
          barometer,
          scoring: teamsBoardComparison,
          expectedBoards,
        }),
        sectionTeamIds,
      );
      return {
        section,
        type: overallScore.type,
        overallScore,
        participants: teamsBySection.get(section) ?? [],
      };
    }

    if (teamsImpAggregate) {
      const overallScore = pad(
        calculateTeamsImpAggregateOverall(sectionRows, sectionMatches, {
          barometer,
        }),
        sectionTeamIds,
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
      const overallScore = pad(
        calculateTeamsVpOverall(sectionRows, ruledMatches, {
          expectedBoards,
        }),
        sectionTeamIds,
      );
      return {
        section,
        type: overallScore.type,
        overallScore,
        participants: teamsBySection.get(section) ?? [],
      };
    }

    const sectionParticipants = pairsBySection.get(section) ?? [];
    const overallScore = pad(
      scoreSwissVp(sectionRows, sectionMatches, swissVpMode, expectedBoards) ??
        scoreBoardsToOverall(sectionRows, scoringType, section, adjusted),
      sectionParticipants.map((p) => p.id),
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

/** The game settings that choose the scoring method. */
export interface EventSettings {
  gameType: GameType;
  scoringType: ScoringType;
  movement: SelectedMovement | null;
  /** Whether a multi-section game also gets a combined ranking. */
  combinedRanking: boolean;
  /** Section label used when all sections are pooled (the game id). */
  combinedLabel: string;
}

/** Who can be ranked: seated pairs (pairs games) and teams (teams games). */
export interface EventParticipants {
  pairs: AssignedPair[];
  teams: AssignedTeam[];
}

export interface ScoreOptions {
  /**
   * Which standings to compute. "both" (the default) honours
   * `combinedRanking`; "combined" always computes the combined standings;
   * "sections" computes only the per-section standings.
   */
  scope?: "both" | "combined" | "sections";
  /**
   * Add a zero line for every seated competitor with no result. Default true;
   * false for the §3.5 replay, which must reproduce the exact field that drew
   * a past Swiss round.
   */
  baseline?: boolean;
}

/**
 * One pair's score on one board after every standings pass (Neuberg
 * equalisation, better than average, rounding) — the figure the standings sum.
 * Board-pooled pairs events only.
 */
export interface AdjustedBoardScore {
  /**
   * The field the board was scored in: the section, or the combined label
   * (the game id) when every section is pooled.
   */
  field: string;
  boardNumber: number;
  /** The pair's scored id, as on the ruled board rows. */
  pairId: string;
  /** Matchpoints for MP; cross-IMPs for Cross-IMP. */
  value: number;
  /** MP only: the board top the matchpoints are out of. */
  top?: number;
}

export interface EventScore {
  classification: EventClassification;
  /**
   * Board-pooled pairs only: each pair's adjusted board scores, for every
   * field that was scored, so the scorecard shows the same figures the
   * standings were built from. Empty for every other format.
   */
  adjustedBoards: AdjustedBoardScore[];
  /**
   * The combined standings. Null when not requested, or when combined ranking
   * is off for a multi-section game.
   */
  overall: Standings | null;
  /** One entry per section, in ascending letter order (empty when not requested). */
  sections: SectionStandings[];
}

/** Whether a classified event needs match rows to score (teams, Swiss Pairs VP). */
export function scoringNeedsMatches(
  classification: EventClassification,
): boolean {
  return (
    scoringNeedsTeams(classification) || classification.swissVpMode !== null
  );
}

/** Whether a classified event ranks teams (and so needs the teams roster). */
export function scoringNeedsTeams(
  classification: EventClassification,
): boolean {
  return (
    classification.format === "TEAMS_VP" ||
    classification.format === "TEAMS_IMP_AGG" ||
    classification.format === "TEAMS_BAM" ||
    classification.format === "TEAMS_PAB"
  );
}

/**
 * Score a whole event: choose the method from the event's classification,
 * score the combined field and/or each section, pad the baseline field, split
 * a two-winner Mitchell by direction, and drop the excluded participants from
 * the ranking (their results stay in the field for their opponents).
 */
export function scoreEvent(
  event: EventSettings,
  ruled: RuledEvent,
  participants: EventParticipants,
  options: ScoreOptions = {},
): EventScore {
  const { scope = "both", baseline = true } = options;
  const { movement } = event;
  const classification = classifyEvent(
    event.gameType,
    event.scoringType,
    movement,
  );
  const isTeamsVp = classification.format === "TEAMS_VP";
  // An aggregate-IMP teams format: ranks teams on total net IMPs (no VP).
  const teamsImpAggregate = classification.format === "TEAMS_IMP_AGG";
  // A board-comparison teams format (Board-a-Match / Point-a-Board), or null
  // for any other format.
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
  const twoWinner = isTwoWinnerPairs(event.gameType, movement);
  // The expected boards per teams match — needed only to size the §3.3.9 void
  // split (AVE+/AVE− over ⌈N/2⌉ boards). Undefined when unknown (the void
  // scorer then falls back to the flat §3.3.6.1 scoring).
  const expectedBoards = boardsPerRoundOf(movement) ?? undefined;

  const { rows, matches, withdrawals, excludedFromRanking } = ruled;
  const { pairs, teams } = participants;
  const adjustedBoards: AdjustedBoardScore[] = [];

  const sections =
    scope === "combined"
      ? []
      : computeSections(
          rows,
          matches,
          pairs,
          event.scoringType,
          swissVpMode,
          isTeamsVp,
          teamsImpAggregate,
          teamsBoardComparison,
          barometer,
          twoWinner,
          teams,
          expectedBoards,
          withdrawals,
          excludedFromRanking,
          baseline,
          adjustedBoards,
        ).map((s) => excludeFromLeaderboard(s, excludedFromRanking));

  // The director can turn off the combined overall ranking for a multi-section
  // event, keeping sections separate. It stays on by default, and is always
  // produced for a single-section game (where "combined" and the one section
  // are identical anyway).
  const showCombined =
    scope === "combined" ||
    (scope === "both" && (event.combinedRanking || sections.length <= 1));

  const overall = showCombined
    ? excludeFromLeaderboard(
        computeCombined(
          rows,
          matches,
          pairs,
          event.combinedLabel,
          event.scoringType,
          swissVpMode,
          isTeamsVp,
          teamsImpAggregate,
          teamsBoardComparison,
          barometer,
          twoWinner,
          teams,
          expectedBoards,
          withdrawals,
          excludedFromRanking,
          adjustedBoards,
        ),
        excludedFromRanking,
      )
    : null;

  return { classification, adjustedBoards, overall, sections };
}
