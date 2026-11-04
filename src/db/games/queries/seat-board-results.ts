import { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";

/**
 * Split the boards of one seat into those that already have a result and those
 * that don't, from the board rows carrying the seat's board id (`boards.ns` or
 * `boards.ew`).
 *
 * The effective result is a director override over the confirmed result — the
 * same rule the scorer uses — so a director-assigned board counts as played.
 *
 * Shared by a fresh handover and a returning pair (EBU §2.4.7): both move the boards
 * that have NOT yet been played to whoever is taking the seat over, and leave
 * every board that already has a result with the pair that played it. Both
 * arrays are returned in ascending board-number order.
 */
export async function splitSeatBoardsByResult(
  db: Db,
  boardAnchorId: string,
): Promise<{ played: number[]; unplayed: number[] }> {
  const rows = await db
    .select({
      ns: boards.ns,
      ew: boards.ew,
      boardNumber: boards.boardNumber,
      confirmedResult: boards.confirmedResult,
      directorOverrideResult: boards.directorOverrideResult,
    })
    .from(boards);

  const played = new Set<number>();
  const unplayed = new Set<number>();
  for (const row of rows) {
    if (row.ns !== boardAnchorId && row.ew !== boardAnchorId) continue;
    const hasResult =
      (row.directorOverrideResult ?? row.confirmedResult) != null;
    if (hasResult) played.add(row.boardNumber);
    else unplayed.add(row.boardNumber);
  }

  const ascending = (a: number, b: number) => a - b;
  return {
    played: [...played].sort(ascending),
    unplayed: [...unplayed].sort(ascending),
  };
}
