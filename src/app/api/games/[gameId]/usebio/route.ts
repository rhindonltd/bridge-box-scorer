import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findClub } from "@/db/system/queries/find-club";
import { findPairs } from "@/db/game/queries/find-pairs";
import { getDb as getPairsDb } from "@/db/game";
import { boards } from "@/db/game/tables/boards";
import {
  generateUsebioXml,
  UsebioGameData,
  UsebioBoardResult,
  UsebioPair,
} from "@/usebio/generate-usebio";
import { BoardOutcome } from "@/model/score";
import { Card } from "@/model/common";

/**
 * GET /api/games/[gameId]/usebio
 *
 * Generates and returns a USEBIO 1.2 XML file for the given game.
 * Returns Content-Type: application/xml with a suggested filename.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;

  try {
    const game = await findGameById(gameId);
    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 },
      );
    }

    const club = await findClub();
    if (!club) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Club info not configured. Set club name and number in settings.",
        },
        { status: 400 },
      );
    }

    // Currently only supports PAIRS games
    if (game.gameType !== "PAIRS") {
      return NextResponse.json(
        {
          success: false,
          error: "USEBIO export is currently only supported for Pairs games",
        },
        { status: 400 },
      );
    }

    // Get participants (pairs)
    const pairs = await findPairs(gameId);

    // Get all board results
    const db = await getPairsDb(gameId);
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

    const xml = generateUsebioXml(usebioData);

    // Return as downloadable XML file
    const filename = `${game.eventName.replace(/[^a-zA-Z0-9]/g, "_")}_${game.eventDate.split("T")[0]}.xml`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("USEBIO generation failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate USEBIO file" },
      { status: 500 },
    );
  }
}
