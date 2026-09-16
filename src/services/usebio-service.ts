import { BridgeGame } from "@/db/game-index/schema";
import { Db } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findTeams } from "@/db/games/queries/find-teams";
import { boards } from "@/db/games/tables/boards";
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

  if (movement?.source === "SWISS_TEAMS" && game.gameType === "TEAMS") {
    const [teams, boardRows] = await Promise.all([
      findTeams(db),
      db.select().from(boards),
    ]);
    return generateUsebioXml(assembleSwissTeams(game, club, teams, boardRows));
  }

  if (movement?.source === "SWISS") {
    const [pairs, boardRows] = await Promise.all([
      findPairs(db),
      db.select().from(boards),
    ]);
    return generateUsebioXml(assembleSwissPairs(game, club, pairs, boardRows));
  }

  return generateMpPairsUsebio(db, game, club);
}

async function generateMpPairsUsebio(db: Db, game: BridgeGame, club: Club) {
  // Get participants (pairs)
  const pairs = await findPairs(db);

  // Get all board results
  const allBoards = await db.select().from(boards);

  // Build USEBIO pairs data
  const usebioPairs: UsebioPair[] = pairs.map((pair) => {
    // Parse direction from initialSeat (e.g., "1NS" → table 1, direction NS)
    const direction = pair.initialSeat.endsWith("NS") ? "N" : "E";

    return {
      pairNumber: pair.initialSeat, // Use initialSeat as pair ID
      direction: direction as "N" | "E",
      player1: pair.player1,
      player2: pair.player2,
    };
  });

  // Build board results
  const boardResults: UsebioBoardResult[] = allBoards
    .filter((b) => b.confirmedResult || b.status === "NOT_PLAYED")
    .map((b) => ({
      table: b.tableNumber,
      board: b.boardNumber,
      round: b.roundNumber,
      nsPairNumber: b.ns,
      ewPairNumber: b.ew,
      outcome: (b.directorOverrideResult ??
        b.confirmedResult ??
        "NP") as BoardOutcome,
      lead: (b.confirmedLead ?? null) as Card | null,
    }));

  // Count total boards
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
    boards: boardNumbers.size,
    pairs: usebioPairs,
    boardResults,
  };

  return generateUsebioXml(usebioData);
}
