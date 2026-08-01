"use server";

import { eq } from "drizzle-orm";
import { getDb as getPairsDb } from "@/db/games/pairs";
import { boards as pairsBoards } from "@/db/games/pairs/tables/boards";
import { findPairs } from "@/db/games/pairs/queries/find-pairs";

export async function getBoardInstances(gameId: string, gameType: string, boardNumber: number) {
  return getPairsBoardInstances(gameId, boardNumber);
}

async function getPairsBoardInstances(gameId: string, boardNumber: number) {
  const db = await getPairsDb(gameId);
  const records = await db
    .select()
    .from(pairsBoards)
    .where(eq(pairsBoards.boardNumber, boardNumber));

  const pairs = await findPairs(gameId);
  const pairNameMap = new Map<string, string>();
  for (const pair of pairs) {
    const names = `${pair.player1.firstName} ${pair.player1.lastName} & ${pair.player2.firstName} ${pair.player2.lastName}`;
    pairNameMap.set(pair.initialSeat, names);
  }

  return records.map((b) => ({
    roundNumber: b.roundNumber,
    tableNumber: b.tableNumber,
    boardNumber: b.boardNumber,
    participants: {
      type: "PAIRS" as const,
      ns: b.ns,
      ew: b.ew,
      nsNames: pairNameMap.get(b.ns) ?? null,
      ewNames: pairNameMap.get(b.ew) ?? null,
    },
    currentResult: b.directorOverrideResult ?? b.confirmedResult ?? null,
    status: b.status ?? null,
  }));
}
