import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findClub } from "@/db/system/queries/find-club";
import { findPairs } from "@/db/games/queries/find-pairs";
import { boards } from "@/db/games/tables/boards";
import {
  generateUsebioXml,
  UsebioGameData,
  UsebioBoardResult,
  UsebioPair,
} from "@/usebio/generate-usebio";
import { BoardOutcome } from "@/model/score";
import { Card } from "@/model/common";
import { withGameRoute } from "@/lib/api/gameRoute";

export const GET = withGameRoute(async ({ db, gameId }) => {
    const game = await findGameById(gameId);

    if (!game) {
        return NextResponse.json(
            {
                success: false,
                error:
                    "Game not found.",
            },
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

    // Get participants (pairs)
    const pairs = await findPairs(db);

    // Get all board results
    const allBoards = await db.select().from(boards);

    // Build USEBIO pairs data
    const usebioPairs: UsebioPair[] = pairs.map((pair) => {
        // Parse direction from initialSeat (e.g., "1NS" → table 1, direction NS)
        const direction = pair.initialSeat.endsWith("NS") ? "N" : "E";
        // Pair number is the table number + direction identifier
        const tableNumber = pair.initialSeat.slice(0, -2);
        const pairNumber = `${tableNumber}${direction === "N" ? "" : "E"}`;

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

    return new NextResponse(xml, {
        headers: {
            "Content-Type": "application/xml",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
});
