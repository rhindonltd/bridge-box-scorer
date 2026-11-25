import "server-only";

import { Db } from "@/db/games";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findSections } from "@/db/games/queries/find-sections";
import { getBoardInstances } from "@/services/board-service";
import { getSchedule } from "@/services/schedule-service";
import { scoreGame } from "@/services/leaderboard-service";
import {
  getCombination,
  type AdjustedBoardScore,
  type EventScore,
  type MatchpointLine,
  type XimpLine,
  scoreBoard,
} from "@/modules/scoring";
import { sectionOf } from "@/model/participants";
import type { Traveller } from "@/model/traveller";
import type {
  PairScorecard,
  ScorecardBoard,
  ScorecardRoundVp,
  ScorecardScoring,
} from "@/model/scorecard";

/** A scored line as any of the pairs per-board plugins produce it. */
type ScoredPairLine = Partial<MatchpointLine & XimpLine> & {
  nsId: string;
  ewId: string;
  score: number | null;
};

/**
 * Build the personal scorecard for the pair holding `seat`: every board it has
 * played so far, with the figure the leaderboard counts for it — after Neuberg
 * equalisation, the "better than average" uplift and rounding — so the
 * scorecard's total matches the leaderboard (D5). A board's figure can
 * therefore differ from the same board on the traveller, which stays flat.
 * Where the standings have no figure for the pair (a Swiss Pairs event, which
 * ranks on Victory Points, or a split handover seat scored under another id)
 * the board is scored on its own, as the Board Results screen scores it. For a
 * Swiss Pairs event the per-round Victory Points come from the standings.
 *
 * The field each board is scored against follows the leaderboard the players
 * see: the pair's own section when a multi-section event ranks its sections
 * separately, otherwise every section's results for that board.
 *
 * Pairs events only — returns null for a teams game, and when the seat has no
 * schedule yet (the game has not started).
 */
export async function buildPairScorecard(
  db: Db,
  gameId: string,
  seat: string,
): Promise<PairScorecard | null> {
  const game = await findGameById(gameId);
  if (!game || game.gameType !== "PAIRS") return null;

  const schedule = await getSchedule(db, seat);
  if (!schedule) return null;
  const pairId = schedule.assignmentId;

  const sections = await findSections(db);
  const ownSection = sectionOf(seat);
  const separateSections = sections.length > 1 && !game.combinedRanking;
  const fieldSection = separateSections ? ownSection : undefined;

  // A pairs game is scored by matchpoints or Cross-IMP.
  const scoring = getCombination(game.scoringType).perBoard as ScorecardScoring;

  // One scoring run gives both the adjusted board figures and (for Swiss) the
  // per-round VP, the same run the leaderboard shows.
  const eventScore = await scoreGame(db, gameId);
  const adjustedByBoard = adjustedFor(
    eventScore.adjustedBoards,
    fieldSection ?? gameId,
  );

  const boards: ScorecardBoard[] = [];
  for (const round of schedule.rounds) {
    if (round.sitOut) continue;
    for (const boardNumber of round.boards) {
      const instances = await getBoardInstances(db, boardNumber, {
        section: fieldSection,
      });
      // This pair's line on the board (as credited, after any seat swap).
      const mine = instances.find(
        (i) =>
          i.roundNumber === round.roundNumber &&
          (i.participants.ns === pairId || i.participants.ew === pairId),
      );
      if (!mine || mine.currentResult == null) continue;

      // Score the board's traveller exactly as the Board Results screen does
      // (see useScoredBoard): every line with a result, on its own.
      const traveller: Traveller = {
        type: "PAIR",
        mode: "PAIR",
        board: boardNumber,
        section: fieldSection ?? gameId,
        lines: instances
          .filter((i) => i.currentResult != null)
          .map((i) => ({
            nsId: i.participants.ns,
            ewId: i.participants.ew,
            outcome: i.currentResult,
          })) as Traveller["lines"],
      };
      const scored = scoreBoard(traveller, game.scoringType)
        .lines as ScoredPairLine[];

      const side = mine.participants.ns === pairId ? "NS" : "EW";
      const line = scored.find(
        (l) =>
          l.nsId === mine.participants.ns && l.ewId === mine.participants.ew,
      );
      if (!line) continue;

      const isNs = side === "NS";
      const rawScore =
        line.score == null ? null : isNs ? line.score : -line.score || 0;

      const entry: ScorecardBoard = {
        roundNumber: round.roundNumber,
        boardNumber,
        side,
        opponentId: isNs ? mine.participants.ew : mine.participants.ns,
        outcome: mine.currentResult,
        score: rawScore,
      };
      const adjusted = adjustedByBoard.get(adjustedKey(boardNumber, pairId));
      if (scoring === "MP") {
        entry.matchpoints = adjusted
          ? { value: adjusted.value, max: adjusted.top ?? 0 }
          : {
              value: (isNs ? line.nsMatchPoints : line.ewMatchPoints) ?? 0,
              max: line.maxMatchPoints ?? 0,
            };
      } else {
        entry.crossImps = adjusted
          ? adjusted.value
          : ((isNs ? line.nsCrossImps : line.ewCrossImps) ?? 0);
      }
      boards.push(entry);
    }
  }

  const roundVps =
    game.eventFormat === "SWISS"
      ? swissRoundVps(
          eventScore,
          pairId,
          fieldSection ?? ownSection,
          separateSections,
          boards,
        )
      : null;

  return { pairId, scoring, boards, roundVps };
}

/**
 * The Victory Points this pair earned in each Swiss round, read from the same
 * standings the leaderboard shows (a round's VP comes from the whole match, so
 * it is per round, not per board).
 */
function swissRoundVps(
  eventScore: EventScore,
  pairId: string,
  section: string,
  separateSections: boolean,
  boards: ScorecardBoard[],
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

/** The lookup key for one pair's adjusted score on one board. */
function adjustedKey(boardNumber: number, pairId: string): string {
  return `${boardNumber}|${pairId}`;
}

/** The adjusted board scores for one field, by board and pair. */
function adjustedFor(
  adjusted: AdjustedBoardScore[],
  field: string,
): Map<string, AdjustedBoardScore> {
  const byKey = new Map<string, AdjustedBoardScore>();
  for (const a of adjusted) {
    if (a.field === field) byKey.set(adjustedKey(a.boardNumber, a.pairId), a);
  }
  return byKey;
}
