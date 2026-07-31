import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { getDb as getPairsDb } from "@/db/games/pairs";
import { getDb as getIndividualDb } from "@/db/games/individual";
import { boards as pairsBoards } from "@/db/games/pairs/tables/boards";
import { boards as individualBoards } from "@/db/games/individual/tables/boards";
import { isBoardEntered } from "@/lib/round-status";

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

    if (game.gameType === "INDIVIDUAL") {
      const db = await getIndividualDb(gameId);
      const rows = await db.select().from(individualBoards);

      // Group by table, then by round
      const tableMap = new Map<
        number,
        Map<
          number,
          {
            n: string;
            s: string;
            e: string;
            w: string;
            boardStart: number;
            boardEnd: number;
          }
        >
      >();

      for (const row of rows) {
        if (!tableMap.has(row.tableNumber))
          tableMap.set(row.tableNumber, new Map());
        const roundMap = tableMap.get(row.tableNumber)!;

        if (!roundMap.has(row.roundNumber)) {
          roundMap.set(row.roundNumber, {
            n: row.n,
            s: row.s,
            e: row.e,
            w: row.w,
            boardStart: row.boardNumber,
            boardEnd: row.boardNumber,
          });
        } else {
          const existing = roundMap.get(row.roundNumber)!;
          existing.boardStart = Math.min(existing.boardStart, row.boardNumber);
          existing.boardEnd = Math.max(existing.boardEnd, row.boardNumber);
        }
      }

      // Compute board progress per table+round
      const boardCountMap = new Map<
        string,
        { played: number; total: number }
      >();

      for (const row of rows) {
        const key = `${row.tableNumber}-${row.roundNumber}`;
        if (!boardCountMap.has(key)) {
          boardCountMap.set(key, { played: 0, total: 0 });
        }
        const counts = boardCountMap.get(key)!;
        counts.total++;
        if (
          isBoardEntered({
            nResult: row.nResult,
            directorOverrideResult: row.directorOverrideResult,
            status: row.status,
          })
        ) {
          counts.played++;
        }
      }

      const tables = Array.from(tableMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([tableNumber, roundMap]) => ({
          tableNumber,
          rounds: Array.from(roundMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([roundNumber, data]) => {
              const key = `${tableNumber}-${roundNumber}`;
              const counts = boardCountMap.get(key) ?? {
                played: 0,
                total: 0,
              };

              // Flag this round if it's incomplete and a LATER round has results
              let hasPreviousGap = false;
              if (counts.played < counts.total) {
                const allRoundNumbers = Array.from(roundMap.keys()).sort((a, b) => a - b);
                for (const laterRound of allRoundNumbers) {
                  if (laterRound > roundNumber) {
                    const laterKey = `${tableNumber}-${laterRound}`;
                    const laterCounts = boardCountMap.get(laterKey);
                    if (laterCounts && laterCounts.played > 0) {
                      hasPreviousGap = true;
                      break;
                    }
                  }
                }
              }

              return {
                roundNumber,
                ...data,
                played: counts.played,
                total: counts.total,
                hasPreviousGap,
              };
            }),
        }));

      return NextResponse.json({ type: game.gameType, tables });
    } else {
      const db = await getPairsDb(gameId);
      const rows = await db.select().from(pairsBoards);

      // Group by table, then by round
      const tableMap = new Map<
        number,
        Map<
          number,
          { ns: string; ew: string; boardStart: number; boardEnd: number }
        >
      >();

      for (const row of rows) {
        if (!tableMap.has(row.tableNumber))
          tableMap.set(row.tableNumber, new Map());
        const roundMap = tableMap.get(row.tableNumber)!;

        if (!roundMap.has(row.roundNumber)) {
          roundMap.set(row.roundNumber, {
            ns: row.ns,
            ew: row.ew,
            boardStart: row.boardNumber,
            boardEnd: row.boardNumber,
          });
        } else {
          const existing = roundMap.get(row.roundNumber)!;
          existing.boardStart = Math.min(existing.boardStart, row.boardNumber);
          existing.boardEnd = Math.max(existing.boardEnd, row.boardNumber);
        }
      }

      // Compute board progress per table+round
      const boardCountMap = new Map<
        string,
        { played: number; total: number }
      >();

      for (const row of rows) {
        const key = `${row.tableNumber}-${row.roundNumber}`;
        if (!boardCountMap.has(key)) {
          boardCountMap.set(key, { played: 0, total: 0 });
        }
        const counts = boardCountMap.get(key)!;
        counts.total++;
        if (
          isBoardEntered({
            nsResult: row.nsResult,
            directorOverrideResult: row.directorOverrideResult,
            status: row.status,
          })
        ) {
          counts.played++;
        }
      }

      const tables = Array.from(tableMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([tableNumber, roundMap]) => ({
          tableNumber,
          rounds: Array.from(roundMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([roundNumber, data]) => {
              const key = `${tableNumber}-${roundNumber}`;
              const counts = boardCountMap.get(key) ?? {
                played: 0,
                total: 0,
              };

              // Flag this round if it's incomplete and a LATER round has results
              let hasPreviousGap = false;
              if (counts.played < counts.total) {
                const allRoundNumbers = Array.from(roundMap.keys()).sort((a, b) => a - b);
                for (const laterRound of allRoundNumbers) {
                  if (laterRound > roundNumber) {
                    const laterKey = `${tableNumber}-${laterRound}`;
                    const laterCounts = boardCountMap.get(laterKey);
                    if (laterCounts && laterCounts.played > 0) {
                      hasPreviousGap = true;
                      break;
                    }
                  }
                }
              }

              return {
                roundNumber,
                ...data,
                played: counts.played,
                total: counts.total,
                hasPreviousGap,
              };
            }),
        }));

      return NextResponse.json({ type: game.gameType, tables });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
