import "server-only";

import { Db } from "@/db/games";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findSections } from "@/db/games/queries/find-sections";
import { getBoardInstances } from "@/services/board-service";
import { getSchedule } from "@/services/schedule-service";
import { buildLeaderboards } from "@/services/leaderboard-service";
import { scoreBoard } from "@/scoring/traveller/score-traveller";
import { getCombination } from "@/scoring/plugins/registry";
import { sectionOf } from "@/model/participants";
import type { Traveller } from "@/model/traveller";
import type { MatchpointLine } from "@/scoring/traveller/pair/mp";
import type { ImpLine } from "@/scoring/traveller/pair/imp";
import type { XimpLine } from "@/scoring/traveller/pair/x-imp";
import type {
  PairScorecard,
  ScorecardBoard,
  ScorecardRoundVp,
} from "@/model/scorecard";

/** A scored line as any of the pairs per-board plugins produce it. */
type ScoredPairLine = Partial<MatchpointLine & ImpLine & XimpLine> & {
  nsId: string;
  ewId: string;
  score: number | null;
};

/**
 * Build the personal scorecard for the pair holding `seat`: every board it has
 * played so far, each scored exactly as the player's Board Results screen
 * scores it — the board's traveller is scored on its own with the game's
 * per-board scoring (no leaderboard-only adjustments). For a Swiss Pairs event
 * the per-round Victory Points come from the standings.
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

  const scoring = getCombination(game.scoringType).perBoard;

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
      if (scoring === "MP") {
        entry.matchpoints = {
          value: (isNs ? line.nsMatchPoints : line.ewMatchPoints) ?? 0,
          max: line.maxMatchPoints ?? 0,
        };
      } else if (scoring === "IMP") {
        entry.imps = (isNs ? line.nsImps : line.ewImps) ?? 0;
      } else {
        entry.crossImps = (isNs ? line.nsCrossImps : line.ewCrossImps) ?? 0;
      }
      boards.push(entry);
    }
  }

  const roundVps =
    game.eventFormat === "SWISS"
      ? await swissRoundVps(
          db,
          gameId,
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
async function swissRoundVps(
  db: Db,
  gameId: string,
  pairId: string,
  section: string,
  separateSections: boolean,
  boards: ScorecardBoard[],
): Promise<ScorecardRoundVp[]> {
  const { leaderboard, sections } = await buildLeaderboards(db, gameId);
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
