import "server-only";

import { getDb } from "@/db/system";
import { seatTransferCodes } from "@/db/system/schema";
import { generateShortCode, CODE_TTL_MS } from "@/db/system/short-code";

/**
 * Generate a short, single-use code that another device can claim to take over
 * a specific seat ("change device"). Bound to `{ gameId, seat }` and expiring
 * after 5 minutes. Claiming it (see validateAndClaimSeatTransferCode) rotates
 * the seat's secret so only the claiming device retains access.
 */
export async function createSeatTransferCode(
  gameId: string,
  seat: string,
): Promise<string> {
  const db = await getDb();

  const code = generateShortCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  await db.insert(seatTransferCodes).values({
    code,
    gameId,
    seat,
    expiresAt,
    used: 0,
  });

  return code;
}
