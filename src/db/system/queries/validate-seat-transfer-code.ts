import "server-only";

import { getDb } from "@/db/system";
import { seatTransferCodes } from "@/db/system/schema";
import { eq } from "drizzle-orm";
import { rotateParticipantSecret } from "@/db/games/actions/rotate-participant-secret";
import { handoverSeat } from "@/db/games/actions/handover-seat";
import { isTeamsGame } from "@/db/game-index/queries/is-teams-game";
import type { NewPlayer } from "@/db/games/tables/players";
import type { PairSeat } from "@/model/participants";
import { checkCodeValidity } from "./code-validation";

export type ClaimSeatTransferResult =
  | {
      valid: true;
      gameId: string;
      seat: string;
      token: string;
      /** Whether this claim handed a stand-in seat over to the real pair. */
      isHandover: boolean;
    }
  | { valid: false; error: string };

/** The arriving real pair, required only when claiming a handover seat. */
export interface ClaimSeatTransferRealPair {
  player1: NewPlayer;
  player2: NewPlayer;
}

export type InspectSeatTransferResult =
  | { valid: true; gameId: string; seat: string; isHandover: boolean }
  | { valid: false; error: string };

/**
 * Validate a seat-transfer code WITHOUT consuming it, and report whether it is a
 * HANDOVER code (a different, arriving pair taking over) vs a plain change-device
 * code (the same pair on a new device). The claim UI calls this first so it
 * knows whether to collect the arriving pair's names before the real (consuming)
 * claim. The intent is carried by the code itself (its `kind`, set when minted),
 * NOT inferred from the seat's standing — any seated seat can be handed over.
 * The code is left unused — only {@link validateAndClaimSeatTransferCode} marks
 * it used.
 */
export async function inspectSeatTransferCode(
  code: string,
): Promise<InspectSeatTransferResult> {
  const db = await getDb();

  const record = await db
    .select()
    .from(seatTransferCodes)
    .where(eq(seatTransferCodes.code, code.toUpperCase()))
    .get();

  const rejection = checkCodeValidity(record);
  if (rejection) return rejection;
  const valid = record!;

  return {
    valid: true,
    gameId: valid.gameId,
    seat: valid.seat,
    isHandover: valid.kind === "HANDOVER",
  };
}

/**
 * Validate a seat-transfer code and, if valid, hand the seat to the claiming
 * device, consuming the code. Returns the resolved game, seat, new token, and
 * whether this was a handover.
 *
 * Two cases, decided by the code's OWN `kind` (set when minted — not inferred
 * from the seat's standing):
 *  - CHANGE_DEVICE: rotate that seat's secret to the fresh token (invalidating
 *    the old device). The same pair, new phone. Unchanged from before.
 *  - HANDOVER: run the handover engine, seating the arriving pair (whose names
 *    the claim must carry) over the unplayed boards WITH the fresh token as
 *    their secret. The claim therefore requires `realPair`.
 *
 * Rejects a missing / already-used / expired code, a seat no longer occupied,
 * a handover claim missing the arriving pair's names, and any handover-engine
 * rejection (e.g. the seat already handed over).
 */
export async function validateAndClaimSeatTransferCode(
  code: string,
  realPair?: ClaimSeatTransferRealPair,
): Promise<ClaimSeatTransferResult> {
  const db = await getDb();

  const record = await db
    .select()
    .from(seatTransferCodes)
    .where(eq(seatTransferCodes.code, code.toUpperCase()))
    .get();

  const rejection = checkCodeValidity(record);
  if (rejection) {
    return rejection;
  }
  // record is defined here: checkCodeValidity rejects the not-found case above.
  const valid = record!;

  const consume = () =>
    db
      .update(seatTransferCodes)
      .set({ used: 1 })
      .where(eq(seatTransferCodes.code, code.toUpperCase()));

  // The claiming device's new secret. For a plain transfer it rotates onto the
  // seat's primary; for a handover it becomes the arriving pair's secret.
  const token = crypto.randomUUID();

  // The intent is carried by the code's own `kind`, decided at mint time.
  const isHandover = valid.kind === "HANDOVER";

  if (isHandover) {
    if (!realPair) {
      // The arriving pair's names are required for a handover claim; don't
      // consume the code so the claimer can retry after entering them.
      return {
        valid: false,
        error: "Enter the arriving pair's names to take over this seat.",
      };
    }

    const result = await handoverSeat(valid.gameId, {
      seat: valid.seat as PairSeat,
      realPair,
      secretKey: token,
      // Options deferred to the director's "Substitutions" screen.
      teamsGame: await isTeamsGame(valid.gameId),
    });

    if (!result.ok) {
      await consume();
      return {
        valid: false,
        error: result.error ?? "Could not hand over the seat.",
      };
    }

    await consume();
    return {
      valid: true,
      gameId: valid.gameId,
      seat: valid.seat,
      token,
      isHandover: true,
    };
  }

  // Plain change-device: rotate the seat's secret so only the claiming device
  // retains access.
  const rotated = await rotateParticipantSecret(
    valid.gameId,
    valid.seat,
    token,
  );

  if (!rotated) {
    // The seat was vacated between minting and claiming the code. Consume the
    // code so a stale one can't linger.
    await consume();
    return { valid: false, error: "That seat is no longer occupied." };
  }

  await consume();
  return {
    valid: true,
    gameId: valid.gameId,
    seat: valid.seat,
    token,
    isHandover: false,
  };
}
