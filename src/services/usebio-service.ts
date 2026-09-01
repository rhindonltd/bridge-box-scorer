import { BridgeGame } from "@/db/game-index/schema";
import { Db } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import { boards } from "@/db/games/tables/boards";
import { Club } from "@/db/system/schema";
import {
  generateUsebioXml,
  UsebioBoardResult,
  UsebioGameData,
  UsebioPair,
} from "@/lib/usebio/generate-usebio";
import { Card } from "@/model/common";
import { BoardOutcome } from "@/model/score";

export async function generateUsebio(db: Db, game: BridgeGame, club: Club) {
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

  const usebioData: UsebioGameData = {
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
