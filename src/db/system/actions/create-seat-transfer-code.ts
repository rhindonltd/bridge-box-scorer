import "server-only";

import { getDb } from "@/db/system";
import { seatTransferCodes } from "@/db/system/schema";
import { generateShortCode, CODE_TTL_MS } from "@/db/system/short-code";

/** What a claimed seat-transfer code does — see the schema's `kind` column. */
export type SeatTransferKind = "CHANGE_DEVICE" | "HANDOVER";

/**
 * Generate a short, single-use code that another device can claim to take over
 * a specific seat. Bound to `{ gameId, seat }` and expiring after 5 minutes.
 *
 * `kind` records the claim's intent at mint time:
 *   - CHANGE_DEVICE (default): the SAME pair moves to a new device — claiming
 *     just rotates the seat's secret so only the claiming device retains access.
 *   - HANDOVER: a DIFFERENT (arriving) pair takes over — claiming runs the
 *     handover engine and requires the arriving pair's names.
 */
export async function createSeatTransferCode(
  gameId: string,
  seat: string,
  kind: SeatTransferKind = "CHANGE_DEVICE",
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
    kind,
  });

  return code;
}
