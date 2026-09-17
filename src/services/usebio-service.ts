import { BridgeGame } from "@/db/game-index/schema";
import { Db } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findTeams } from "@/db/games/queries/find-teams";
import { boards } from "@/db/games/tables/boards";
import { findSections } from "@/db/games/queries/find-sections";
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
import { parseSelectedMovement } from "@/model/selected-movement";
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
 *  - everything else -> the standard MP/Butler/XIMP pairs file.
 */
export async function generateUsebio(db: Db, game: BridgeGame, club: Club) {
  const movement = parseSelectedMovement(game.selectedMovement);
  const { format } = classifyEvent(game.gameType, game.scoringType, movement);

  switch (format) {
    case "SWISS_TEAMS_VP": {
      const [teams, boardRows] = await Promise.all([
        findTeams(db),
        db.select().from(boards),
      ]);
      return generateUsebioXml(
        assembleSwissTeams(game, club, teams, boardRows),
      );
    }
    case "SWISS_PAIRS_VP": {
      const [pairs, boardRows] = await Promise.all([
        findPairs(db),
        db.select().from(boards),
      ]);
      return generateUsebioXml(
        assembleSwissPairs(game, club, pairs, boardRows),
      );
    }
    case "PAIRS_BOARD":
      return generateMpPairsUsebio(db, game, club);
  }
}

async function generateMpPairsUsebio(db: Db, game: BridgeGame, club: Club) {
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
    .filter((b) => b.confirmedResult || b.status === "NOT_PLAYED")
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
  };

  return generateUsebioXml(usebioData);
}
