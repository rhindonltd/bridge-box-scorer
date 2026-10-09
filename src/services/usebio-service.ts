import { BridgeGame } from "@/db/game-index/schema";
import { Db } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findTeams } from "@/db/games/queries/find-teams";
import { boards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";
import { findSections } from "@/db/games/queries/find-sections";
import {
  readRankingExclusions,
  readWithdrawals,
} from "@/db/games/queries/ranking-exclusions";
import { getAnySectionMovement } from "@/db/games/queries/get-section-movement";
import { applyTeamWithdrawalRulings } from "@/scoring/swiss/team-withdrawal";
import { formatPairNumber, sectionOf } from "@/model/participants";
import { Club } from "@/db/system/schema";
import {
  generateUsebioXml,
  UsebioBoardResult,
  UsebioPairsData,
  UsebioPair,
} from "@/lib/usebio/generate-usebio";
import { assembleSwissPairs } from "@/lib/usebio/assemble-swiss-pairs";
import { assembleSwissTeams } from "@/lib/usebio/assemble-swiss-teams";
import { assembleImpAggregateTeams } from "@/lib/usebio/assemble-imp-aggregate-teams";
import { assembleBoardComparisonTeams } from "@/lib/usebio/assemble-board-comparison-teams";
import {
  parseSelectedMovement,
  boardsPerRoundOf,
} from "@/model/selected-movement";
import { classifyEvent } from "@/model/event-format";
import { Card } from "@/model/common";
import { BoardOutcome } from "@/model/score";

/**
 * Generate the USEBIO 1.2 XML for a game, choosing the event shape from the
 * game type and its selected movement:
 *  - Swiss Pairs (movement source SWISS) -> a SWISS_PAIRS file (matches per
 *    round, integer Victory Points);
 *  - Swiss Teams (TEAMS + source SWISS_TEAMS) -> a SWISS_TEAMS file (team
 *    matches per round, board IMPs, integer Victory Points);
 *  - Board-comparison teams (TEAMS + a teams movement + BAM or PAB scoring) ->
 *    a board-comparison teams file (team matches per round, per-board points,
 *    ranked by points won): BAM uses a 0/0.5/1 scale, PAB a 0/1/2 scale;
 *  - everything else -> the standard MP/Butler/XIMP pairs file.
 */
export async function generateUsebio(db: Db, game: BridgeGame, club: Club) {
  // The movement is stored PER SECTION for Swiss/Swiss-Teams games (not on the
  // game-index row), so fall back to a section movement when the index copy is
  // absent — matching the leaderboard's classification (and needed to size the
  // §3.3.9 withdrawal void split).
  const movement =
    parseSelectedMovement(game.selectedMovement) ??
    (await getAnySectionMovement(db));
  const { format, swissVpMode } = classifyEvent(
    game.gameType,
    game.scoringType,
    movement,
  );

  // The expected boards per teams match, to size the §3.3.9 void split; the
  // void scorer falls back to the flat §3.3.6.1 40% when it is unknown.
  const expectedBoards = boardsPerRoundOf(movement) ?? undefined;

  // EBU §2.4.9 — the without-standing / removed-withdrawn contestants dropped
  // from the ranking (but whose results still count for opponents). The same
  // set the live leaderboard uses, so the published file and the board agree.
  const excludedFromRanking = await readRankingExclusions(db);

  switch (format) {
    case "TEAMS_VP": {
      const [teams, boardRows, matchRows, withdrawals] = await Promise.all([
        findTeams(db),
        db.select().from(boards),
        db.select().from(matches),
        readWithdrawals(db),
      ]);
      // §2.4.3–§2.4.6: void a withdrawn team's unplayed matches in-memory
      // (never persisted), so the published file matches the live leaderboard.
      const ruledMatches = applyTeamWithdrawalRulings(
        matchRows,
        withdrawals,
        boardRows,
      );
      return generateUsebioXml(
        assembleSwissTeams(
          game,
          club,
          teams,
          boardRows,
          ruledMatches,
          excludedFromRanking,
          expectedBoards,
        ),
      );
    }
    case "TEAMS_IMP_AGG": {
      const [teams, boardRows, matchRows] = await Promise.all([
        findTeams(db),
        db.select().from(boards),
        db.select().from(matches),
      ]);
      return generateUsebioXml(
        assembleImpAggregateTeams(
          game,
          club,
          teams,
          boardRows,
          matchRows,
          excludedFromRanking,
        ),
      );
    }
    case "TEAMS_BAM":
    case "TEAMS_PAB": {
      const [teams, boardRows, matchRows] = await Promise.all([
        findTeams(db),
        db.select().from(boards),
        db.select().from(matches),
      ]);
      const scoring = format === "TEAMS_PAB" ? "PAB" : "BAM";
      return generateUsebioXml(
        assembleBoardComparisonTeams(
          game,
          club,
          teams,
          boardRows,
          matchRows,
          scoring,
          excludedFromRanking,
        ),
      );
    }
    case "SWISS_PAIRS_VP": {
      const [pairs, boardRows, matchRows] = await Promise.all([
        findPairs(db),
        db.select().from(boards),
        db.select().from(matches),
      ]);
      // A matchpoint-scored Swiss exports in MP mode; cross-IMP and (null-mode)
      // IMP-scored Swiss both export as cross-IMP vs the field, so the file
      // agrees with how the leaderboard scores an XIMP/MP Swiss event.
      const mode = swissVpMode === "MP" ? "MP" : "XIMP";
      return generateUsebioXml(
        assembleSwissPairs(
          game,
          club,
          pairs,
          boardRows,
          matchRows,
          mode,
          excludedFromRanking,
        ),
      );
    }
    case "PAIRS_BOARD":
      return generateMpPairsUsebio(db, game, club, excludedFromRanking);
  }
}

async function generateMpPairsUsebio(
  db: Db,
  game: BridgeGame,
  club: Club,
  excludedFromRanking: ReadonlySet<string>,
) {
  // Get participants (pairs)
  const pairs = await findPairs(db);

  // Get all board results
  const allBoards = await db.select().from(boards);

  // The ordered section ids to emit (one <SECTION> each). Each section is its
  // own scoring field, so pair numbers are always emitted UNPREFIXED (e.g.
  // "1NS", never "A1NS") — the enclosing SECTION carries the section id.
  const sections = await findSections(db);
  const sectionIds = sections.map((s) => s.section);

  // Build USEBIO pairs data. The pair carries its section (derived from its
  // section-qualified seat) so the builder can group it under the right
  // SECTION; the pair number itself is unprefixed.
  const usebioPairs: UsebioPair[] = pairs.map((pair) => {
    // Parse direction from initialSeat (e.g., "A1NS" → direction NS → "N").
    const direction = pair.initialSeat.endsWith("NS") ? "N" : "E";

    return {
      pairNumber: formatPairNumber(pair.initialSeat, false),
      direction: direction as "N" | "E",
      section: sectionOf(pair.initialSeat),
      player1: pair.player1,
      player2: pair.player2,
    };
  });

  // Build board results — each tagged with the section it was played in (from
  // the board row), with unprefixed pair numbers.
  const boardResults: UsebioBoardResult[] = allBoards
    .filter(
      (b) =>
        b.confirmedResult ||
        // A director assignment / cancellation (fouled board, §3.3.2) has a
        // directorOverrideResult but no confirmedResult — it must still be
        // exported, not dropped as if it had no result.
        b.directorOverrideResult ||
        b.status === "NOT_PLAYED",
    )
    .map((b) => ({
      table: b.tableNumber,
      board: b.boardNumber,
      round: b.roundNumber,
      nsPairNumber: formatPairNumber(b.ns, false),
      ewPairNumber: formatPairNumber(b.ew, false),
      outcome: (b.directorOverrideResult ??
        b.confirmedResult ??
        "NP") as BoardOutcome,
      lead: (b.confirmedLead ?? null) as Card | null,
      section: b.section,
    }));

  // Count total distinct board numbers (sections share the same board set).
  const boardNumbers = new Set(allBoards.map((b) => b.boardNumber));

  const usebioData: UsebioPairsData = {
    club: {
      name: club.name,
      clubNumber: club.clubNumber,
    },
    eventName: game.eventName,
    eventDate: game.eventDate,
    scoringType: game.scoringType,
    tables: game.tables,
    sectionName: game.sectionName || "A",
    sections: sectionIds,
    boards: boardNumbers.size,
    pairs: usebioPairs,
    boardResults,
    excludedFromRanking,
  };

  return generateUsebioXml(usebioData);
}
