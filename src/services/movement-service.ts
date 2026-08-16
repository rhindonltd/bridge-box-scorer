"use server";

import { getDb as getPairsDb } from "@/db/games";
import { boards as pairsBoards } from "@/db/games/tables/boards";
import { isBoardEntered } from "@/lib/round-status";

export async function getMovementWithProgress(
  gameId: string,
  gameType: string,
) {
  return getPairsMovementWithProgress(gameId);
}

async function getPairsMovementWithProgress(gameId: string) {
  const db = await getPairsDb(gameId);
  const rows = await db.select().from(pairsBoards);

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

  const boardCountMap = new Map<string, { played: number; total: number }>();
  for (const row of rows) {
    const key = `${row.tableNumber}-${row.roundNumber}`;
    if (!boardCountMap.has(key))
      boardCountMap.set(key, { played: 0, total: 0 });
    const counts = boardCountMap.get(key)!;
    counts.total++;
    if (
      isBoardEntered({
        confirmedResult: row.confirmedResult,
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
          const counts = boardCountMap.get(key) ?? { played: 0, total: 0 };

          let hasPreviousGap = false;
          if (counts.played < counts.total) {
            const allRoundNumbers = Array.from(roundMap.keys()).sort(
              (a, b) => a - b,
            );
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

  return { type: "PAIRS" as const, tables };
}
