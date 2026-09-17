import { BridgeGame } from "@/db/game-index/schema";
import { Db } from "@/db/games";
import { getAllDealHands } from "@/db/games/queries/get-deal";
import { Club } from "@/db/system/schema";
import { generatePbn } from "@/lib/pbn/generate-pbn";

/**
 * Generate the PBN (Portable Bridge Notation) export for a game.
 *
 * PBN here is a deal-oriented file: one block per board carrying the event
 * metadata and the dealt cards. Unlike USEBIO it does not depend on the
 * scoring type or movement — it only needs the entered deals (keyed by board
 * number) plus the event name/date and the club name (used as the PBN `Site`).
 *
 * Boards without an entered deal contribute nothing to the file.
 */
export async function generatePbnExport(
  db: Db,
  game: BridgeGame,
  club: Club,
): Promise<string> {
  const deals = await getAllDealHands(db);

  return generatePbn({
    eventName: game.eventName,
    eventDate: game.eventDate,
    site: club.name,
    deals,
  });
}
